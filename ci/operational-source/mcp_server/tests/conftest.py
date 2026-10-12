"""Tests require visible fixture preparation; missing/corrupt setup is never a pass."""

import sys
from pathlib import Path

import openpyxl
import pytest

ROOT = Path(__file__).resolve().parents[2]


def bootstrap_checkout():
    """Pytest entry point: resolve checkout modules before collection.

    Standalone Russia scenario scripts use sibling imports, so their directory
    must also precede collection. Runtime/application import policy is unchanged.
    """
    for directory in (ROOT, ROOT / "mcp_server", ROOT / "scripts/testing", ROOT / "scripts/russia_shock"):
        sys.path.insert(0, str(directory))
    from prepare_model_fixtures import FixtureSetupError, validate

    return FixtureSetupError, validate


FixtureSetupError, validate = bootstrap_checkout()


def pytest_sessionstart(session):
    try:
        report = validate(ROOT)
    except FixtureSetupError as error:
        raise pytest.UsageError("Mandatory model fixture setup failed: " + str(error)) from error
    original_load = openpyxl.load_workbook
    mapping = {
        (
            ROOT / "scripts/overview/source-discovery/phase3/cbu-statistical-bulletin-2026-03.xlsx"
        ).resolve(): ROOT / "mcp_server/tests/generated/cbu-statistical-bulletin-2026-03.xlsx",
        (
            ROOT
            / "scripts/overview/source-discovery/phase4/world-bank-commodity-monthly-2026-07.xlsx"
        ).resolve(): ROOT / "mcp_server/tests/generated/world-bank-commodity-monthly-2026-07.xlsx",
    }

    def test_fixture_load(filename, *args, **kwargs):
        target = (
            mapping.get(Path(filename).resolve(), filename)
            if isinstance(filename, (str, Path))
            else filename
        )
        return original_load(target, *args, **kwargs)

    openpyxl.load_workbook = test_fixture_load
    session.config._model_fixture_skip_count = len(report["optional_skips"])


def pytest_terminal_summary(terminalreporter):
    terminalreporter.write_line(
        "Model fixture setup: 8 required validated; optional fixture skips: "
        + str(terminalreporter.config._model_fixture_skip_count)
    )
