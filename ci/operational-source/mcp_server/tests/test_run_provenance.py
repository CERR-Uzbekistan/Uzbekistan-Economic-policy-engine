"""Confirmation identity, deterministic replay, terminal atomicity and durable limits."""

import json
import sys
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
from threading import Barrier
from unittest.mock import patch

import pytest
from fastapi import HTTPException
from fastapi.testclient import TestClient

sys.path.insert(0, str(Path(__file__).parent.parent))
from api.policy_chat import PolicyChatSettings, DATA_DIR
from api.policy_chat_app import create_policy_chat_app
from api.policy_chat_runners import EngineModelRunner
from api.policy_chat_store import PolicyChatStore, ExecutionLimit


@pytest.fixture
def service(tmp_path):
    app = create_policy_chat_app(
        PolicyChatSettings(
            enabled=True, auth_mode="dev_header", state_path=str(tmp_path / "state.db")
        )
    )
    yield app, TestClient(app)
    app.state.policy_chat_store.close()


def propose(client):
    return client.post(
        "/api/v1/policy-chat/proposals",
        headers={"X-Policy-Chat-User": "owner"},
        json={"message": "Raise policy rate by 2pp for 16 quarters", "client_turn_id": "turn-0001"},
    ).json()


def execute(client, proposal):
    return client.post(
        f"/api/v1/policy-chat/proposals/{proposal['proposal_id']}/execute",
        headers={"X-Policy-Chat-User": "owner"},
        json={
            "proposal_hash": proposal["proposal_hash"],
            "confirmation": True,
            "client_request_id": "request-0001",
        },
    )


def test_saved_envelope_reproduces_qpm_with_declared_tolerance(service):
    _, client = service
    result = execute(client, propose(client)).json()
    envelope = result["run_envelope"]
    assert envelope["execution_id"] == result["run_id"]
    assert envelope["execution_origin"] == "backend"
    assert envelope["qualification"]["authoritative"] is False
    assert envelope["code_identity"] and envelope["artifact_hashes"]
    assert envelope["snapshot_fingerprint"] == result["execution_fingerprint"]
    context, prepared = EngineModelRunner(DATA_DIR).prepare_execution("qpm")
    assert context["code_identity"] == envelope["code_identity"]
    replay = prepared.run("qpm", envelope["inputs"]).result
    for name, values in envelope["outputs"]["irf_paths"].items():
        assert replay["irf_paths"][name] == pytest.approx(values, abs=1e-6, rel=0)


@pytest.mark.parametrize(
    "identity", ["code_identity", "source_data_identity", "manifest_identity", "version"]
)
def test_change_requires_refresh_and_new_confirmation(service, identity):
    app, client = service
    proposal = propose(client)
    original = EngineModelRunner.prepare_execution

    def changed(self, model):
        context, prepared = original(self, model)
        context[identity] = {"changed": "identity"} if identity.endswith("identity") else "changed"
        return context, prepared

    with (
        patch.object(EngineModelRunner, "prepare_execution", changed),
        patch.object(EngineModelRunner, "run") as run,
    ):
        conflict = execute(client, proposal)
        assert conflict.status_code == 409
        assert conflict.json()["detail"]["code"] == "new_confirmation_required"
        run.assert_not_called()
        renewed = client.post(
            f"/api/v1/policy-chat/proposals/{proposal['proposal_id']}/refresh",
            headers={"X-Policy-Chat-User": "owner"},
        ).json()
        assert renewed["proposal_hash"] != proposal["proposal_hash"]
        assert execute(client, proposal).json()["detail"]["code"] == "stale_proposal"
    assert (
        app.state.policy_chat_store._connection.execute(
            "SELECT count(*) FROM policy_chat_executions"
        ).fetchone()[0]
        == 0
    )


@pytest.mark.parametrize("boundary", ["after_state", "after_audit", "before_commit"])
def test_terminal_failure_rolls_back_result_and_audit(tmp_path, boundary):
    path = str(tmp_path / "state.db")
    store = PolicyChatStore(path)
    claim = store.claim_execution("owner", "key", {"proposal_id": "p"})

    def fail(actual):
        if actual == boundary:
            raise RuntimeError("injected failure")

    with patch.object(store, "_terminal_boundary", fail), pytest.raises(RuntimeError):
        store.finish_execution("owner", "key", claim["claim_token"], result={"run_id": "r"})
    store.close()
    restarted = PolicyChatStore(path)
    row = restarted.claim_execution("owner", "key", {"proposal_id": "p"})
    assert row["state"] == "pending" and row["result_json"] is None
    assert restarted.list_events("owner") == []
    restarted.finish_execution("owner", "key", claim["claim_token"], result={"run_id": "r"})
    assert restarted.claim_execution("owner", "key", {"proposal_id": "p"})["state"] == "successful"
    assert [e["event_type"] for e in restarted.list_events("owner")] == ["run_succeeded"]
    restarted.close()


