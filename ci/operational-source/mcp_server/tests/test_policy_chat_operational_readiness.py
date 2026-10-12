"""Non-executing dependency probes and truthful service/model readiness."""

import json
import sqlite3
import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path
from unittest.mock import patch

import pytest
from fastapi.testclient import TestClient

sys.path.insert(0, str(Path(__file__).parent.parent))
from api.policy_chat import PolicyChatSettings, DATA_DIR
from api.policy_chat_app import create_policy_chat_app
from api.policy_chat_runners import EngineModelRunner
from api.policy_chat_store import PolicyChatStore
from models.readiness import load_manifest, semantic_hash


@pytest.fixture
def service(tmp_path):
    app = create_policy_chat_app(
        PolicyChatSettings(
            enabled=True,
            auth_mode="trusted_proxy",
            proxy_secret="private-secret",
            state_path=str(tmp_path / "state.db"),
        )
    )
    yield app, TestClient(app)
    app.state.policy_chat_store.close()


def codes(item):
    return {reason["code"] for reason in item["reasons"]}


def install_manifest(monkeypatch, manifest):
    monkeypatch.setattr("api.policy_chat_app.load_manifest", lambda: manifest)
    monkeypatch.setattr("api.policy_chat_runners.load_manifest", lambda: manifest)


def test_healthy_qualified_service_with_unavailable_models(service):
    app, client = service
    result = client.get("/ready")
    assert result.status_code == 200
    assert result.json()["status"] == "degraded"
    assert result.json()["storage"] == {
        "status": "available",
        "schema_version": 3,
        "durable": True,
        "writable": True,
    }
    qpm = result.json()["model_readiness"]["qpm"]
    assert qpm["operational_availability"] == "available"
    assert qpm["qualification"] == "qualified_diagnostic"
    assert qpm["approval"]["authoritative"] is False
    assert "source_stale" in codes(result.json()["model_readiness"]["dfm"])
    assert "private-secret" not in result.text
    assert str(DATA_DIR) not in result.text


def test_qualified_and_blocked_variants_preserve_approvals(tmp_path):
    app = create_policy_chat_app(
        PolicyChatSettings(
            enabled=True,
            auth_mode="dev_header",
            allow_in_memory_state=True,
            enabled_models=("qpm", "fpp"),
        )
    )
    response = TestClient(app).get("/ready")
    assert response.status_code == 200
    fpp = response.json()["model_readiness"]["fpp"]
    assert fpp["status"] == "blocked"
    assert fpp["approval"]["diagnostic"] is False
    assert "diagnostic_not_released" in codes(fpp)
    app.state.policy_chat_store.close()


@pytest.mark.parametrize(
    "kind,expected",
    [
        ("missing", "artifact_missing"),
        ("corrupt", "artifact_corrupt"),
        ("hash", "artifact_hash_mismatch"),
        ("schema", "artifact_schema_incompatible"),
    ],
)
def test_artifact_failures_are_individual(service, tmp_path, monkeypatch, kind, expected):
    app, client = service
    folder = tmp_path / "data"
    folder.mkdir()
    source = json.loads((DATA_DIR / "io_data.json").read_text())
    manifest = load_manifest()
    if kind == "corrupt":
        (folder / "io_data.json").write_text("invalid JSON")
    elif kind == "hash":
        source["X"][0] += 1
        (folder / "io_data.json").write_text(json.dumps(source))
    elif kind == "schema":
        source["L"] = [[1]]
        (folder / "io_data.json").write_text(json.dumps(source))
        # Isolate schema checks despite a matching declared test-artifact hash.
        variant = next(
            v for v in manifest["variants"] if v["id"] == manifest["routes"]["policy-chat:io"]
        )
        variant["artifacts"][0]["semantic_sha256"] = semantic_hash(source)
        install_manifest(monkeypatch, manifest)
    app.state.policy_chat_runner.data_dir = folder
    response = client.get("/ready")
    assert response.status_code == 200
    assert expected in codes(response.json()["model_readiness"]["io"])
    assert response.json()["model_readiness"]["qpm"]["status"] == "qualified"


@pytest.mark.parametrize(
    "error", [FileNotFoundError("/private/manifest"), ValueError("secret invalid JSON")]
)
def test_manifest_failure_is_service_wide_and_sanitized(service, monkeypatch, error):
    app, client = service

    def failed():
        raise error

    monkeypatch.setattr("api.policy_chat_app.load_manifest", failed)
    monkeypatch.setattr("api.policy_chat_runners.load_manifest", failed)
    response = client.get("/ready")
    assert response.status_code == 503
    assert "manifest_unavailable_or_incompatible" in codes(response.json()["detail"])
    assert "private" not in response.text and "secret" not in response.text
    assert client.get("/health").json() == {"status": "ok"}


def test_undeclared_route_and_corrupt_manifest(service, monkeypatch):
    _, client = service
    manifest = load_manifest()
    manifest["routes"]["policy-chat:io"] = "undeclared"
    install_manifest(monkeypatch, manifest)
    response = client.get("/ready")
    assert response.status_code == 200
    assert "unknown_variant" in codes(response.json()["model_readiness"]["io"])
    manifest["schema_version"] = "unknown"
    assert client.get("/ready").status_code == 503


