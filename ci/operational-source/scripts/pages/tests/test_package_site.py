"""Publication boundary, integrity, content and direct HTTP regression checks."""
import functools
import http.server
import json
import os
from pathlib import Path
import shutil
import subprocess
import sys
import tempfile
import threading
import unittest
import urllib.error
import urllib.request

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import package_site as packaging


class PackagingTests(unittest.TestCase):
    def setUp(self):
        self.temporary = tempfile.TemporaryDirectory(prefix="publication-", dir=packaging.ROOT / "tmp")
        self.addCleanup(self.temporary.cleanup)
        self.repo = Path(self.temporary.name)
        self.dist = self.repo / "apps/policy-ui/dist"
        self.output = self.repo / "site"
        self.base = "/Uzbekistan-Economic-policy-engine/policy-ui/"
        self.rules = packaging.policy()
        for name in self.rules["static_files"] + ["scripts/pages/synthesis-unavailable.html"]:
            self.copy(packaging.ROOT / name, self.repo / name)
        for name in self.rules["policy_ui_files"]:
            if name != "index.html":
                self.copy(packaging.ROOT / "apps/policy-ui/public" / name,
                          self.repo / "apps/policy-ui/public" / name)
                self.copy(packaging.ROOT / "apps/policy-ui/public" / name, self.dist / name)
        self.write(self.dist / "index.html", '<html><head><script type="module" src="' + self.base + 'assets/main-test.js"></script><link rel="icon" href="' + self.base + 'favicon.svg"></head></html>')
        self.write(self.dist / "assets/main-test.js", "console.info('public fixture');")
        self.write(self.dist / ".vite/manifest.json", json.dumps({"index.html": {
            "file": "assets/main-test.js", "isEntry": True}}))

    def copy(self, source, destination):
        destination.parent.mkdir(parents=True, exist_ok=True)
        shutil.copyfile(source, destination)

    def write(self, destination, value):
        destination.parent.mkdir(parents=True, exist_ok=True)
        destination.write_text(value, encoding="utf-8")

    def assemble(self):
        return packaging.assemble(self.repo, self.dist, self.output, self.base)

    def test_exact_files_and_hashes_and_qualifications(self):
        manifest = self.assemble()
        self.assertEqual({row["path"] for row in manifest["files"]},
            set(self.rules["static_files"]) | {"policy-ui/" + name for name in self.rules["policy_ui_files"]}
            | {"policy-ui/assets/main-test.js"} | set(self.rules["generated_files"]))
        for row in manifest["files"]:
            self.assertEqual(packaging.digest((self.output / row["path"]).read_bytes()), row["sha256"])
        self.assertEqual((self.output / "policy-ui/data/model-manifest.json").read_bytes(),
            (packaging.ROOT / "apps/policy-ui/public/data/model-manifest.json").read_bytes())
        self.assertIn("Historical, unapproved", (self.output / "shared/model-readiness.js").read_text())

    def test_unknown_source_files_never_published(self):
        names = [".mcp.json", ".env", "docs/private.md", "claude-logs/session.json",
            "model sources/private.xlsx", "shared/internal-notes.txt", "qpm_uzbekistan/private.csv",
            "apps/policy-ui/src/private.ts", "tmp/runtime/snapshot.json"]
        for name in names:
            self.write(self.repo / name, "private fixture")
        self.assemble()
        for name in names:
            self.assertFalse((self.output / name).exists())

    def test_unexpected_packaged_files_are_rejected(self):
        self.assemble()
        for name in (".mcp.json", ".env", "docs/internal.md", "source.xlsx", "runtime.log", "src/main.ts", "assets/source.js.map"):
            with self.subTest(name=name):
                path = self.output / name
                self.write(path, "unapproved fixture")
                with self.assertRaisesRegex(packaging.PackagingError, "unexpected_or_missing"):
                    packaging.validate(self.repo, self.dist, self.output, self.base)
                path.unlink()

    def test_unexpected_dist_file_fails_instead_of_copying(self):
        self.write(self.dist / "data/unreviewed.json", "{}")
        with self.assertRaisesRegex(packaging.PackagingError, "unexpected_build_paths"):
            self.assemble()
        self.assertFalse(self.output.exists())

    def test_missing_required_assets_and_wrong_base_fail(self):
        (self.dist / "favicon.svg").unlink()
        with self.assertRaisesRegex(packaging.PackagingError, "required_asset_missing"):
            self.assemble()
        self.copy(packaging.ROOT / "apps/policy-ui/public/favicon.svg", self.dist / "favicon.svg")
        with self.assertRaisesRegex(packaging.PackagingError, "base_mismatch"):
            packaging.assemble(self.repo, self.dist, self.output, "/wrong/policy-ui/")

    def test_hash_tampering_and_manifest_tampering_fail(self):
        self.assemble()
        path = self.output / "index.html"
        original = path.read_bytes()
        path.write_bytes(original + b"tamper")
        with self.assertRaisesRegex(packaging.PackagingError, "hash_mismatch"):
            packaging.validate(self.repo, self.dist, self.output, self.base)
        path.write_bytes(original)
        manifest = json.loads((self.output / packaging.MANIFEST).read_text())
        manifest["files"].append(manifest["files"][0])
        self.write(self.output / packaging.MANIFEST, json.dumps(manifest))
        with self.assertRaisesRegex(packaging.PackagingError, "paths_mismatch"):
            packaging.validate(self.repo, self.dist, self.output, self.base)

    def test_sensitive_content_and_new_internal_references_fail(self):
        reviews = json.loads(packaging.REVIEW.read_text())["references"]
        for value in ({"path": r"C:\Users\fixture\private.xlsx"}, {"path": "/home/fixture/secrets"},
                      {"api_key": "private-test-value"}, {"source": "docs/unreviewed.md"},
                      {"secret": "ghp_" + "a" * 30}, {"url": "https://user:password@example.org"}):
            with self.subTest(value=list(value)):
                with self.assertRaises(packaging.PackagingError):
                    packaging.inspect_content("policy-ui/data/overview.json", json.dumps(value).encode(), reviews)

    def test_symlink_source_is_rejected(self):
        source = self.repo / "shared/toast.js"
        source.unlink()
        outside = self.repo / "private.js"
        self.write(outside, "private fixture")
        try:
            os.symlink(outside, source)
        except OSError:
            self.skipTest("Platform does not permit creating symlinks")
        with self.assertRaisesRegex(packaging.PackagingError, "symlink_not_publishable"):
            self.assemble()

    def test_output_symlink_and_existing_content_rejected(self):
        self.write(self.output / "existing.txt", "preserve me")
        with self.assertRaisesRegex(packaging.PackagingError, "output_must_be_empty"):
            self.assemble()
        self.assertEqual((self.output / "existing.txt").read_text(), "preserve me")

    @unittest.skipUnless(os.name == "nt", "Windows junction test")
    def test_windows_junction_cannot_escape_approved_root(self):
        with tempfile.TemporaryDirectory(prefix="publication-outside-", dir=packaging.ROOT / "tmp") as temporary:
            outside = Path(temporary)
            self.write(outside / "private.js", "private fixture")
            junction = self.repo / "escape"
            completed = subprocess.run(["cmd", "/c", "mklink", "/J", str(junction), str(outside)],
                capture_output=True, creationflags=subprocess.CREATE_NO_WINDOW)
            self.assertEqual(completed.returncode, 0)
            try:
                with self.assertRaisesRegex(packaging.PackagingError, "symlink_not_publishable"):
                    packaging.safe_file(self.repo, "escape/private.js")
            finally:
                junction.rmdir()

    def test_direct_http_routes_assets_data_and_exclusions(self):
        self.assemble()
        class QuietHandler(http.server.SimpleHTTPRequestHandler):
            def log_message(self, *_):
                pass
        server = http.server.ThreadingHTTPServer(("127.0.0.1", 0), functools.partial(QuietHandler, directory=str(self.output)))
        worker = threading.Thread(target=server.serve_forever, daemon=True)
        worker.start()
        try:
            origin = f"http://127.0.0.1:{server.server_port}"
            for route in ["/", "/policy-ui/", "/policy-ui/#/scenario-lab", "/synthesis/",
                          *["/" + name for name in self.rules["legacy_pages"]],
                          "/policy-ui/assets/main-test.js", "/policy-ui/data/model-manifest.json",
                          "/policy-ui/data/overview.json", "/shared/parameter-registry.json"]:
                with urllib.request.urlopen(origin + route) as response:
                    self.assertEqual(response.status, 200)
            for route in ("/.mcp.json", "/docs/private.md", "/apps/policy-ui/src/main.tsx", "/model%20sources/private.xlsx"):
                with self.assertRaises(urllib.error.HTTPError) as error:
                    urllib.request.urlopen(origin + route)
                self.assertEqual(error.exception.code, 404)
                error.exception.close()
        finally:
            server.shutdown()
            server.server_close()
            worker.join(timeout=5)
        self.assertFalse(worker.is_alive())


if __name__ == "__main__":
    unittest.main()
