"""Internal isolated-container probes; never exposes a listener or real records."""
import argparse
import asyncio
import importlib.util
import json
import os
import sqlite3
import subprocess
import sys
import time
from pathlib import Path


def web_probe(memory=False):
    import httpx
    from api.policy_chat_runners import EngineModelRunner
    from models.readiness import load_manifest

    assert os.getuid() == 10001, "container must use the declared non-root UID"
    health = httpx.get("http://127.0.0.1:8001/health", timeout=3)
    assert health.status_code == 200 and health.json() == {"status": "ok"}
    ready = httpx.get("http://127.0.0.1:8001/ready", timeout=5)
    if memory:
        assert ready.status_code == 503
        reasons = ready.json()["detail"]["reasons"]
        assert any(r["code"] == "in_memory_state_not_allowed" for r in reasons)
    else:
        assert ready.status_code == 200, "real container dependencies must be ready"
        value = ready.json()
        assert value["storage"]["durable"] and value["storage"]["schema_version"] == 3
        assert not any(m["approval"]["authoritative"] for m in value["model_readiness"].values())
        state = Path(os.environ["POLICY_CHAT_STATE_PATH"])
        for path in [state, Path(str(state) + "-wal"), Path(str(state) + "-shm")]:
            assert path.is_file() and path.stat().st_uid == 10001
            assert path.stat().st_mode & 0o077 == 0, "state files must be owner-private"
    unauthorized = httpx.get("http://127.0.0.1:8001/api/v1/policy-chat/capabilities", timeout=3)
    assert unauthorized.status_code == 401
    manifest = load_manifest()
    runner = EngineModelRunner(Path("/app/mcp_server/data"))
    assert runner.readiness("fpp")["status"] == "blocked"
    assert all(not v["approval"].get("authoritative", False) for v in manifest["variants"])
    return {"non_root_uid": os.getuid(), "health": health.status_code,
            "ready": ready.status_code, "production_memory_rejected": memory,
            "unauthorized_rejected": True, "approval_gates_preserved": True,
            "model_execution": False}


async def mcp_probe():
    from mcp import ClientSession, StdioServerParameters
    from mcp.client.stdio import stdio_client

    env = {k: v for k, v in os.environ.items() if not k.startswith("MCP_")}
    env.update({"MCP_TRANSPORT": "stdio", "MCP_HOST": "127.0.0.1",
                "MCP_STDIO_SCOPES": "policy:read"})
    parameters = StdioServerParameters(command=sys.executable, args=["/app/mcp_server/main.py"],
                                       cwd="/app/mcp_server", env=env)
    async with stdio_client(parameters) as (read, write), ClientSession(read, write) as session:
        await session.initialize()
        assert (await session.list_tools()).tools
        result = await session.call_tool("list_models", {})
        value = result.structuredContent or json.loads(result.content[0].text)
        assert "model_manifest" in value
        for tool, inputs in [("update_tracker_data", {}),
                             ("model_execute", {"variant_id": "fpp-workbook-public-output-v0",
                                                "inputs": {}, "intent": "authoritative"})]:
            denied = await session.call_tool(tool, inputs)
            value = denied.structuredContent or json.loads(denied.content[0].text)
            assert value["error"]["code"] == "permission_denied"
    return {"mcp_stdio_initialize_list_readonly_shutdown": True, "mutation_denied": True,
            "model_execution_permission_denied": True}


def worker(root, index, limited):
    from api.policy_chat_store import ExecutionLimit, PolicyChatStore

    store = PolicyChatStore(str(root / "workers.sqlite3"))
    (root / f"ready-{index}").touch()
    deadline = time.monotonic() + 15
    while not (root / "go").exists():
        if time.monotonic() >= deadline:
            raise TimeoutError("worker coordination deadline")
        time.sleep(0.01)
    try:
        key = str(index) if limited else "same-key"
        return store.claim_execution("synthetic-workers", key, {"fixture": "storage-only"},
                                     max_runs_per_minute=1 if limited else 10)
    except ExecutionLimit as error:
        return error.detail
    finally:
        store.close()


