"""Partial Equilibrium (PE) Trade Model — WITS-SMART framework.

Ported from pe_model/index.html:716-837 (runSim).
Simulates tariff cut impacts on trade creation, trade diversion,
consumer welfare, and government revenue.
"""


def run_trade_simulation(
    data: dict,
    tariff_cut_pct: float = 20.0,
    regime: str = "all",
    hs_section: str = "all",
    country: str = "all",
) -> dict:
    """Run a tariff cut scenario.

    Args:
        data: Loaded pe_data.json.
        tariff_cut_pct: Tariff reduction as percentage (5-100).
        regime: Trade regime filter ("all", "mfn", "fta", "full").
        hs_section: HS section ID (e.g. "I", "XVI") or "all".
        country: Partner country name or "all".
    """
    scale = tariff_cut_pct / 20.0  # data is pre-computed for 20% cut
    sections = data.get("sections", [])
    chapters = data.get("chapters", {})

    # Regime factor (simplified matching JS logic)
    rf = 1.0 if regime == "all" else 0.6

    rows = []
    for s in sections:
        if hs_section != "all" and s["id"] != hs_section:
            continue

        imp = 0
        tc = 0
        td = 0
        welfare = 0
        tax_chg = 0
        mfn_w = 0

        for ch in s.get("chapters", []):
            ch_key = str(ch)
            cd = chapters.get(ch_key)
            if not cd:
                continue

            imp += cd["imp"] * rf
            tc += cd["tc"] * scale * rf
            td += cd["td"] * scale * rf
            welfare += cd["welfare"] * scale * rf
            tax_chg += cd["taxChg"] * scale * rf
            mfn_w += cd["avgMfn"] * cd["imp"] * rf

        if imp > 0:
            rows.append({
                "section_id": s["id"],
                "name": s["name"],
                "import_usd": imp,
                "trade_creation_usd": tc,
                "trade_diversion_usd": td,
                "welfare_usd": welfare,
                "revenue_change_usd": tax_chg,
                "avg_mfn_rate": mfn_w / imp,
            })

    # Country filter
    if country != "all":
        countries = data.get("countries", [])
        cty = next((c for c in countries if c["name"] == country), None)
        if cty:
            total_import = data.get("meta", {}).get("totalImport", 1)
            cty_share = cty["imp"] / total_import if total_import > 0 else 0
            rows = [
                {**r,
                 "import_usd": r["import_usd"] * cty_share,
                 "trade_creation_usd": r["trade_creation_usd"] * cty_share,
                 "trade_diversion_usd": r["trade_diversion_usd"] * cty_share,
                 "welfare_usd": r["welfare_usd"] * cty_share,
                 "revenue_change_usd": r["revenue_change_usd"] * cty_share}
                for r in rows
            ]

    tot_imp = sum(r["import_usd"] for r in rows)
    tot_tc = sum(r["trade_creation_usd"] for r in rows)
    tot_td = sum(r["trade_diversion_usd"] for r in rows)
    tot_wel = sum(r["welfare_usd"] for r in rows)
    tot_tax = sum(r["revenue_change_usd"] for r in rows)
    tot_eff = tot_tc + tot_td

    # Sort by import value
    rows.sort(key=lambda r: r["import_usd"], reverse=True)

    # Round values
    for r in rows:
        for k in ["import_usd", "trade_creation_usd", "trade_diversion_usd",
                   "welfare_usd", "revenue_change_usd"]:
            r[k] = round(r[k], 2)
        r["avg_mfn_rate"] = round(r["avg_mfn_rate"], 2)
        r["trade_effect_usd"] = round(r["trade_creation_usd"] + r["trade_diversion_usd"], 2)

    return {
        "model": "Partial Equilibrium (WITS-SMART)",
        "scenario": {
            "tariff_cut_pct": tariff_cut_pct,
            "regime": regime,
            "hs_section": hs_section,
            "country": country,
        },
        "aggregate": {
            "total_trade_effect_usd": round(tot_eff, 2),
            "trade_creation_usd": round(tot_tc, 2),
            "trade_diversion_usd": round(tot_td, 2),
            "consumer_welfare_usd": round(tot_wel, 2),
            "revenue_change_usd": round(tot_tax, 2),
            "import_base_usd": round(tot_imp, 2),
            "impact_pct": round(tot_eff / tot_imp * 100, 3) if tot_imp > 0 else 0,
        },
        "by_section": rows,
        "data_coverage": {
            "total_hs10_lines": data.get("meta", {}).get("dataRows", 0),
            "base_year": data.get("meta", {}).get("baseYear", 2025),
        },
    }


def get_trade_overview(data: dict) -> dict:
    """Get summary trade statistics without running a scenario."""
    meta = data.get("meta", {})
    sections = data.get("sections", [])
    countries = data.get("countries", [])

    # Top sections by import
    top_sections = sorted(sections, key=lambda s: s.get("imp", 0), reverse=True)[:10]
    top_sections = [
        {"id": s["id"], "name": s["name"], "import_usd": round(s.get("imp", 0), 2),
         "avg_mfn_rate": round(s.get("avgMfn", 0), 2)}
        for s in top_sections
    ]

    # Top partners by import
    top_partners = sorted(countries, key=lambda c: c.get("imp", 0), reverse=True)[:15]
    top_partners = [
        {"name": c["name"], "import_usd": round(c.get("imp", 0), 2),
         "regime": c.get("regime", "unknown")}
        for c in top_partners
    ]

    return {
        "model": "PE Trade Overview",
        "total_imports_usd": round(meta.get("totalImport", 0), 2),
        "data_rows": meta.get("dataRows", 0),
        "base_year": meta.get("baseYear", 2025),
        "top_sections": top_sections,
        "top_partners": top_partners,
    }
