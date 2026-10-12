"""Persistence primitives for governed Policy Chat state and audit events."""

from __future__ import annotations

import hashlib
import math
import json
import sqlite3
import threading
import time
from datetime import UTC, datetime
from pathlib import Path
from typing import Any
from uuid import uuid4

from .policy_chat_identity import validate_owner


SCHEMA_VERSION = 3
EXECUTION_CONTRACT_VERSION = "policy-chat-execution-v1"


def canonical_execution(value):
    """Sorted UTF-8 JSON; finite numbers normalize 1.0/1 and negative zero."""
    def normalize(item):
        if isinstance(item, float):
            if not math.isfinite(item):
                raise ValueError("Execution inputs must be finite")
            return int(item) if item.is_integer() else item
        if isinstance(item, dict):
            return {key: normalize(val) for key, val in item.items()}
        if isinstance(item, list):
            return [normalize(val) for val in item]
        return item
    return json.dumps(normalize(value), sort_keys=True, ensure_ascii=False,
                      separators=(",", ":"), allow_nan=False)


def execution_fingerprint(snapshot):
    return "sha256:" + hashlib.sha256(canonical_execution(snapshot).encode("utf-8")).hexdigest()


class ExecutionConflict(ValueError):
    def __init__(self, code):
        self.detail = {"code": "idempotency_conflict", "reason": code}
        super().__init__(code)


