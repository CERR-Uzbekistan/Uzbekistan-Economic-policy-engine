"""Durable claims, immutable identities, and API retry authorization."""

import copy
import json
import sys
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
from threading import Barrier, Event
from unittest.mock import patch

import pytest
from fastapi import HTTPException
from fastapi.testclient import TestClient

sys.path.insert(0, str(Path(__file__).parent.parent))
from api.policy_chat import PolicyChatSettings
from api.policy_chat_app import create_policy_chat_app
from api.policy_chat_runners import EngineModelRunner
from api.policy_chat_store import PolicyChatStore, ExecutionConflict, execution_fingerprint


def snapshot():
    return {
        "execution_contract_version": "policy-chat-execution-v1",
        "proposal_id": "p1",
        "proposal_hash": "hash1",
        "inputs": {"size": 1.0, "horizon": 16},
        "variant": "variant1",
        "version": "v1",
        "source_data_identity": {"data": "sha1"},
    }


@pytest.mark.parametrize(
    "field,value",
    [
        ("proposal_id", "p2"),
        ("proposal_hash", "hash2"),
        ("inputs", {"size": 2}),
        ("variant", "variant2"),
        ("version", "v2"),
        ("source_data_identity", {"data": "sha2"}),
        ("execution_contract_version", "v2"),
    ],
)
def test_complete_fingerprint_conflicts(tmp_path, field, value):
    store = PolicyChatStore(str(tmp_path / "state.db"))
    first = store.claim_execution("owner", "key", snapshot())
    altered = snapshot()
    altered[field] = value
    with pytest.raises(ExecutionConflict, match="execution_fingerprint_mismatch"):
        store.claim_execution("owner", "key", altered)
    store.finish_execution("owner", "key", first["claim_token"], result={"run_id": "r1"})
    assert json.loads(store.claim_execution("owner", "key", snapshot())["result_json"]) == {
        "run_id": "r1"
    }
    store.close()


def test_normalization_and_no_ignored_keys():
    assert execution_fingerprint({"a": 1.0, "b": [0.0, {"x": 2, "y": 3}]}) == execution_fingerprint(
        {"b": [-0.0, {"y": 3.0, "x": 2.0}], "a": 1}
    )
    assert execution_fingerprint({"_source": 1}) != execution_fingerprint({"_source": 2})
    with pytest.raises(ValueError):
        execution_fingerprint({"a": float("nan")})


def test_independent_connections_claim_once_and_restart(tmp_path):
    path = str(tmp_path / "state.db")
    stores = [PolicyChatStore(path) for _ in range(6)]
    barrier = Barrier(6)

    def claim(store):
        barrier.wait()
        return store.claim_execution("owner", "key", snapshot())

    with ThreadPoolExecutor(6) as pool:
        claims = list(pool.map(claim, stores))
    assert sum(c["claimed"] for c in claims) == 1
    token = next(c["claim_token"] for c in claims if c["claimed"])
    for store in stores:
        store.close()
    restarted = PolicyChatStore(path)
    assert restarted.claim_execution("owner", "key", snapshot())["state"] == "pending"
    assert not restarted.claim_execution("owner", "key", snapshot())["claimed"]
    with pytest.raises(ExecutionConflict):
        restarted.finish_execution("owner", "key", "wrong", result={})
    restarted.finish_execution(
        "owner", "key", token, error={"status_code": 503, "detail": {"code": "failed"}}
    )
    assert restarted.claim_execution("owner", "key", snapshot())["state"] == "failed"
    with pytest.raises(ExecutionConflict):
        restarted.finish_execution("owner", "key", token, result={})
    assert restarted.claim_execution("other", "key", snapshot())["claimed"]
    restarted.close()


def test_legacy_rows_unverified_and_preserved(tmp_path):
    path = str(tmp_path / "legacy.db")
    store = PolicyChatStore(path)
    store.put_proposal("owner", {"proposal_id": "p1"})
    store.put_run("owner", "key", {"run_id": "old", "proposal_id": "p1", "completed_at": "2024"})
    store._connection.execute("DROP TABLE policy_chat_executions")
    store._connection.execute("UPDATE policy_chat_meta SET value='1'")
    store._connection.commit()
    store.close()
    migrated = PolicyChatStore(path)
    assert migrated.health()["schema_version"] == 3
    with pytest.raises(ExecutionConflict, match="legacy_fingerprint_unverified"):
        migrated.claim_execution("owner", "key", snapshot())
    assert migrated.get_run("owner", "key")["run_id"] == "old"
    migrated.close()


