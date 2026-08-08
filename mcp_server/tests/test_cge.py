"""Tests for the workbook-reconciled CGE 1-2-3 solver."""

import math
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from helpers.validation import CGE_BASE_ENDOGENOUS, CGE_DEFAULTS
from models.cge import solve_cge


def test_cge_base_reproduces_formula_derived_workbook_equilibrium():
    result = solve_cge(CGE_DEFAULTS)

    assert result["error"] is False
    assert result["solver"]["converged"] is True
    assert result["results"] == result["comparison_baseline"]
    assert all(abs(value) < 1e-9 for value in result["changes_from_base"].values())
    for key, workbook_value in CGE_BASE_ENDOGENOUS.items():
        assert math.isclose(
            result["results"][key],
            workbook_value,
            rel_tol=0,
            abs_tol=6e-7,
        )


def test_cge_reports_formula_reconciled_calibration():
    diagnostics = solve_cge(CGE_DEFAULTS)["calibration_diagnostics"]

    assert diagnostics["status"] == "formula_reconciled"
    assert diagnostics["material_gaps_pct"] == {}
    assert diagnostics["max_abs_gap_pct"] < diagnostics["tolerance_pct"]
    assert diagnostics["source_workbook_status"] == (
        "formula_reconciled_stale_saved_scenarios_excluded"
    )


def test_cge_core_identities_and_finite_outputs():
    result = solve_cge(CGE_DEFAULTS)
    values = result["results"]

    assert all(math.isfinite(value) for value in values.values())
    assert max(abs(value) for value in result["accounting_residuals"].values()) < 1e-8
    assert math.isclose(values["Dd"], values["Ds"], abs_tol=1e-6)
    assert math.isclose(values["Qd"], values["Qs"], abs_tol=1e-6)
    assert math.isclose(values["Z"], values["S"] / values["Pt"], abs_tol=2e-6)
    assert math.isclose(
        values["TB"],
        values["Pe"] * values["E"] - values["Pm"] * values["M"],
        abs_tol=2e-6,
    )


def test_cge_reproduces_2021_energy_workbook_scenario_under_equivalent_numeraire():
    """The 21 Dec 2023 workbook experiment raises the world import price."""
    params = dict(CGE_DEFAULTS)
    params["wm"] = 1.0656990348951294
    result = solve_cge(params)
    values = result["results"]

    assert result["error"] is False
    # Real quantities are invariant to the workbook/Python numeraire choice.
    expected_real = {
        "E": 0.2585946117155831,
        "M": 0.40859123022377525,
        "Ds": 0.741378414154912,
        "Q": 1.1490381719416976,
        "Cn": 0.5936977509908844,
        "Z": 0.3795563340779064,
    }
    for key, workbook_value in expected_real.items():
        assert math.isclose(values[key], workbook_value, abs_tol=2e-6)

    # The workbook fixes Er=1 and solves Pd=0.9800963751. This port fixes Pd=1.
    workbook_pd = 0.9800963751035009
    expected_normalized_prices = {
        "Er": 1 / workbook_pd,
        "Pm": 1.0829193023255812 / workbook_pd,
        "Pe": 1 / workbook_pd,
        "Pt": 1.083306280497243 / workbook_pd,
        "Pq": 1.0174542621014149 / workbook_pd,
        "Px": 0.9852166186710815 / workbook_pd,
    }
    for key, workbook_value in expected_normalized_prices.items():
        assert math.isclose(values[key], workbook_value, abs_tol=2e-6)


def test_cge_tariff_increase_reduces_imports():
    params = dict(CGE_DEFAULTS)
    params["tm"] *= 2
    result = solve_cge(params)

    assert result["error"] is False
    assert result["results"]["M"] < result["comparison_baseline"]["M"]
    assert result["changes_from_base"]["M_pct_change"] < 0


def test_cge_remittance_shock_raises_normalized_exchange_rate():
    params = dict(CGE_DEFAULTS)
    params["re"] *= 0.5
    result = solve_cge(params)

    assert result["error"] is False
    assert result["results"]["Er"] > 1.0
    assert result["changes_from_base"]["Er_pct_change"] > 0
    assert result["closure"]["adjusting_price"] == "normalized_exchange_rate_index_Er"


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


def test_cge_rejects_inactive_productivity_parameter():
    params = dict(CGE_DEFAULTS)
    params["Pf"] = 1.05
    result = solve_cge(params)

    assert result["error"] is True
    assert "not used by the accepted CGE equations" in result["message"]


def test_cge_rejects_inconsistent_elasticity_transformation_pair():
    params = dict(CGE_DEFAULTS)
    params["sig_q"] = 0.8
    result = solve_cge(params)

    assert result["error"] is True
    assert "rho_q_consistency" in result["message"]


def test_cge_changes_from_base():
    params = dict(CGE_DEFAULTS)
    params["tm"] = 0.05
    result = solve_cge(params)

    assert "changes_from_base" in result
    assert "Er_pct_change" in result["changes_from_base"]


def test_cge_reproduces_gold_workbook_calibration_variant():
    """The gold workbook is a calibration variant, not an isolated price shock."""
    params = dict(CGE_DEFAULTS)
    params.update(
        {
            "we": 0.9475169014017701,
            "sig_q": 0.85,
            "rho_q": 0.17647058823529416,
            "aq": 1.9233641055541322,
            "bq": 0.35005943384368887,
        }
    )
    result = solve_cge(params)

    assert result["error"] is False
    expected_real = {
        "E": 0.25447989843050894,
        "M": 0.4247184215042827,
        "Ds": 0.7455123566456383,
        "Q": 1.1700151581694114,
        "Cn": 0.6043733370900031,
        "Z": 0.3898577342065014,
    }
    for key, workbook_value in expected_real.items():
        assert math.isclose(result["results"][key], workbook_value, abs_tol=2e-6)