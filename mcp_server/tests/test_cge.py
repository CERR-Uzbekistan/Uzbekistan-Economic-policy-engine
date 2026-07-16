"""Tests for CGE 1-2-3 solver."""

import math
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from helpers.validation import CGE_DEFAULTS
from models.cge import solve_cge


def test_cge_base_calibration():
    """The no-shock run should be the exact comparison baseline."""
    result = solve_cge(CGE_DEFAULTS)
    assert result["error"] is False
    assert result["solver"]["converged"] is True
    assert abs(result["results"]["Er"] - 1.0) < 0.01
    assert all(abs(value) < 1e-9 for value in result["changes_from_base"].values())
    assert result["results"] == result["comparison_baseline"]


def test_cge_reports_rounded_calibration_gaps():
    """Rounded legacy base constants must not be presented as an exact fit."""
    result = solve_cge(CGE_DEFAULTS)
    diagnostics = result["calibration_diagnostics"]

    assert diagnostics["status"] == "review_required"
    assert diagnostics["source_workbook_status"] == "legacy_xls_requires_reconciliation"
    assert {"TAX", "S", "Z"}.issubset(diagnostics["material_gaps_pct"])
    assert diagnostics["max_abs_gap_pct"] > 5


def test_cge_core_identities_and_finite_outputs():
    """The solved equilibrium should satisfy BoP and accounting identities."""
    result = solve_cge(CGE_DEFAULTS)
    values = result["results"]
    params = result["parameters_used"]

    assert all(math.isfinite(value) for value in values.values())
    bop_residual = (
        values["Pm"] * values["M"]
        - values["Pe"] * values["E"]
        - params["B"]
        - params["re"]
        - params["ft"]
    )
    assert abs(bop_residual) < 5e-6
    assert abs(values["TB"] - (values["Pe"] * values["E"] - values["Pm"] * values["M"])) < 5e-6
    assert values["S"] == values["Z"]


def test_cge_tariff_increase():
    """Doubling tariff should depreciate exchange rate and reduce imports."""
    params = dict(CGE_DEFAULTS)
    params["tm"] = 0.04  # double from 2% to 4%
    result = solve_cge(params)
    assert result["error"] is False
    # Higher tariff → higher import price → less imports
    assert result["results"]["M"] < result["comparison_baseline"]["M"]
    assert result["changes_from_base"]["M_pct_change"] < 0


def test_cge_remittance_shock():
    """Halving remittances should depreciate exchange rate."""
    params = dict(CGE_DEFAULTS)
    params["re"] = 0.07  # half of 0.14
    result = solve_cge(params)
    assert result["error"] is False
    # Less inflow → BoP pressure → depreciation
    assert result["results"]["Er"] > 1.0
    assert result["changes_from_base"]["Er_pct_change"] > 0


def test_cge_rejects_invalid_world_import_price():
    params = dict(CGE_DEFAULTS)
    params["wm"] = 0
    result = solve_cge(params)

    assert result["error"] is True
    assert "Invalid parameter domain" in result["message"]


def test_cge_rejects_zero_transformation_exponent():
    params = dict(CGE_DEFAULTS)
    params["rho_q"] = 0
    result = solve_cge(params)

    assert result["error"] is True
    assert "rho_q" in result["message"]


def test_cge_reports_structural_parameters_used():
    params = dict(CGE_DEFAULTS)
    params["sig_q"] = 0.8
    result = solve_cge(params)

    assert result["error"] is False
    assert result["parameters_used"]["sig_q"] == 0.8


def test_cge_changes_from_base():
    """Changes from base should be computed correctly."""
    params = dict(CGE_DEFAULTS)
    params["tm"] = 0.05
    result = solve_cge(params)
    assert "changes_from_base" in result
    assert "Er_pct_change" in result["changes_from_base"]


if __name__ == "__main__":
    test_cge_base_calibration()
    test_cge_tariff_increase()
    test_cge_remittance_shock()
    test_cge_changes_from_base()
    print("All CGE tests passed!")
