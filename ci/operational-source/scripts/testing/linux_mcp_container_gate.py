"""Frozen MCP image/Compose acceptance; no published ports or real credentials."""
import argparse
import asyncio
import hashlib
import json
import os
import subprocess
import time
from pathlib import Path
from uuid import uuid4

from mcp import ClientSession, StdioServerParameters
from mcp.client.stdio import stdio_client
from mcp_container_probe import check_session


def run_gate(source, evidence):
    if os.name != "posix":
        raise RuntimeError("linux_platform_required")
    source = source.resolve()
    evidence.mkdir(parents=True, exist_ok=True)
    snapshot = json.loads((source / "clean-source-snapshot.json").read_text())
    for name, expected in snapshot["files"].items():
        assert hashlib.sha256((source / name).read_bytes()).hexdigest() == expected, name
    prefix = "mcp-review-" + uuid4().hex
    image = prefix + ":review"
    token = uuid4().hex
    commands = []
    containers = []
    volume = prefix + "-tokens"
    volume_created = False
    private_fixtures = []
    marker = "synthetic private fixture; must never enter image"
    record = {"schema": "mcp-container-evidence-v1", "status": "failed",
              "source_identity": snapshot["source_identity"],
              "source_commit": snapshot["original_head"], "deployment": False,
              "checks": {}, "commands": commands}

    def command(args, *, input_text=None, checked=True, env=None, check_secret_absent=False):
        result = subprocess.run(args, cwd=source, input=input_text, text=True,
                                stdout=subprocess.PIPE, stderr=subprocess.STDOUT,
                                timeout=300, env=env, check=False)
        commands.append({"command": args, "exit_code": result.returncode})
        if check_secret_absent:
            assert token not in result.stdout, "synthetic token appeared in server logs"
        output = result.stdout.replace(token, "[redacted]")
        if checked and result.returncode:
            (evidence / f"failed-command-{len(commands)}.log").write_text(output[-12000:])
            last = output.strip().splitlines()[-1] if output.strip() else "no diagnostic output"
            raise RuntimeError("mcp_container_command_failed: " + last)
        return result.returncode, output.strip()

    hardened = ["--network", "none", "--read-only", "--tmpfs", "/tmp:rw,noexec,nosuid,size=16m",
                "--cap-drop", "ALL", "--security-opt", "no-new-privileges:true", "--pids-limit", "64"]

    async def stdio_probe(name, execution=False, compose=False):
        containers.append(name)
        env = {**os.environ, "MCP_IMAGE": image, "COMPOSE_DISABLE_ENV_FILE": "true",
               "COMPOSE_STATUS_STDOUT": "false", "COMPOSE_ANSI": "never",
               "COMPOSE_REMOVE_ORPHANS": "false"}
        env.pop("COMPOSE_ENV_FILES", None)
        if compose:
            args = ["compose", "-f", str(source / "mcp_server/docker-compose.yml"),
                    "run", "--rm", "--no-deps", "-T", "--name", name, "mcp-server"]
        else:
            args = ["run", "--rm", "-i", "--name", name, *hardened]
            if execution:
                args += ["-e", "MCP_STDIO_SCOPES=policy:read,policy:execute"]
            args += [image]
        parameters = StdioServerParameters(command="docker", args=args, cwd=str(source), env=env)
        async with stdio_client(parameters) as (read, write), ClientSession(read, write) as session:
            value = await check_session(session, execution=execution)
            _, raw = command(["docker", "inspect", name])
            configuration = json.loads(raw)[0]
            host = configuration["HostConfig"]
            assert host["ReadonlyRootfs"] and host["NetworkMode"] == "none"
            assert not host["PortBindings"] and "ALL" in host["CapDrop"]
            assert "no-new-privileges:true" in host["SecurityOpt"]
            value["no_ports_readonly_network_none"] = True
        # The client owns the process; SDK shutdown must remove its --rm container.
        deadline = time.monotonic() + 10
        while time.monotonic() < deadline:
            code, _ = command(["docker", "inspect", name], checked=False)
            if code:
                value["client_shutdown_removed_container"] = True
                return value
            await asyncio.sleep(0.1)
        raise RuntimeError("stdio_container_remained_after_client_shutdown")

    try:
        # These owned synthetic files must be absent from the image allowlist.
        for relative in ["mcp_server/.env", "mcp_server/data/private-container-fixture.json",
                         "shared/private-container-fixture.txt"]:
            target = source / relative
            assert not target.exists()
            target.write_text(marker)
            private_fixtures.append(target)
        command(["docker", "build", "-f", "mcp_server/Dockerfile", "--iidfile",
                 str(evidence.resolve() / "image-id.txt"), "--label",
                 "io.policy.source-identity=" + snapshot["source_identity"], "-t", image, "."])
        record["image_id"] = (evidence / "image-id.txt").read_text().strip()
        record["checks"]["stdio"] = asyncio.run(stdio_probe(prefix + "-stdio"))
        record["checks"]["compose"] = asyncio.run(stdio_probe(prefix + "-compose", compose=True))
        record["checks"]["execution_scope"] = asyncio.run(stdio_probe(prefix + "-execute", execution=True))
        command(["docker", "volume", "create", volume])
        volume_created = True
        rows = [{"token_sha256": hashlib.sha256(token.encode()).hexdigest(), "client_id": "synthetic-owner",
                 "scopes": ["policy:read"], "expires_at": int(time.time()) + 600,
                 "resource": "http://127.0.0.1:8000/mcp"}]
        command(["docker", "run", "--rm", "-i", *hardened, "--mount",
                 "type=volume,src=" + volume + ",dst=/run/mcp-config", image, "python", "-c",
                 ("import pathlib,sys; p=pathlib.Path('/run/mcp-config/tokens.json'); "
                 "p.write_text(sys.stdin.read()); p.chmod(0o400)")], input_text=json.dumps(rows))
        for mode in ["anonymous", "bearer"]:
            name = prefix + "-" + mode
            args = ["docker", "run", "--detach", "--name", name, *hardened,
                    "-e", "MCP_TRANSPORT=http", "--mount",
                    "type=bind,src=" + str(source / "scripts/testing/mcp_container_probe.py")
                    + ",dst=/run/mcp-probe.py,readonly"]
            if mode == "bearer":
                args += ["--mount", "type=volume,src=" + volume + ",dst=/run/mcp-config,readonly",
                         "-e", "MCP_AUTH_MODE=bearer", "-e", "MCP_TOKEN_FILE=/run/mcp-config/tokens.json",
                         "-e", "MCP_AUTH_ISSUER=http://127.0.0.1:9000",
                         "-e", "MCP_AUTH_RESOURCE=http://127.0.0.1:8000/mcp"]
            command(args + [image])
            containers.append(name)
            _, output = command(["docker", "exec", "-i", name, "python", "/run/mcp-probe.py", mode],
                                input_text=token if mode == "bearer" else "")
            record["checks"][mode] = json.loads(output.splitlines()[-1])
            command(["docker", "logs", name], check_secret_absent=True)
            command(["docker", "stop", "--time", "5", name])
        code, output = command(["docker", "run", "--rm", *hardened, "-e", "MCP_TRANSPORT=http",
                                "-e", "MCP_HOST=0.0.0.0", image], checked=False)
        assert code == 2 and "remote_binding_requires_authenticated_configuration" in output
        record["checks"]["unsafe_binding_rejected"] = True
        record["status"] = "passed"
    finally:
        cleanup_failed = False
        for name in containers:
            code, _ = command(["docker", "inspect", name], checked=False)
            if code == 0:
                code, _ = command(["docker", "rm", "--force", name], checked=False)
                cleanup_failed |= code != 0
        if volume_created:
            code, _ = command(["docker", "volume", "rm", volume], checked=False)
            cleanup_failed |= code != 0
        for path in private_fixtures:
            if path.exists():
                if path.read_text() != marker:
                    cleanup_failed = True
                else:
                    path.unlink()
        if cleanup_failed:
            record["status"] = "failed"
        record["owned_resources_removed"] = not cleanup_failed
        (evidence / "mcp-container.json").write_text(json.dumps(record, indent=2) + "\n")
        if cleanup_failed:
            raise RuntimeError("mcp_container_cleanup_failed")
    return record


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--source", type=Path, required=True)
    parser.add_argument("--evidence", type=Path, required=True)
    args = parser.parse_args()
    value = run_gate(args.source, args.evidence)
    print(json.dumps({"status": value["status"], "image_id": value["image_id"], "deployment": False}))
