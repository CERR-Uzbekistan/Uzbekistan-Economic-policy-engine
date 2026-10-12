"""Immutable review identity, exact verification binding and promotion planning only."""
import argparse
from datetime import datetime, timezone
import hashlib
import json
import os
from pathlib import Path
import re
import subprocess

IDENTITY = "release-identity.json"
VERIFICATION = "release-verification.json"
REQUIRED_CHECKS = {"direct_http", "browser_routes", "scenario_save_reload_export", "served_identity"}


class ReleaseError(ValueError):
    pass


def canonical(value):
    return json.dumps(value, sort_keys=True, separators=(",", ":"), ensure_ascii=False).encode()


def sha(body):
    return hashlib.sha256(body).hexdigest()


def load(path):
    return json.loads(Path(path).read_text(encoding="utf-8"))


def read_public(site, name):
    parts = name.split("/")
    if not name or "\\" in name or ":" in name or any(part in ("", ".", "..") for part in parts):
        raise ReleaseError("invalid_release_path")
    path = Path(site) / name
    for candidate in [path, *path.parents]:
        if candidate.is_symlink() or (hasattr(candidate, "is_junction") and candidate.is_junction()):
            raise ReleaseError("release_symlink_rejected")
    return path.read_bytes()


def core_identity(site):
    manifest_bytes = read_public(site, "publication-manifest.json")
    manifest = json.loads(manifest_bytes)
    if manifest.get("schema_version") != "publication-manifest-v1":
        raise ReleaseError("publication_manifest_incompatible")
    names = [entry["path"] for entry in manifest["files"]]
    if len(names) != len(set(names)):
        raise ReleaseError("duplicate_release_path")
    for entry in manifest["files"]:
        body = read_public(site, entry["path"])
        if sha(body) != entry["sha256"] or len(body) != entry["bytes"]:
            raise ReleaseError("release_content_mismatch")
    data = {}
    for name in names:
        if name.startswith("policy-ui/data/") and name.endswith(".json"):
            body = read_public(site, name)
            value = json.loads(body)
            vintages = {}
            vintage_keys = {"data_version", "source_vintage", "exported_at", "base_year", "source_year", "generated_at", "extracted_at", "observed_at", "source_period", "timestamp"}
            def collect(node, pointer=""):
                if isinstance(node, dict):
                    for key, item in node.items():
                        child = pointer + "/" + key.replace("~", "~0").replace("/", "~1")
                        if key in vintage_keys and isinstance(item, (str, int, float)):
                            vintages[child] = item
                        elif isinstance(item, (dict, list)):
                            collect(item, child)
                elif isinstance(node, list):
                    for index, item in enumerate(node):
                        collect(item, pointer + "/" + str(index))
            collect(value)
            data[name] = {"sha256": sha(body), "vintages": vintages}
    model_manifest = json.loads(read_public(site, "policy-ui/data/model-manifest.json"))
    return {"model_manifest_identity": {"schema_version": model_manifest.get("schema_version"), "policy_version": model_manifest.get("policy_version")},
            "publication_manifest_sha256": sha(manifest_bytes),
            "model_manifest_sha256": sha(read_public(site, "policy-ui/data/model-manifest.json")),
            "data": data}


def seal(site, build_configuration, *, source_branch, channel="preview", expected_data=None):
    site = Path(site)
    if (site / IDENTITY).exists() or (site / VERIFICATION).exists():
        raise ReleaseError("release_already_sealed")
    configuration = load(build_configuration)
    allowed_configuration = {"schema_version", "commit", "source_state", "source_tree_identity", "base", "node_version", "dependency_lock_sha256", "code_identity", "scenario_mode", "policy_chat_enabled", "environment_identity"}
    if not isinstance(configuration, dict) or not set(configuration) <= allowed_configuration:
        raise ReleaseError("unsafe_build_configuration")
    if configuration.get("schema_version") != "policy-ui-build-v1" or not re.fullmatch(r"[a-f0-9]{40}", configuration.get("commit", "")):
        raise ReleaseError("build_identity_unavailable")
    manifest = load(site / "publication-manifest.json")
    if configuration.get("base") != manifest["policy_ui_base"]:
        raise ReleaseError("build_configuration_mismatch")
    if channel not in ("preview", "production-candidate"):
        raise ReleaseError("invalid_release_channel")
    if channel == "production-candidate":
        if source_branch != "main" or os.getenv("GITHUB_REF_NAME") != "main" or os.getenv("GITHUB_EVENT_NAME") == "pull_request" or configuration.get("source_state") != "clean":
            raise ReleaseError("nonproduction_cannot_target_production")
        subprocess.run(["git", "merge-base", "--is-ancestor", configuration["commit"], "origin/main"], check=True, capture_output=True)
    payload = {"schema_version": "review-release-v1", "commit": configuration["commit"],
               "source_branch": source_branch, "channel": channel, "build_configuration": configuration,
               "build_configuration_sha256": sha(canonical(configuration)),
               "verifier_sha256": sha(Path(__file__).with_name("verify-release.mjs").read_bytes()),
               **core_identity(site)}
    for name, expected_hash in (expected_data or {}).items():
        if payload["data"].get(name, {}).get("sha256") != expected_hash:
            raise ReleaseError("regenerated_data_hash_mismatch")
    identity = {"release_id": "sha256:" + sha(canonical(payload)), **payload}
    (site / IDENTITY).write_text(json.dumps(identity, indent=2) + "\n", encoding="utf-8")
    return identity


