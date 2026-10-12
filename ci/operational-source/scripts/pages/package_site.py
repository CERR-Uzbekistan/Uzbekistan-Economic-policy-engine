"""Explicit public assembly and independent validation; never deploys or deletes."""
from __future__ import annotations

import argparse
import hashlib
from html.parser import HTMLParser
import json
from pathlib import Path, PurePosixPath
import re
from urllib.parse import urlsplit, unquote

ROOT = Path(__file__).resolve().parents[2]
POLICY = Path(__file__).with_name("publication-policy.json")
REVIEW = Path(__file__).with_name("public-metadata-review.json")
MANIFEST = "publication-manifest.json"
PRIVATE = re.compile(r"(?:(?<![A-Za-z])[A-Za-z]:[\\/](?=[A-Za-z0-9_\\])|/(?:Users|home|workspace|app|tmp|etc|private|var/lib)/|file://[^\s\"'<>])", re.I)
SECRET = re.compile(r"(?:-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----|(?<![A-Za-z0-9_-])(?:sk-ant-|sk-proj-|sk-|ghp_|github_pat_|AKIA|AIza)[A-Za-z0-9_-]{20,}|https?://[^\s/\"']+:[^\s/\"']+@)")
SECRET_LITERAL = re.compile(r'''(?:apiKey|api_key|client_secret|access_token|proxy_secret)["']?\s*[:=]\s*["'`][^"'`\r\n]{8,}["'`]''', re.I)
INTERNAL_REFERENCE = re.compile(r"(?:^|[\s;=])(?:docs/|scripts/|mcp_server/|model_specs/|model sources/|apps/)")
SECRET_FIELDS = {"api_key", "apikey", "password", "client_secret", "proxy_secret", "access_token", "refresh_token", "private_key", "authorization"}


class PackagingError(ValueError):
    pass


def digest(data):
    return hashlib.sha256(data).hexdigest()


def safe_relative(path):
    value = PurePosixPath(path)
    if (not path or "\\" in path or value.is_absolute() or any(part in (".", "..") for part in path.split("/"))
            or ":" in path or str(value) != path):
        raise PackagingError("invalid_publication_path")
    return path


def safe_file(root, relative):
    relative = safe_relative(relative)
    root = Path(root).absolute()
    for parent in [root, *root.parents]:
        if parent.is_symlink() or (hasattr(parent, "is_junction") and parent.is_junction()):
            raise PackagingError("symlink_approved_root")
    path = root / relative
    for candidate in [root, *[root.joinpath(*PurePosixPath(relative).parts[:n]) for n in range(1, len(PurePosixPath(relative).parts) + 1)]]:
        if candidate.is_symlink() or (hasattr(candidate, "is_junction") and candidate.is_junction()):
            raise PackagingError(f"symlink_not_publishable: {relative}")
    if not path.resolve().is_relative_to(root.resolve()):
        raise PackagingError(f"source_escapes_approved_root: {relative}")
    if not path.is_file() or path.stat().st_size == 0:
        raise PackagingError(f"required_asset_missing: {relative}")
    return path


def inventory(root):
    result = set()
    for path in Path(root).rglob("*"):
        name = path.relative_to(root).as_posix()
        if path.is_symlink() or (hasattr(path, "is_junction") and path.is_junction()):
            raise PackagingError(f"symlink_not_publishable: {name}")
        if path.is_file():
            result.add(name)
    return result


def policy():
    value = json.loads(POLICY.read_text(encoding="utf-8"))
    for key in ("static_files", "policy_ui_files", "generated_files", "legacy_pages"):
        if len(value[key]) != len(set(value[key])):
            raise PackagingError("duplicate_policy_path")
        for name in value[key]:
            safe_relative(name)
    return value


def vite_assets(dist):
    graph = json.loads(safe_file(dist, ".vite/manifest.json").read_text(encoding="utf-8"))
    if "index.html" not in graph or not graph["index.html"].get("isEntry"):
        raise PackagingError("vite_entry_missing")
    seen, assets = set(), set()
    def visit(key):
        if key in seen:
            return
        seen.add(key)
        if key not in graph:
            raise PackagingError("vite_dependency_missing")
        entry = graph[key]
        for name in [entry["file"], *entry.get("css", []), *entry.get("assets", [])]:
            safe_relative(name)
            if not name.startswith("assets/") or PurePosixPath(name).suffix not in {".js", ".css", ".svg", ".png", ".jpg", ".webp", ".woff", ".woff2"}:
                raise PackagingError("unexpected_vite_asset")
            safe_file(dist, name)
            assets.add(name)
        for child in entry.get("imports", []) + entry.get("dynamicImports", []):
            visit(child)
    visit("index.html")
    if seen != set(graph):
        raise PackagingError("unreachable_vite_output")
    return assets


