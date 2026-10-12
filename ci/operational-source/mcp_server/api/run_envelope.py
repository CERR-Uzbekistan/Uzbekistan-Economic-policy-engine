"""Versioned provenance for new backend executions; legacy identity is never invented."""
from .policy_chat_store import execution_fingerprint

ENVELOPE_VERSION = "policy-run-envelope-v1"


def build_run_envelope(execution_id, started, completed, snapshot, result):
    readiness = result.get("model_readiness", {})
    return {"version": ENVELOPE_VERSION, "execution_id": execution_id, "execution_origin": "backend",
        "started_at": started, "completed_at": completed,
        "model_attribution_id": snapshot["variant"], "variant": snapshot["variant"], "calibration_version": snapshot["version"],
        "solver_version": snapshot["solver_version"], "code_identity": snapshot["code_identity"],
        "manifest_identity": snapshot["manifest_identity"], "runtime_identity": snapshot.get("runtime_identity"),
        "loaded_code_identity": snapshot.get("loaded_code_identity"),
        "artifact_hashes": snapshot["source_data_identity"], "source_vintage": snapshot.get("source_vintage"),
        "baseline": snapshot["baseline"], "inputs": snapshot["inputs"], "units": snapshot["units"],
        "periods": snapshot["periods"], "aggregation": snapshot["aggregation"],
        "status": "successful", "convergence": result.get("solver", {"status": "not_applicable"}),
        "qualification": {"status": "blocked" if readiness.get("status") == "blocked" else "qualified_diagnostic", "authoritative": False,
            "disclosures": readiness.get("disclosures", []), "reasons": readiness.get("reasons", [])},
        "snapshot_fingerprint": execution_fingerprint(snapshot), "outputs": result,
        "completeness": "recorded"}
