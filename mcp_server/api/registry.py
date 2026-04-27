"""Read-only artifact registry metadata loader."""

from __future__ import annotations

import hashlib
import json
from dataclasses import dataclass
from pathlib import Path
from typing import Any

from .schemas import RegistryArtifactResponse, RegistryArtifactsResponse


REPO_ROOT = Path(__file__).resolve().parents[2]
PUBLIC_DATA_DIR = REPO_ROOT / "apps" / "policy-ui" / "public" / "data"


@dataclass(frozen=True)
class ArtifactSource:
    artifact_id: str
    model_family: str
    artifact_path: str
    file_path: Path


class RegistryArtifactLoadError(RuntimeError):
    """Raised when a public artifact cannot be loaded into registry metadata."""

    def __init__(self, artifact_id: str, message: str) -> None:
        super().__init__(message)
        self.artifact_id = artifact_id


ARTIFACT_SOURCES: tuple[ArtifactSource, ...] = (
    ArtifactSource("qpm", "QPM", "/data/qpm.json", PUBLIC_DATA_DIR / "qpm.json"),
    ArtifactSource("dfm", "DFM", "/data/dfm.json", PUBLIC_DATA_DIR / "dfm.json"),
    ArtifactSource("io", "I-O", "/data/io.json", PUBLIC_DATA_DIR / "io.json"),
)


def checksum_file(path: Path) -> str:
    """Return a deterministic SHA-256 checksum for an artifact payload."""

    digest = hashlib.sha256()
    with path.open("rb") as file:
        for chunk in iter(lambda: file.read(1024 * 1024), b""):
            digest.update(chunk)
    return f"sha256:{digest.hexdigest()}"


def load_registry_artifacts(
    sources: tuple[ArtifactSource, ...] | None = None,
) -> list[RegistryArtifactResponse]:
    """Load metadata records from existing frontend public artifacts."""

    if sources is None:
        sources = ARTIFACT_SOURCES
    return [load_registry_artifact(source) for source in sources]


def load_registry_artifact(source: ArtifactSource) -> RegistryArtifactResponse:
    try:
        raw_payload = source.file_path.read_text(encoding="utf-8")
    except FileNotFoundError as error:
        raise RegistryArtifactLoadError(
            source.artifact_id,
            f"Registry artifact {source.artifact_id} is missing at {source.artifact_path}.",
        ) from error

    try:
        payload = json.loads(raw_payload)
    except json.JSONDecodeError as error:
        raise RegistryArtifactLoadError(
            source.artifact_id,
            f"Registry artifact {source.artifact_id} contains invalid JSON.",
        ) from error

    attribution = payload.get("attribution") if isinstance(payload, dict) else {}
    metadata = payload.get("metadata") if isinstance(payload, dict) else {}
    caveats = payload.get("caveats") if isinstance(payload, dict) else []

    if not isinstance(attribution, dict):
        attribution = {}
    if not isinstance(metadata, dict):
        metadata = {}
    if not isinstance(caveats, list):
        caveats = []

    normalized_caveats = [_normalize_caveat(caveat) for caveat in caveats if isinstance(caveat, dict)]
    warnings = [
        caveat
        for caveat in normalized_caveats
        if caveat["severity"] in {"warning", "critical"}
    ]

    return RegistryArtifactResponse(
        id=source.artifact_id,
        model_family=source.model_family,
        artifact_path=source.artifact_path,
        source_artifact=_source_artifact(source, metadata, attribution),
        source_vintage=_source_vintage(source.artifact_id, attribution, metadata),
        data_vintage=_string_or_none(attribution.get("data_version")),
        exported_at=_string_or_none(metadata.get("exported_at")),
        generated_at=_generated_at(attribution, metadata),
        checksum=checksum_file(source.file_path),
        guard_status="warning" if warnings else "valid",
        guard_checks=["json_parse", "metadata_extract"],
        caveats=normalized_caveats,
        warnings=warnings,
    )


def build_registry_response() -> RegistryArtifactsResponse:
    return RegistryArtifactsResponse(
        api_version="v1",
        source="frontend_public_artifacts",
        artifacts=load_registry_artifacts(),
    )


def _normalize_caveat(caveat: dict[str, Any]) -> dict[str, str | None]:
    return {
        "id": _string_or_none(caveat.get("caveat_id")),
        "severity": _string_or_none(caveat.get("severity")) or "info",
        "message": _string_or_none(caveat.get("message")),
        "source": _string_or_none(caveat.get("source")),
    }


def _source_artifact(
    source: ArtifactSource,
    metadata: dict[str, Any],
    attribution: dict[str, Any],
) -> str | None:
    if "source_artifact" in metadata:
        return _string_or_none(metadata.get("source_artifact"))
    return _string_or_none(attribution.get("module")) or source.artifact_path


def _source_vintage(
    artifact_id: str,
    attribution: dict[str, Any],
    metadata: dict[str, Any],
) -> str | None:
    if artifact_id == "dfm":
        return _string_or_none(metadata.get("source_artifact_exported_at")) or _string_or_none(
            attribution.get("data_version")
        )
    if artifact_id == "io" and "base_year" in metadata:
        return f"Base-year vintage {metadata['base_year']}"
    return _string_or_none(attribution.get("data_version"))


def _generated_at(attribution: dict[str, Any], metadata: dict[str, Any]) -> str | None:
    return (
        _string_or_none(metadata.get("source_artifact_generated"))
        or _string_or_none(attribution.get("timestamp"))
        or _string_or_none(metadata.get("exported_at"))
    )


def _string_or_none(value: Any) -> str | None:
    if value is None:
        return None
    return str(value)
