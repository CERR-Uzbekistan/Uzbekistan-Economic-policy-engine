"""Unapproved historical FPP diagnostic; public execution remains blocked.

Ported from fpp_model/index.html:544-660.
Projects real, external, fiscal, and monetary sectors for 2025-2027
with consistency checks across all four sectors.
"""

import inspect
import math

VARIANT_ID = "fpp-reduced-form-v0"
INPUT_CONTRACT_VERSION = "fpp-input-v1"
FORECAST_YEARS = (2025, 2026, 2027)
SOURCE_VINTAGE = "Legacy code constants labeled CAEM SEP 2025; 2024 base; workbook not verified"
INPUT_FIELDS = {
    "g": {"aliases": ["gdp_growth"], "unit": "annual real growth percent", "equations": ["gap judgment", "nominal GDP"]},
    "ner_dep": {"aliases": ["ner_depreciation"], "unit": "annual exchange-rate depreciation percent", "equations": ["exchange-rate level", "imported inflation", "USD GDP", "NFA flow conversion"]},
    "us_inf": {"aliases": ["us_inflation"], "unit": "annual US inflation percent", "equations": ["imported inflation", "Phillips curve"]},
    "ca": {"aliases": ["current_account", "current_account_pct_gdp"], "unit": "percent GDP", "equations": ["current-account flow", "reserves", "NFA"]},
    "fdi": {"aliases": ["fdi_pct_gdp"], "unit": "percent GDP", "equations": ["FDI flow", "reserves", "NFA"]},
    "ofa": {"aliases": ["other_financial_account", "other_financial_account_pct_gdp"], "unit": "percent GDP", "equations": ["other financial-account flow", "reserves", "NFA"]},
    "rev": {"aliases": ["revenue_pct_gdp"], "unit": "percent GDP", "equations": ["revenue", "fiscal balance", "residual debt financing"]},
    "exp": {"aliases": ["expenditure_pct_gdp"], "unit": "percent GDP", "equations": ["expenditure", "fiscal balance", "residual debt financing"]},
    "pr": {"aliases": ["policy_rate"], "unit": "annual nominal rate percent", "equations": ["reported policy rate", "ex-post real rate only; no transmission equation"]},
    "vel": {"aliases": ["velocity"], "unit": "annual nominal income / year-end M2 proxy", "equations": ["M2 demand", "residual NDA"]},
}
ALIASES = {alias: key for key, field in INPUT_FIELDS.items() for alias in [key, *field["aliases"]]}
UNSUPPORTED_INFLATION = {"inflation", "inf", "inflation_pct", "inflation_assumption"}
UNSUPPORTED_FISCAL = {"fiscal_bal", "fb", "fiscal_balance", "fiscal_balance_pct_gdp", "fiscal_balance_target"}
TOOL_FIELDS = {"gdp_growth": "g", "policy_rate": "pr", "ner_depreciation": "ner_dep", "current_account_pct_gdp": "ca"}


class FppInputError(ValueError):
    def __init__(self, reasons):
        self.reasons = reasons
        super().__init__("; ".join(reason["message"] for reason in reasons))

    def response(self):
        return {"code": "fpp_input_invalid", "variant": VARIANT_ID,
                "input_contract_version": INPUT_CONTRACT_VERSION, "reasons": self.reasons}


def input_reason(key, path):
    key = str(key)
    stem = key.rsplit("_", 1)[0] if key.rsplit("_", 1)[-1] in {str(year) for year in FORECAST_YEARS} else key
    if stem in UNSUPPORTED_INFLATION:
        code, message = "inflation_endogenous", "Inflation is endogenous in the diagnostic Phillips curve; no approved equation supports an inflation assumption."
    elif stem in UNSUPPORTED_FISCAL:
        code, message = "fiscal_closure_unapproved", "Fiscal balance is derived from revenue minus expenditure. A balance target requires a documented, approved revenue/expenditure closure; none is recorded."
    else:
        code, message = "unknown_input", f"Unsupported FPP input: {key}."
    return {"code": code, "path": path, "message": message, "blocking": True}


