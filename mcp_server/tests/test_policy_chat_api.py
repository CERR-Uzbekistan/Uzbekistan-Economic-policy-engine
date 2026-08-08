"""Contract and security-boundary tests for the Policy Chat foundation."""

from __future__ import annotations

import sys
import unittest
from pathlib import Path

from fastapi.testclient import TestClient

sys.path.insert(0, str(Path(__file__).parent.parent))

from api.policy_chat import PolicyChatSettings  # noqa: E402
from api.policy_chat_app import create_policy_chat_app  # noqa: E402


class PolicyChatApiTests(unittest.TestCase):
    def setUp(self) -> None:
        settings = PolicyChatSettings(enabled=True, auth_mode="dev_header")
        self.client = TestClient(create_policy_chat_app(settings))
        self.headers = {"X-Policy-Chat-User": "analyst@example.test"}

    def propose(self, message: str = "Raise the policy rate by 2pp for 16 quarters"):
        return self.client.post(
            "/api/v1/policy-chat/proposals",
            headers=self.headers,
            json={"message": message, "locale": "en", "client_turn_id": "turn-0001"},
        )

    def test_feature_is_disabled_by_default(self) -> None:
        client = TestClient(create_policy_chat_app(PolicyChatSettings()))
        response = client.get(
            "/api/v1/policy-chat/capabilities",
            headers=self.headers,
        )
        self.assertEqual(response.status_code, 404)
        self.assertEqual(response.json()["detail"]["code"], "policy_chat_disabled")

    def test_enabled_feature_requires_identity(self) -> None:
        response = self.client.get("/api/v1/policy-chat/capabilities")
        self.assertEqual(response.status_code, 401)
        self.assertEqual(response.json()["detail"]["code"], "authentication_required")

    def test_unconfigured_identity_fails_closed(self) -> None:
        settings = PolicyChatSettings(enabled=True, auth_mode="disabled")
        client = TestClient(create_policy_chat_app(settings))
        response = client.get(
            "/api/v1/policy-chat/capabilities",
            headers=self.headers,
        )
        self.assertEqual(response.status_code, 503)
        self.assertEqual(response.json()["detail"]["code"], "identity_not_configured")

    def test_proposal_exposes_origins_ranges_and_hash(self) -> None:
        response = self.propose()
        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(payload["model_id"], "qpm")
        self.assertEqual(payload["operation"], "qpm_impulse_response")
        self.assertTrue(payload["proposal_hash"].startswith("sha256:"))
        parameters = {item["key"]: item for item in payload["parameters"]}
        self.assertEqual(parameters["shock_type"]["value"], "monetary")
        self.assertEqual(parameters["shock_size"]["value"], 2.0)
        self.assertEqual(parameters["shock_size"]["origin"], "user_stated")
        self.assertEqual(parameters["horizon"]["value"], 16)
        self.assertEqual(parameters["horizon"]["allowed_range"], {"min": 8.0, "max": 32.0})

    def test_unknown_scenario_is_safely_declined(self) -> None:
        response = self.propose("Optimize Uzbekistan GDP through 2040")
        self.assertEqual(response.status_code, 422)
        self.assertEqual(response.json()["detail"]["code"], "unsupported_scenario")

    def test_edit_changes_hash_and_invalidates_old_confirmation(self) -> None:
        proposal = self.propose().json()
        edited_response = self.client.patch(
            f"/api/v1/policy-chat/proposals/{proposal['proposal_id']}",
            headers=self.headers,
            json={"values": {"shock_size": 3, "horizon": 20}},
        )
        self.assertEqual(edited_response.status_code, 200)
        edited = edited_response.json()
        self.assertNotEqual(edited["proposal_hash"], proposal["proposal_hash"])

        stale = self.client.post(
            f"/api/v1/policy-chat/proposals/{proposal['proposal_id']}/execute",
            headers=self.headers,
            json={
                "proposal_hash": proposal["proposal_hash"],
                "confirmation": True,
                "client_request_id": "run-stale-1",
            },
        )
        self.assertEqual(stale.status_code, 409)
        self.assertEqual(stale.json()["detail"]["code"], "stale_proposal")

    def test_confirmation_executes_qpm_and_is_idempotent(self) -> None:
        proposal = self.propose().json()
        request = {
            "proposal_hash": proposal["proposal_hash"],
            "confirmation": True,
            "client_request_id": "run-idempotent-1",
        }
        first = self.client.post(
            f"/api/v1/policy-chat/proposals/{proposal['proposal_id']}/execute",
            headers=self.headers,
            json=request,
        )
        second = self.client.post(
            f"/api/v1/policy-chat/proposals/{proposal['proposal_id']}/execute",
            headers=self.headers,
            json=request,
        )
        self.assertEqual(first.status_code, 200)
        self.assertEqual(second.status_code, 200)
        payload = first.json()
        self.assertEqual(second.json()["run_id"], payload["run_id"])
        self.assertEqual(payload["status"], "succeeded")
        self.assertEqual(payload["normalized_result"]["model"], "QPM")
        self.assertTrue(payload["normalized_result"]["solver"]["converged"])
        self.assertEqual(payload["explanation"]["grounding_status"], "deterministic_fallback")
        self.assertIn("not an official forecast", payload["explanation"]["limitations"][0])

    def test_other_user_cannot_access_proposal(self) -> None:
        proposal = self.propose().json()
        response = self.client.patch(
            f"/api/v1/policy-chat/proposals/{proposal['proposal_id']}",
            headers={"X-Policy-Chat-User": "other@example.test"},
            json={"values": {"shock_size": 3}},
        )
        self.assertEqual(response.status_code, 404)

    def test_dfm_read_only_retrieval_is_attributed(self) -> None:
        proposal = self.propose("What is the latest GDP nowcast and uncertainty range?").json()
        self.assertEqual(proposal["model_id"], "dfm")
        response = self.client.post(
            f"/api/v1/policy-chat/proposals/{proposal['proposal_id']}/execute",
            headers=self.headers,
            json={
                "proposal_hash": proposal["proposal_hash"],
                "confirmation": True,
                "client_request_id": "run-dfm-0001",
            },
        )
        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertIn("gdp_nowcast_yoy_pct", payload["normalized_result"])
        self.assertEqual(payload["model_attribution"][0]["module"], "models.dfm.run_nowcast")

    def test_io_trillion_shock_is_converted_and_executed(self) -> None:
        proposal = self.propose(
            "Estimate the output effect of UZS 5 trillion of infrastructure investment"
        ).json()
        self.assertEqual(proposal["model_id"], "io")
        params = {item["key"]: item["value"] for item in proposal["parameters"]}
        self.assertEqual(params["amount_bln_uzs"], 5000.0)
        response = self.client.post(
            f"/api/v1/policy-chat/proposals/{proposal['proposal_id']}/execute",
            headers=self.headers,
            json={
                "proposal_hash": proposal["proposal_hash"],
                "confirmation": True,
                "client_request_id": "run-io-00001",
            },
        )
        self.assertEqual(response.status_code, 200)
        aggregate = response.json()["normalized_result"]["aggregate"]
        self.assertEqual(aggregate["total_demand_shock_bln_uzs"], 5000.0)
        self.assertGreater(aggregate["total_output_effect_bln_uzs"], 5000.0)

    def test_russian_and_uzbek_starter_prompts_are_parsed(self) -> None:
        prompts = [
            ("Повысить ставку на 2 п.п. на 16 кварталов", "ru", "qpm"),
            ("5 trln so'mlik infratuzilma investitsiyasining ta'siri", "uz", "io"),
            ("YAIMning so'nggi joriy bahosi qanday?", "uz", "dfm"),
        ]
        for index, (message, locale, expected) in enumerate(prompts):
            with self.subTest(locale=locale, expected=expected):
                response = self.client.post(
                    "/api/v1/policy-chat/proposals",
                    headers=self.headers,
                    json={
                        "message": message,
                        "locale": locale,
                        "client_turn_id": f"localized-{index:02d}",
                    },
                )
                self.assertEqual(response.status_code, 200)
                self.assertEqual(response.json()["model_id"], expected)
                self.assertEqual(response.json()["locale"], locale)

    def test_model_kill_switch_hides_and_rejects_disabled_model(self) -> None:
        settings = PolicyChatSettings(
            enabled=True,
            auth_mode="dev_header",
            enabled_models=("dfm",),
        )
        client = TestClient(create_policy_chat_app(settings))
        capabilities = client.get(
            "/api/v1/policy-chat/capabilities",
            headers=self.headers,
        )
        self.assertEqual(
            [item["model_id"] for item in capabilities.json()["models"]],
            ["dfm"],
        )
        rejected = client.post(
            "/api/v1/policy-chat/proposals",
            headers=self.headers,
            json={
                "message": "Raise the policy rate by 2pp for 16 quarters",
                "locale": "en",
                "client_turn_id": "disabled-qpm-01",
            },
        )
        self.assertEqual(rejected.status_code, 422)
        self.assertEqual(rejected.json()["detail"]["code"], "model_disabled")

    def test_run_rate_limit_keeps_idempotent_retry_available(self) -> None:
        settings = PolicyChatSettings(
            enabled=True,
            auth_mode="dev_header",
            max_runs_per_minute=1,
        )
        client = TestClient(create_policy_chat_app(settings))
        first_proposal = client.post(
            "/api/v1/policy-chat/proposals",
            headers=self.headers,
            json={
                "message": "Raise the policy rate by 2pp for 16 quarters",
                "locale": "en",
                "client_turn_id": "limited-turn-01",
            },
        ).json()
        first_request = {
            "proposal_hash": first_proposal["proposal_hash"],
            "confirmation": True,
            "client_request_id": "limited-run-01",
        }
        first = client.post(
            f"/api/v1/policy-chat/proposals/{first_proposal['proposal_id']}/execute",
            headers=self.headers,
            json=first_request,
        )
        retry = client.post(
            f"/api/v1/policy-chat/proposals/{first_proposal['proposal_id']}/execute",
            headers=self.headers,
            json=first_request,
        )
        second_proposal = client.post(
            "/api/v1/policy-chat/proposals",
            headers=self.headers,
            json={
                "message": "Raise the policy rate by 3pp for 16 quarters",
                "locale": "en",
                "client_turn_id": "limited-turn-02",
            },
        ).json()
        limited = client.post(
            f"/api/v1/policy-chat/proposals/{second_proposal['proposal_id']}/execute",
            headers=self.headers,
            json={
                "proposal_hash": second_proposal["proposal_hash"],
                "confirmation": True,
                "client_request_id": "limited-run-02",
            },
        )
        self.assertEqual(first.status_code, 200)
        self.assertEqual(retry.json()["run_id"], first.json()["run_id"])
        self.assertEqual(limited.status_code, 429)
        self.assertEqual(limited.headers["Retry-After"], "60")

    def test_durable_store_survives_restart_and_audits_without_prompt(self) -> None:
        prompt = "Raise the policy rate by 2pp for 16 quarters"
        state_file = Path(__file__).with_name("policy_chat_test.sqlite3")
        state_file.unlink(missing_ok=True)
        settings = PolicyChatSettings(
            enabled=True,
            auth_mode="dev_header",
            state_path=str(state_file),
        )
        first_app = create_policy_chat_app(settings)
        try:
            first_client = TestClient(first_app)
            proposal = first_client.post(
                "/api/v1/policy-chat/proposals",
                headers=self.headers,
                json={
                    "message": prompt,
                    "locale": "en",
                    "client_turn_id": "durable-turn-01",
                },
            ).json()
            request = {
                "proposal_hash": proposal["proposal_hash"],
                "confirmation": True,
                "client_request_id": "durable-run-01",
            }
            first_run = first_client.post(
                f"/api/v1/policy-chat/proposals/{proposal['proposal_id']}/execute",
                headers=self.headers,
                json=request,
            ).json()
            events = first_app.state.policy_chat_store.list_events("analyst@example.test")
            self.assertEqual(
                [event["event_type"] for event in events],
                ["proposal_created", "run_confirmed", "run_succeeded"],
            )
            self.assertNotIn(prompt, str(events))
        finally:
            first_app.state.policy_chat_store.close()

        second_app = create_policy_chat_app(settings)
        try:
            second_client = TestClient(second_app)
            repeated = second_client.post(
                f"/api/v1/policy-chat/proposals/{proposal['proposal_id']}/execute",
                headers=self.headers,
                json=request,
            )
            self.assertEqual(repeated.status_code, 200)
            self.assertEqual(repeated.json()["run_id"], first_run["run_id"])
            self.assertTrue(second_client.get("/ready").json()["storage"]["durable"])
        finally:
            second_app.state.policy_chat_store.close()
            state_file.unlink(missing_ok=True)

    def test_readiness_fails_closed_without_proxy_secret(self) -> None:
        settings = PolicyChatSettings(
            enabled=True,
            auth_mode="trusted_proxy",
            proxy_secret="",
        )
        response = TestClient(create_policy_chat_app(settings)).get("/ready")
        self.assertEqual(response.status_code, 503)
        self.assertEqual(
            response.json()["detail"]["code"],
            "proxy_secret_not_configured",
        )

    def test_trusted_proxy_rejects_spoofed_identity_without_secret(self) -> None:
        settings = PolicyChatSettings(
            enabled=True, auth_mode="trusted_proxy", proxy_secret="test-secret"
        )
        client = TestClient(create_policy_chat_app(settings))
        rejected = client.get("/api/v1/policy-chat/capabilities", headers=self.headers)
        accepted = client.get(
            "/api/v1/policy-chat/capabilities",
            headers={**self.headers, "X-Policy-Chat-Proxy-Secret": "test-secret"},
        )
        self.assertEqual(rejected.status_code, 401)
        self.assertEqual(accepted.status_code, 200)


if __name__ == "__main__":
    unittest.main()