def verify_identity(site):
    identity = load(Path(site) / IDENTITY)
    payload = {key: value for key, value in identity.items() if key != "release_id"}
    if identity.get("schema_version") != "review-release-v1" or identity.get("release_id") != "sha256:" + sha(canonical(payload)):
        raise ReleaseError("release_identity_mismatch")
    core = core_identity(site)
    if any(identity.get(key) != value for key, value in core.items()):
        raise ReleaseError("release_identity_content_mismatch")
    manifest = load(Path(site) / "publication-manifest.json")
    expected = {row["path"] for row in manifest["files"]} | {"publication-manifest.json", IDENTITY}
    if (Path(site) / VERIFICATION).exists():
        expected.add(VERIFICATION)
    actual = set()
    for path in Path(site).rglob("*"):
        if path.is_symlink() or (hasattr(path, "is_junction") and path.is_junction()):
            raise ReleaseError("release_symlink_rejected")
        if path.is_file():
            actual.add(path.relative_to(site).as_posix())
    if actual != expected:
        raise ReleaseError("release_unexpected_paths")
    return identity


def record_verification(site, evidence):
    identity = verify_identity(site)
    evidence = load(evidence)
    if evidence.get("release_id") != identity["release_id"] or evidence.get("publication_manifest_sha256") != identity["publication_manifest_sha256"]:
        raise ReleaseError("verification_identity_mismatch")
    if evidence.get("verifier_sha256") != identity.get("verifier_sha256"):
        raise ReleaseError("verification_implementation_mismatch")
    checks = evidence.get("checks", {})
    passed = set(checks) == REQUIRED_CHECKS and all(value is True for value in checks.values())
    report = {"schema_version": "release-verification-v1", "release_id": identity["release_id"],
              "publication_manifest_sha256": identity["publication_manifest_sha256"],
              "identity_sha256": sha(read_public(site, IDENTITY)), "verifier_sha256": evidence["verifier_sha256"], "checks": checks,
              "status": "verified" if passed else "unverified", "verified_at": datetime.now(timezone.utc).isoformat(),
              "workflow_run_id": os.getenv("GITHUB_RUN_ID"), "verifier_version": "exact-artifact-smoke-v1",
              "reasons": evidence.get("reasons", [])}
    path = Path(site) / VERIFICATION
    if path.exists():
        raise ReleaseError("verification_already_recorded")
    path.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    if not passed:
        raise ReleaseError("functional_verification_failed")
    return report


def require_verified(site):
    identity = verify_identity(site)
    report = load(Path(site) / VERIFICATION)
    if (report.get("status") != "verified" or report.get("release_id") != identity["release_id"]
            or report.get("publication_manifest_sha256") != identity["publication_manifest_sha256"]
            or report.get("verifier_sha256") != identity.get("verifier_sha256")
            or report.get("identity_sha256") != sha(read_public(site, IDENTITY))
            or set(report.get("checks", {})) != REQUIRED_CHECKS
            or not all(value is True for value in report["checks"].values())):
        raise ReleaseError("release_not_verified")
    return identity


def selection_plan(site, target, *, approval=None, rollback=False):
    identity = require_verified(site)
    if target not in ("preview", "production"):
        raise ReleaseError("invalid_promotion_target")
    if target == "production" and (identity["channel"] != "production-candidate" or identity["source_branch"] != "main" or identity["build_configuration"]["source_state"] != "clean"):
        raise ReleaseError("nonproduction_cannot_target_production")
    if not approval or approval.get("release_id") != identity["release_id"] or approval.get("target") != target or not approval.get("approver_identity"):
        raise ReleaseError("manual_release_approval_required")
    return {"action": "rollback-selection" if rollback else "promotion-selection", "release_id": identity["release_id"],
            "target": target, "publication_enabled": False, "requires_fresh_served_verification": True}


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("command", choices=("seal", "verify", "record", "select"))
    parser.add_argument("--site", type=Path, required=True)
    parser.add_argument("--build-configuration", type=Path)
    parser.add_argument("--source-branch", default="unknown")
    parser.add_argument("--channel", default="preview")
    parser.add_argument("--evidence", type=Path)
    parser.add_argument("--target", default="preview")
    parser.add_argument("--approval", type=Path)
    parser.add_argument("--rollback", action="store_true")
    args = parser.parse_args()
    try:
        if args.command == "seal":
            result = seal(args.site, args.build_configuration, source_branch=args.source_branch, channel=args.channel,
                          expected_data=json.loads(os.getenv("EXPECTED_DATA_HASHES", "{}")))
        elif args.command == "record":
            result = record_verification(args.site, args.evidence)
        elif args.command == "select":
            result = selection_plan(args.site, args.target, approval=load(args.approval) if args.approval else None, rollback=args.rollback)
        else:
            result = require_verified(args.site)
        print(json.dumps(result))
    except ReleaseError as error:
        print(json.dumps({"status": "unverified", "reason": str(error)}))
        raise SystemExit(1) from None
    except (OSError, ValueError, subprocess.CalledProcessError):
        print("FAIL release identity, prerequisites or exact verification were not satisfied")
        raise SystemExit(1) from None


if __name__ == "__main__":
    main()
