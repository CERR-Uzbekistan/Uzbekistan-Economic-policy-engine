"""Financial Programming & Policies (FPP) — IMF 4-Sector Framework.

Ported from fpp_model/index.html:544-660.
Projects real, external, fiscal, and monetary sectors for 2025-2027
with consistency checks across all four sectors.
"""

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
    inputs = []
    for i in range(3):
        default = DEFAULT_INPUTS[i].copy()
        if i < len(years):
            user = years[i]
            # Map user-friendly keys to solver keys
            mapping = {
                "gdp_growth": "g", "g": "g",
                "inflation": "inf", "inf": "inf",
                "policy_rate": "pr", "pr": "pr",
                "ner_depreciation": "ner_dep", "ner_dep": "ner_dep",
                "us_inflation": "us_inf", "us_inf": "us_inf",
                "current_account": "ca", "ca": "ca",
                "fdi": "fdi",
                "other_financial_account": "ofa", "ofa": "ofa",
                "revenue_pct_gdp": "rev", "rev": "rev",
                "expenditure_pct_gdp": "exp", "exp": "exp",
                "velocity": "vel", "vel": "vel",
                "fiscal_bal": "fb",
            }
            for user_key, solver_key in mapping.items():
                if user_key in user:
                    if solver_key == "fb":
                        # fiscal_bal is derived from rev - exp in the solver
                        # but user may pass it directly
                        pass
                    elif solver_key == "inf":
                        # Inflation is endogenous in the model (Phillips Curve)
                        # User input is ignored — the model computes it
                        pass
                    else:
                        default[solver_key] = float(user[user_key])
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
        r["reserves"] = max(0, prev["reserves"] + r["delta_res"])
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
        "model": "Financial Programming & Policies (IMF 4-Sector)",
        "base_year": 2024,
        "projections": projections,
        "consistency_checks": checks,
    }
