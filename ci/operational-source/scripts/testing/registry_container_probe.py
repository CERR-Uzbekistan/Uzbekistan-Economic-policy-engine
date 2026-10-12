"""Read-only checks inside an isolated Registry API container."""
import argparse
import hashlib
import json
import os
import time
from pathlib import Path

import httpx


def probe(mode):
    assert os.getuid() == 10001
    for path in ["/app/mcp_server/.env", "/app/mcp_server/api/private-container-fixture.json",
                 "/app/mcp_server/models", "/app/mcp_server/main.py",
                 "/app/apps/policy-ui/src", "/app/apps/policy-ui/public/data/overview.json",
                 "/app/apps/policy-ui/public/data/private-container-fixture.json"]:
        assert not Path(path).exists(), path
    try:
        Path("/app/mcp_server/api/should-not-write").write_text("synthetic")
    except PermissionError:
        pass
    except OSError as error:
        assert error.errno == 30
    else:
        raise AssertionError("registry source was writable")
    url = "http://127.0.0.1:8000/api/v1/registry/artifacts"
    deadline = time.monotonic() + 15
    while True:
        try:
            response = httpx.get(url, timeout=1)
            break
        except httpx.TransportError:
            if time.monotonic() >= deadline:
                raise
            time.sleep(0.1)
    if mode != "normal":
        assert response.status_code == 503
        detail = response.json()["detail"]
        assert detail["code"] == "registry_artifact_unavailable" and detail["artifact_id"] == "qpm"
        assert "/app/" not in detail["message"]
        return {"http": 503, "honest_unavailability": True, "non_root_uid": os.getuid()}
    assert response.status_code == 200
    value = response.json()
    assert value["api_version"] == "v1" and value["source"] == "frontend_public_artifacts"
    assert [row["id"] for row in value["artifacts"]] == ["qpm", "dfm", "io", "pe"]
    checksums = {}
    for row in value["artifacts"]:
        path = Path("/app/apps/policy-ui/public/data") / (row["id"] + ".json")
        expected = "sha256:" + hashlib.sha256(path.read_bytes()).hexdigest()
        assert row["checksum"] == expected
        checksums[row["id"]] = expected
        assert row["guard_checks"] == ["json_parse", "metadata_extract"]
    for method in ["POST", "PUT", "PATCH", "DELETE"]:
        assert httpx.request(method, url, json={}, timeout=3).status_code == 405
    assert httpx.get("http://127.0.0.1:8000/api/v1/policy-chat/capabilities", timeout=3).status_code == 404
    assert httpx.get("http://127.0.0.1:8000/mcp", timeout=3).status_code == 404
    assert httpx.get(url, timeout=3).json() == value
    return {"http": 200, "non_root_uid": os.getuid(), "checksums": checksums,
            "read_only_sources": True, "write_methods_rejected": True,
            "private_fixtures_and_model_code_excluded": True, "metadata_only": True,
            "policy_chat_mcp_absent": True, "repeat_response_identical": True}


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("mode", choices=["normal", "missing", "malformed"])
    print(json.dumps(probe(parser.parse_args().mode)))
