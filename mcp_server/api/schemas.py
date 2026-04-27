"""Pydantic response schemas for the read-only registry API."""

from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, ConfigDict


class RegistryCaveatResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    id: str | None
    severity: str
    message: str | None
    source: str | None


class RegistryArtifactResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    id: Literal["qpm", "dfm", "io"]
    model_family: str
    artifact_path: str
    source_artifact: str | None
    source_vintage: str | None
    data_vintage: str | None
    exported_at: str | None
    generated_at: str | None
    checksum: str
    guard_status: Literal["valid", "warning", "failed"]
    guard_checks: list[str]
    caveats: list[RegistryCaveatResponse]
    warnings: list[RegistryCaveatResponse]


class RegistryArtifactsResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    api_version: Literal["v1"]
    source: Literal["frontend_public_artifacts"]
    artifacts: list[RegistryArtifactResponse]