def walk_strings(value, pointer=""):
    if isinstance(value, dict):
        for key, item in value.items():
            next_pointer = pointer + "/" + key.replace("~", "~0").replace("/", "~1")
            if key.lower() in SECRET_FIELDS and item not in (None, "", [], {}):
                raise PackagingError("credential_field_in_public_data")
            yield from walk_strings(item, next_pointer)
    elif isinstance(value, list):
        for index, item in enumerate(value):
            yield from walk_strings(item, pointer + "/" + str(index))
    elif isinstance(value, str):
        yield pointer, value


def inspect_content(name, body, reviews):
    if PurePosixPath(name).suffix not in {".json", ".html", ".js", ".css", ".svg"}:
        return
    text = body.decode("utf-8")
    if PRIVATE.search(text) or SECRET.search(text) or SECRET_LITERAL.search(text):
        raise PackagingError(f"private_path_or_credential: {name}")
    if name.endswith(".json"):
        value = json.loads(text)
        for pointer, string in walk_strings(value):
            if PRIVATE.search(string) or SECRET.search(string):
                raise PackagingError(f"private_path_or_credential: {name}")
            if INTERNAL_REFERENCE.search(string):
                identity = digest(string.encode())
                if reviews.get(name, {}).get(pointer) != identity:
                    raise PackagingError(f"unreviewed_provenance_reference: {name}{pointer}")


class References(HTMLParser):
    def __init__(self):
        super().__init__()
        self.values = []
    def handle_starttag(self, tag, attrs):
        for key, value in attrs:
            if key in ("src", "href") and value and not any(marker in value for marker in ("${", "{{")):
                self.values.append(value)


def check_links(site, base):
    for path in Path(site).rglob("*.html"):
        parser = References()
        parser.feed(path.read_text(encoding="utf-8"))
        source = path.relative_to(site).as_posix()
        for ref in parser.values:
            parsed = urlsplit(ref)
            if parsed.scheme or parsed.netloc or not parsed.path:
                continue
            target = unquote(parsed.path)
            if target.startswith("/"):
                if not target.startswith(base):
                    raise PackagingError(f"incorrect_policy_ui_base: {source}")
                target = "policy-ui/" + target[len(base):]
                candidate = Path(site) / target
            else:
                candidate = path.parent / target
            resolved = candidate.resolve()
            if not resolved.is_relative_to(Path(site).resolve()):
                raise PackagingError(f"link_escapes_site: {source}")
            if resolved.is_dir():
                resolved /= "index.html"
            if not resolved.is_file():
                raise PackagingError(f"required_link_missing: {source} -> {ref}")


def planned_files(repo, dist, base):
    rules = policy()
    assets = vite_assets(dist)
    allowed_dist = set(rules["policy_ui_files"]) | assets | {".vite/manifest.json", ".vite/build-configuration.json"}
    unexpected = inventory(dist) - allowed_dist
    if unexpected:
        raise PackagingError("unexpected_build_paths: " + ", ".join(sorted(unexpected)))
    files = {}
    for name in rules["static_files"]:
        files[name] = safe_file(repo, name).read_bytes()
    for name in rules["policy_ui_files"] + sorted(assets):
        files["policy-ui/" + name] = safe_file(dist, name).read_bytes()
        if name != "index.html" and name not in assets:
            original = safe_file(repo, "apps/policy-ui/public/" + name).read_bytes()
            if files["policy-ui/" + name] != original:
                raise PackagingError("public_data_changed_during_build: " + name)
    files["policy-ui/404.html"] = files["policy-ui/index.html"]
    files["synthesis/index.html"] = safe_file(repo, "scripts/pages/synthesis-unavailable.html").read_bytes()
    files[".nojekyll"] = b"\n"
    if base not in files["policy-ui/index.html"].decode():
        raise PackagingError("policy_ui_build_base_mismatch")
    for page in rules["legacy_pages"]:
        source = files[page].decode()
        if "../shared/model-readiness.js" not in source or "ModelReadiness.requireExecution" not in source:
            raise PackagingError("legacy_readiness_gate_missing")
    return files


