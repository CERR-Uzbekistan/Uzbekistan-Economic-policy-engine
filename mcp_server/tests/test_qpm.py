"""Tests for QPM solver — cross-validated against JS output."""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from helpers.validation import validate_qpm_params
from models.qpm import solve_irf, run_baseline, run_level_scenario


def assert_close_path(actual, expected, tol=1e-3):
    assert len(actual) >= len(expected)
    for actual_value, expected_value in zip(actual, expected):
        assert abs(actual_value - expected_value) <= tol


def test_qpm_demand_shock_converges():
    """1pp demand shock with default params should converge."""
    params = validate_qpm_params({})
    result = solve_irf(params, "demand", 1.0, 20)
    assert result["solver"]["converged"] is True
    assert result["solver"]["iterations"] < 600


def test_qpm_all_shock_types():
    """All QPM shock types should converge."""
    params = validate_qpm_params({})
    for shock_type in [
        "demand",
        "cost_push",
        "inflation",
        "depreciation",
        "exchange",
        "monetary",
        "risk",
        "external_demand",
    ]:
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


def test_qpm_external_demand_shock_uses_b3_channel():
    """External demand should enter the IS curve through b3 * gap_star."""
    params = validate_qpm_params({})
    shock_size = 1.0
    result = solve_irf(params, "external_demand", shock_size, 20)
    paths = result["irf_paths"]

    assert result["solver"]["converged"] is True
    assert paths["output_gap"][0] > 0
    assert abs(paths["output_gap"][0] - params["b3"] * shock_size) < 0.01
    assert max(paths["inflation_yoy"]) > 0
    assert max(paths["policy_rate"]) > 0


def test_qpm_external_demand_response_scales_with_b3():
    """Higher b3 should strengthen the external-demand spillover path."""
    low_b3 = validate_qpm_params({"b3": 0.10})
    high_b3 = validate_qpm_params({"b3": 0.50})

    low = solve_irf(low_b3, "external_demand", 1.0, 20)
    high = solve_irf(high_b3, "external_demand", 1.0, 20)

    assert high["peaks"]["output_gap"]["value"] > low["peaks"]["output_gap"]["value"]
    assert high["irf_paths"]["output_gap"][0] > low["irf_paths"]["output_gap"][0]


def test_qpm_external_demand_gap_star_decays_ar1():
    """External-demand gap should decay as gap*_t = 0.75 * gap*_{t-1}."""
    params = validate_qpm_params({})
    params["b1"] = 0.0
    params["b2"] = 0.0
    params["b3"] = 0.40
    params["a2"] = 0.0

    result = solve_irf(params, "external_demand", 1.0, 8)
    output_gap = result["irf_paths"]["output_gap"]
    expected = [params["b3"] * (0.75 ** quarter) for quarter in range(5)]

    assert result["solver"]["converged"] is True
    assert output_gap[:5] == [round(value, 6) for value in expected]


def test_qpm_depreciation_includes_direct_import_pass_through():
    """Depreciation shock should include direct a4 import-price pass-through."""
    params = validate_qpm_params({})
    result = solve_irf(params, "depreciation", 10.0, 8)
    no_direct_pass_through = validate_qpm_params({"a4": 0.0})
    muted = solve_irf(no_direct_pass_through, "depreciation", 10.0, 8)

    assert result["irf_paths"]["inflation_yoy"][0] > 1.0
    assert result["irf_paths"]["inflation_yoy"][0] > muted["irf_paths"]["inflation_yoy"][0]


def test_qpm_risk_premium_shock_uses_uip_channel():
    """Temporary risk-premium shock should move the exchange-rate block."""
    params = validate_qpm_params({})
    result = solve_irf(params, "risk", 1.0, 8)

    assert result["solver"]["converged"] is True
    assert max(result["irf_paths"]["exchange_rate_gap"]) > 0
    assert max(result["irf_paths"]["inflation_yoy"]) > 0


def test_qpm_level_scenario_matches_public_export_reference_values():
    """Canonical Python scenario path should match the public R export."""
    params = validate_qpm_params({})
    result = run_level_scenario(params, {"exchange": 10.0}, horizon=8)

    assert result["solver"]["baseline_converged"] is True
    assert result["solver"]["scenario_converged"] is True
    assert_close_path(result["scenario"]["gdp_growth"][:4], [5.4482, 5.5423, 5.2397, 4.8566])
    assert_close_path(result["scenario"]["inflation"][:4], [10.9202, 10.9044, 10.3943, 9.4127])
    assert_close_path(result["scenario"]["policy_rate"][:4], [14.3194, 14.1028, 13.1422, 11.7791])
    assert_close_path(result["scenario"]["exchange_rate"][:4], [14328.3, 14143.7, 13930.1, 13758.7])


def test_qpm_baseline_runs():
    """Baseline forecast should produce reasonable output."""
    params = validate_qpm_params({})
    result = run_baseline(params)
    assert result["horizon_quarters"] == 16
    assert len(result["paths"]["inflation_yoy"]) == 16
    assert len(result["labels"]) == 16
    assert result["labels"][0] == "Q1 2026"
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
    test_qpm_external_demand_shock_uses_b3_channel()
    test_qpm_external_demand_response_scales_with_b3()
    test_qpm_external_demand_gap_star_decays_ar1()
    test_qpm_baseline_runs()
    print("All QPM tests passed!")
