"""Generate the guarded public CGE reference artifact.

The source workbooks are audit evidence, not runtime dependencies. The public
artifact is generated from the formula-reconciled Python solver and embeds the
accepted benchmark values needed for frontend parity checks.
"""

from __future__ import annotations

import argparse
import json
import sys
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "mcp_server"))

from helpers.validation import CGE_DEFAULTS  # noqa: E402
from models.cge import solve_cge  # noqa: E402


PUBLIC_PATH = ROOT / "apps" / "policy-ui" / "public" / "data" / "cge.json"


def run(overrides: dict[str, float]) -> dict:
    params = dict(CGE_DEFAULTS)
    params.update(overrides)
    result = solve_cge(params)
    if result.get("error"):
        raise RuntimeError(result.get("message", "CGE solver failed"))
    return result


def compact_run(result: dict) -> dict:
    return {
        "results": result["results"],
        "changes_from_base": result["changes_from_base"],
        "accounting_residuals": result["accounting_residuals"],
        "solver": result["solver"],
    }


def benchmark(
    *,
    benchmark_id: str,
    title: str,
    source_file: str,
    source_sha256: str,
    overrides: dict[str, float],
    expected: dict[str, float],
    note: str,
) -> dict:
    result = run(overrides)
    observed = result["results"]
    max_abs_error = max(abs(observed[key] - value) for key, value in expected.items())
    return {
        "benchmark_id": benchmark_id,
        "title": title,
        "status": "exact_workbook_match" if max_abs_error <= 0.000002 else "failed",
        "source_file": source_file,
        "source_sha256": source_sha256,
        "parameter_overrides": overrides,
        "expected_results": expected,
        "max_abs_error": max_abs_error,
        "tolerance": 0.000002,
        "note": note,
    }