def validate_fpp_inputs(years):
    if not isinstance(years, list) or len(years) > 3:
        raise FppInputError([{"code": "years_invalid", "path": "years", "message": "Provide zero to three annual assumption objects for 2025, 2026 and 2027; extra years are not discarded.", "blocking": True}])
    reasons, normalized = [], []
    for index, user in enumerate(years):
        path = f"years[{index}]"
        if not isinstance(user, dict):
            reasons.append({"code": "year_inputs_invalid", "path": path, "message": "Expected an annual assumption object.", "blocking": True})
            continue
        values = {}
        for key, value in user.items():
            if key == "year":
                if not isinstance(value, int) or isinstance(value, bool) or value != FORECAST_YEARS[index]:
                    reasons.append({"code": "year_mismatch", "path": path + ".year", "message": f"This position represents {FORECAST_YEARS[index]}.", "blocking": True})
                continue
            if key not in ALIASES:
                reasons.append(input_reason(key, f"{path}.{key}"))
                continue
            canonical = ALIASES[key]
            if canonical in values:
                reasons.append({"code": "duplicate_input", "path": path + "." + key, "message": "Supply one spelling per input; duplicate aliases are not overwritten.", "blocking": True})
                continue
            try:
                finite = isinstance(value, (int, float)) and not isinstance(value, bool) and math.isfinite(float(value))
            except (OverflowError, ValueError):
                finite = False
            if not finite:
                reasons.append({"code": "input_not_finite", "path": path + "." + key, "message": "Expected a finite numeric assumption, not a boolean or numeric string.", "blocking": True})
                continue
            if (canonical in ("g", "ner_dep") and value <= -100) or (canonical == "vel" and value <= 0):
                reasons.append({"code": "input_domain_invalid", "path": path + "." + key, "message": "Growth/depreciation must exceed -100%; velocity must be positive.", "blocking": True})
                continue
            values[canonical] = float(value)
        normalized.append(values)
    if reasons:
        raise FppInputError(reasons)
    return normalized


def validate_fpp_request(inputs):
    if not isinstance(inputs, dict):
        raise FppInputError([input_reason("inputs", "inputs")])
    reasons = [input_reason(key, key) for key in inputs if key != "years"]
    if reasons:
        raise FppInputError(reasons)
    return validate_fpp_inputs(inputs.get("years", []))


def fpp_tool_years(values):
    supported = {f"{field}_{year}" for field in TOOL_FIELDS for year in FORECAST_YEARS}
    reasons = [input_reason(key, key) for key in values if key not in supported]
    if reasons:
        raise FppInputError(reasons)
    years = [{canonical: values[f"{field}_{year}"] for field, canonical in TOOL_FIELDS.items() if f"{field}_{year}" in values} for year in FORECAST_YEARS]
    return validate_fpp_inputs(years)


def validate_fpp_tool_call(function, args, kwargs):
    unknown = [key for key in kwargs if key not in inspect.signature(function).parameters]
    if unknown:
        raise FppInputError([input_reason(key, key) for key in unknown])
    try:
        bound = inspect.signature(function).bind(*args, **kwargs)
    except TypeError as error:
        raise FppInputError([{"code": "call_invalid", "path": "inputs", "message": str(error), "blocking": True}]) from error
    bound.apply_defaults()
    return fpp_tool_years(bound.arguments)

# Base year 2024 (CAEM SEP 2025)
BASE = {
    "year": 2024,
    "NGDP": 1454574,    # bln UZS
    "GDP_USD": 114962,   # mln USD
    "NER": 12652.7,      # UZS/USD avg
    "g": 6.5,            # % real GDP growth
    "pi": 9.6,           # % CPI inflation avg
    "y_gap": 0.2,        # % of potential
    "reserves": 41182,   # mln USD
    "M2": 277065,        # bln UZS eop
    "NFA": 361650,       # bln UZS
    "debt_GDP": 32.6,    # % total govt debt
    "pi_target": 5.0,
}

# Phillips Curve coefficients
PC = {"l1": 0.05, "l2": 0.70, "l3": 0.40, "omega": 0.50}
G_POT = 5.8            # potential growth %
IMPORT_SHARE = 0.355   # imports G&S as % of GDP

# Default input values (CAEM baseline)
DEFAULT_INPUTS = [
    {"g": 5.9, "ner_dep": 3.3, "us_inf": 2.5, "ca": -3.3, "fdi": 2.0, "ofa": 3.5,
     "rev": 26.7, "exp": 31.6, "pr": 13.5, "vel": 5.77},
    {"g": 5.8, "ner_dep": 5.3, "us_inf": 2.5, "ca": -3.6, "fdi": 2.3, "ofa": 3.8,
     "rev": 27.2, "exp": 32.1, "pr": 9.9, "vel": 5.83},
    {"g": 5.7, "ner_dep": 5.9, "us_inf": 2.5, "ca": -4.8, "fdi": 2.9, "ofa": 4.2,
     "rev": 27.5, "exp": 31.8, "pr": 9.1, "vel": 5.87},
]


