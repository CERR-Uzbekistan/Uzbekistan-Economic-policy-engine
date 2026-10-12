"""Explicit deterministic test preparation; never changes model approval or public data."""

import argparse
import hashlib
import json
import shutil
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "mcp_server"))
from models.readiness import semantic_hash  # noqa: E402 -- import the explicit checkout under test
from workbook_fixtures import prepare_workbooks, validate_workbooks  # noqa: E402 -- import the explicit checkout under test

CONTRACT = ROOT / "scripts/testing/model-fixture-contract.json"
GENERATED = ROOT / "mcp_server/tests/generated"
CSV_FIXTURES = {
    "qpm-legacy-quarterly-v1.csv": "model sources/QPM_UZB/data_q.csv",
    "qpm-legacy-monthly-v1.csv": "model sources/QPM_UZB/data_m.csv",
    "russia-export-demand-panel-v1.csv": "russia-export-demand-panel.csv",
}
CONVERSIONS = {
    "dfm_data.json": "dfm_nowcast/dfm_data.js",
    "io_data.json": "io_model/io_data.js",
    "pe_data.json": "pe_model/pe_data.js",
}


class FixtureSetupError(ValueError):
    pass


def read(path):
    try:
        return json.loads(path.read_text(encoding="utf-8-sig"))
    except (OSError, ValueError) as error:
        raise FixtureSetupError("required_json_missing_or_corrupt:" + path.name) from error


def digest(path):
    try:
        return hashlib.sha256(path.read_bytes()).hexdigest()
    except OSError as error:
        raise FixtureSetupError("required_source_missing:" + path.name) from error


def validate_sources(root=ROOT):
    contract = read(root / "scripts/testing/model-fixture-contract.json")
    if (
        contract.get("schema_version") != "model-test-fixtures-v1"
        or contract.get("approval_effect") != "none"
    ):
        raise FixtureSetupError("fixture_contract_incompatible")
    for name, expected in contract["sources"].items():
        if digest(root / name) != expected:
            raise FixtureSetupError("required_source_hash_mismatch:" + name)
    manifest = read(root / "apps/policy-ui/public/data/model-manifest.json")
    if (
        manifest.get("schema_version") != "1.0"
        or manifest.get("hash_scheme") != "sorted-json-typed-f64-v1"
    ):
        raise FixtureSetupError("model_manifest_schema_incompatible")
    ids = [variant["id"] for variant in manifest["variants"]]
    if len(ids) != len(set(ids)) or manifest["policy_version"] != contract["model_policy_version"]:
        raise FixtureSetupError("model_manifest_identity_mismatch")
    return contract, manifest


def validate_shape(name, value):
    if not isinstance(value, dict):
        raise FixtureSetupError("fixture_schema_incompatible:" + name)
    required = {
        "dfm_data.json": {"meta", "history", "params", "vars", "gdp", "factor"},
        "io_data.json": {"codes", "A", "X"},
        "pe_data.json": {"meta", "sections", "chapters", "countries"},
    }[name]
    if not required <= set(value):
        raise FixtureSetupError("fixture_schema_incompatible:" + name)
    if name == "io_data.json" and (
        len(value["codes"]) != 136 or len(value["A"]) != 136 or len(value["X"]) != 136
    ):
        raise FixtureSetupError("fixture_dimensions_incompatible:" + name)
    if name == "pe_data.json" and not value["sections"]:
        raise FixtureSetupError("fixture_dimensions_incompatible:" + name)


