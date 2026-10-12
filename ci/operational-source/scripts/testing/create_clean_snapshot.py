"""Copy a reviewable clean source snapshot, excluding credentials and generated runtime state."""

import argparse
import hashlib
import json
import os
import shutil
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
ROOTS = [
    "mcp_server",
    "apps/policy-ui",
    "model_specs",
    "scripts",
    "shared",
    "qpm_uzbekistan",
    "dfm_nowcast",
    "io_model",
    "pe_model",
    "cge_model",
    "fpp_model",
    "docs",
    ".github/workflows",
]
EXTENSIONS = {
    ".py",
    ".ts",
    ".tsx",
    ".js",
    ".mjs",
    ".json",
    ".css",
    ".html",
    ".svg",
    ".R",
    ".toml",
    ".lock",
    ".yaml",
    ".yml",
    ".csv",
    ".md",
    ".txt",
}
EXCLUDE = {
    "node_modules",
    "dist",
    ".test-dist",
    "local-runtime",
    "generated",
    "build",
    "__pycache__",
    ".pytest_cache",
    ".venv",
    ".git",
    ".vite-temp",
}


def snapshot(destination):
    if destination.exists():
        raise ValueError("snapshot_destination_must_be_new")
    names = {".gitignore", ".dockerignore", "README.md", "Dockerfile", "Dockerfile.dockerignore", "Dockerfile.policy-chat"}
    names.update({"mcp_server/Dockerfile", "mcp_server/Dockerfile.dockerignore"})
    # Only reviewed non-secret examples; real environment files stay excluded.
    names.update({"apps/policy-ui/.env.policy-chat.example", "mcp_server/.env.example"})
    publication = json.loads((ROOT / "scripts/pages/publication-policy.json").read_text())
    names.update(publication["static_files"])
    contract = json.loads((ROOT / "scripts/testing/model-fixture-contract.json").read_text())
    names.update(contract["sources"])
    for directory in ROOTS:
        for parent, dirs, files in os.walk(ROOT / directory):
            dirs[:] = [
                name
                for name in dirs
                if name not in EXCLUDE
                and not name.startswith("pytest-cache")
                and not name.endswith(".egg-info")
            ]
            for name in files:
                path = Path(parent) / name
                if (
                    path.suffix in EXTENSIONS
                    and not name.startswith(".env")
                    and not (
                        Path(parent) == ROOT / "mcp_server/data"
                        and name in ["dfm_data.json", "io_data.json", "pe_data.json"]
                    )
                ):
                    names.add(path.relative_to(ROOT).as_posix())
    hashes = {}
    for name in sorted(names):
        source = ROOT / name
        if source.is_symlink() or (hasattr(source, "is_junction") and source.is_junction()):
            raise ValueError("snapshot_symlink_rejected")
        target = destination / name
        target.parent.mkdir(parents=True, exist_ok=True)
        shutil.copyfile(source, target)
        hashes[name] = hashlib.sha256(target.read_bytes()).hexdigest()
    identity = hashlib.sha256(json.dumps(hashes, sort_keys=True, separators=(",", ":")).encode()).hexdigest()
    original_head = subprocess.check_output(["git", "rev-parse", "HEAD"], cwd=ROOT, text=True).strip()
    original_branch = subprocess.check_output(["git", "branch", "--show-current"], cwd=ROOT, text=True).strip()
    (destination / "clean-source-snapshot.json").write_text(
        json.dumps(
            {"kind": "working-tree-source-snapshot", "schema_version": "acceptance-source-snapshot-v1",
             "approval_effect": "none", "original_head": original_head, "original_branch": original_branch,
             "source_identity": "sha256:" + identity, "files": hashes,
             "excluded": sorted(EXCLUDE), "credential_files_excluded": True,
             "synthetic_commit": "isolated snapshot only; does not commit the original working tree"},
            sort_keys=True,
            indent=2,
        )
        + "\n"
    )
    subprocess.run(["git", "init", "--quiet"], cwd=destination, check=True)
    subprocess.run(
        ["git", "add", "."],
        cwd=destination,
        check=True,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )
    subprocess.run(
        [
            "git",
            "-c",
            "user.name=Isolated verification",
            "-c",
            "user.email=verification@example.invalid",
            "commit",
            "--quiet",
            "-m",
            "Isolated working-tree snapshot",
        ],
        cwd=destination,
        check=True,
    )
    print(json.dumps({"snapshot_files": len(hashes), "source_identity": "sha256:" + identity, "approval_effect": "none"}))


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--output", type=Path, required=True)
    snapshot(parser.parse_args().output.resolve())
