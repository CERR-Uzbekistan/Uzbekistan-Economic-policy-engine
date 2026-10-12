"""Uncovered identity validation, issuer scope, and ambiguous legacy ownership."""

import base64
import json
import sqlite3
import sys
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

sys.path.insert(0, str(Path(__file__).parent.parent))
from api.policy_chat import PolicyChatSettings
from api.policy_chat_app import create_policy_chat_app
from api.policy_chat_identity import identity_owner, validate_subject, IdentityInvalid
from api.policy_chat_store import PolicyChatStore, ExecutionConflict


def snapshot():
    return {
        "proposal_id": "p",
        "proposal_hash": "h",
        "inputs": {"size": 1},
        "variant": "variant",
        "execution_contract_version": "policy-chat-execution-v1",
    }


def headers(subject, issuer=None):
    result = {"X-Policy-Chat-Proxy-Secret": "test-secret"}
    if subject is not None:
        if subject.isascii():
            result["X-Policy-Chat-User"] = subject
        else:
            result["X-Policy-Chat-User"] = (
                base64.urlsafe_b64encode(subject.encode()).decode().rstrip("=")
            )
            result["X-Policy-Chat-User-Encoding"] = "utf-8-base64url"
    if issuer is not None:
        result["X-Policy-Chat-Issuer"] = issuer
    return result


@pytest.fixture
def app_client(tmp_path):
    app = create_policy_chat_app(
        PolicyChatSettings(
            enabled=True,
            auth_mode="trusted_proxy",
            proxy_secret="test-secret",
            state_path=str(tmp_path / "state.db"),
        )
    )
    yield app, TestClient(app)
    app.state.policy_chat_store.close()


def propose(client, h):
    return client.post(
        "/api/v1/policy-chat/proposals",
        headers=h,
        json={
            "message": "Raise policy rate by 2pp for 16 quarters",
            "locale": "en",
            "client_turn_id": "turn-0001",
        },
    )


def run(client, p, h, confirmation=True):
    return client.post(
        f"/api/v1/policy-chat/proposals/{p['proposal_id']}/execute",
        headers=h,
        json={
            "proposal_hash": p["proposal_hash"],
            "confirmation": confirmation,
            "client_request_id": "request-0001",
        },
    )


@pytest.mark.parametrize(
    "subject",
    [
        None,
        "",
        " ",
        " padded",
        "padded ",
        "\tbad",
        "bad\x00",
        "bad\x7f",
        "bad\u2028line",
        "a" * 1025,
    ],
)
def test_invalid_identity_is_generic_and_creates_nothing(app_client, subject, caplog):
    app, client = app_client
    response = propose(client, headers(subject))
    assert response.status_code == 401
    assert response.json()["detail"]["code"] in {"authentication_required", "invalid_identity"}
    assert "test-secret" not in response.text + caplog.text
    assert (
        app.state.policy_chat_store._connection.execute(
            "SELECT count(*) FROM policy_chat_proposals"
        ).fetchone()[0]
        == 0
    )


@pytest.mark.parametrize(
    "subject",
    [
        "a",
        "a" * 119,
        "a" * 120,
        "a" * 121,
        "a" * 1024,
        "analyst with space",
        "Oʻzbekiston-分析",
        "é",
        "e\u0301",
        "Ж" * 512,
    ],
)
def test_valid_boundaries_preserve_exact_owner(app_client, subject):
    app, client = app_client
    p = propose(client, headers(subject))
    assert p.status_code == 200
    stored = app.state.policy_chat_store.get_proposal(p.json()["proposal_id"])
    assert stored[0] == subject
    assert app.state.policy_chat_store.list_events(subject)[0]["owner"] == subject


def test_unicode_forms_remain_distinct_and_no_cross_owner_paths(app_client):
    app, client = app_client
    owners = ["a" * 120 + "é", "a" * 120 + "e\u0301"]
    proposals = [propose(client, headers(o)).json() for o in owners]
    runs = [run(client, p, headers(o)).json() for p, o in zip(proposals, owners)]
    assert runs[0]["run_id"] != runs[1]["run_id"]
    for p, other in ((proposals[0], owners[1]), (proposals[1], owners[0])):
        denied = client.patch(
            f"/api/v1/policy-chat/proposals/{p['proposal_id']}",
            headers=headers(other),
            json={"values": {"shock_size": 3}},
        )
        assert denied.status_code == 404
        for confirm in (True, False):
            denied = run(client, p, headers(other), confirm)
            assert denied.status_code == 404
            assert denied.json() == {"detail": {"code": "proposal_not_found"}}
            assert p["proposal_hash"] not in denied.text
    events = [app.state.policy_chat_store.list_events(o) for o in owners]
    assert {e["proposal_id"] for e in events[0]} == {proposals[0]["proposal_id"]}
    assert {e["proposal_id"] for e in events[1]} == {proposals[1]["proposal_id"]}
    for p, owner, original in zip(proposals, owners, runs):
        assert run(client, p, headers(owner)).json()["run_id"] == original["run_id"]