def client_app(path):
    app = create_policy_chat_app(
        PolicyChatSettings(
            enabled=True, auth_mode="dev_header", allow_in_memory_state=True, state_path=str(path)
        )
    )
    return app, TestClient(app)


def proposal(client, owner="analyst"):
    return client.post(
        "/api/v1/policy-chat/proposals",
        headers={"X-Policy-Chat-User": owner},
        json={
            "message": "Raise policy rate by 2pp for 16 quarters",
            "locale": "en",
            "client_turn_id": "turn-0001",
        },
    ).json()


def execute(client, p, owner="analyst", key="request-0001", confirmation=True):
    return client.post(
        f"/api/v1/policy-chat/proposals/{p['proposal_id']}/execute",
        headers={"X-Policy-Chat-User": owner},
        json={
            "proposal_hash": p["proposal_hash"],
            "client_request_id": key,
            "confirmation": confirmation,
        },
    )


def test_api_different_proposal_conflict_and_full_owners(tmp_path):
    app, client = client_app(tmp_path / "state.db")
    p = proposal(client)
    first = execute(client, p)
    assert first.status_code == 200
    assert execute(client, p).json() == first.json()
    assert first.json()["execution_snapshot"]["inputs"]["shock_size"] == 2
    assert (
        execute(client, proposal(client)).json()["detail"]["reason"]
        == "execution_fingerprint_mismatch"
    )
    assert execute(client, p, confirmation=False).status_code == 422
    assert execute(client, p, owner="other").status_code == 404
    owners = ["a" * 120 + "one", "a" * 120 + "two"]
    results = [execute(client, proposal(client, owner), owner).json() for owner in owners]
    assert results[0]["run_id"] != results[1]["run_id"]
    app.state.policy_chat_store.close()


@pytest.mark.parametrize(
    "field,value",
    [("variant", "changed"), ("version", "changed"), ("source_data_identity", {"x": "changed"})],
)
def test_api_context_change_conflicts(tmp_path, field, value):
    app, client = client_app(tmp_path / "state.db")
    p = proposal(client)
    assert execute(client, p).status_code == 200
    original = EngineModelRunner.prepare_execution

    def changed(self, model):
        context, runner = original(self, model)
        context[field] = value
        return context, runner

    with patch.object(EngineModelRunner, "prepare_execution", changed):
        response = execute(client, p)
        assert response.status_code == 409
        assert response.json()["detail"]["reason"] == "execution_context_changed"
    app.state.policy_chat_store.close()


def test_two_api_workers_execute_once(tmp_path):
    app1, client1 = client_app(tmp_path / "state.db")
    app2, client2 = client_app(tmp_path / "state.db")
    p = proposal(client1)
    started, release = Event(), Event()
    original = EngineModelRunner.run
    calls = []

    def delayed(self, model, values):
        calls.append(copy.deepcopy(values))
        started.set()
        assert release.wait(5)
        return original(self, model, values)

    with patch.object(EngineModelRunner, "run", delayed), ThreadPoolExecutor(2) as pool:
        future = pool.submit(execute, client1, p)
        assert started.wait(5)
        pending = execute(client2, p)
        assert pending.status_code == 409
        assert pending.json()["detail"]["code"] == "execution_pending"
        release.set()
        first = future.result()
    assert len(calls) == 1
    assert execute(client2, p).json()["run_id"] == first.json()["run_id"]
    app1.state.policy_chat_store.close()
    app2.state.policy_chat_store.close()


