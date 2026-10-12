"""Execution readiness shared with the UI through one checked-in manifest.

Numerical kernels remain callable for research tests. Public routes must call
require_ready before a kernel; successful diagnostics carry this assessment.
"""
from __future__ import annotations

import hashlib
import json
import struct
import math
import inspect
from datetime import datetime, timezone
from functools import wraps
from contextvars import ContextVar
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
MANIFEST_PATH = ROOT / "apps/policy-ui/public/data/model-manifest.json"
_execution_artifacts = ContextVar("model_execution_artifacts", default={})


def load_manifest():
    return json.loads(MANIFEST_PATH.read_text(encoding="utf-8"))


def canonical(value):
    if value is None:
        return "null"
    if isinstance(value, bool):
        return "true" if value else "false"
    if isinstance(value, (int, float)):
        return "n" + struct.pack(">d", value).hex()
    if isinstance(value, str):
        return json.dumps(value, ensure_ascii=False, separators=(",", ":"))
    if isinstance(value, list):
        return "[" + ",".join(map(canonical, value)) + "]"
    return "{" + ",".join(canonical(k) + ":" + canonical(value[k]) for k in sorted(value) if not k.startswith("_")) + "}"


def semantic_hash(value):
    return hashlib.sha256(canonical(value).encode()).hexdigest()


def get_path(value, path):
    for key in path.split("."):
        value = value.get(key) if isinstance(value, dict) else None
    return value


def assess_readiness(variant_id, *, intent="authoritative", now=None, artifacts=None, manifest=None):
    manifest = manifest or load_manifest()
    now = now or datetime.now(timezone.utc)
    variants = {v["id"]: v for v in manifest["variants"]}
    variant = variants.get(variant_id)
    reasons = []

    def reason(code, message, blocking=True, path=None):
        reasons.append({"code": code, "message": message, "blocking": blocking, "path": path})

    if intent not in ("authoritative", "diagnostic"):
        reason("invalid_intent", "Execution intent must be authoritative or diagnostic.")
    if manifest.get("schema_version") != "1.0":
        reason("manifest_schema_incompatible", "Unsupported model manifest schema.")
    if variant is None:
        reason("unknown_variant", f"Undeclared variant: {variant_id}")
        return {"variant": variant_id, "intent": intent, "status": "blocked", "reasons": reasons, "disclosures": []}
    approval = variant["approval"]
    if intent == "authoritative" and not approval["authoritative"]:
        reason("approval_missing", "This exact variant has no model-owner approval for authoritative use.")
    if intent == "authoritative" and approval["authoritative"] and not approval.get("signed_record"):
        reason("approval_record_missing", "An approval flag alone is not a signed approval record.")
    if intent == "diagnostic":
        if not approval["diagnostic"]:
            reason("diagnostic_not_released", "Research/unsupported variant is not released on execution routes.")
        reason("diagnostic_only", "Qualified diagnostic; not an approved forecast or policy estimate.", False)
    loaded = []
    for artifact in variant["artifacts"]:
        path = artifact["path"]
        try:
            value = artifacts[path] if artifacts is not None else json.loads((ROOT / path).read_text(encoding="utf-8-sig"))
            if value is None:
                raise ValueError("Missing artifact")
        except (KeyError, OSError, ValueError):
            reason("artifact_missing", "Required artifact is missing or invalid JSON.", path=path)
            continue
        loaded.append(value)
        if semantic_hash(value) != artifact["semantic_sha256"]:
            reason("artifact_hash_mismatch", "Artifact differs from the frozen declared calibration/vintage.", path=path)
    payload = loaded[0] if loaded else {}
    for requirement in variant["freshness"]:
        if requirement.get("kind") == "overview":
            # UI validates the shared fetched Overview. Python has no equivalent
            # fetched snapshot here, so level paths are explicit fallback diagnostics.
            reason("overview_snapshot_required", "No shared fetched Overview snapshot supplied; deterministic judgment baseline only.", intent == "authoritative")
            continue
        path = requirement["path"]
        value = get_path(payload, path)
        if requirement.get("current_quarter"):
            expected = f"{now.year}Q{(now.month - 1) // 3 + 1}"
            if str(value).upper().replace(" ", "") != expected:
                reason("period_mismatch", f"Published quarter does not match {expected}.", path=path)
        else:
            try:
                timestamp = datetime.fromisoformat(str(value).replace("Z", "+00:00"))
                if timestamp.tzinfo is None:
                    timestamp = timestamp.replace(tzinfo=timezone.utc)
                age = (now - timestamp).total_seconds() / 86400
                if age < 0:
                    reason("source_date_future", "Source date is in the future.", path=path)
                elif age > requirement["max_age_days"]:
                    reason("source_stale", f"Source exceeds {requirement['max_age_days']} day limit.", path=path)
            except (ValueError, TypeError):
                reason("source_date_invalid", "Source date is missing or invalid.", path=path)
    return {"variant": variant_id, "intent": intent,
            "status": "blocked" if any(r["blocking"] for r in reasons) else "qualified" if intent == "diagnostic" else "ready",
            "policy_version": manifest["policy_version"], "calibration_version": variant["calibration_version"],
            "artifacts": variant["artifacts"], "reasons": reasons, "disclosures": variant["disclosures"]}