def assemble(repo, dist, output, base):
    if not re.fullmatch(r"/(?:[A-Za-z0-9_-]+/)*policy-ui/", base):
        raise PackagingError("invalid_policy_ui_base")
    output = Path(output).absolute()
    if not output.is_relative_to(Path(repo).absolute()) or output == Path(repo).absolute():
        raise PackagingError("output_outside_workspace")
    for candidate in [output, *output.parents]:
        if candidate.is_symlink() or (hasattr(candidate, "is_junction") and candidate.is_junction()):
            raise PackagingError("symlink_output_directory")
    if output.exists() and any(output.iterdir()):
        raise PackagingError("output_must_be_empty")
    files = planned_files(repo, dist, base)
    reviews = json.loads(REVIEW.read_text(encoding="utf-8"))["references"]
    for name, body in files.items():
        inspect_content(name, body, reviews)
    output.mkdir(parents=True, exist_ok=True)
    entries = []
    for name, body in sorted(files.items()):
        destination = output / name
        destination.parent.mkdir(parents=True, exist_ok=True)
        destination.write_bytes(body)
        entries.append({"path": name, "sha256": digest(body), "bytes": len(body)})
    manifest = {"schema_version": "publication-manifest-v1", "policy_sha256": digest(POLICY.read_bytes()),
                "policy_ui_base": base, "files": entries}
    (output / MANIFEST).write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")
    validate(repo, dist, output, base)
    return manifest


def validate(repo, dist, output, base):
    expected = planned_files(repo, dist, base)
    release_files = {name for name in ("release-identity.json", "release-verification.json") if (Path(output) / name).exists()}
    if release_files:
        from release_contract import verify_identity
        verify_identity(output)
    if inventory(output) != set(expected) | {MANIFEST} | release_files:
        raise PackagingError("unexpected_or_missing_publication_paths")
    manifest = json.loads(safe_file(output, MANIFEST).read_text(encoding="utf-8"))
    if (set(manifest) != {"schema_version", "policy_ui_base", "policy_sha256", "files"}
            or manifest.get("schema_version") != "publication-manifest-v1" or manifest.get("policy_ui_base") != base
            or manifest.get("policy_sha256") != digest(POLICY.read_bytes())):
        raise PackagingError("publication_manifest_incompatible")
    entries = manifest["files"]
    if {entry["path"] for entry in entries} != set(expected) or len(entries) != len(expected):
        raise PackagingError("publication_manifest_paths_mismatch")
    reviews = json.loads(REVIEW.read_text(encoding="utf-8"))["references"]
    for entry in entries:
        if set(entry) != {"path", "sha256", "bytes"}:
            raise PackagingError("publication_manifest_entry_incompatible")
        name = safe_relative(entry["path"])
        body = safe_file(output, name).read_bytes()
        if digest(body) != entry["sha256"] or len(body) != entry["bytes"] or body != expected[name]:
            raise PackagingError("publication_hash_mismatch: " + name)
        inspect_content(name, body, reviews)
    check_links(output, base)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("command", choices=("assemble", "validate"))
    parser.add_argument("--repo", type=Path, default=ROOT)
    parser.add_argument("--dist", type=Path, default=ROOT / "apps/policy-ui/dist")
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--base", default="/Uzbekistan-Economic-policy-engine/policy-ui/")
    args = parser.parse_args()
    try:
        if args.command == "assemble":
            result = assemble(args.repo, args.dist, args.output, args.base)
            print(f"PASS assembled {len(result['files'])} public files; no deployment")
        else:
            validate(args.repo, args.dist, args.output, args.base)
            print("PASS publication paths, content, hashes, dependencies and qualifications")
    except (PackagingError, OSError, ValueError) as error:
        if not isinstance(error, PackagingError):
            print("FAIL packaging input unavailable or incompatible")
        else:
            print("FAIL " + str(error))
        raise SystemExit(1) from None


if __name__ == "__main__":
    main()
