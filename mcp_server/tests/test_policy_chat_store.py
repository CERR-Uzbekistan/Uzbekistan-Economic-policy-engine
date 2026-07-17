"""Persistence and append-only guarantees for Policy Chat governance state."""

from __future__ import annotations

import sqlite3
import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from api.policy_chat_store import PolicyChatStore  # noqa: E402


class PolicyChatStoreTests(unittest.TestCase):
    def test_audit_events_are_append_only(self) -> None:
        store = PolicyChatStore()
        try:
            event_id = store.append_event(
                "proposal_created",
                "analyst@example.test",
                metadata={"model_id": "qpm"},
            )
            with self.assertRaises(sqlite3.IntegrityError):
                with store._connection:  # noqa: SLF001 - verifies the database guard
                    store._connection.execute(  # noqa: SLF001
                        "DELETE FROM policy_chat_audit_events WHERE event_id = ?",
                        (event_id,),
                    )
            events = store.list_events("analyst@example.test")
            self.assertEqual(len(events), 1)
            self.assertEqual(events[0]["event_id"], event_id)
        finally:
            store.close()

    def test_owner_scoping_excludes_other_users_events(self) -> None:
        store = PolicyChatStore()
        try:
            store.append_event("capabilities_viewed", "first@example.test")
            store.append_event("capabilities_viewed", "second@example.test")
            events = store.list_events("first@example.test")
            self.assertEqual([event["owner"] for event in events], ["first@example.test"])
        finally:
            store.close()


if __name__ == "__main__":
    unittest.main()