def build_artifact(exported_at: str) -> dict:
    base = run({})
    energy_overrides = {"wm": 1.0656990348951294}
    gold_overrides = {
        "we": 0.9475169014017701,
        "sig_q": 0.85,
        "rho_q": 0.17647058823529416,
        "aq": 1.9233641055541322,
        "bq": 0.35005943384368887,
    }
    presets = [
        {
            "preset_id": "baseline",
            "title": "2021 calibrated baseline",
            "description": "No shock; reproduces the reconciled 2021 equilibrium.",
            "controls": {
                "world_import_price_change_pct": 0.0,
                "import_tariff_change_pp": 0.0,
                "government_consumption_change_pct": 0.0,
                "remittances_change_pct": 0.0,
            },
            "evidence_status": "exact_base_reconciliation",
        },
        {
            "preset_id": "world_import_price_benchmark",
            "title": "World import-price increase",
            "description": "Replays the internally consistent 21 December 2023 workbook experiment.",
            "controls": {
                "world_import_price_change_pct": (energy_overrides["wm"] / CGE_DEFAULTS["wm"] - 1) * 100,
                "import_tariff_change_pp": 0.0,
                "government_consumption_change_pct": 0.0,
                "remittances_change_pct": 0.0,
            },
            "evidence_status": "exact_workbook_benchmark",
        },
        {
            "preset_id": "tariff_removal_sensitivity",
            "title": "Remove aggregate import tariff",
            "description": "Solver sensitivity supported directionally, not numerically, by the tariff policy note.",
            "controls": {
                "world_import_price_change_pct": 0.0,
                "import_tariff_change_pp": -CGE_DEFAULTS["tm"] * 100,
                "government_consumption_change_pct": 0.0,
                "remittances_change_pct": 0.0,
            },
            "evidence_status": "directional_source_support",
        },
        {
            "preset_id": "remittance_decline_sensitivity",
            "title": "Remittances decline",
            "description": "A bounded solver sensitivity; no source workbook benchmark is claimed.",
            "controls": {
                "world_import_price_change_pct": 0.0,
                "import_tariff_change_pp": 0.0,
                "government_consumption_change_pct": 0.0,
                "remittances_change_pct": -10.0,
            },
            "evidence_status": "solver_sensitivity_only",
        },
    ]

    return {
        "schema_version": "cge-reference-v1",
        "attribution": {
            "model_id": "cge_123_uzbekistan",
            "model_name": "Uzbekistan CGE 1-2-3 reference model",
            "module": "cge",
            "version": "formula-reconciled-v1",
            "run_id": "cge-public-reference-2021",
            "data_version": "2021-workbook-reconciliation",
            "timestamp": exported_at,
        },
        "metadata": {
            "exported_at": exported_at,
            "base_year": 2021,
            "status": "experimental_reference",
            "solver_version": "CGE 1-2-3 formula-reconciled v1",
            "framework": "Devarajan-Go-Lewis-Robinson-Sinko aggregate 1-2-3 model",
            "source_artifact": "CGE123(2021)_UZ_IMF_MAIN.xls",
            "source_sha256": "8F2B5D75E19D89318FA73EB8E84136DFD9F8DCB0D896B57718F81E9073482904",
            "result_semantics": "comparative_static_percent_change_from_2021_base",
            "approval_status": "not_model_owner_approved",
        },
        "calibration": {
            "parameters": CGE_DEFAULTS,
            "base_results": base["results"],
            "closure": base["closure"],
            "diagnostics": base["calibration_diagnostics"],
            "accounting_residuals": base["accounting_residuals"],
        },
        "controls": [
            {
                "id": "world_import_price_change_pct",
                "parameter": "wm",
                "label": "World import-price change",
                "unit": "%",
                "min": -10.0,
                "max": 15.0,
                "step": 0.5,
                "default": 0.0,
            },
            {
                "id": "import_tariff_change_pp",
                "parameter": "tm",
                "label": "Import tariff change",
                "unit": "pp",
                "min": -CGE_DEFAULTS["tm"] * 100,
                "max": 5.0,
                "step": 0.25,
                "default": 0.0,
            },
            {
                "id": "government_consumption_change_pct",
                "parameter": "G",
                "label": "Government consumption change",
                "unit": "%",
                "min": -10.0,
                "max": 10.0,
                "step": 0.5,
                "default": 0.0,
            },
            {
                "id": "remittances_change_pct",
                "parameter": "re",
                "label": "Remittances change",
                "unit": "%",
                "min": -20.0,
                "max": 20.0,
                "step": 1.0,
                "default": 0.0,
            },
        ],
        "presets": presets,
        "benchmarks": [
            benchmark(
                benchmark_id="energy_world_import_price",
                title="21 December 2023 world import-price experiment",
                source_file="CGE123_2021_21.12.2023.xls",
                source_sha256="EF0096EBE52C90EC268CB7E75A498EE6A2BECD281387275B4D683F1F70B869EC",
                overrides=energy_overrides,
                expected={
                    "E": 0.2585946117155831,
                    "M": 0.40859123022377525,
                    "Ds": 0.741378414154912,
                    "Q": 1.1490381719416976,
                    "Cn": 0.5936977509908844,
                    "Z": 0.3795563340779064,
                },
                note="Exact real-quantity match under the equivalent Python numeraire.",
            ),
            benchmark(
                benchmark_id="gold_export_price_variant",
                title="Gold export-price workbook variant",
                source_file="CGE123_2021_gold_price.xls",
                source_sha256="573E19D6FD49B72D8DF0520D70888C205A51001D9004E775EF6B472AF460950E",
                overrides=gold_overrides,
                expected={
                    "E": 0.25447989843050894,
                    "M": 0.4247184215042827,
                    "Ds": 0.7455123566456383,
                    "Q": 1.1700151581694114,
                    "Cn": 0.6043733370900031,
                    "Z": 0.3898577342065014,
                },
                note="Exact match requires the workbook's alternative Armington elasticity; this is not an isolated gold-price effect.",
            ),
        ],
        "reference_runs": {
            "baseline": compact_run(base),
            "world_import_price_benchmark": compact_run(run(energy_overrides)),
            "tariff_removal_sensitivity": compact_run(run({"tm": 0.0})),
            "remittance_decline_sensitivity": compact_run(run({"re": CGE_DEFAULTS["re"] * 0.9})),
        },
        "excluded_sources": [
            {
                "source_file": "CGE123_2021_28.01.2024.xls",
                "source_sha256": "55A5652452AB5D804976DE298244F1E8C3D627C95C8F81BF0C4C8B8242F94F26",
                "reason": "Saved outputs move without displayed exogenous-input changes; not accepted as a CGE benchmark.",
            },
            {
                "source_file": "Investitsiyalar_osishi-28.01.docx",
                "reason": "The accompanying note states that the calculation used an input-output method, not this CGE 1-2-3 model.",
            },
        ],
        "caveats": [
            "Experimental comparative-static reference, not a forecast or model-owner-approved policy estimate.",
            "Er is a normalized relative-price index, not the nominal UZS/USD exchange rate.",
            "The aggregate model has no sector, labor, household-distribution, debt, or time-path block.",
            "Government consumption and remittance controls are solver sensitivities without accepted source-workbook benchmarks.",
        ],
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--output", type=Path, default=PUBLIC_PATH)
    parser.add_argument(
        "--exported-at",
        default=datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
    )
    args = parser.parse_args()
    artifact = build_artifact(args.exported_at)
    if any(item["status"] != "exact_workbook_match" for item in artifact["benchmarks"]):
        raise RuntimeError("CGE workbook benchmark parity failed")
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(artifact, indent=2) + "\n", encoding="utf-8")
    print(f"Wrote {args.output}")


if __name__ == "__main__":
    main()
