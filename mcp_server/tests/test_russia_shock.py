"""Tests for the Russia shock prototype orchestration layer."""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from models.russia_shock import (  # noqa: E402
    Calibration,
    PolicyPackage,
    RussiaShockScenario,
    load_channel_calibration,
    load_simple_yaml,
    load_policies,
    load_scenarios,
    run_russia_shock,
)


def test_russia_shock_scenarios_load():
    scenarios = load_scenarios()
    assert {"baseline", "stagnation", "recession", "combined_shock"} <= set(scenarios)
    assert scenarios["recession"].russia_real_gdp_growth_deviation_pp == -3.0
    assert (
        scenarios["recession"].remittance_shock_russia
        < scenarios["stagnation"].remittance_shock_russia
    )


def test_stress_driver_evidence_documents_confidence():
    path = Path(__file__).parent.parent / "data" / "russia_shock_stress_driver_evidence.yaml"
    evidence = load_simple_yaml(path)
    assert evidence["russia_real_gdp_growth_deviation_pp"]["evidence_strength"] == "medium"
    assert evidence["payment_restriction_index"]["evidence_strength"] == "low"
    assert evidence["ruble_depreciation_pct"]["current_status"].startswith(
        "judgemental_placeholder"
    )


def test_channel_calibration_loads_and_derives_scenarios():
    calibration = load_channel_calibration()
    scenarios = load_scenarios()
    recession = scenarios["recession"]
    assert "remittances" in calibration
    assert recession.remittance_shock_russia < 0
    assert recession.returning_migrants > 0
    assert recession.russia_export_demand_shock < 0
    assert recession.risk_premium_bps > 0
    expected_returning = round(
        calibration["return_migration"]["migrant_base_count"]
        * min(
            calibration["return_migration"]["max_return_share"],
            calibration["return_migration"]["labor_stress_return_share"]
            * recession.migrant_labor_market_stress
            + calibration["return_migration"]["gdp_shock_return_share_per_pp"]
            * abs(recession.russia_real_gdp_growth_deviation_pp),
        )
    )
    assert recession.returning_migrants == expected_returning


def test_russia_shock_policies_load():
    policies = load_policies()
    assert {"none", "minimal", "stabilization", "full_crisis"} <= set(policies)
    assert policies["stabilization"].ifi_financing_usd == 2_000_000_000


def test_invalid_negative_migrants_raise():
    scenario = RussiaShockScenario(
        description="invalid",
        remittance_shock_russia=0.0,
        returning_migrants=-1,
        russia_export_demand_shock=0.0,
        russia_import_supply_shock=0.0,
        fuel_price_shock=0.0,
        payment_friction=0.0,
        risk_premium_bps=0,
    )
    scenarios = {"bad": scenario}
    policies = load_policies()
    try:
        run_russia_shock("bad", "none", scenarios=scenarios, policies=policies)
    except ValueError:
        return
    raise AssertionError("negative returning_migrants should raise ValueError")


def test_invalid_policy_share_raises():
    policies = {
        "bad": PolicyPackage(
            description="invalid",
            household_transfer_usd=0,
            public_works_jobs=0,
            wage_subsidy_rate=1.2,
            fx_reserve_use_usd=0,
            ifi_financing_usd=0,
            china_swap_cny=0,
            fuel_reserve_release=0,
        )
    }
    scenarios = load_scenarios()
    try:
        run_russia_shock("baseline", "bad", scenarios=scenarios, policies=policies)
    except ValueError:
        return
    raise AssertionError("impossible wage_subsidy_rate should raise ValueError")


def test_baseline_has_small_shock_deviations():
    result = run_russia_shock("baseline", "none")
    summary = result["summary"]
    assert abs(summary["real_gdp_growth_deviation_pp"]) < 0.01
    assert abs(summary["inflation_deviation_pp"]) < 0.01
    assert summary["remittance_loss_usd"] == 0
    assert summary["export_loss_usd"] == 0


def test_larger_remittance_shock_worsens_household_income():
    stagnation = run_russia_shock("stagnation", "none")
    recession = run_russia_shock("recession", "none")
    assert (
        recession["summary"]["average_real_income_change_pct"]
        < stagnation["summary"]["average_real_income_change_pct"]
    )


def test_policy_transfer_reduces_poverty():
    no_policy = run_russia_shock("recession", "none")
    stabilization = run_russia_shock("recession", "stabilization")
    assert stabilization["summary"]["poverty_headcount"] < no_policy["summary"]["poverty_headcount"]


def test_custom_calibration_controls_remittance_and_financing_channels():
    low_exposure = Calibration(
        russia_remittance_share=0.10,
        gdp_usd=200_000_000_000,
    )
    high_exposure = Calibration(
        russia_remittance_share=0.90,
        gdp_usd=50_000_000_000,
    )
    low = run_russia_shock("recession", "stabilization", calibration=low_exposure)
    high = run_russia_shock("recession", "stabilization", calibration=high_exposure)

    assert high["summary"]["remittance_loss_usd"] > low["summary"]["remittance_loss_usd"]
    assert (
        high["summary"]["real_gdp_growth_deviation_pp"]
        < low["summary"]["real_gdp_growth_deviation_pp"]
    )
    assert high["cge"]["results"]["Er"] != low["cge"]["results"]["Er"]


def test_unemployment_summary_uses_all_policy_offsets():
    no_policy = run_russia_shock("recession", "none")
    stabilization = run_russia_shock("recession", "stabilization")

    assert (
        stabilization["summary"]["unemployment_rate_pct"]
        < no_policy["summary"]["unemployment_rate_pct"]
    )


def test_fiscal_proxy_is_not_mislabeled_as_import_tax_loss():
    result = run_russia_shock("recession", "none")
    fiscal = result["fiscal"]

    assert "trade_related_revenue_loss_usd" in fiscal
    assert "import_tax_loss_usd" not in fiscal


def test_output_attaches_channel_evidence_confidence():
    result = run_russia_shock("recession", "none")

    assert result["evidence"]["channel_calibration"]["remittances"]["confidence"] == "medium"


def test_china_swap_reduces_usd_demand_not_reserves():
    result = run_russia_shock("recession", "stabilization")
    external = result["external_balance"]
    assert external["china_linked_usd_demand_reduction_usd"] > 0
    assert external["usd_reserve_addition_from_china_swap"] == 0


def test_exchange_rate_and_inflation_are_not_scenario_inputs():
    scenario_fields = set(RussiaShockScenario.__dataclass_fields__)
    assert "exchange_rate_depreciation" not in scenario_fields
    assert "inflation" not in scenario_fields
    assert "gdp_loss" not in scenario_fields
    assert "unemployment" not in scenario_fields
