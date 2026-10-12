"""POSIX publication gate: a skipped symlink test is a mandatory failure."""
import json
import os
import unittest
from pathlib import Path


def main():
    if os.name != "posix":
        raise RuntimeError("posix_platform_required")
    root = Path(__file__).resolve().parents[2]
    (root / "tmp").mkdir(exist_ok=True)
    suite = unittest.defaultTestLoader.discover(str(root / "scripts/pages/tests"))
    result = unittest.TextTestRunner(verbosity=2).run(suite)
    mandatory_skips = [test.id() for test, _ in result.skipped
                       if not test.id().endswith("test_windows_junction_cannot_escape_approved_root")]
    if not result.wasSuccessful() or mandatory_skips:
        raise RuntimeError("mandatory_publication_checks_failed_or_skipped")
    print(json.dumps({"platform": "posix", "tests": result.testsRun,
                      "skips": [{"test": t.id(), "reason": r} for t, r in result.skipped],
                      "posix_symlink_rejection": "passed", "publication_enabled": False}))


if __name__ == "__main__":
    main()
