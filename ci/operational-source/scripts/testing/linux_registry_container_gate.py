"""Frozen Registry image acceptance with owned, network-disabled containers."""
import argparse
import hashlib
import json
import os
import subprocess
import tempfile
import time
from pathlib import Path
from uuid import uuid4


def run_gate(source, evidence):
    if os.name != "posix":
        raise RuntimeError("linux_platform_required")
    source = source.resolve()
    evidence.mkdir(parents=True, exist_ok=True)
    snapshot = json.loads((source / "clean-source-snapshot.json").read_text())
    for name, expected in snapshot["files"].items():
        assert hashlib.sha256((source / name).read_bytes()).hexdigest() == expected, name
    prefix = "registry-review-" + uuid4().hex
    image = prefix + ":review"
    containers, commands, private_fixtures = [], [], []
    marker = "synthetic private fixture; excluded from Registry image"
    record = {"schema": "registry-container-evidence-v1", "status": "failed",
              "source_identity": snapshot["source_identity"],
              "source_commit": snapshot["original_head"], "deployment": False,
              "checks": {}, "commands": commands}

    def command(args, *, checked=True):
        result = subprocess.run(args, cwd=source, text=True, stdout=subprocess.PIPE,
                                stderr=subprocess.STDOUT, timeout=300, check=False)
        commands.append({"command": args, "exit_code": result.returncode})
        if checked and result.returncode:
            (evidence / f"failed-command-{len(commands)}.log").write_text(result.stdout[-12000:])
            last = result.stdout.strip().splitlines()[-1] if result.stdout.strip() else "no diagnostic output"
            raise RuntimeError("registry_container_command_failed: " + last)
        return result.returncode, result.stdout.strip()

    def probe(name, mode):
        _, output = command(["docker", "exec", name, "python", "/run/registry-probe.py", mode])
        return json.loads(output.splitlines()[-1])

    def health(name, expected):
        deadline = time.monotonic() + 15
        while time.monotonic() < deadline:
            _, output = command(["docker", "inspect", "--format", "{{.State.Health.Status}}", name])
            if output == expected:
                return expected
            time.sleep(0.2)
        raise RuntimeError("registry_healthcheck_state_mismatch")

    try:
        for relative in ["mcp_server/.env", "mcp_server/api/private-container-fixture.json",
                         "apps/policy-ui/public/data/private-container-fixture.json"]:
            path = source / relative
            assert not path.exists()
            path.write_text(marker)
            private_fixtures.append(path)
        command(["docker", "build", "-f", "Dockerfile", "--iidfile",
                 str(evidence.resolve() / "image-id.txt"), "--label",
                 "io.policy.source-identity=" + snapshot["source_identity"], "-t", image, "."])
        record["image_id"] = (evidence / "image-id.txt").read_text().strip()
        with tempfile.TemporaryDirectory(prefix="registry-corruption-") as temporary:
            temporary = Path(temporary)
            temporary.chmod(0o755)
            empty = temporary / "empty"
            empty.mkdir(mode=0o755)
            malformed = temporary / "qpm.json"
            malformed.write_text("{ invalid synthetic JSON")
            malformed.chmod(0o644)
            for mode in ["normal", "missing", "malformed"]:
                name = prefix + "-" + mode
                args = ["docker", "run", "--detach", "--name", name, "--network", "none",
                        "--read-only", "--tmpfs", "/tmp:rw,noexec,nosuid,size=16m",
                        "--cap-drop", "ALL", "--security-opt", "no-new-privileges:true",
                        "--pids-limit", "64", "--health-interval", "1s",
                        "--health-start-period", "0s", "--health-retries", "1",
                        "--mount", "type=bind,src=" + str(source / "scripts/testing/registry_container_probe.py")
                        + ",dst=/run/registry-probe.py,readonly"]
                destination = "/app/apps/policy-ui/public/data"
                if mode != "normal":
                    origin = empty if mode == "missing" else malformed
                    target = destination if mode == "missing" else destination + "/qpm.json"
                    args += ["--mount", "type=bind,src=" + str(origin) + ",dst=" + target + ",readonly"]
                command(args + [image])
                containers.append(name)
                _, raw = command(["docker", "inspect", name])
                host = json.loads(raw)[0]["HostConfig"]
                assert host["ReadonlyRootfs"] and host["NetworkMode"] == "none" and not host["PortBindings"]
                assert "ALL" in host["CapDrop"] and "no-new-privileges:true" in host["SecurityOpt"]
                value = probe(name, mode)
                value["docker_health"] = health(name, "healthy" if mode == "normal" else "unhealthy")
                if mode == "normal":
                    for artifact, checksum in value["checksums"].items():
                        assert checksum == "sha256:" + snapshot["files"]["apps/policy-ui/public/data/" + artifact + ".json"]
                    command(["docker", "restart", name])
                    assert probe(name, mode) == {k: v for k, v in value.items() if k != "docker_health"}
                    assert health(name, "healthy") == "healthy"
                    value["restart_identical"] = True
                command(["docker", "stop", "--time", "5", name])
                _, raw = command(["docker", "inspect", name])
                state = json.loads(raw)[0]["State"]
                assert not state["Running"] and state["ExitCode"] == 0
                value["graceful_stop"] = True
                record["checks"][mode] = value
        record["status"] = "passed"
    finally:
        cleanup_failed = False
        for name in containers:
            code, _ = command(["docker", "rm", "--force", name], checked=False)
            cleanup_failed |= code != 0
        for path in private_fixtures:
            if path.exists():
                if path.read_text() != marker:
                    cleanup_failed = True
                else:
                    path.unlink()
        record["owned_resources_removed"] = not cleanup_failed
        if cleanup_failed:
            record["status"] = "failed"
        (evidence / "registry-container.json").write_text(json.dumps(record, indent=2) + "\n")
        if cleanup_failed:
            raise RuntimeError("registry_container_cleanup_failed")
    return record


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--source", type=Path, required=True)
    parser.add_argument("--evidence", type=Path, required=True)
    args = parser.parse_args()
    value = run_gate(args.source, args.evidence)
    print(json.dumps({"status": value["status"], "image_id": value["image_id"], "deployment": False}))