def _build_inputs(years: list[dict]) -> list[dict]:
    """Merge user-provided year assumptions with CAEM defaults."""
    years = validate_fpp_inputs(years)
    inputs = []
    for i in range(3):
        default = DEFAULT_INPUTS[i].copy()
        if i < len(years):
            default.update(years[i])
        inputs.append(default)
    return inputs


def solve_fpp(years: list[dict]) -> dict:
    """Run FPP 3-year projections.

    Args:
        years: List of up to 3 dicts with year-specific assumptions.
            Supported keys per year: g (GDP growth %), ner_dep (NER depreciation %),
            us_inf (US inflation %), ca (current account % GDP), fdi (FDI % GDP),
            ofa (other financial account % GDP), rev (revenue % GDP),
            exp (expenditure % GDP), pr (policy rate %), vel (money velocity).

    Returns:
        Dict with year-by-year projections and consistency checks.
    """
    inputs = _build_inputs(years)
    results = []

    prev = {
        "NGDP": BASE["NGDP"],
        "GDP_USD": BASE["GDP_USD"],
        "NER": BASE["NER"],
        "pi": BASE["pi"],
        "y_gap": BASE["y_gap"],
        "M2": BASE["M2"],
        "NFA": BASE["NFA"],
        "reserves": BASE["reserves"],
        "debt_USD": BASE["debt_GDP"] / 100 * BASE["GDP_USD"],
    }

    for i, inp in enumerate(inputs):
        r = {"year": 2025 + i}

        # 1. Real Sector
        r["g"] = inp["g"]
        r["y_gap"] = max(-6, min(6, prev["y_gap"] + (inp["g"] - G_POT)))
        r["ner_dep"] = inp["ner_dep"]
        r["NER"] = prev["NER"] * (1 + inp["ner_dep"] / 100)
        r["us_inf"] = inp.get("us_inf", 2.5)
        r["pi_imp"] = inp["ner_dep"] + r["us_inf"]  # imported inflation
        r["pi_exp"] = PC["omega"] * prev["pi"] + (1 - PC["omega"]) * BASE["pi_target"]
        r["pi"] = (
            PC["l2"] * r["pi_imp"]
            + (1 - PC["l1"] - PC["l2"]) * r["pi_exp"]
            + PC["l1"] * prev["pi"]
            + PC["l3"] * r["y_gap"]
        )
        r["pi"] = max(1.0, r["pi"])
        r["NGDP"] = prev["NGDP"] * (1 + inp["g"] / 100) * (1 + r["pi"] / 100)
        r["GDP_USD"] = (r["NGDP"] / r["NER"]) * 1000  # mln USD

        # 2. External Sector
        r["CA_GDP"] = inp["ca"]
        r["CA"] = (inp["ca"] / 100) * r["GDP_USD"]
        r["FDI"] = (inp["fdi"] / 100) * r["GDP_USD"]
        r["OFA"] = (inp["ofa"] / 100) * r["GDP_USD"]
        r["delta_res"] = r["CA"] + r["FDI"] + r["OFA"]
        r["reserves"] = prev["reserves"] + r["delta_res"]
        if r["reserves"] < 0:
            raise FppInputError([{"code": "reserves_infeasible", "path": f"years[{i}]", "message": "External flows would produce negative reserves. No approved borrowing or adjustment closure exists; the diagnostic does not clip the stock to zero.", "blocking": True}])
        r["imports"] = IMPORT_SHARE * r["GDP_USD"]
        r["import_cover"] = r["reserves"] / (r["imports"] / 12) if r["imports"] > 0 else 0
        r["ext_debt_GDP"] = [55.1, 54.0, 54.5][i]

        # 3. Fiscal Sector
        r["rev_GDP"] = inp["rev"]
        r["exp_GDP"] = inp["exp"]
        r["fb_GDP"] = inp["rev"] - inp["exp"]
        r["interest_GDP"] = 1.8 if i < 2 else 1.9
        r["pb_GDP"] = r["fb_GDP"] + r["interest_GDP"]
        r["financing_need_GDP"] = -r["fb_GDP"]
        r["debt_USD"] = prev["debt_USD"] + (r["financing_need_GDP"] / 100) * r["GDP_USD"]
        if r["debt_USD"] < 0:
            raise FppInputError([{"code": "debt_infeasible", "path": f"years[{i}]", "message": "The fiscal surplus exceeds the modeled debt stock. No approved asset-accumulation or financing closure exists; gross debt cannot become negative.", "blocking": True}])
        r["debt_GDP"] = (r["debt_USD"] / r["GDP_USD"]) * 100 if r["GDP_USD"] > 0 else 0

        # 4. Monetary Sector
        r["velocity"] = inp["vel"]
        r["policy_rate"] = inp["pr"]
        NGDP_avg = (prev["NGDP"] + r["NGDP"]) / 2
        r["M2"] = NGDP_avg / inp["vel"]
        r["delta_M2"] = r["M2"] - prev["M2"]
        r["M2_growth"] = (r["delta_M2"] / prev["M2"]) * 100 if prev["M2"] > 0 else 0
        r["delta_NFA_uzs"] = (r["delta_res"] / 1000) * r["NER"]
        r["NFA"] = prev["NFA"] + r["delta_NFA_uzs"]
        r["delta_NDA_uzs"] = r["delta_M2"] - r["delta_NFA_uzs"]
        r["real_rate"] = inp["pr"] - r["pi"]

        r["ledger"] = {
            "previous_nominal_gdp_bln_uzs": prev["NGDP"], "nominal_gdp_bln_uzs": r["NGDP"],
            "gdp_mln_usd": r["GDP_USD"], "ner_uzs_per_usd": r["NER"],
            "current_account_mln_usd": r["CA"], "fdi_mln_usd": r["FDI"], "other_financial_account_mln_usd": r["OFA"],
            "reserve_change_mln_usd": r["delta_res"], "previous_reserves_mln_usd": prev["reserves"], "reserves_mln_usd": r["reserves"],
            "imports_mln_usd": r["imports"],
            "revenue_bln_uzs": r["NGDP"] * r["rev_GDP"] / 100,
            "expenditure_bln_uzs": r["NGDP"] * r["exp_GDP"] / 100,
            "fiscal_balance_bln_uzs": r["NGDP"] * r["fb_GDP"] / 100,
            "interest_bln_uzs": r["NGDP"] * r["interest_GDP"] / 100,
            "primary_balance_bln_uzs": r["NGDP"] * r["pb_GDP"] / 100,
            "financing_need_bln_uzs": r["NGDP"] * r["financing_need_GDP"] / 100,
            "previous_government_debt_mln_usd": prev["debt_USD"], "government_debt_mln_usd": r["debt_USD"],
            "previous_m2_bln_uzs": prev["M2"], "m2_bln_uzs": r["M2"], "m2_change_bln_uzs": r["delta_M2"],
            "previous_nfa_bln_uzs": prev["NFA"], "nfa_bln_uzs": r["NFA"], "nfa_change_bln_uzs": r["delta_NFA_uzs"],
            "previous_nda_bln_uzs": prev["M2"] - prev["NFA"], "nda_bln_uzs": r["M2"] - r["NFA"], "nda_change_bln_uzs": r["delta_NDA_uzs"],
        }
        if any(not math.isfinite(value) for value in r["ledger"].values()):
            raise FppInputError([{"code": "calculation_nonfinite", "path": f"years[{i}]", "message": "Assumptions produce nonfinite accounting quantities.", "blocking": True}])

        results.append(r)
        prev = {
            "NGDP": r["NGDP"], "GDP_USD": r["GDP_USD"], "NER": r["NER"],
            "pi": r["pi"], "y_gap": r["y_gap"], "M2": r["M2"], "NFA": r["NFA"],
            "reserves": r["reserves"], "debt_USD": r["debt_USD"],
        }

    # Format output
    projections = []
    for r in results:
        projections.append({
            "year": r["year"],
            "accounting_ledger": r["ledger"],
            "real_sector": {
                "gdp_growth_pct": round(r["g"], 2),
                "inflation_pct": round(r["pi"], 2),
                "output_gap_pp": round(r["y_gap"], 2),
                "nominal_gdp_bln_uzs": round(r["NGDP"], 0),
                "gdp_mln_usd": round(r["GDP_USD"], 0),
                "ner_uzs_usd": round(r["NER"], 1),
            },
            "external_sector": {
                "current_account_pct_gdp": round(r["CA_GDP"], 2),
                "reserves_mln_usd": round(r["reserves"], 0),
                "import_cover_months": round(r["import_cover"], 1),
                "external_debt_pct_gdp": round(r["ext_debt_GDP"], 1),
            },
            "fiscal_sector": {
                "revenue_pct_gdp": round(r["rev_GDP"], 2),
                "expenditure_pct_gdp": round(r["exp_GDP"], 2),
                "fiscal_balance_pct_gdp": round(r["fb_GDP"], 2),
                "primary_balance_pct_gdp": round(r["pb_GDP"], 2),
                "govt_debt_pct_gdp": round(r["debt_GDP"], 1),
            },
            "monetary_sector": {
                "m2_growth_pct": round(r["M2_growth"], 2),
                "policy_rate_pct": round(r["policy_rate"], 2),
                "real_rate_pct": round(r["real_rate"], 2),
                "velocity": round(r["velocity"], 2),
            },
        })

    # Consistency checks
    rL = results[-1]
    avg_gap = sum(r["y_gap"] for r in results) / len(results)
    avg_fb = sum(r["fb_GDP"] for r in results) / len(results)
    pi_dev = abs(rL["pi"] - 5.0)

    checks = {
        "growth_gap": {
            "status": "green" if abs(avg_gap) <= 1.5 else ("yellow" if abs(avg_gap) <= 3 else "red"),
            "value": f"Avg gap: {avg_gap:+.1f}pp",
        },
        "inflation_target": {
            "status": "green" if pi_dev <= 2 else ("yellow" if pi_dev <= 4 else "red"),
            "value": f"pi={rL['pi']:.1f}% (target 5%)",
        },
        "reserves_adequacy": {
            "status": "green" if rL["import_cover"] >= 6 else ("yellow" if rL["import_cover"] >= 3 else "red"),
            "value": f"{rL['import_cover']:.1f} months import cover",
        },
        "fiscal_sustainability": {
            "status": "green" if avg_fb >= -3 else ("yellow" if avg_fb >= -5 else "red"),
            "value": f"Avg fiscal balance: {avg_fb:+.1f}% GDP",
        },
        "debt_sustainability": {
            "status": "green" if rL["debt_GDP"] < 50 else ("yellow" if rL["debt_GDP"] < 60 else "red"),
            "value": f"Govt debt: {rL['debt_GDP']:.1f}% GDP",
        },
    }

    return {
        "model": "Historical FPP reduced-form internal diagnostic",
        "base_year": 2024,
        "forecast_years": list(FORECAST_YEARS),
        "variant_id": VARIANT_ID,
        "input_contract_version": INPUT_CONTRACT_VERSION,
        "source_vintage": SOURCE_VINTAGE,
        "calibration_version": "legacy-reduced-form",
        "effective_inputs": [{"year": year, **values} for year, values in zip(FORECAST_YEARS, inputs)],
        "qualification": {"status": "internal_diagnostic_only", "public_execution": "blocked", "approved": False,
            "message": "Unapproved historical calculation; no accepted workbook parity or model-owner approval. Consistency traffic lights are illustrative heuristics, not validation or approval."},
        "closure_assumptions": [
            "Revenue and expenditure ratios are independently exogenous; fiscal balance is their difference. No target-balancing revenue/expenditure closure is approved.",
            "Every fiscal financing residual changes a USD-denominated government debt stock; no currency valuation, maturity or financing mix is modeled.",
            "CA, FDI and other financial-account ratios are exogenous; their sum changes reserves. No trade/factor-income decomposition or external adjustment closure is modeled.",
            "Imports are prescribed at 35.5% of USD GDP; external-debt ratios and interest/GDP ratios are prescribed paths.",
            "Year-end M2 equals the average of adjacent nominal GDP levels divided by velocity; NDA is residual after the NFA flow. No behavioral credit closure is estimated.",
            "Inflation is endogenous; CPI is used as a GDP-deflator proxy and floored at 1%. These are judgments.",
            "The output-gap proxy accumulates growth minus prescribed potential growth and is capped at +/-6 points; it is a judgment, not a level-consistent gap estimate.",
            "Policy rate affects only the reported ex-post real rate; no monetary transmission equation is present.",
        ],
        "projections": projections,
        "consistency_checks": checks,
    }
