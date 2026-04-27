"""Tests for the read-only registry API v1."""

from __future__ import annotations

import hashlib
import sys
import unittest
from pathlib import Path
from unittest.mock import patch

from fastapi.testclient import TestClient

sys.path.insert(0, str(Path(__file__).parent.parent))

from api.app import app  # noqa: E402
from api.registry import (  # noqa: E402
    PUBLIC_DATA_DIR,
    ArtifactSource,
    RegistryArtifactLoadError,
    build_registry_response,
    checksum_file,
    load_registry_artifact,
    load_registry_artifacts,
)
from api.schemas import RegistryArtifactsResponse  # noqa: E402


class RegistryApiTests(unittest.TestCase):
    def test_seed_load_is_deterministic(self) -> None:
        first = load_registry_artifacts()
        second = load_registry_artifacts()

        self.assertEqual(first, second)
        self.assertEqual([artifact.id for artifact in first], ["qpm", "dfm", "io"])

    def test_checksum_generation_uses_artifact_bytes(self) -> None:
        path = PUBLIC_DATA_DIR / "qpm.json"
        expected = f"sha256:{hashlib.sha256(path.read_bytes()).hexdigest()}"

        self.assertEqual(checksum_file(path), expected)

    def test_endpoint_shape(self) -> None:
        client = TestClient(app)
        response = client.get("/api/v1/registry/artifacts")

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(payload["api_version"], "v1")
        self.assertEqual(payload["source"], "frontend_public_artifacts")
        self.assertEqual(payload, build_registry_response().model_dump(mode="json"))
        self.assertEqual(len(payload["artifacts"]), 3)

        artifact = payload["artifacts"][0]
        self.assertEqual(
            set(artifact),
            {
                "id",
                "model_family",
                "artifact_path",
                "source_artifact",
                "source_vintage",
                "data_vintage",
                "exported_at",
                "generated_at",
                "checksum",
                "guard_status",
                "guard_checks",
                "caveats",
                "warnings",
            },
        )
        self.assertTrue(artifact["checksum"].startswith("sha256:"))

    def test_response_model_shape(self) -> None:
        response_model = build_registry_response()

        self.assertIsInstance(response_model, RegistryArtifactsResponse)
        self.assertEqual(response_model.api_version, "v1")
        self.assertEqual(response_model.source, "frontend_public_artifacts")
        self.assertEqual([artifact.id for artifact in response_model.artifacts], ["qpm", "dfm", "io"])
        self.assertEqual(response_model.model_dump(mode="json")["artifacts"][0]["id"], "qpm")

    def test_missing_artifact_file_returns_service_unavailable(self) -> None:
        client = TestClient(app)
        with patch(
            "api.app.build_registry_response",
            side_effect=RegistryArtifactLoadError(
                "qpm",
                "Registry artifact qpm is missing at /data/qpm.json.",
            ),
        ):
            response = client.get("/api/v1/registry/artifacts")

        self.assertEqual(response.status_code, 503)
        self.assertEqual(response.json()["detail"]["code"], "registry_artifact_unavailable")
        self.assertEqual(response.json()["detail"]["artifact_id"], "qpm")

    def test_missing_artifact_file_raises_registry_load_error(self) -> None:
        source = ArtifactSource("qpm", "QPM", "/data/qpm.json", Path("missing-qpm.json"))

        with patch.object(Path, "read_text", side_effect=FileNotFoundError):
            with self.assertRaises(RegistryArtifactLoadError) as context:
                load_registry_artifact(source)

        self.assertEqual(context.exception.artifact_id, "qpm")
        self.assertIn("missing", str(context.exception))

    def test_invalid_json_raises_registry_load_error(self) -> None:
        source = ArtifactSource("qpm", "QPM", "/data/qpm.json", Path("qpm.json"))

        with patch.object(Path, "read_text", return_value="{ invalid json"):
            with self.assertRaises(RegistryArtifactLoadError) as context:
                load_registry_artifact(source)

        self.assertEqual(context.exception.artifact_id, "qpm")
        self.assertIn("invalid JSON", str(context.exception))

    def test_no_mutation_endpoints(self) -> None:
        client = TestClient(app)
        for method_name in ["post", "put", "patch", "delete"]:
            method = getattr(client, method_name)
            response = method("/api/v1/registry/artifacts")
            self.assertEqual(response.status_code, 405)

        mutation_methods = {"POST", "PUT", "PATCH", "DELETE"}
        registry_routes = [
            route
            for route in app.routes
            if getattr(route, "path", None) == "/api/v1/registry/artifacts"
        ]
        self.assertTrue(registry_routes)
        for route in registry_routes:
            self.assertTrue(mutation_methods.isdisjoint(getattr(route, "methods", set())))


if __name__ == "__main__":
    unittest.main()
