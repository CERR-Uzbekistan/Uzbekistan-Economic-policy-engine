"""Uzbekistan CGE 1-2-3 model reconciled with the accepted 2021 workbook.

The model follows the Devarajan-Go-Lewis-Robinson-Sinko 1-2-3 structure:
CET export transformation, CES Armington aggregation, government and savings
accounts, and a current-account closure. The source workbook fixes the
exchange-rate index at one and solves for the domestic-good price. This port
uses the equivalent normalization: the domestic-good price is one and the
exchange-rate index adjusts.
"""

import math

from helpers.validation import CGE_BASE_ENDOGENOUS, CGE_DEFAULTS


_STRUCT = {
    "at": 2.417688609007712,
    "bt": 0.8212363629719106,
    "rho_t": 2.428571428571429,
    "sig_t": 0.7,
    "aq": 1.9082318341945435,
    "bq": 0.3205221500766939,
    "rho_q": 0.4285714285714286,
    "sig_q": 0.7,
}


def solve_cge(params: dict, *, _comparison_base: dict | None = None) -> dict:
    """Solve the formula-reconciled CGE 1-2-3 equilibrium.

    Pd is the numeraire. Er is therefore a normalized relative-price
    index, not the observed UZS/USD exchange rate.
    """
    at = params.get("at", _STRUCT["at"])
    bt = params.get("bt", _STRUCT["bt"])
    rho_t = params.get("rho_t", _STRUCT["rho_t"])
    sig_t = params.get("sig_t", _STRUCT["sig_t"])
    aq = params.get("aq", _STRUCT["aq"])
    bq = params.get("bq", _STRUCT["bq"])
    rho_q = params.get("rho_q", _STRUCT["rho_q"])
    sig_q = params.get("sig_q", _STRUCT["sig_q"])
    wm = params.get("wm", CGE_DEFAULTS["wm"])
    we = params.get("we", CGE_DEFAULTS["we"])
    tm = params.get("tm", CGE_DEFAULTS["tm"])
    te = params.get("te", CGE_DEFAULTS["te"])
    ts = params.get("ts", CGE_DEFAULTS["ts"])
    ty = params.get("ty", CGE_DEFAULTS["ty"])
    sy = params.get("sy", CGE_DEFAULTS["sy"])
    government_consumption = params.get("G", CGE_DEFAULTS["G"])
    government_transfers = params.get("tr", CGE_DEFAULTS["tr"])
    foreign_grants = params.get("ft", CGE_DEFAULTS["ft"])
    remittances = params.get("re", CGE_DEFAULTS["re"])
    foreign_saving = params.get("B", CGE_DEFAULTS["B"])
    output = params.get("X", CGE_DEFAULTS["X"])
    price_effect = params.get("Pf", CGE_DEFAULTS["Pf"])
    domestic_price = 1.0

    numeric_params = {
        "at": at, "bt": bt, "rho_t": rho_t, "sig_t": sig_t,
        "aq": aq, "bq": bq, "rho_q": rho_q, "sig_q": sig_q,
        "wm": wm, "we": we, "tm": tm, "te": te, "ts": ts,
        "ty": ty, "sy": sy, "G": government_consumption,
        "tr": government_transfers, "ft": foreign_grants,
        "re": remittances, "B": foreign_saving, "X": output,
        "Pf": price_effect,
    }
    invalid_numeric = [
        key for key, value in numeric_params.items()
        if not isinstance(value, (int, float)) or not math.isfinite(value)
    ]
    if invalid_numeric:
        return _error(f"Invalid non-finite parameter: {invalid_numeric[0]}.")

    domain_checks = {
        "at": at > 0,
        "bt": 0 < bt < 1,
        "rho_t": rho_t != 0,
        "sig_t": sig_t > 0,
        "rho_t_consistency": sig_t > 0 and math.isclose(
            rho_t, 1 / sig_t + 1, rel_tol=0, abs_tol=1e-10
        ),
        "aq": aq > 0,
        "bq": 0 < bq < 1,
        "rho_q": rho_q != 0,
        "sig_q": sig_q > 0,
        "rho_q_consistency": sig_q > 0 and math.isclose(
            rho_q, 1 / sig_q - 1, rel_tol=0, abs_tol=1e-10
        ),
        "wm": wm > 0,
        "we": we > 0,
        "X": output > 0,
        "tm": 1 + tm > 0,
        "te": 1 + te > 0,
        "ts": 1 + ts > 0,
        "sy": 0 <= sy < 1,
        "ty": 0 <= ty < 1,
        "consumption_share": 1 - ty - sy > 0,
        "Pf": math.isclose(price_effect, 1.0, rel_tol=0, abs_tol=1e-12),
    }
    invalid_domain = [key for key, is_valid in domain_checks.items() if not is_valid]
    if invalid_domain:
        if invalid_domain[0] == "Pf":
            return _error(
                "Pf is a legacy workbook label and is not used by the accepted "
                "CGE equations; keep productivity_factor at 1.0."
            )
        return _error(f"Invalid parameter domain: {invalid_domain[0]}.")

    def equilibrium(exchange_rate: float) -> dict | None:
        export_price = exchange_rate * we / (1 + te)
        import_price = exchange_rate * wm * (1 + tm)
        if export_price <= 0 or import_price <= 0:
            return None
        try:
            export_domestic_ratio = math.pow(
                (export_price / domestic_price) / (bt / (1 - bt)),
                1 / (rho_t - 1),
            )
            cet_inner = bt * math.pow(export_domestic_ratio, rho_t) + (1 - bt)
            domestic_supply = output / (at * math.pow(cet_inner, 1 / rho_t))
            exports = export_domestic_ratio * domestic_supply
            import_domestic_ratio = math.pow(
                (domestic_price / import_price) * (bq / (1 - bq)),
                1 / (1 + rho_q),
            )
            imports = import_domestic_ratio * domestic_supply
            composite_inner = (
                bq * math.pow(imports, -rho_q)
                + (1 - bq) * math.pow(domestic_supply, -rho_q)
            )
            composite_supply = aq * math.pow(composite_inner, -1 / rho_q)
        except (ValueError, ZeroDivisionError, OverflowError):
            return None

        real_values = (
            export_domestic_ratio, domestic_supply, exports,
            import_domestic_ratio, imports, composite_supply,
        )
        if not all(math.isfinite(value) and value > 0 for value in real_values):
            return None

        composite_price = (
            import_price * imports + domestic_price * domestic_supply
        ) / composite_supply
        sales_price = composite_price * (1 + ts)
        output_price = (
            export_price * exports + domestic_price * domestic_supply
        ) / output
        income = (
            output_price * output
            + government_transfers * composite_price
            + remittances * exchange_rate
        )
        tax_revenue = (
            tm * wm * exchange_rate * imports
            + te * export_price * exports
            + ts * composite_price * composite_supply
            + ty * income
        )
        government_saving = (
            tax_revenue
            - government_consumption * sales_price
            - government_transfers * composite_price
            + foreign_grants * exchange_rate
        )
        savings = sy * income + exchange_rate * foreign_saving + government_saving
        consumption = income * (1 - ty - sy) / sales_price
        investment = savings / sales_price
        composite_demand = consumption + investment + government_consumption
        current_account = wm * imports - we * exports - foreign_grants - remittances

        values = {
            "Er": exchange_rate, "Pe": export_price, "Pm": import_price,
            "Pd": domestic_price, "E": exports, "M": imports,
            "Ds": domestic_supply, "Dd": domestic_supply, "Q": composite_supply,
            "Qs": composite_supply, "Qd": composite_demand, "X": output,
            "Pq": composite_price, "Pt": sales_price, "Px": output_price,
            "TAX": tax_revenue, "Y": income, "Sg": government_saving,
            "Cn": consumption, "S": savings, "Z": investment,
            "TB": export_price * exports - import_price * imports,
        }
        values["current_account_residual"] = current_account - foreign_saving
        values["domestic_market_residual"] = values["Dd"] - values["Ds"]
        values["composite_market_residual"] = values["Qd"] - values["Qs"]
        values["government_budget_residual"] = (
            tax_revenue
            - government_consumption * sales_price
            - government_transfers * composite_price
            + foreign_grants * exchange_rate
            - government_saving
        )
        return values

    def current_account_residual(exchange_rate: float) -> float:
        values = equilibrium(exchange_rate)
        if values is None:
            return math.nan
        return values["current_account_residual"]

    lower, upper = 0.001, 1000.0
    lower_value = current_account_residual(lower)
    upper_value = current_account_residual(upper)
    if (
        not math.isfinite(lower_value)
        or not math.isfinite(upper_value)
        or lower_value * upper_value > 0
    ):
        return _error("Solver could not bracket an equilibrium. Check parameter values.")

    exchange_rate = 1.0
    converged = False
    iterations = 0
    for iterations in range(1, 101):
        midpoint = (lower + upper) / 2
        midpoint_value = current_account_residual(midpoint)
        if not math.isfinite(midpoint_value):
            break
        exchange_rate = midpoint
        if abs(midpoint_value) < 1e-12:
            converged = True
            break
        if lower_value * midpoint_value <= 0:
            upper = midpoint
        else:
            lower = midpoint
            lower_value = midpoint_value

    solved = equilibrium(exchange_rate)
    if (
        solved is None
        or abs(solved["current_account_residual"]) >= 1e-8
        or abs(solved["composite_market_residual"]) >= 1e-8
    ):
        return _error("Solver did not converge. Check parameter values.")
    converged = True

    residual_keys = (
        "current_account_residual", "domestic_market_residual",
        "composite_market_residual", "government_budget_residual",
    )
    accounting_residuals = {key: solved.pop(key) for key in residual_keys}
    results = {key: round(value, 6) for key, value in solved.items()}

    if _comparison_base is None:
        baseline_run = solve_cge(CGE_DEFAULTS, _comparison_base=CGE_BASE_ENDOGENOUS)
        if baseline_run.get("error"):
            return baseline_run
        comparison_base = baseline_run["results"]
    else:
        comparison_base = _comparison_base

    changes = {}
    for key in ("Er", "E", "M", "Ds", "Q", "Y", "Cn", "TAX", "Sg", "S", "Z"):
        base_value = comparison_base.get(key, 0)
        if base_value != 0:
            changes[f"{key}_pct_change"] = round(
                (results[key] - base_value) / abs(base_value) * 100, 4
            )

    calibration_gaps = {}
    for key, declared_value in CGE_BASE_ENDOGENOUS.items():
        if declared_value == 0 or key not in comparison_base:
            continue
        calibration_gaps[key] = (
            comparison_base[key] - declared_value
        ) / abs(declared_value) * 100
    max_gap = max((abs(value) for value in calibration_gaps.values()), default=0.0)

    return {
        "model": "CGE 1-2-3 (Devarajan-Go)",
        "error": False,
        "solver": {
            "converged": converged,
            "method": "bisection",
            "iterations": iterations,
            "exchange_rate": round(exchange_rate, 6),
            "normalized_exchange_rate": round(exchange_rate, 6),
            "exchange_rate_semantics": "normalized relative-price index",
        },
        "base_year": 2021,
        "results": results,
        "comparison_baseline": comparison_base,
        "changes_from_base": changes,
        "accounting_residuals": accounting_residuals,
        "closure": {
            "numeraire": "domestic_good_price_Pd_equals_1",
            "adjusting_price": "normalized_exchange_rate_index_Er",
            "current_account": "foreign_saving_B_fixed",
            "government": "government_saving_Sg_adjusts",
            "investment": "savings_driven",
            "normalization_equivalence": (
                "The source workbook fixes Er=1 and lets Pd adjust; this port fixes "
                "Pd=1 and lets Er adjust. Real quantities are invariant and nominal "
                "values differ only by the common price normalization."
            ),
        },
        "calibration_diagnostics": {
            "status": "formula_reconciled",
            "tolerance_pct": 0.001,
            "comparison_basis": "formula-derived 2021 workbook equilibrium",
            "declared_base_reference": "exact accepted-workbook calibration",
            "max_abs_gap_pct": round(max_gap, 8),
            "material_gaps_pct": {
                key: round(value, 8)
                for key, value in calibration_gaps.items()
                if abs(value) > 0.001
            },
            "source_workbook_status": (
                "formula_reconciled_stale_saved_scenarios_excluded"
            ),
        },
        "parameters_used": numeric_params,
        "inactive_parameters": {
            "Pf": (
                "Legacy workbook label retained for API compatibility; it is not "
                "referenced by the accepted model equations and must remain 1.0."
            )
        },
    }


def _error(message: str) -> dict:
    return {"model": "CGE 1-2-3", "error": True, "message": message}