def test_freshness_exact_threshold_and_expiration(monkeypatch):
    manifest = load_manifest()
    variant = next(
        v for v in manifest["variants"] if v["id"] == manifest["routes"]["policy-chat:dfm"]
    )
    variant["freshness"] = [{"path": "meta.exported_at", "max_age_days": 45}]
    monkeypatch.setattr("api.policy_chat_runners.load_manifest", lambda: manifest)
    data = json.loads((DATA_DIR / "dfm_data.json").read_text())
    stamp = datetime.fromisoformat(data["meta"]["exported_at"]).replace(tzinfo=timezone.utc)
    runner = EngineModelRunner(DATA_DIR, clock=lambda: stamp + timedelta(days=45))
    assert runner.readiness("dfm")["operational_availability"] == "available"
    runner.clock = lambda: stamp + timedelta(days=45, microseconds=1)
    assert "source_stale" in codes(runner.readiness("dfm"))


def test_read_only_and_incompatible_storage(service):
    app, client = service
    connection = app.state.policy_chat_store._connection
    connection.execute("PRAGMA query_only=ON")
    response = client.get("/ready")
    assert response.status_code == 503
    assert "storage_unavailable" in codes(response.json()["detail"])
    connection.execute("PRAGMA query_only=OFF")
    connection.execute("UPDATE policy_chat_meta SET value='99' WHERE key='schema_version'")
    connection.commit()
    assert client.get("/ready").json()["detail"]["code"] == "storage_schema_incompatible"
    assert client.get("/health").status_code == 200


def test_future_schema_is_not_downgraded(tmp_path):
    path = str(tmp_path / "future.db")
    store = PolicyChatStore(path)
    store._connection.execute("UPDATE policy_chat_meta SET value='99'")
    store._connection.commit()
    store.close()
    app = create_policy_chat_app(
        PolicyChatSettings(
            enabled=True, auth_mode="trusted_proxy", proxy_secret="secret", state_path=path
        )
    )
    client = TestClient(app)
    assert client.get("/health").status_code == 200
    assert client.get("/ready").json()["detail"]["code"] == "storage_schema_incompatible"
    with sqlite3.connect(path) as connection:
        assert connection.execute("SELECT value FROM policy_chat_meta").fetchone()[0] == "99"


def test_storage_startup_error_stays_live_without_memory_fallback(monkeypatch):
    monkeypatch.setattr(
        "api.policy_chat_app.PolicyChatStore",
        lambda path: (_ for _ in ()).throw(PermissionError("secret /private/database")),
    )
    app = create_policy_chat_app(
        PolicyChatSettings(
            enabled=True,
            auth_mode="trusted_proxy",
            proxy_secret="secret",
            state_path="/private/database",
        )
    )
    client = TestClient(app)
    assert client.get("/health").status_code == 200
    response = client.get("/ready")
    assert response.status_code == 503 and "private" not in response.text
    assert not app.state.policy_chat_store.durable


@pytest.mark.parametrize(
    "mode,allow,expected",
    [
        ("trusted_proxy", False, 503),
        ("trusted_proxy", True, 503),
        ("dev_header", False, 503),
        ("dev_header", True, 200),
    ],
)
def test_memory_requires_explicit_development_mode(mode, allow, expected):
    app = create_policy_chat_app(
        PolicyChatSettings(
            enabled=True,
            auth_mode=mode,
            proxy_secret="secret",
            allow_in_memory_state=allow,
            enabled_models=("qpm",),
        )
    )
    client = TestClient(app)
    response = client.get("/ready")
    assert response.status_code == expected
    if expected == 503:
        assert "in_memory_state_not_allowed" in codes(response.json()["detail"])
    app.state.policy_chat_store.close()


def test_probe_never_executes_or_changes_governed_records(service):
    app, client = service
    store = app.state.policy_chat_store
    store.put_proposal("owner", {"proposal_id": "p"})
    store.claim_execution("owner", "key", {"inputs": {"size": 1}})
    before = {
        table: list(store._connection.execute(f"SELECT * FROM {table}"))
        for table in (
            "policy_chat_meta",
            "policy_chat_proposals",
            "policy_chat_executions",
            "policy_chat_audit_events",
        )
    }
    with (
        patch.object(EngineModelRunner, "run") as run,
        patch("api.policy_chat_runners.solve_irf") as kernel,
    ):
        for _ in range(3):
            assert client.get("/ready").status_code == 200
        run.assert_not_called()
        kernel.assert_not_called()
    after = {table: list(store._connection.execute(f"SELECT * FROM {table}")) for table in before}
    assert before == after


def test_no_available_configured_operation_is_503():
    app = create_policy_chat_app(
        PolicyChatSettings(
            enabled=True,
            auth_mode="dev_header",
            allow_in_memory_state=True,
            enabled_models=("fpp",),
        )
    )
    response = TestClient(app).get("/ready")
    assert response.status_code == 503
    assert "no_models_ready" in codes(response.json()["detail"])
    app.state.policy_chat_store.close()


def test_container_paths_and_readiness_probe():
    docker = (Path(__file__).parents[2] / "Dockerfile.policy-chat").read_text()
    assert "ENV POLICY_CHAT_STATE_PATH=/var/lib/policy-chat/policy-chat.sqlite3" in docker
    assert 'VOLUME ["/var/lib/policy-chat"]' in docker
    assert "ENV POLICY_CHAT_ALLOW_IN_MEMORY_STATE=false" in docker
    assert "COPY apps/policy-ui/public/data/model-manifest.json" in docker
    assert "COPY model_specs/qpm/qpm-core-v0.3.json" in docker
    assert "+ '/ready'" in docker
