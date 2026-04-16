"""Tests for QPM solver — cross-validated against JS output."""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from helpers.validation import validate_qpm_params
from models.qpm import solve_irf, run_baseline


def test_qpm_demand_shock_converges():
    """1pp demand shock with default params should converge."""
    params = validate_qpm_params({})
    result = solve_irf(params, "demand", 1.0, 20)
    assert result["solver"]["converged"] is True
    assert result["solver"]["iterations"] < 600


def test_qpm_all_shock_types():
    """All four shock types should converge."""
    params = validate_qpm_params({})
    for shock_type in ["demand", "cost_push", "depreciation", "monetary"]:
        result = solve_irf(params, shock_type, 1.0, 20)
        assert result["solver"]["converged"] is True, f"{shock_type} failed to converge"
        assert len(result["irf_paths"]["output_gap"]) == 21  # T+1 points


def test_qpm_demand_shock_signs():
    """Positive demand shock should increase output gap and inflation."""
    params = validate_qpm_params({})
    result = solve_irf(params, "demand", 1.0, 20)
    paths = result["irf_paths"]
    # Output gap should be positive on impact
    assert paths["output_gap"][1] > 0
    # Inflation should rise
    assert max(paths["inflation_yoy"]) > 0


def test_qpm_monetary_shock_signs():
    """Monetary tightening should reduce output gap and increase policy rate."""
    params = validate_qpm_params({})
    result = solve_irf(params, "monetary", 1.0, 20)
    paths = result["irf_paths"]
    # Policy rate should be positive on impact
    assert paths["policy_rate"][1] > 0
    # Output gap should eventually fall
    assert min(paths["output_gap"]) < 0


def test_qpm_zero_shock():
    """Zero shock should produce zero IRFs."""
    params = validate_qpm_params({})
    result = solve_irf(params, "demand", 0.0, 12)
    paths = result["irf_paths"]
    assert all(abs(v) < 1e-8 for v in paths["output_gap"])


def test_qpm_larger_shock_larger_response():
    """2pp shock should produce larger peak than 1pp."""
    params = validate_qpm_params({})
    r1 = solve_irf(params, "demand", 1.0, 20)
    r2 = solve_irf(params, "demand", 2.0, 20)
    assert abs(r2["peaks"]["output_gap"]["value"]) > abs(r1["peaks"]["output_gap"]["value"])


def test_qpm_baseline_runs():
    """Baseline forecast should produce reasonable output."""
    params = validate_qpm_params({})
    result = run_baseline(params)
    assert result["horizon_quarters"] == 16
    assert len(result["paths"]["inflation_yoy"]) == 16
    assert len(result["labels"]) == 16
    # Inflation should trend toward target
    pi = result["paths"]["inflation_yoy"]
    assert pi[-1] < pi[0]  # should decline from 10.5%


if __name__ == "__main__":
    test_qpm_demand_shock_converges()
    test_qpm_all_shock_types()
    test_qpm_demand_shock_signs()
    test_qpm_monetary_shock_signs()
    test_qpm_zero_shock()
    test_qpm_larger_shock_larger_response()
    test_qpm_baseline_runs()
    print("All QPM tests passed!")
