"""Executable review-only Linux/Docker gate; isolated network and synthetic volume."""
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
        assert hashlib.sha256((source / name).read_bytes()).hexdigest() == expected, "source snapshot drift"
    commands = []
    def command(args, *, checked=True):
        result = subprocess.run(args, cwd=source, text=True, stdout=subprocess.PIPE,
                                stderr=subprocess.STDOUT, timeout=300, check=False)
        commands.append({"command": args, "exit_code": result.returncode})
        if checked and result.returncode:
            raise RuntimeError("platform_command_failed: " + args[0])
        return result.stdout.strip()
    name = "policy-platform-" + uuid4().hex
    memory = name + "-memory"
    volume = name + "-synthetic"
    image = name + ":review"
    root = "/var/lib/policy-chat/platform-synthetic"
    record = {"schema_version": "linux-container-evidence-v1", "source_identity": snapshot["source_identity"],
              "source_commit": snapshot["original_head"], "release_eligible": False,
              "model_manifest_sha256": snapshot["files"]["apps/policy-ui/public/data/model-manifest.json"],
              "qualification": "isolated mechanics only; no operator or model approval",
              "status": "failed", "checks": {}, "commands": commands}
    containers = []
    volume_created = False
    try:
        command(["docker", "version", "--format", "{{json .}}"])
        command(["docker", "build", "--iidfile", str(evidence.resolve() / "image-id.txt"),
                 "--label", "io.policy.source-identity=" + snapshot["source_identity"],
                 "-f", "Dockerfile.policy-chat", "-t", image, "."])
        record["image_id"] = (evidence / "image-id.txt").read_text().strip()
        record["image_repo_digests"] = json.loads(command(["docker", "image", "inspect", image,
                                                          "--format", "{{json .RepoDigests}}"] ))
        assert command(["docker", "image", "inspect", image, "--format", "{{.Config.User}}"] ) == "policy-chat"
        command(["docker", "volume", "create", volume])
        volume_created = True
        with tempfile.TemporaryDirectory(prefix="synthetic-proxy-") as temporary:
            envfile = Path(temporary) / "test.env"
            # Secret appears only in the ephemeral env file, never command/evidence/log output.
            envfile.write_text("POLICY_CHAT_ENABLED=true\nPOLICY_CHAT_AUTH_MODE=trusted_proxy\n"
                               "POLICY_CHAT_PROXY_SECRET=" + uuid4().hex + "\n"
                               "POLICY_CHAT_ENABLED_MODELS=io,dfm,qpm\n")
            envfile.chmod(0o600)
            def start(container, in_memory=False):
                args = ["docker", "run", "--detach", "--name", container, "--network", "none",
                        "--env-file", str(envfile), "--mount", "type=volume,src=" + volume + ",dst=/var/lib/policy-chat"]
                if in_memory:
                    args += ["-e", "POLICY_CHAT_STATE_PATH=:memory:", "-e", "POLICY_CHAT_ALLOW_IN_MEMORY_STATE=true"]
                command(args + [image])
                containers.append(container)
                for filename in ["platform_container_probe.py", "policy_chat_recovery.py"]:
                    command(["docker", "cp", str(source / "scripts/testing" / filename), container + ":/tmp/" + filename])
                deadline = time.monotonic() + 30
                while time.monotonic() < deadline:
                    text = command(["docker", "exec", container, "python", "-c",
                                    "import urllib.request; print(urllib.request.urlopen('http://127.0.0.1:8001/health',timeout=1).status)"], checked=False)
                    if text == "200":
                        return
                    time.sleep(0.2)
                raise TimeoutError("container_liveness_deadline")
            def probe(container, mode):
                value = command(["docker", "exec", "-e", "PYTHONPATH=/app/mcp_server", container,
                                 "python", "/tmp/platform_container_probe.py", mode, "--root", root])
                return json.loads(value.splitlines()[-1])
            start(name)
            record["checks"]["service"] = probe(name, "web")
            record["checks"]["mcp"] = probe(name, "mcp")
            record["checks"]["durable_recovery"] = probe(name, "storage")
            command(["docker", "restart", name])
            record["checks"]["restart"] = probe(name, "restart")
            start(memory, in_memory=True)
            record["checks"]["production_memory_rejection"] = probe(memory, "memory")
        record["status"] = "passed"
    finally:
        cleanup_failed = False
        for container in containers:
            command(["docker", "rm", "--force", container], checked=False)
            cleanup_failed = cleanup_failed or commands[-1]["exit_code"] != 0
        if volume_created:
            command(["docker", "volume", "rm", volume], checked=False)
            cleanup_failed = cleanup_failed or commands[-1]["exit_code"] != 0
        if cleanup_failed:
            record["status"] = "failed"
            record["cleanup_failed"] = True
        (evidence / "container.json").write_text(json.dumps(record, indent=2) + "\n")
        if cleanup_failed:
            raise RuntimeError("synthetic_container_cleanup_failed")
    return record


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--source", type=Path, required=True)
    parser.add_argument("--evidence", type=Path, required=True)
    args = parser.parse_args()
    result = run_gate(args.source, args.evidence)
    print(json.dumps({"status": result["status"], "source_identity": result["source_identity"],
                      "image_id": result["image_id"], "release_eligible": False}))


if __name__ == "__main__":
    main()
