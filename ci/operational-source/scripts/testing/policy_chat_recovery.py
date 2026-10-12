"""Synthetic-only recovery exercise; never opens an existing operational database."""
import argparse
import json
import sqlite3
from pathlib import Path
from uuid import uuid4


def exercise(root):
    from api.policy_chat_store import (
        ExecutionConflict,
        PolicyChatStore,
        execution_fingerprint,
    )

    root = Path(root)
    root.mkdir(parents=True, exist_ok=True)
    if any(root.iterdir()):
        raise ValueError("synthetic_recovery_directory_must_be_empty")
    live = root / "synthetic-live.sqlite3"
    backup = root / "synthetic-backup.sqlite3"
    restored = root / "synthetic-restored.sqlite3"
    owner = "synthetic-" + "a" * 120 + "-one"
    other = "synthetic-" + "a" * 120 + "-two"
    snapshot = {"execution_contract_version": "policy-chat-execution-v1",
                "proposal_id": "synthetic-proposal", "proposal_hash": "synthetic-hash",
                "inputs": {"size": -0.25}, "variant": "synthetic-storage-fixture",
                "version": "test-only", "source_data_identity": {"fixture": "synthetic-v1"}}
    execution_id = str(uuid4())
    result = {"run_id": execution_id, "proposal_id": snapshot["proposal_id"],
              "completed_at": "2026-10-01T00:00:00Z",
              "execution_fingerprint": execution_fingerprint(snapshot),
              "qualification": "synthetic storage test; no model execution or approval",
              "run_envelope": {"version": "policy-run-envelope-v1",
                               "execution_id": execution_id,
                               "execution_origin": "synthetic-storage-fixture",
                               "inputs": snapshot["inputs"],
                               "snapshot_fingerprint": execution_fingerprint(snapshot)}}
    store = PolicyChatStore(str(live))
    try:
        assert store._connection.execute("PRAGMA journal_mode").fetchone()[0] == "wal"
        assert store._connection.execute("PRAGMA synchronous").fetchone()[0] == 2
        store.put_proposal(owner, {"proposal_id": snapshot["proposal_id"]})
        success = store.claim_execution(owner, "synthetic-completed", snapshot)
        store.finish_execution(owner, "synthetic-completed", success["claim_token"], result=result)
        store.put_run(owner, "synthetic-completed", result)
        pending = store.claim_execution(owner, "synthetic-pending", snapshot)
        assert pending["state"] == "pending"
        assert Path(str(live) + "-wal").is_file()
        assert Path(str(live) + "-shm").is_file()
        # SQLite online backup includes committed WAL pages, not an unsafe main-file copy.
        with sqlite3.connect(backup) as target:
            store._connection.backup(target)
        with sqlite3.connect(backup) as source, sqlite3.connect(restored) as target:
            assert source.execute("PRAGMA integrity_check").fetchone()[0] == "ok"
            source.backup(target)
    finally:
        store.close()
    recovered = PolicyChatStore(str(restored))
    try:
        assert recovered.health()["schema_version"] == 3
        replay = recovered.claim_execution(owner, "synthetic-completed", snapshot)
        assert replay["state"] == "successful" and not replay["claimed"]
        assert json.loads(replay["result_json"]) == result
        assert recovered.get_run(owner, "synthetic-completed") == result
        assert recovered.get_run(other, "synthetic-completed") is None
        retained = recovered.claim_execution(owner, "synthetic-pending", snapshot)
        assert retained["state"] == "pending" and not retained["claimed"]
        assert retained["claim_token"] == pending["claim_token"]
        assert retained["result_json"] is None
        assert [e["event_type"] for e in recovered.list_events(owner)] == ["run_succeeded"]
        assert recovered.list_events(other) == []
        try:
            recovered.claim_execution(owner, "synthetic-completed", snapshot | {"inputs": {"size": 1}})
        except ExecutionConflict as error:
            assert str(error) == "execution_fingerprint_mismatch"
        else:
            raise AssertionError("changed replay accepted")
        try:
            recovered._connection.execute("UPDATE policy_chat_executions SET result_json='{}' WHERE state='successful'")
        except sqlite3.IntegrityError:
            recovered._connection.rollback()
        else:
            raise AssertionError("terminal outcome modified")
        assert recovered.retention_review()["automatic_deletion"] is False
    finally:
        recovered.close()
    # Exercise existing schema-2 ambiguity quarantine independently, then back it up.
    legacy = PolicyChatStore(str(root / "synthetic-legacy.sqlite3"))
    short = "z" * 120
    legacy.put_proposal(short, {"proposal_id": "synthetic-legacy"})
    legacy.put_run(short, "legacy-key", {"run_id": "legacy-run",
                   "proposal_id": "synthetic-legacy", "completed_at": "2024"})
    legacy.claim_execution(short, "legacy-pending", snapshot)
    legacy._connection.execute("UPDATE policy_chat_meta SET value='2' WHERE key='schema_version'")
    legacy._connection.commit()
    legacy.close()
    migrated = PolicyChatStore(str(root / "synthetic-legacy.sqlite3"))
    with sqlite3.connect(root / "synthetic-quarantine-restored.sqlite3") as target:
        migrated._connection.backup(target)
    migrated.close()
    quarantined = PolicyChatStore(str(root / "synthetic-quarantine-restored.sqlite3"))
    try:
        assert quarantined.get_proposal("synthetic-legacy") is None
        assert quarantined.get_run(short, "legacy-key") is None
        assert quarantined._connection.execute("SELECT count(*) FROM policy_chat_identity_quarantine").fetchone()[0] >= 3
        assert quarantined._connection.execute("SELECT state FROM policy_chat_executions").fetchone()[0] == "pending"
        for identity in (short, short + "-one", short + "-two"):
            try:
                quarantined.claim_execution(identity, "legacy-key", snapshot)
            except ExecutionConflict as error:
                assert str(error) == "legacy_fingerprint_unverified"
            else:
                raise AssertionError("legacy identity assigned or replayed")
    finally:
        quarantined.close()
    return {"contract": "synthetic-recovery-v1", "schema": 3,
            "wal_online_backup": True, "restore_integrity": True,
            "completed_result_envelope_and_terminal_audit_preserved": True,
            "pending_unresolved": True, "owner_isolation": True,
            "quarantine_preserved": True, "changed_and_legacy_replay_rejected": True,
            "terminal_immutable": True, "automatic_deletion": False,
            "model_execution": False, "approval_effect": "none"}


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--synthetic-root", type=Path, required=True)
    args = parser.parse_args()
    print(json.dumps(exercise(args.synthetic_root)))


if __name__ == "__main__":
    main()
