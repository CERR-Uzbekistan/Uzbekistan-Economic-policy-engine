"""PE response v2: *_usd is actual USD; filters are explicit approximations."""
from .readiness import ModelReadinessError, load_manifest

VARIANT = "pe-share-scaled-usd-v2"


def response_contract(payload):
    metadata = payload["metadata"]
    variant = next(v for v in load_manifest()["variants"] if v["id"] == VARIANT)
    return {"version": "pe-response-v2", "variant_id": VARIANT,
            "currency": "USD", "scale": 1, "source_scale": 1000,
            "source_vintage": payload["attribution"]["data_version"],
            "source_artifact_generated": metadata["source_artifact_generated"],
            "tariff_change_kind": "relative_percent_reduction",
            "method": "share_scaled_approximation",
            "qualification": ["Qualified diagnostic; not an approved forecast or policy estimate.", f"Declared variant: {VARIANT}."] + variant["disclosures"] + [c["message"] for c in payload["caveats"]]}


def filter_share(payload, inputs):
    def fail(code, path, message, unavailable=False):
        raise ModelReadinessError({"variant": VARIANT, "intent": "diagnostic",
            "response_contract": response_contract(payload),
            "status": "qualified" if unavailable else "blocked",
            "disclosures": response_contract(payload)["qualification"],
            "reasons": [{"code": code, "path": path, "message": message, "blocking": not unavailable}]})
    monetary = payload.get("metadata", {}).get("monetary", {})
    if payload["metadata"].get("contract_version") != "pe-response-v2" or monetary.get("currency") != "USD" or monetary.get("scale") != 1 or monetary.get("conversion_applied") is not True:
        fail("monetary_contract_incompatible", "metadata.monetary", "Expected already converted actual USD; do not convert again.")
    section = inputs.get("section_id", "all")
    country = inputs.get("partner_name", "all")
    regime = inputs.get("regime", "all").strip().lower()
    if section != "all" and not any(s["id"] == section for s in payload["sections"]):
        fail("filter_unknown", "section_id", "Unknown PE section.")
    if regime != "all" and regime not in payload["regimes"]:
        fail("filter_unknown", "regime", "Unknown PE regime.")
    partner = next((p for p in payload["partners"] if p["name"] == country), None)
    if country != "all" and partner is None:
        fail("filter_unknown", "partner_name", "Unknown PE country.")
    if partner and regime != "all" and partner["regime"].strip().lower() != regime:
        fail("filter_incompatible", "regime", "Selected country does not belong to selected regime.")
    if partner:
        return partner["import_share"]
    if regime != "all":
        evidence = payload["metadata"].get("regime_share_evidence")
        shares = (evidence or {}).get("shares", {})
        if regime not in shares:
            fail("regime_share_unavailable", "metadata.regime_share_evidence", "Qualified unavailable: accepted regime-share evidence is missing.", True)
        return shares[regime]
    return 1
