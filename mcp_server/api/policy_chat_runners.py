"""Allowlisted adapters from Policy Chat proposals to production model code."""

from __future__ import annotations

import json
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Protocol

from fastapi import HTTPException

from helpers.validation import validate_qpm_params
from models.dfm import run_nowcast
from models.io_model import run_demand_shock
from models.qpm import solve_irf


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

    def __init__(self, data_dir: Path) -> None:
        self.data_dir = data_dir
        self._data_cache: dict[str, dict[str, Any]] = {}

    def _load(self, name: str) -> dict[str, Any]:
        if name not in self._data_cache:
            path = self.data_dir / f"{name}_data.json"
            if not path.exists():
                raise HTTPException(
                    status_code=503,
                    detail={"code": "model_data_unavailable", "model_id": name},
                )
            with path.open(encoding="utf-8") as handle:
                self._data_cache[name] = json.load(handle)
        return self._data_cache[name]

    def run(self, model_id: str, values: dict[str, Any]) -> ModelRun:
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
            return ModelRun(
                result=result,
                module="models.qpm.solve_irf",
                data_version="qpm-calibration-v1",
            )

        if model_id == "dfm":
            result = run_nowcast(self._load("dfm"))
            version = result["model_status"].get("last_data_date") or "dfm-approved-artifact"
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
                self._load("io"),
                **args,
                distribution=str(values["distribution"]),
                sector_code=None if sector == "all_sectors" else sector,
            )
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