def processes(root, limited=False):
    root.mkdir()
    children = [subprocess.Popen([sys.executable, __file__, "worker", "--root", str(root),
                                 "--index", str(i), *( ["--limited"] if limited else [])],
                                stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
                for i in range(6)]
    try:
        deadline = time.monotonic() + 15
        while len(list(root.glob("ready-*"))) != 6:
            if any(p.poll() is not None for p in children) or time.monotonic() >= deadline:
                failures = []
                for child in children:
                    if child.poll() is not None:
                        _, stderr = child.communicate(timeout=1)
                        failures.append({"exit_code": child.returncode,
                                         "last_error": stderr.splitlines()[-1] if stderr else ""})
                (root / "worker-errors.json").write_text(json.dumps(failures, indent=2))
                raise RuntimeError("independent workers failed before barrier: " + json.dumps(failures))
            time.sleep(0.01)
        (root / "go").touch()
        values = []
        for child in children:
            stdout, _ = child.communicate(timeout=15)
            assert child.returncode == 0, "worker failed"
            values.append(json.loads(stdout))
        assert sum(bool(v.get("claimed")) for v in values) == 1
        if limited:
            assert sum(v.get("code") == "run_rate_limit_exceeded" for v in values) == 5
        else:
            assert len({v["claim_token"] for v in values}) == 1
        return {"workers": 6, "claims": 1, "shared_quota": limited}
    finally:
        for child in children:
            if child.poll() is None:
                child.kill()
            child.wait(timeout=5)


def storage_probe(root):
    from api.policy_chat_store import PolicyChatStore

    assert os.getuid() == 10001
    os.umask(0o077)
    root.mkdir()
    spec = importlib.util.spec_from_file_location("recovery", Path(__file__).with_name("policy_chat_recovery.py"))
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    recovery = module.exercise(root / "recovery")
    workers = processes(root / "workers")
    quotas = processes(root / "quotas", limited=True)
    for boundary in ["after_state", "after_audit", "before_commit"]:
        path = root / f"atomic-{boundary}.sqlite3"
        store = PolicyChatStore(str(path))
        claim = store.claim_execution("synthetic-atomic", boundary, {})
        def fail(actual, expected=boundary):
            if actual == expected:
                raise RuntimeError("synthetic rollback")
        store._terminal_boundary = fail
        try:
            store.finish_execution("synthetic-atomic", boundary, claim["claim_token"], result={"run_id": boundary})
        except RuntimeError:
            pass
        else:
            raise AssertionError("failure injection did not run")
        store.close()
        restarted = PolicyChatStore(str(path))
        item = restarted.claim_execution("synthetic-atomic", boundary, {})
        assert item["state"] == "pending" and item["result_json"] is None
        assert restarted.list_events("synthetic-atomic") == []
        restarted.close()
    for path in root.rglob("*.sqlite3"):
        assert path.stat().st_uid == 10001 and os.access(path, os.R_OK | os.W_OK)
        assert path.stat().st_mode & 0o077 == 0
        with sqlite3.connect(path) as connection:
            assert connection.execute("PRAGMA integrity_check").fetchone()[0] == "ok"
    return {"recovery": recovery, "workers": workers, "quotas": quotas,
            "atomic_rollback_boundaries": 3, "mounted_files_owned_writable_by_non_root": True}


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("mode", choices=["web", "memory", "mcp", "storage", "worker", "restart"])
    parser.add_argument("--root", type=Path)
    parser.add_argument("--index", type=int)
    parser.add_argument("--limited", action="store_true")
    args = parser.parse_args()
    if args.mode in ("web", "memory"):
        value = web_probe(args.mode == "memory")
    elif args.mode == "mcp":
        value = asyncio.run(mcp_probe())
    elif args.mode == "worker":
        value = worker(args.root, args.index, args.limited)
    elif args.mode == "storage":
        value = storage_probe(args.root)
    else:
        from api.policy_chat_store import PolicyChatStore
        store = PolicyChatStore(str(args.root / "recovery/synthetic-restored.sqlite3"))
        rows = store._connection.execute("SELECT * FROM policy_chat_executions ORDER BY client_request_id").fetchall()
        assert {r["state"] for r in rows} == {"pending", "successful"}
        assert len(store._connection.execute("SELECT * FROM policy_chat_audit_events").fetchall()) == 1
        for row in rows:
            replay = store.claim_execution(row["owner"], row["client_request_id"], json.loads(row["snapshot_json"]))
            assert not replay["claimed"] and replay["state"] == row["state"]
            assert replay["result_json"] == row["result_json"]
        store.close()
        quarantine = PolicyChatStore(str(args.root / "recovery/synthetic-quarantine-restored.sqlite3"))
        assert quarantine.get_proposal("synthetic-legacy") is None
        assert quarantine._connection.execute("SELECT count(*) FROM policy_chat_identity_quarantine").fetchone()[0] >= 3
        assert quarantine._connection.execute("SELECT state FROM policy_chat_executions").fetchone()[0] == "pending"
        quarantine.close()
        value = {"container_restart_persistence": True, "pending_unresolved": True,
                 "quarantine_preserved": True, "successful_replay_unchanged": True}
    print(json.dumps(value))


if __name__ == "__main__":
    main()
