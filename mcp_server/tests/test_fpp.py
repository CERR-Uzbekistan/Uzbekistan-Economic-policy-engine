"""Tests for FPP 4-sector framework."""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from models.fpp import solve_fpp


def test_fpp_default_projection():
    """CAEM baseline inputs should produce 3 years of projections."""
    result = solve_fpp([])  # uses defaults
    assert result["base_year"] == 2024
    assert len(result["projections"]) == 3
    assert result["projections"][0]["year"] == 2025
    assert result["projections"][2]["year"] == 2027


def test_fpp_consistency_checks():
    """Consistency checks should be present and have valid status."""
    result = solve_fpp([])
    checks = result["consistency_checks"]
    valid_statuses = {"green", "yellow", "red"}
    for key in ["growth_gap", "inflation_target", "reserves_adequacy",
                "fiscal_sustainability", "debt_sustainability"]:
        assert key in checks
        assert checks[key]["status"] in valid_statuses


def test_fpp_custom_inputs():
    """Custom high-growth scenario should reflect in projections."""
    years = [
        {"g": 8.0, "ner_dep": 2.0, "ca": -2.0, "fdi": 3.0, "ofa": 4.0,
         "rev": 28.0, "exp": 30.0, "pr": 12.0, "vel": 5.8},
    ]
    result = solve_fpp(years)
    assert result["projections"][0]["real_sector"]["gdp_growth_pct"] == 8.0


def test_fpp_inflation_endogenous():
    """Inflation should be computed endogenously via Phillips Curve."""
    result = solve_fpp([])
    pi_2025 = result["projections"][0]["real_sector"]["inflation_pct"]
    assert pi_2025 > 0  # inflation should be positive
    assert pi_2025 < 30  # and reasonable


if __name__ == "__main__":
    test_fpp_default_projection()
    test_fpp_consistency_checks()
    test_fpp_custom_inputs()
    test_fpp_inflation_endogenous()
    print("All FPP tests passed!")
