"""Tests for CGE 1-2-3 solver."""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from helpers.validation import CGE_DEFAULTS, CGE_BASE_ENDOGENOUS
from models.cge import solve_cge


def test_cge_base_calibration():
    """Base-year parameters should return Er=1.0 (calibration check)."""
    result = solve_cge(CGE_DEFAULTS)
    assert result["error"] is False
    assert result["solver"]["converged"] is True
    assert abs(result["results"]["Er"] - 1.0) < 0.01


def test_cge_tariff_increase():
    """Doubling tariff should depreciate exchange rate and reduce imports."""
    params = dict(CGE_DEFAULTS)
    params["tm"] = 0.04  # double from 2% to 4%
    result = solve_cge(params)
    assert result["error"] is False
    # Higher tariff → higher import price → less imports
    assert result["results"]["M"] < CGE_BASE_ENDOGENOUS["M"]


def test_cge_remittance_shock():
    """Halving remittances should depreciate exchange rate."""
    params = dict(CGE_DEFAULTS)
    params["re"] = 0.07  # half of 0.14
    result = solve_cge(params)
    assert result["error"] is False
    # Less inflow → BoP pressure → depreciation
    assert result["results"]["Er"] > 1.0


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