class ModelReadinessError(ValueError):
    def __init__(self, assessment):
        super().__init__("Model execution blocked by readiness policy")
        self.assessment = assessment


def require_ready(variant_id, **kwargs):
    assessment = assess_readiness(variant_id, **kwargs)
    if assessment["status"] == "blocked":
        raise ModelReadinessError(assessment)
    return assessment


def validate_model_inputs(variant_id, inputs, assessment):
    variant = next(v for v in load_manifest()["variants"] if v["id"] == variant_id)
    reasons = []
    def scan(value, path):
        if isinstance(value, float) and not math.isfinite(value):
            reasons.append({"code": "input_contract_incompatible", "message": "Input must be finite.", "blocking": True, "path": path})
        elif isinstance(value, dict):
            for key, item in value.items():
                scan(item, path + "." + key)
        elif isinstance(value, list):
            for index, item in enumerate(value):
                scan(item, f"{path}[{index}]")
    scan(inputs, "inputs")
    for key, rule in variant.get("input_contract", {}).items():
        if key not in inputs or not isinstance(rule, dict):
            continue
        value = inputs[key]
        if rule.get("normalization") == "trim_lowercase" and isinstance(value, str):
            value = value.strip().lower()
        if isinstance(value, str):
            value = rule.get("aliases", {}).get(value, value)
        invalid = "enum" in rule and value not in rule["enum"]
        if "minimum" in rule or "maximum" in rule or rule.get("integer"):
            invalid = invalid or not isinstance(value, (int, float)) or isinstance(value, bool)
            if not invalid:
                invalid = value < rule.get("minimum", -math.inf) or value > rule.get("maximum", math.inf) or (rule.get("integer") and int(value) != value)
        if invalid:
            reasons.append({"code": "filter_unknown" if variant["model"] == "pe" and key in ("regime", "section_id", "hs_section", "country", "partner_name") else "input_contract_incompatible", "message": f"Input {key} violates the declared variant contract.", "blocking": True, "path": key})
    if variant["model"] == "qpm":
        core = next((a.get("embedded") for a in variant["artifacts"] if a.get("embedded")), None)
        if core:
            parameters = inputs.get("parameters", inputs)
            for key, rule in core["parameters"].items():
                if key not in parameters:
                    continue
                value = parameters[key]
                if not isinstance(value, (int, float)) or isinstance(value, bool) or not rule["minimum"] <= value <= rule["maximum"]:
                    reasons.append({"code": "input_contract_incompatible", "message": f"Calibration parameter {key} is outside its declared range.", "blocking": True, "path": key})
    if reasons:
        raise ModelReadinessError({**assessment, "status": "blocked", "reasons": assessment["reasons"] + reasons})


def guarded_tool(route, artifact_loader=None):
    """MCP's existing economic tools are expressly qualified diagnostics."""
    def decorate(function):
        @wraps(function)
        async def guarded(*args, **kwargs):
            manifest = load_manifest()
            if route == "mcp:fpp":
                from .fpp import FppInputError, validate_fpp_tool_call
                try:
                    validate_fpp_tool_call(function, args, kwargs)
                except FppInputError as error:
                    return {"error": error.response()}
            try:
                supplied = None
                if artifact_loader is not None:
                    variant = next(v for v in manifest["variants"] if v["id"] == manifest["routes"][route])
                    supplied = {}
                    for artifact in variant["artifacts"]:
                        path = artifact["path"]
                        try:
                            if path.startswith("mcp_server/data/"):
                                supplied[path] = artifact_loader()
                            else:
                                supplied[path] = json.loads((ROOT / path).read_text(encoding="utf-8-sig"))
                        except (OSError, ValueError):
                            # The common assessment reports the missing/invalid
                            # source instead of leaking an unstructured exception.
                            continue
                assessment = require_ready(manifest["routes"][route], intent="diagnostic", manifest=manifest, artifacts=supplied)
                bound = inspect.signature(function).bind(*args, **kwargs)
                bound.apply_defaults()
                validate_model_inputs(assessment["variant"], bound.arguments, assessment)
            except ModelReadinessError as error:
                return {"error": {"code": "model_not_ready", "readiness": error.assessment}}
            token = _execution_artifacts.set({route: next(iter((supplied or {}).values()), None)})
            try:
                result = await function(*args, **kwargs)
                return {**result, "model_readiness": assessment}
            except ModelReadinessError as error:
                combined = {**assessment, **error.assessment, "reasons": assessment["reasons"] + error.assessment["reasons"]}
                if error.assessment["status"] == "qualified":
                    return {"status": "unavailable", "totals": None, "response_contract": error.assessment.get("response_contract"), "model_readiness": combined, "reasons": error.assessment["reasons"]}
                return {"error": {"code": "model_not_ready", "readiness": combined}}
            finally:
                _execution_artifacts.reset(token)
        return guarded
    return decorate


def execution_artifact(route, loader):
    """Use the exact snapshot already checked by this execution's guard."""
    artifacts = _execution_artifacts.get()
    return artifacts[route] if route in artifacts else loader()
