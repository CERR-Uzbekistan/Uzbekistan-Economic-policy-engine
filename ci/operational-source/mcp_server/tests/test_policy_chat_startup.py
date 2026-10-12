"""Cold-start WAL contention must not crash independent workers."""
import sqlite3
from pathlib import Path

import pytest

from api.policy_chat_store import PolicyChatStore
from scripts.testing.platform_container_probe import processes


def test_transient_wal_lock_is_retried_without_replaying_execution(tmp_path, monkeypatch):
    original_connect = sqlite3.connect

    class BusyOnce(sqlite3.Connection):
        attempts = 0

        def execute(self, sql, *args):
            if sql == "PRAGMA journal_mode = WAL":
                self.attempts += 1
                if self.attempts == 1:
                    error = sqlite3.OperationalError("database is locked")
                    error.sqlite_errorcode = sqlite3.SQLITE_BUSY
                    raise error
            return super().execute(sql, *args)

    monkeypatch.setattr(sqlite3, "connect", lambda *a, **k: original_connect(*a, **k, factory=BusyOnce))
    store = PolicyChatStore(str(tmp_path / "state.sqlite3"))
    try:
        assert store._connection.attempts == 2
        assert store._connection.execute("PRAGMA journal_mode").fetchone()[0] == "wal"
        assert store._connection.execute("SELECT count(*) FROM policy_chat_executions").fetchone()[0] == 0
        assert store.list_events("owner") == []
    finally:
        store.close()


def test_non_contention_error_closes_connection_and_is_not_retried(tmp_path, monkeypatch):
    original_connect = sqlite3.connect
    connections = []

    class ReadOnly(sqlite3.Connection):
        attempts = 0

        def execute(self, sql, *args):
            if sql == "PRAGMA journal_mode = WAL":
                self.attempts += 1
                error = sqlite3.OperationalError("attempt to write a readonly database")
                error.sqlite_errorcode = sqlite3.SQLITE_READONLY
                raise error
            return super().execute(sql, *args)

    def connect(*a, **k):
        connection = original_connect(*a, **k, factory=ReadOnly)
        connections.append(connection)
        return connection

    monkeypatch.setattr(sqlite3, "connect", connect)
    with pytest.raises(sqlite3.OperationalError, match="readonly"):
        PolicyChatStore(str(tmp_path / "state.sqlite3"))
    assert connections[0].attempts == 1
    with pytest.raises(sqlite3.ProgrammingError, match="closed"):
        connections[0].execute("SELECT 1")


def test_independent_cold_start_workers_coordinate_claims_and_quotas(tmp_path, monkeypatch):
    root = Path(__file__).resolve().parents[2]
    monkeypatch.setenv("PYTHONPATH", str(root / "mcp_server"))
    for index in range(5):
        claims = processes(tmp_path / f"claims-{index}")
        quotas = processes(tmp_path / f"quotas-{index}", limited=True)
        assert claims["workers"] == quotas["workers"] == 6
        assert claims["claims"] == quotas["claims"] == 1


def test_first_schema_creation_failure_rolls_back_all_partial_tables(tmp_path, monkeypatch):
    original_connect = sqlite3.connect

    class InterruptedCreation(sqlite3.Connection):
        def execute(self, sql, *args):
            if "CREATE TABLE IF NOT EXISTS policy_chat_runs" in sql:
                raise RuntimeError("synthetic schema creation interruption")
            return super().execute(sql, *args)

    path = tmp_path / "interrupted.sqlite3"
    monkeypatch.setattr(sqlite3, "connect", lambda *a, **k: original_connect(*a, **k, factory=InterruptedCreation))
    with pytest.raises(RuntimeError, match="synthetic schema"):
        PolicyChatStore(str(path))
    with original_connect(path) as database:
        assert database.execute("SELECT name FROM sqlite_master WHERE name LIKE 'policy_chat_%'").fetchall() == []
    monkeypatch.setattr(sqlite3, "connect", original_connect)
    store = PolicyChatStore(str(path))
    try:
        assert store.health()["schema_version"] == 3
    finally:
        store.close()