def test_failed_terminal_event_is_atomic(tmp_path):
    store = PolicyChatStore(str(tmp_path / "state.db"))
    claim = store.claim_execution("owner", "key", {"proposal_id": "p"})
    store.finish_execution(
        "owner",
        "key",
        claim["claim_token"],
        error={"status_code": 500, "detail": {"code": "failure", "private_input": "sensitive"}},
    )
    event = store.list_events("owner")[0]
    assert event["event_type"] == "run_failed"
    assert "sensitive" not in json.dumps(event)
    store.close()


def test_workers_share_rate_and_pending_limits(tmp_path):
    path = str(tmp_path / "state.db")
    stores = [PolicyChatStore(path) for _ in range(6)]
    barrier = Barrier(6)

    def claim(item):
        index, store = item
        barrier.wait()
        try:
            return store.claim_execution("owner", str(index), {"i": index}, max_runs_per_minute=1)
        except ExecutionLimit as error:
            return error.detail

    with ThreadPoolExecutor(6) as pool:
        claims = list(pool.map(claim, enumerate(stores)))
    assert sum(bool(item.get("claimed")) for item in claims) == 1
    assert sum(item.get("code") == "run_rate_limit_exceeded" for item in claims) == 5
    winner = next(index for index, item in enumerate(claims) if item.get("claimed"))
    assert not stores[0].claim_execution(
        "owner", str(winner), {"i": winner}, max_runs_per_minute=1
    )["claimed"]
    for store in stores:
        store.close()
    store = PolicyChatStore(str(tmp_path / "pending.db"))
    store.claim_execution("owner", "one", {}, max_pending_per_owner=1)
    with pytest.raises(ExecutionLimit, match="execution_capacity_exceeded"):
        store.claim_execution("owner", "two", {}, max_pending_per_owner=1)
    store.close()


def test_retention_review_protects_claims_and_never_deletes(tmp_path):
    store = PolicyChatStore(str(tmp_path / "state.db"))
    for name in ("unused", "claimed"):
        store.put_proposal("owner", {"proposal_id": name})
    store._connection.execute("UPDATE policy_chat_proposals SET updated_at='2000-01-01'")
    store._connection.commit()
    store.claim_execution("owner", "key", {"proposal_id": "claimed"})
    review = store.retention_review()
    assert review["proposal_archive_candidates"] == 1
    assert review["automatic_deletion"] is False
    assert store.get_proposal("unused") and store.get_proposal("claimed")
    store.close()


def test_saved_io_envelope_reproduces_static_outputs(service):
    _, client = service
    proposal = client.post(
        "/api/v1/policy-chat/proposals",
        headers={"X-Policy-Chat-User": "owner"},
        json={
            "message": "Estimate the output effect of UZS 5 trillion of infrastructure investment",
            "client_turn_id": "turn-0002",
        },
    ).json()
    result = execute(client, proposal).json()
    envelope = result["run_envelope"]
    _, prepared = EngineModelRunner(DATA_DIR).prepare_execution("io")
    replay = prepared.run("io", envelope["inputs"]).result
    for key, value in envelope["outputs"]["aggregate"].items():
        assert replay["aggregate"][key] == pytest.approx(value, abs=1e-6, rel=0)


def test_loaded_code_drift_blocks_execution():
    runner = EngineModelRunner(DATA_DIR)
    path = next(iter(runner.loaded_code_identity))
    runner.loaded_code_identity[path] = "sha256:changed"
    assessment = runner.readiness("qpm")
    assert "model_code_reload_required" in json.dumps(assessment)
    with pytest.raises(HTTPException):
        runner.authorize_execution("qpm")


def test_failed_completion_storage_failure_stays_pending(service):
    app, client = service
    proposal = propose(client)
    store = app.state.policy_chat_store
    with (
        patch.object(EngineModelRunner, "run", side_effect=HTTPException(503, detail={"code": "failure"})),
        patch.object(store, "_terminal_boundary", side_effect=RuntimeError("injected")),
    ):
        response = execute(client, proposal)
    assert response.status_code == 503
    assert response.json()["detail"]["code"] == "execution_outcome_unresolved"
    row = store._connection.execute("SELECT state, result_json, error_json FROM policy_chat_executions").fetchone()
    assert tuple(row) == ("pending", None, None)
    assert not any(e["event_type"] in ("run_succeeded", "run_failed") for e in store.list_events("owner"))


def test_terminal_envelope_must_match_claim_snapshot(tmp_path):
    store = PolicyChatStore(str(tmp_path / "state.db"))
    claim = store.claim_execution("owner", "key", {"inputs": {"size": -1}})
    with pytest.raises(ValueError, match="result_envelope_snapshot_mismatch"):
        store.finish_execution("owner", "key", claim["claim_token"], result={
            "run_envelope": {"snapshot_fingerprint": claim["fingerprint"], "inputs": {"size": 1}}
        })
    assert store.claim_execution("owner", "key", {"inputs": {"size": -1}})["state"] == "pending"
    assert store.list_events("owner") == []
    store.close()