class ExecutionLimit(ValueError):
    def __init__(self, code):
        self.detail = {"code": code, "scope": "durable_execution_admission"}
        super().__init__(code)


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
        try:
            self._connection.row_factory = sqlite3.Row
            self._connection.execute("PRAGMA foreign_keys = ON")
            if self.path != ":memory:":
                self._enable_wal()
                self._connection.execute("PRAGMA synchronous = FULL")
            self._initialize()
        except BaseException:
            self._connection.close()
            raise

    def _enable_wal(self) -> None:
        # Concurrent first opens can race while changing the journal mode;
        # SQLite may return BUSY here immediately despite the connection timeout.
        # Retry only this startup setting, never claims or model execution.
        deadline = time.monotonic() + 5
        while True:
            try:
                mode = self._connection.execute("PRAGMA journal_mode = WAL").fetchone()[0]
                if mode.lower() != "wal":
                    raise ValueError("durable_storage_wal_unavailable")
                return
            except sqlite3.OperationalError as error:
                code = getattr(error, "sqlite_errorcode", 0) & 0xFF
                if code not in {sqlite3.SQLITE_BUSY, sqlite3.SQLITE_LOCKED} or time.monotonic() >= deadline:
                    raise
                time.sleep(0.01)

    @property
    def durable(self) -> bool:
        return self.path != ":memory:"

    def _initialize(self) -> None:
        with self._lock, self._connection:
            self._connection.execute("BEGIN IMMEDIATE")
            meta_exists = self._connection.execute(
                "SELECT 1 FROM sqlite_master WHERE type='table' AND name='policy_chat_meta'").fetchone()
            if meta_exists:
                existing = self._connection.execute(
                    "SELECT value FROM policy_chat_meta WHERE key='schema_version'").fetchone()
                if existing is None or existing[0] not in {"1", "2", "3"}:
                    raise ValueError("storage_schema_incompatible")
                if existing[0] == "3":
                    self._verify_schema()
            self._execute_schema_script(
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
                CREATE TABLE IF NOT EXISTS policy_chat_executions (
                    owner TEXT NOT NULL,
                    client_request_id TEXT NOT NULL,
                    fingerprint TEXT NOT NULL,
                    snapshot_json TEXT NOT NULL,
                    claim_token TEXT NOT NULL,
                    state TEXT NOT NULL CHECK(state IN ('pending','successful','failed')),
                    result_json TEXT,
                    error_json TEXT,
                    created_at TEXT NOT NULL,
                    updated_at TEXT NOT NULL,
                    PRIMARY KEY(owner, client_request_id)
                );
                CREATE TRIGGER IF NOT EXISTS policy_chat_execution_no_delete
                BEFORE DELETE ON policy_chat_executions
                BEGIN SELECT RAISE(ABORT, 'execution claims cannot be deleted'); END;
                CREATE TRIGGER IF NOT EXISTS policy_chat_execution_immutable
                BEFORE UPDATE ON policy_chat_executions
                WHEN NEW.owner != OLD.owner OR NEW.client_request_id != OLD.client_request_id
                  OR NEW.fingerprint != OLD.fingerprint OR NEW.snapshot_json != OLD.snapshot_json
                  OR NEW.claim_token != OLD.claim_token OR OLD.state != 'pending'
                BEGIN SELECT RAISE(ABORT, 'execution identity and terminal states are immutable'); END;
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
            previous = self._connection.execute(
                "SELECT value FROM policy_chat_meta WHERE key='schema_version'").fetchone()
            self._connection.execute("""CREATE TABLE IF NOT EXISTS policy_chat_identity_quarantine (
                table_name TEXT NOT NULL, record_id TEXT NOT NULL,
                reason TEXT NOT NULL, PRIMARY KEY(table_name, record_id))""")
            if previous and int(previous[0]) < 3:
                for table, key in (("policy_chat_proposals", "proposal_id"),
                                   ("policy_chat_runs", "run_id"),
                                   ("policy_chat_audit_events", "event_id"),
                                   ("policy_chat_executions", "claim_token")):
                    self._connection.execute(f"""INSERT OR IGNORE INTO policy_chat_identity_quarantine
                        SELECT ?, {key}, 'legacy_owner_ambiguous' FROM {table}
                        WHERE length(owner) >= 120 OR owner LIKE 'identity-v1:%'""", (table,))
            self._connection.execute("""CREATE TRIGGER IF NOT EXISTS policy_chat_proposal_owner_immutable
                BEFORE UPDATE ON policy_chat_proposals WHEN NEW.owner != OLD.owner
                BEGIN SELECT RAISE(ABORT, 'proposal owner is immutable'); END;""")
            self._connection.execute(
                """
                INSERT INTO policy_chat_meta(key, value) VALUES('schema_version', ?)
                ON CONFLICT(key) DO UPDATE SET value = excluded.value
                """,
                (str(SCHEMA_VERSION),),
            )

    def _execute_schema_script(self, script: str) -> None:
        # executescript() commits an existing transaction before running DDL.
        # Keep first creation/migration and the schema marker atomic instead.
        statement = ""
        for line in script.splitlines(keepends=True):
            statement += line
            if sqlite3.complete_statement(statement):
                self._connection.execute(statement)
                statement = ""
        if statement.strip():
            raise ValueError("storage_schema_script_incomplete")

    def _quarantined(self, table, record_id):
        with self._lock:
            return self._connection.execute(
                "SELECT 1 FROM policy_chat_identity_quarantine WHERE table_name=? AND record_id=?",
                (table, record_id)).fetchone() is not None

    def _verify_schema(self):
        required = {
            "policy_chat_meta": {"key", "value"},
            "policy_chat_proposals": {"proposal_id", "owner", "payload_json", "created_at", "updated_at"},
            "policy_chat_runs": {"run_id", "owner", "client_request_id", "proposal_id", "payload_json", "created_at"},
            "policy_chat_executions": {"owner", "client_request_id", "fingerprint", "snapshot_json", "claim_token", "state", "result_json", "error_json", "created_at", "updated_at"},
            "policy_chat_audit_events": {"event_id", "event_type", "owner", "proposal_id", "run_id", "metadata_json", "created_at"},
            "policy_chat_identity_quarantine": {"table_name", "record_id", "reason"},
        }
        for table, columns in required.items():
            actual = {row[1] for row in self._connection.execute(f"PRAGMA table_info({table})")}
            if not columns <= actual:
                raise ValueError("storage_schema_incompatible")
        triggers = {row[0] for row in self._connection.execute(
            "SELECT name FROM sqlite_master WHERE type='trigger'")}
        if not {"policy_chat_execution_no_delete", "policy_chat_execution_immutable",
                "policy_chat_proposal_owner_immutable", "policy_chat_audit_no_update",
                "policy_chat_audit_no_delete"} <= triggers:
            raise ValueError("storage_schema_incompatible")
        keys = [row[1] for row in sorted(self._connection.execute(
            "PRAGMA table_info(policy_chat_executions)"), key=lambda row: row[5]) if row[5]]
        if keys != ["owner", "client_request_id"]:
            raise ValueError("storage_schema_incompatible")

    def health(self) -> dict[str, Any]:
        """Check compatibility and a rolled-back write without touching governed rows."""
        with self._lock:
            row = self._connection.execute(
                "SELECT value FROM policy_chat_meta WHERE key = 'schema_version'").fetchone()
            if row is None or row[0] != str(SCHEMA_VERSION):
                raise ValueError("storage_schema_incompatible")
            self._verify_schema()
            if self._connection.execute("PRAGMA quick_check(1)").fetchone()[0] != "ok":
                raise ValueError("storage_integrity_failed")
            try:
                self._connection.execute("BEGIN IMMEDIATE")
                self._connection.execute(
                    "INSERT INTO policy_chat_meta(key,value) VALUES(?,?)",
                    ("readiness_probe:" + str(uuid4()), "probe"))
            finally:
                self._connection.rollback()
        return {"schema_version": SCHEMA_VERSION, "durable": self.durable, "writable": True}

    def put_proposal(self, owner: str, payload: dict[str, Any]) -> None:
        validate_owner(owner)
        now = datetime.now(UTC).isoformat()
        encoded = json.dumps(payload, ensure_ascii=False, separators=(",", ":"))
        with self._lock, self._connection:
            self._connection.execute("BEGIN IMMEDIATE")
            exists = self._connection.execute("SELECT 1 FROM policy_chat_proposals WHERE proposal_id=?", (payload["proposal_id"],)).fetchone()
            if not exists and (self._connection.execute("SELECT count(*) FROM policy_chat_proposals WHERE owner=?", (owner,)).fetchone()[0] >= 1000 or self._connection.execute("SELECT count(*) FROM policy_chat_proposals").fetchone()[0] >= 100000):
                raise ExecutionLimit("proposal_capacity_exceeded")
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
        if row is None or self._quarantined("policy_chat_proposals", proposal_id):
            return None
        return row["owner"], json.loads(row["payload_json"])

    def put_run(
        self,
        owner: str,
        client_request_id: str,
        payload: dict[str, Any],
    ) -> dict[str, Any]:
        validate_owner(owner)
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
        validate_owner(owner)
        with self._lock:
            row = self._connection.execute(
                """
                SELECT run_id, payload_json FROM policy_chat_runs
                WHERE owner = ? AND client_request_id = ?
                """,
                (owner, client_request_id),
            ).fetchone()
        return json.loads(row["payload_json"]) if row and not self._quarantined("policy_chat_runs", row["run_id"]) else None

    def claim_execution(self, owner, client_request_id, snapshot, *, max_runs_per_minute=10, max_pending_per_owner=2, max_pending_global=8):
        """Commit a durable claim before running; never auto-reclaim pending work."""
        validate_owner(owner)
        encoded = canonical_execution(snapshot)
        fingerprint = execution_fingerprint(snapshot)
        with self._lock:
            self._connection.execute("BEGIN IMMEDIATE")
            try:
                row = self._connection.execute(
                    "SELECT * FROM policy_chat_executions WHERE owner=? AND client_request_id=?",
                    (owner, client_request_id)).fetchone()
                if row:
                    if self._quarantined("policy_chat_executions", row["claim_token"]):
                        raise ExecutionConflict("legacy_owner_ambiguous")
                    if row["fingerprint"] != fingerprint or row["snapshot_json"] != encoded:
                        raise ExecutionConflict("execution_fingerprint_mismatch")
                    result = dict(row)
                    result["claimed"] = False
                else:
                    # v1 rows cannot be verified; retain them and reserve their keys.
                    legacy = self._connection.execute(
                        "SELECT 1 FROM policy_chat_runs WHERE owner IN (?, ?) AND client_request_id=?",
                        (owner, owner.strip()[:120], client_request_id)).fetchone()
                    if legacy:
                        raise ExecutionConflict("legacy_fingerprint_unverified")
                    if (self._connection.execute("SELECT count(*) FROM policy_chat_audit_events WHERE owner=?", (owner,)).fetchone()[0] >= 19992 or self._connection.execute("SELECT count(*) FROM policy_chat_audit_events").fetchone()[0] >= 1999992):
                        raise ExecutionLimit("audit_capacity_exceeded")
                    from datetime import timedelta
                    threshold = (datetime.now(UTC) - timedelta(seconds=60)).isoformat()
                    recent = self._connection.execute("SELECT count(*) FROM policy_chat_executions WHERE owner=? AND created_at>=?", (owner, threshold)).fetchone()[0]
                    if recent >= max_runs_per_minute:
                        raise ExecutionLimit("run_rate_limit_exceeded")
                    pending_owner = self._connection.execute("SELECT count(*) FROM policy_chat_executions WHERE owner=? AND state='pending'", (owner,)).fetchone()[0]
                    pending_global = self._connection.execute("SELECT count(*) FROM policy_chat_executions WHERE state='pending'").fetchone()[0]
                    if pending_owner >= max_pending_per_owner or pending_global >= max_pending_global:
                        raise ExecutionLimit("execution_capacity_exceeded")
                    token = str(uuid4())
                    now = datetime.now(UTC).isoformat()
                    self._connection.execute(
                        "INSERT INTO policy_chat_executions VALUES(?,?,?,?,?,'pending',NULL,NULL,?,?)",
                        (owner, client_request_id, fingerprint, encoded, token, now, now))
                    result = {"claimed": True, "state": "pending", "claim_token": token,
                              "fingerprint": fingerprint, "snapshot_json": encoded}
                self._connection.commit()
                return result
            except BaseException:
                self._connection.rollback()
                raise

    def finish_execution(self, owner, client_request_id, token, *, result=None, error=None):
        validate_owner(owner)
        if (result is None) == (error is None):
            raise ValueError("Supply exactly one terminal outcome")
        status = "successful" if result is not None else "failed"
        with self._lock:
            self._connection.execute("BEGIN IMMEDIATE")
            try:
                claim = self._connection.execute("SELECT * FROM policy_chat_executions WHERE owner=? AND client_request_id=? AND claim_token=? AND state='pending'", (owner, client_request_id, token)).fetchone()
                if claim is None:
                    raise ExecutionConflict("claim_not_pending_or_not_owned")
                snapshot = json.loads(claim["snapshot_json"])
                outcome = result if result is not None else error
                envelope = outcome.get("run_envelope", {})
                if envelope and (envelope.get("snapshot_fingerprint") != claim["fingerprint"] or
                                 canonical_execution(envelope.get("inputs")) != canonical_execution(snapshot.get("inputs"))):
                    raise ExecutionConflict("result_envelope_snapshot_mismatch")
                if result and result.get("execution_fingerprint") != claim["fingerprint"]:
                    if "execution_fingerprint" in result:
                        raise ExecutionConflict("result_fingerprint_mismatch")
                self._connection.execute(
                    "UPDATE policy_chat_executions SET state=?, result_json=?, error_json=?, updated_at=? WHERE owner=? AND client_request_id=? AND claim_token=?",
                    (status, canonical_execution(result) if result is not None else None,
                     canonical_execution(error) if error is not None else None, datetime.now(UTC).isoformat(), owner, client_request_id, token))
                self._terminal_boundary("after_state")
                metadata = {"fingerprint": claim["fingerprint"], "model_id": snapshot.get("model_id"),
                            "execution_id": envelope.get("execution_id") or outcome.get("run_id"),
                            "envelope_version": envelope.get("version"),
                            "code": error.get("detail", {}).get("code") if error and isinstance(error.get("detail"), dict) else None}
                self._connection.execute("INSERT INTO policy_chat_audit_events VALUES(?,?,?,?,?,?,?)",
                    (str(uuid4()), "run_succeeded" if result is not None else "run_failed", owner,
                     snapshot.get("proposal_id"), outcome.get("run_id"), canonical_execution(metadata), datetime.now(UTC).isoformat()))
                self._terminal_boundary("after_audit")
                self._terminal_boundary("before_commit")
                self._connection.commit()
            except BaseException:
                self._connection.rollback()
                raise

    def _terminal_boundary(self, boundary):
        """Failure-injection hook; production completion performs no extra side effects."""

    def retention_review(self, *, now=None, proposal_days=30, audit_days=365):
        """Read-only archive eligibility; claims/replay/investigation records stay protected."""
        from datetime import timedelta
        now = now or datetime.now(UTC)
        with self._lock:
            proposals = self._connection.execute("""SELECT count(*) FROM policy_chat_proposals p
                WHERE updated_at<? AND NOT EXISTS (SELECT 1 FROM policy_chat_executions e
                WHERE json_extract(e.snapshot_json, '$.proposal_id')=p.proposal_id)
                AND NOT EXISTS (SELECT 1 FROM policy_chat_runs r WHERE r.proposal_id=p.proposal_id)
                AND NOT EXISTS (SELECT 1 FROM policy_chat_identity_quarantine q
                WHERE q.table_name='policy_chat_proposals' AND q.record_id=p.proposal_id)""", ((now-timedelta(days=proposal_days)).isoformat(),)).fetchone()[0]
            audits = self._connection.execute("""SELECT count(*) FROM policy_chat_audit_events a
                WHERE created_at<? AND run_id IS NULL AND NOT EXISTS (
                SELECT 1 FROM policy_chat_executions e WHERE json_extract(e.snapshot_json, '$.proposal_id')=a.proposal_id)
                AND NOT EXISTS (SELECT 1 FROM policy_chat_identity_quarantine q
                WHERE q.table_name='policy_chat_audit_events' AND q.record_id=a.event_id)""", ((now-timedelta(days=audit_days)).isoformat(),)).fetchone()[0]
        return {"proposal_archive_candidates": proposals, "audit_archive_candidates": audits,
                "automatic_deletion": False, "proposal_days": proposal_days, "audit_days": audit_days}

    def append_event(
        self,
        event_type: str,
        owner: str,
        *,
        proposal_id: str | None = None,
        run_id: str | None = None,
        metadata: dict[str, Any] | None = None,
    ) -> str:
        validate_owner(owner)
        event_id = str(uuid4())
        safe_metadata = metadata or {}
        encoded = json.dumps(safe_metadata, ensure_ascii=False, separators=(",", ":"))
        with self._lock, self._connection:
            self._connection.execute("BEGIN IMMEDIATE")
            if (self._connection.execute("SELECT count(*) FROM policy_chat_audit_events WHERE owner=?", (owner,)).fetchone()[0] >= 20000 or self._connection.execute("SELECT count(*) FROM policy_chat_audit_events").fetchone()[0] >= 2000000):
                raise ExecutionLimit("audit_capacity_exceeded")
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
        validate_owner(owner)
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
            if not self._quarantined("policy_chat_audit_events", row["event_id"])
        ]

    def close(self) -> None:
        with self._lock:
            self._connection.close()