def test_failure_replayed_without_execution_and_readiness_rechecked(tmp_path):
    app, client = client_app(tmp_path / "state.db")
    p = proposal(client)
    with patch.object(
        EngineModelRunner, "run", side_effect=HTTPException(500, {"code": "test_failure"})
    ) as run:
        assert execute(client, p).status_code == 500
        assert execute(client, p).json()["detail"]["code"] == "test_failure"
        assert run.call_count == 1
    with patch.object(
        EngineModelRunner,
        "authorize_execution",
        side_effect=HTTPException(503, {"code": "model_not_ready"}),
    ):
        assert execute(client, p).json()["detail"]["code"] == "model_not_ready"
    app.state.policy_chat_store.close()


def test_successful_replay_cannot_bypass_new_readiness_block(tmp_path):
    app, client = client_app(tmp_path / "state.db")
    p = proposal(client)
    assert execute(client, p).status_code == 200
    with patch.object(
        EngineModelRunner,
        "authorize_execution",
        side_effect=HTTPException(503, {"code": "model_not_ready"}),
    ):
        assert execute(client, p).status_code == 503
    app.state.policy_chat_store.close()


def test_edited_input_conflict_and_old_result_immutable(tmp_path):
    app, client = client_app(tmp_path / "state.db")
    p = proposal(client)
    first = execute(client, p).json()
    edited = client.patch(
        f"/api/v1/policy-chat/proposals/{p['proposal_id']}",
        headers={"X-Policy-Chat-User": "analyst"},
        json={"values": {"shock_size": 3}},
    ).json()
    conflict = execute(client, edited)
    assert conflict.status_code == 409
    assert conflict.json()["detail"]["reason"] == "execution_fingerprint_mismatch"
    assert first["execution_snapshot"]["inputs"]["shock_size"] == 2
    rows = app.state.policy_chat_store._connection.execute(
        "SELECT result_json FROM policy_chat_executions"
    ).fetchall()
    assert json.loads(rows[0][0])["confirmed_parameters"] == first["confirmed_parameters"]
    app.state.policy_chat_store.close()


def test_pending_api_claim_survives_restart_without_execution(tmp_path):
    path = tmp_path / "state.db"
    app, client = client_app(path)
    p = proposal(client)
    with patch.object(
        PolicyChatStore, "finish_execution", side_effect=RuntimeError("crash before commit")
    ):
        assert execute(client, p).json()["detail"]["code"] == "execution_outcome_unresolved"
    app.state.policy_chat_store.close()
    restarted, next_client = client_app(path)
    with patch.object(EngineModelRunner, "run") as run:
        pending = execute(next_client, p)
        assert pending.status_code == 409
        assert pending.json()["detail"]["automatic_retry"] is False
        run.assert_not_called()
    restarted.state.policy_chat_store.close()


def test_blocked_manifest_route_never_executes_kernel(tmp_path):
    from models.readiness import load_manifest

    manifest = load_manifest()
    manifest["routes"]["policy-chat:qpm"] = "fpp-reduced-form-v0"
    app, client = client_app(tmp_path / "state.db")
    p = proposal(client)
    with (
        patch("api.policy_chat_runners.load_manifest", return_value=manifest),
        patch("api.policy_chat_runners.solve_irf") as kernel,
    ):
        first = execute(client, p)
        assert first.status_code == 409
        refreshed = client.post(
            f"/api/v1/policy-chat/proposals/{p['proposal_id']}/refresh",
            headers={"X-Policy-Chat-User": "analyst"},
        ).json()
        first = execute(client, refreshed)
        assert first.status_code == 503
        assert first.json()["detail"]["code"] == "model_not_ready"
        assert execute(client, refreshed).status_code == 503
        kernel.assert_not_called()
    app.state.policy_chat_store.close()


def test_prepared_source_is_frozen():
    from api.policy_chat import DATA_DIR

    runner = EngineModelRunner(DATA_DIR)
    with patch.object(runner, "_load", return_value={"source": [1, 2]}):
        context, prepared = runner.prepare_execution("io")
    # Instance monkeypatch was copied; remove it to exercise the prepared loader.
    prepared.__dict__.pop("_load")
    assert prepared._load("io") == {"source": [1, 2]}
    actual = next(iter(context["source_data_identity"].values()))
    assert actual == execution_fingerprint({"source": [1, 2]})
    loaded = prepared._load("io")
    loaded["source"].append(3)
    assert prepared._load("io") == {"source": [1, 2]}
