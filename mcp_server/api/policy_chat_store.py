"""Persistence primitives for governed Policy Chat state and audit events."""

from __future__ import annotations

import json
import sqlite3
import threading
from datetime import UTC, datetime
from pathlib import Path
from typing import Any
from uuid import uuid4


SCHEMA_VERSION = 1


class PolicyChatStore:
    """Small SQLite state store with append-only governance events.

    The default ``:memory:`` database keeps unit tests and local development
    isolated. Internal deployments should provide a volume-backed path through
    ``POLICY_CHAT_STATE_PATH``.
    """

    def __init__(self, path: str = ":memory:") -> None:
        self.path = path or ":memory:"
        if self.path != ":memory:":
            Path(self.path).expanduser().resolve().parent.mkdir(parents=True, exist_ok=True)
        self._lock = threading.RLock()
        self._connection = sqlite3.connect(
            self.path,
            timeout=5,
            check_same_thread=False,
        )
        self._connection.row_factory = sqlite3.Row
        self._connection.execute("PRAGMA foreign_keys = ON")
        if self.path != ":memory:":
            self._connection.execute("PRAGMA journal_mode = WAL")
            self._connection.execute("PRAGMA synchronous = FULL")
        self._initialize()

    @property
    def durable(self) -> bool:
        return self.path != ":memory:"

    def _initialize(self) -> None:
        with self._lock, self._connection:
            self._connection.executescript(
                """
                CREATE TABLE IF NOT EXISTS policy_chat_meta (
                    key TEXT PRIMARY KEY,
                    value TEXT NOT NULL
                );
                CREATE TABLE IF NOT EXISTS policy_chat_proposals (
                    proposal_id TEXT PRIMARY KEY,
                    owner TEXT NOT NULL,
                    payload_json TEXT NOT NULL,
                    created_at TEXT NOT NULL,
                    updated_at TEXT NOT NULL
                );
                CREATE INDEX IF NOT EXISTS idx_policy_chat_proposals_owner
                    ON policy_chat_proposals(owner, updated_at);
                CREATE TABLE IF NOT EXISTS policy_chat_runs (
                    run_id TEXT PRIMARY KEY,
                    owner TEXT NOT NULL,
                    client_request_id TEXT NOT NULL,
                    proposal_id TEXT NOT NULL,
                    payload_json TEXT NOT NULL,
                    created_at TEXT NOT NULL,
                    UNIQUE(owner, client_request_id),
                    FOREIGN KEY(proposal_id) REFERENCES policy_chat_proposals(proposal_id)
                );
                CREATE INDEX IF NOT EXISTS idx_policy_chat_runs_owner
                    ON policy_chat_runs(owner, created_at);
                CREATE TABLE IF NOT EXISTS policy_chat_audit_events (
                    event_id TEXT PRIMARY KEY,
                    event_type TEXT NOT NULL,
                    owner TEXT NOT NULL,
                    proposal_id TEXT,
                    run_id TEXT,
                    metadata_json TEXT NOT NULL,
                    created_at TEXT NOT NULL
                );
                CREATE INDEX IF NOT EXISTS idx_policy_chat_audit_owner_time
                    ON policy_chat_audit_events(owner, created_at);
                CREATE TRIGGER IF NOT EXISTS policy_chat_audit_no_update
                BEFORE UPDATE ON policy_chat_audit_events
                BEGIN
                    SELECT RAISE(ABORT, 'audit events are append-only');
                END;
                CREATE TRIGGER IF NOT EXISTS policy_chat_audit_no_delete
                BEFORE DELETE ON policy_chat_audit_events
                BEGIN
                    SELECT RAISE(ABORT, 'audit events are append-only');
                END;
                """
            )
            self._connection.execute(
                """
                INSERT INTO policy_chat_meta(key, value) VALUES('schema_version', ?)
                ON CONFLICT(key) DO UPDATE SET value = excluded.value
                """,
                (str(SCHEMA_VERSION),),
            )

    def health(self) -> dict[str, Any]:
        with self._lock:
            row = self._connection.execute(
                "SELECT value FROM policy_chat_meta WHERE key = 'schema_version'"
            ).fetchone()
        if row is None:
            raise RuntimeError("Policy Chat state schema is unavailable")
        return {"schema_version": int(row["value"]), "durable": self.durable}

    def put_proposal(self, owner: str, payload: dict[str, Any]) -> None:
        now = datetime.now(UTC).isoformat()
        encoded = json.dumps(payload, ensure_ascii=False, separators=(",", ":"))
        with self._lock, self._connection:
            self._connection.execute(
                """
                INSERT INTO policy_chat_proposals(
                    proposal_id, owner, payload_json, created_at, updated_at
                ) VALUES(?, ?, ?, ?, ?)
                ON CONFLICT(proposal_id) DO UPDATE SET
                    owner = excluded.owner,
                    payload_json = excluded.payload_json,
                    updated_at = excluded.updated_at
                """,
                (payload["proposal_id"], owner, encoded, now, now),
            )

    def get_proposal(self, proposal_id: str) -> tuple[str, dict[str, Any]] | None:
        with self._lock:
            row = self._connection.execute(
                """
                SELECT owner, payload_json
                FROM policy_chat_proposals
                WHERE proposal_id = ?
                """,
                (proposal_id,),
            ).fetchone()
        if row is None:
            return None
        return row["owner"], json.loads(row["payload_json"])

    def put_run(
        self,
        owner: str,
        client_request_id: str,
        payload: dict[str, Any],
    ) -> dict[str, Any]:
        encoded = json.dumps(payload, ensure_ascii=False, separators=(",", ":"))
        with self._lock, self._connection:
            self._connection.execute(
                """
                INSERT OR IGNORE INTO policy_chat_runs(
                    run_id, owner, client_request_id, proposal_id, payload_json, created_at
                ) VALUES(?, ?, ?, ?, ?, ?)
                """,
                (
                    payload["run_id"],
                    owner,
                    client_request_id,
                    payload["proposal_id"],
                    encoded,
                    payload["completed_at"],
                ),
            )
            row = self._connection.execute(
                """
                SELECT payload_json FROM policy_chat_runs
                WHERE owner = ? AND client_request_id = ?
                """,
                (owner, client_request_id),
            ).fetchone()
        if row is None:
            raise RuntimeError("Policy Chat run could not be persisted")
        return json.loads(row["payload_json"])

    def get_run(self, owner: str, client_request_id: str) -> dict[str, Any] | None:
        with self._lock:
            row = self._connection.execute(
                """
                SELECT payload_json FROM policy_chat_runs
                WHERE owner = ? AND client_request_id = ?
                """,
                (owner, client_request_id),
            ).fetchone()
        return json.loads(row["payload_json"]) if row else None

    def append_event(
        self,
        event_type: str,
        owner: str,
        *,
        proposal_id: str | None = None,
        run_id: str | None = None,
        metadata: dict[str, Any] | None = None,
    ) -> str:
        event_id = str(uuid4())
        safe_metadata = metadata or {}
        encoded = json.dumps(safe_metadata, ensure_ascii=False, separators=(",", ":"))
        with self._lock, self._connection:
            self._connection.execute(
                """
                INSERT INTO policy_chat_audit_events(
                    event_id, event_type, owner, proposal_id, run_id,
                    metadata_json, created_at
                ) VALUES(?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    event_id,
                    event_type,
                    owner,
                    proposal_id,
                    run_id,
                    encoded,
                    datetime.now(UTC).isoformat(),
                ),
            )
        return event_id

    def list_events(self, owner: str) -> list[dict[str, Any]]:
        """Return owner-scoped events for tests and privileged offline tooling."""
        with self._lock:
            rows = self._connection.execute(
                """
                SELECT event_id, event_type, owner, proposal_id, run_id,
                       metadata_json, created_at
                FROM policy_chat_audit_events
                WHERE owner = ?
                ORDER BY created_at, event_id
                """,
                (owner,),
            ).fetchall()
        return [
            {
                "event_id": row["event_id"],
                "event_type": row["event_type"],
                "owner": row["owner"],
                "proposal_id": row["proposal_id"],
                "run_id": row["run_id"],
                "metadata": json.loads(row["metadata_json"]),
                "created_at": row["created_at"],
            }
            for row in rows
        ]

    def close(self) -> None:
        with self._lock:
            self._connection.close()