def test_duplicate_unknown_encoding_and_unconfigured_issuer_rejected(app_client):
    _, client = app_client
    normal = list(headers("analyst").items())
    variants = [
        normal + [("X-Policy-Chat-User", "other")],
        normal + [("X-Policy-Chat-Proxy-Secret", "other-secret")],
        normal + [("X-Policy-Chat-User-Encoding", "unknown")],
        normal + [("X-Policy-Chat-Issuer", "https://unknown")],
        list(headers("analyst").items()) + [("X-Policy-Chat-User-Encoding", "utf-8-base64url")],
    ]
    for h in variants:
        response = client.get("/api/v1/policy-chat/capabilities", headers=h)
        assert response.status_code == 401
        assert "other-secret" not in response.text
    wrong_secret = headers("analyst")
    wrong_secret["X-Policy-Chat-Proxy-Secret"] = "wrong"
    assert client.get("/api/v1/policy-chat/capabilities", headers=wrong_secret).status_code == 401


def test_pinned_issuer_subject_pair_isolated(tmp_path):
    apps = [
        create_policy_chat_app(
            PolicyChatSettings(
                enabled=True,
                auth_mode="trusted_proxy",
                proxy_secret="test-secret",
                identity_issuer=issuer,
                state_path=str(tmp_path / "shared.db"),
            )
        )
        for issuer in ("https://issuer-one", "https://issuer-two")
    ]
    try:
        clients = [TestClient(app) for app in apps]
        issuers = ["https://issuer-one", "https://issuer-two"]
        p = propose(clients[0], headers("same-subject", issuers[0])).json()
        assert run(clients[0], p, headers("same-subject", issuers[0])).status_code == 200
        assert run(clients[1], p, headers("same-subject", issuers[1])).status_code == 404
        assert propose(clients[0], headers("same-subject", issuers[1])).status_code == 401
        assert propose(clients[0], headers("same-subject")).status_code == 401
        key = identity_owner("same-subject", issuer=issuers[0], expected_issuer=issuers[0])
        assert json.loads(key[len("identity-v1:") :]) == {
            "issuer": issuers[0],
            "subject": "same-subject",
        }
        assert apps[0].state.policy_chat_store.list_events(key)
    finally:
        for app in apps:
            app.state.policy_chat_store.close()


def test_legacy_120_character_records_quarantined_without_reassignment(tmp_path):
    path = str(tmp_path / "legacy.db")
    owner = "a" * 120
    store = PolicyChatStore(path)
    store.put_proposal(owner, {"proposal_id": "legacy"})
    store.put_run(
        owner, "old", {"run_id": "oldrun", "proposal_id": "legacy", "completed_at": "2024"}
    )
    store.append_event("proposal_created", owner, proposal_id="legacy")
    store.claim_execution(owner, "claimed", snapshot())
    store._connection.execute("UPDATE policy_chat_meta SET value='2'")
    store._connection.commit()
    store.close()
    migrated = PolicyChatStore(path)
    assert migrated.get_proposal("legacy") is None
    assert migrated.get_run(owner, "old") is None
    assert migrated.list_events(owner) == []
    with pytest.raises(ExecutionConflict, match="legacy_owner_ambiguous"):
        migrated.claim_execution(owner, "claimed", snapshot())
    for full in (owner, owner + "one", owner + "two"):
        with pytest.raises(ExecutionConflict, match="legacy_fingerprint_unverified"):
            migrated.claim_execution(full, "old", snapshot())
    assert (
        migrated._connection.execute("SELECT owner FROM policy_chat_proposals").fetchone()[0]
        == owner
    )
    migrated.close()


def test_store_cannot_reassign_proposal_owner_or_accept_malformed_owner():
    store = PolicyChatStore()
    store.put_proposal("first", {"proposal_id": "p"})
    with pytest.raises(sqlite3.IntegrityError):
        store.put_proposal("second", {"proposal_id": "p"})
    assert store.get_proposal("p")[0] == "first"
    with pytest.raises(IdentityInvalid):
        store.append_event("event", " padded ")
    with pytest.raises(IdentityInvalid):
        validate_subject("\ud800")
    store.close()


def test_new_long_subject_survives_restart_without_quarantine(tmp_path):
    path = str(tmp_path / "current.db")
    owner = "a" * 120 + "full"
    store = PolicyChatStore(path)
    store.put_proposal(owner, {"proposal_id": "current"})
    store.append_event("proposal_created", owner, proposal_id="current")
    store.close()
    restarted = PolicyChatStore(path)
    assert restarted.get_proposal("current")[0] == owner
    assert len(restarted.list_events(owner)) == 1
    restarted.close()


@pytest.mark.parametrize("encoded", ["***", "YQ==", "_w", "7aCA"])
def test_malformed_unicode_transport_fails_closed(app_client, encoded):
    _, client = app_client
    h = headers("analyst")
    h["X-Policy-Chat-User"] = encoded
    h["X-Policy-Chat-User-Encoding"] = "utf-8-base64url"
    response = propose(client, h)
    assert response.status_code == 401
    assert response.json() == {"detail": {"code": "invalid_identity"}}