def validate(root=ROOT, generated=None, check_runtime=True):
    generated = generated or root / "mcp_server/tests/generated"
    contract, manifest = validate_sources(root)
    preparation = read(generated / "fixture-manifest.json")
    if preparation.get("schema_version") != "prepared-model-tests-v1" or preparation.get(
        "contract_sha256"
    ) != digest(root / "scripts/testing/model-fixture-contract.json"):
        raise FixtureSetupError("fixture_preparation_identity_mismatch")
    try:
        workbook_hashes = validate_workbooks(root, generated, read)
    except (OSError, ValueError, KeyError) as error:
        raise FixtureSetupError(
            "required_workbook_fixture_missing_corrupt_or_incompatible"
        ) from error
    if preparation.get("workbook_semantic_hashes") != workbook_hashes:
        raise FixtureSetupError("required_workbook_fixture_identity_mismatch")
    for name, relative in CSV_FIXTURES.items():
        if digest(generated / "research" / relative) != digest(
            root / "mcp_server/tests/fixtures" / name
        ):
            raise FixtureSetupError("required_research_csv_hash_mismatch")
    converted = {}
    for name in CONVERSIONS:
        value = read(generated / name)
        validate_shape(name, value)
        expected = contract["converted"][name]
        if semantic_hash(value) != expected or preparation["semantic_hashes"].get(name) != expected:
            raise FixtureSetupError("required_fixture_hash_mismatch:" + name)
        converted["mcp_server/data/" + name] = value
        if check_runtime and semantic_hash(read(root / "mcp_server/data" / name)) != expected:
            raise FixtureSetupError("runtime_derived_artifact_mismatch:" + name)
    for variant in manifest["variants"]:
        for artifact in variant["artifacts"]:
            value = converted.get(artifact["path"])
            if value is None:
                value = read(root / artifact["path"])
            if semantic_hash(value) != artifact["semantic_sha256"]:
                raise FixtureSetupError("frozen_model_artifact_hash_mismatch:" + artifact["path"])
    return preparation


def prepare(root=ROOT, generated=None):
    generated = generated or root / "mcp_server/tests/generated"
    contract, _ = validate_sources(root)
    generated.mkdir(parents=True, exist_ok=True)
    subprocess.run(
        [
            sys.executable,
            str(root / "mcp_server/data/convert_js_data.py"),
            "--output-dir",
            str(generated),
        ],
        cwd=root,
        check=True,
    )
    hashes = {}
    for name in CONVERSIONS:
        value = read(generated / name)
        validate_shape(name, value)
        hashes[name] = semantic_hash(value)
        if hashes[name] != contract["converted"][name]:
            raise FixtureSetupError("converted_fixture_hash_mismatch:" + name)
    for name, relative in CSV_FIXTURES.items():
        target = generated / "research" / relative
        target.parent.mkdir(parents=True, exist_ok=True)
        shutil.copyfile(root / "mcp_server/tests/fixtures" / name, target)
    workbook_hashes = prepare_workbooks(root, generated, read)
    preparation = {
        "workbook_semantic_hashes": workbook_hashes,
        "schema_version": "prepared-model-tests-v1",
        "purpose": "test-fixtures-and-frozen-runtime-derivatives",
        "approval_effect": "none",
        "contract_sha256": digest(root / "scripts/testing/model-fixture-contract.json"),
        "semantic_hashes": hashes,
        "optional_skips": [],
    }
    (generated / "fixture-manifest.json").write_text(
        json.dumps(preparation, sort_keys=True, indent=2) + "\n", encoding="utf-8"
    )
    validate(root, generated, check_runtime=False)
    # Only manifest-matched historical derivatives; public artifacts/manifest are untouched.
    for name in CONVERSIONS:
        shutil.copyfile(generated / name, root / "mcp_server/data" / name)
    return validate(root, generated)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("command", choices=("prepare", "validate"))
    parser.add_argument("--root", type=Path, default=ROOT)
    args = parser.parse_args()
    try:
        result = prepare(args.root) if args.command == "prepare" else validate(args.root)
        print(
            json.dumps(
                {
                    "status": "ready-for-tests",
                    "approval_effect": "none",
                    "required_fixtures": len(CONVERSIONS)
                    + len(CSV_FIXTURES)
                    + len(result["workbook_semantic_hashes"]),
                    "optional_skip_count": len(result["optional_skips"]),
                    "semantic_hashes": result["semantic_hashes"],
                }
            )
        )
    except (FixtureSetupError, subprocess.CalledProcessError) as error:
        reason = str(error) if isinstance(error, FixtureSetupError) else "required_converter_failed"
        print(json.dumps({"status": "setup-failed", "reason": reason}))
        raise SystemExit(1) from None


if __name__ == "__main__":
    main()
