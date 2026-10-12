"""Portable recovery mechanics; Linux volume behavior requires separate evidence."""
import pytest

from scripts.testing.policy_chat_recovery import exercise


def test_online_wal_backup_restore_preserves_governance(tmp_path):
    evidence = exercise(tmp_path / "synthetic")
    assert evidence["pending_unresolved"]
    assert evidence["quarantine_preserved"]
    assert evidence["completed_result_envelope_and_terminal_audit_preserved"]


def test_recovery_exercise_refuses_existing_directory(tmp_path):
    path = tmp_path / "existing"
    path.mkdir()
    original = path / "record"
    original.write_bytes(b"preserve")
    with pytest.raises(ValueError, match="synthetic_recovery_directory_must_be_empty"):
        exercise(path)
    assert original.read_bytes() == b"preserve"
