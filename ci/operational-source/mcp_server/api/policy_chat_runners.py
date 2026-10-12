"""Allowlisted, qualified diagnostic adapters for internal Policy Chat."""

from __future__ import annotations

import copy
import json
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Protocol

from fastapi import HTTPException
from .policy_chat_readiness import validate_manifest, validate_artifact, unavailable, DependencyInvalid

from helpers.validation import validate_qpm_params
from models.dfm import run_nowcast
from models.io_model import run_demand_shock
from models.qpm import solve_irf
from models.readiness import load_manifest, require_ready, assess_readiness, validate_model_inputs, ModelReadinessError
from models.fpp import FppInputError, validate_fpp_request


ALLOWED_QPM_SHOCKS = {
    "demand",
    "inflation",
    "exchange",
    "monetary",
    "risk",
    "external_demand",
}


@dataclass(frozen=True)
class ModelRun:
    result: dict[str, Any]
    module: str
    data_version: str


class PolicyModelRunner(Protocol):
    def run(self, model_id: str, values: dict[str, Any]) -> ModelRun: ...


class EngineModelRunner:
    """Validated boundary around the engine's checked-in QPM, DFM, and I-O APIs."""

    def __init__(self, data_dir: Path, *, clock=None) -> None:
        self.data_dir = data_dir
        self.clock = clock
        from models.readiness import ROOT
        import hashlib
        paths = ["mcp_server/api/policy_chat.py", "mcp_server/api/policy_chat_runners.py",
                 "mcp_server/api/policy_chat_readiness.py", "mcp_server/api/run_envelope.py",
                 "mcp_server/models/readiness.py", "mcp_server/helpers/validation.py",
                 "mcp_server/models/qpm.py", "mcp_server/models/dfm.py", "mcp_server/models/io_model.py"]
        self.loaded_code_identity = {path: "sha256:" + hashlib.sha256((ROOT/path).read_bytes()).hexdigest() for path in paths}

    def prepare_execution(self, model_id):
        """Freeze the declared manifest and actual data consumed by this execution."""
        from models.readiness import ROOT
        from .policy_chat_store import execution_fingerprint
        try:
            manifest = validate_manifest(getattr(self, "_execution_manifest", None) or load_manifest())
        except (OSError, ValueError, TypeError) as error:
            raise HTTPException(503, detail={"code": "manifest_unavailable_or_incompatible"}) from error
        variant_id = manifest["routes"].get(f"policy-chat:{model_id}", "unknown")
        variant = next((v for v in manifest["variants"] if v["id"] == variant_id), None)
        if variant is None:
            raise HTTPException(503, detail={"code": "model_not_ready"})
        artifacts = {}
        for artifact in variant["artifacts"]:
            try:
                value = self._load(model_id) if model_id in ("dfm", "io") else json.loads(
                    (ROOT / artifact["path"]).read_text(encoding="utf-8-sig"))
            except (OSError, ValueError, HTTPException):
                value = None
            artifacts[artifact["path"]] = value
        prepared = copy.copy(self)
        prepared._execution_manifest = copy.deepcopy(manifest)
        prepared._execution_data = copy.deepcopy(artifacts)
        context = {"variant": variant_id, "version": variant["calibration_version"],
                   "manifest_identity": execution_fingerprint(manifest),
                   "source_data_identity": {path: execution_fingerprint(value)
                                            for path, value in artifacts.items()},
                   "source_vintage": variant.get("source_vintage")}
        from .policy_chat_store import EXECUTION_CONTRACT_VERSION
        model_file = {"qpm": "qpm.py", "dfm": "dfm.py", "io": "io_model.py"}.get(model_id)
        files = ["mcp_server/api/policy_chat.py", "mcp_server/api/policy_chat_runners.py",
                 "mcp_server/api/policy_chat_readiness.py", "mcp_server/api/run_envelope.py",
                 "mcp_server/models/readiness.py", "mcp_server/helpers/validation.py"]
        if model_file:
            files.append("mcp_server/models/" + model_file)
        import hashlib
        identities = {path: "sha256:" + hashlib.sha256((ROOT / path).read_bytes()).hexdigest() for path in files}
        import platform
        import numpy as np
        context.update({"runtime_identity": {"python": platform.python_version(), "numpy": np.__version__},
            "loaded_code_identity": {path: self.loaded_code_identity[path] for path in files},
            "code_identity": identities, "execution_contract_version": EXECUTION_CONTRACT_VERSION,
            "solver_version": variant.get("calibration_version"),
            "baseline": {"kind": "steady-state-deviation" if model_id == "qpm" else "artifact-state",
                         "identity": execution_fingerprint(context["source_data_identity"])},
            "units": variant["units"], "periods": variant["period"], "aggregation": variant["allocation"]})
        return context, prepared

    def authorize_execution(self, model_id):
        assessment = self.readiness(model_id)
        if assessment["status"] == "blocked":
            raise HTTPException(503, detail={"code": "model_not_ready", "readiness": assessment})

    def run_variant(self, variant_id: str, inputs: dict[str, Any], *, intent: str = "authoritative") -> ModelRun:
        from models.execution import execute_variant
        try:
            result = execute_variant(variant_id, inputs, intent=intent)
        except FppInputError as error:
            raise HTTPException(status_code=422, detail=error.response()) from error
        except ModelReadinessError as error:
            if error.assessment["status"] == "qualified":
                return ModelRun({"status": "unavailable", "totals": None, "response_contract": error.assessment.get("response_contract"), "model_readiness": error.assessment, "reasons": error.assessment["reasons"]}, "models.execution.execute_variant", "pe-wits-smart-public-bridge-v2")
            raise HTTPException(status_code=503, detail={"code": "model_not_ready", "readiness": error.assessment}) from error
        except (ValueError, TypeError, KeyError) as error:
            raise HTTPException(status_code=422, detail={"code": "input_contract_incompatible", "variant": variant_id, "reasons": [{"code": "input_contract_incompatible", "message": str(error), "blocking": True, "path": "inputs"}]}) from error
        return ModelRun(result, "models.execution.execute_variant", result["model_readiness"]["calibration_version"])

    def _load(self, name: str) -> dict[str, Any]:
        if hasattr(self, "_execution_data"):
            values = list(self._execution_data.values())
            if values and values[0] is not None:
                return copy.deepcopy(values[0])
            raise HTTPException(503, detail={"code": "model_data_unavailable", "model_id": name})
        path = self.data_dir / f"{name}_data.json"
        if not path.exists():
            raise HTTPException(status_code=503, detail={"code": "model_data_unavailable", "model_id": name})
        return json.loads(path.read_text(encoding="utf-8-sig"))

    def readiness(self, model_id: str):
        from models.readiness import ROOT
        try:
            manifest = validate_manifest(getattr(self, "_execution_manifest", None) or load_manifest())
        except (OSError, ValueError, TypeError):
            return unavailable("manifest_unavailable_or_incompatible")
        variant_id = manifest["routes"].get(f"policy-chat:{model_id}", "unknown")
        variant = next((v for v in manifest["variants"] if v["id"] == variant_id), None)
        if variant is None:
            return unavailable("unknown_variant", variant_id)
        supplied = copy.deepcopy(getattr(self, "_execution_data", None))
        extra = []
        import hashlib
        for path, loaded_hash in self.loaded_code_identity.items():
            try:
                if "sha256:" + hashlib.sha256((ROOT/path).read_bytes()).hexdigest() != loaded_hash:
                    extra.append("model_code_reload_required")
            except OSError:
                extra.append("model_code_reload_required")
        if supplied is None:
            supplied = {}
            for artifact in variant["artifacts"]:
                try:
                    supplied[artifact["path"]] = self._load(model_id) if model_id in ("dfm", "io") else json.loads(
                        (ROOT / artifact["path"]).read_text(encoding="utf-8-sig"))
                except json.JSONDecodeError:
                    supplied[artifact["path"]] = None
                    extra.append("artifact_corrupt")
                except (OSError, ValueError, HTTPException):
                    supplied[artifact["path"]] = None
        if model_id not in ("qpm", "dfm", "io"):
            extra.append("operation_not_exposed")
        if variant["model"] != model_id:
            extra.append("operation_variant_incompatible")
        exposed_variants = {"qpm": "qpm-core-irf-v0.3", "dfm": "dfm-legacy-state-v0",
                            "io": "io-legacy-output-v0"}
        if model_id in exposed_variants and variant_id != exposed_variants[model_id]:
            extra.append("operation_variant_not_supported")
        for value in supplied.values():
            if value is None:
                continue
            try:
                validate_artifact(model_id, value)
            except DependencyInvalid:
                extra.append("artifact_schema_incompatible")
        try:
            assessment = assess_readiness(variant_id, intent="diagnostic", manifest=manifest,
                artifacts=supplied, now=self.clock() if self.clock else None)
        except (KeyError, TypeError, ValueError, OverflowError):
            return unavailable("manifest_schema_incompatible", variant_id)
        assessment["reasons"].extend({"code": code, "message": "Operation dependency is incompatible.",
            "blocking": True} for code in sorted(set(extra)))
        if extra:
            assessment["status"] = "blocked"
        dependency_reasons = [reason for reason in assessment["reasons"] if reason["blocking"]
                              and reason["code"] not in {"approval_missing", "approval_record_missing", "diagnostic_not_released"}]
        assessment["operational_availability"] = "unavailable" if dependency_reasons else "available"
        assessment["qualification"] = "qualified_diagnostic" if assessment["status"] == "qualified" else "blocked"
        assessment["approval"] = copy.deepcopy(variant["approval"])
        return assessment

    def run(self, model_id: str, values: dict[str, Any]) -> ModelRun:
        if model_id == "fpp":
            try:
                validate_fpp_request(values)
            except FppInputError as error:
                raise HTTPException(status_code=422, detail=error.response()) from error
        self.authorize_execution(model_id)
        manifest = getattr(self, "_execution_manifest", None) or load_manifest()
        variant_id = manifest["routes"].get(f"policy-chat:{model_id}", "unknown")
        data = None
        supplied = getattr(self, "_execution_data", None)
        if model_id in ("dfm", "io"):
            try:
                data = self._load(model_id)
            except (HTTPException, ValueError) as error:
                raise HTTPException(status_code=503, detail={"code": "model_not_ready", "readiness": self.readiness(model_id)}) from error
            variant = next(v for v in manifest["variants"] if v["id"] == variant_id)
            supplied = {variant["artifacts"][0]["path"]: data}
        try:
            assessment = require_ready(variant_id, intent="diagnostic", manifest=manifest, artifacts=supplied,
                                       now=self.clock() if self.clock else None)
            validate_model_inputs(variant_id, values, assessment)
        except ModelReadinessError as error:
            raise HTTPException(status_code=503, detail={"code": "model_not_ready", "readiness": error.assessment}) from error
        if model_id == "qpm":
            shock = str(values["shock_type"])
            if shock not in ALLOWED_QPM_SHOCKS:
                raise HTTPException(
                    status_code=422,
                    detail={"code": "operation_not_allowed"},
                )
            result = solve_irf(
                validate_qpm_params({}),
                shock,
                float(values["shock_size"]),
                int(values["horizon"]),
            )
            result["model_readiness"] = assessment
            return ModelRun(
                result=result,
                module="models.qpm.solve_irf",
                data_version=assessment["calibration_version"],
            )

        if model_id == "dfm":
            result = run_nowcast(data)
            result["model_readiness"] = assessment
            version = result["model_status"].get("last_data_date") or "dfm-legacy-unknown-vintage"
            return ModelRun(
                result=result,
                module="models.dfm.run_nowcast",
                data_version=str(version),
            )

        if model_id == "io":
            args = {
                "consumption": 0.0,
                "government": 0.0,
                "investment": 0.0,
                "exports": 0.0,
            }
            bucket = str(values["demand_bucket"])
            if bucket not in args:
                raise HTTPException(
                    status_code=422,
                    detail={"code": "operation_not_allowed"},
                )
            args[bucket] = float(values["amount_bln_uzs"])
            sector = str(values["sector_code"])
            result = run_demand_shock(
                data,
                **args,
                distribution=str(values["distribution"]),
                sector_code=None if sector == "all_sectors" else sector,
            )
            result["model_readiness"] = assessment
            if "error" in result:
                raise HTTPException(
                    status_code=422,
                    detail={"code": "invalid_sector", "message": result["error"]},
                )
            return ModelRun(
                result=result,
                module="models.io_model.run_demand_shock",
                data_version="io-2022",
            )

        raise HTTPException(
            status_code=422,
            detail={"code": "operation_not_allowed"},
        )
