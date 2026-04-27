"""Tests for the read-only registry API v1."""

from __future__ import annotations

import hashlib
import sys
import unittest
from pathlib import Path

from fastapi.testclient import TestClient

sys.path.insert(0, str(Path(__file__).parent.parent))

from api.app import app  # noqa: E402
from api.registry import PUBLIC_DATA_DIR, build_registry_response, checksum_file, load_registry_artifacts  # noqa: E402


class RegistryApiTests(unittest.TestCase):
    def test_seed_load_is_deterministic(self) -> None:
        first = load_registry_artifacts()
        second = load_registry_artifacts()

        self.assertEqual(first, second)
        self.assertEqual([artifact["id"] for artifact in first], ["qpm", "dfm", "io"])

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
        self.assertEqual(payload, build_registry_response())
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
