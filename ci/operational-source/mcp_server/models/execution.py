"""Declared-variant diagnostic boundary; no research model is auto-promoted."""
from __future__ import annotations

import json
from .readiness import ROOT, load_manifest, require_ready, validate_model_inputs, ModelReadinessError


def execute_variant(variant_id: str, inputs: dict, *, intent="authoritative", now=None):
    manifest = load_manifest()
    variant = next((v for v in manifest["variants"] if v["id"] == variant_id), None)
    if variant_id == "fpp-reduced-form-v0":
        from .fpp import validate_fpp_request
        validate_fpp_request(inputs)
    artifacts = {}
    for artifact in (variant or {}).get("artifacts", []):
        try:
            artifacts[artifact["path"]] = json.loads((ROOT / artifact["path"]).read_text(encoding="utf-8-sig"))
        except (OSError, ValueError):
            pass
    assessment = require_ready(variant_id, intent=intent, now=now, manifest=manifest, artifacts=artifacts)
    validate_model_inputs(variant_id, inputs, assessment)
    for field in ("calibration_version", "period", "units"):
        if field in inputs and inputs[field] != variant[field]:
            mismatch = {**assessment, "status": "blocked", "reasons": assessment["reasons"] + [{"code": "input_contract_incompatible", "message": f"Declared {field} differs from variant contract.", "blocking": True, "path": field}]}
            raise ModelReadinessError(mismatch)
    from helpers.validation import validate_qpm_params
    if variant_id == "qpm-core-irf-v0.3":
        from .qpm import solve_irf
        result = solve_irf(validate_qpm_params(inputs.get("parameters", {})), inputs["shock_type"], inputs["shock_size"], inputs.get("horizon", 12))
    elif variant_id == "qpm-level-core-judgment-v1":
        from .qpm import run_level_scenario
        result = run_level_scenario(validate_qpm_params(inputs.get("parameters", {})), inputs.get("shocks", {}), horizon=inputs.get("horizon", 12), **inputs.get("initial_conditions", {}))
    elif variant_id == "level-consistent-judgment-v1":
        result = run_scenario_lab_qpm(inputs)
    elif variant_id == "io-total-resource-buckets-v1":
        result = run_public_io(artifacts[variant["artifacts"][0]["path"]], inputs)
    elif variant_id == "pe-share-scaled-usd-v2":
        result = run_public_pe(artifacts[variant["artifacts"][0]["path"]], inputs)
    elif variant_id == "cge-formula-reference-v1":
        from .cge import solve_cge
        payload = artifacts[variant["artifacts"][0]["path"]]
        controls = inputs.get("controls", {})
        p = dict(payload["calibration"]["parameters"])
        for definition in payload["controls"]:
            value = controls.get(definition["id"], 0)
            if not definition["min"] <= value <= definition["max"]:
                raise ValueError("CGE control outside declared range")
        p["wm"] *= 1 + controls.get("world_import_price_change_pct", 0)/100
        p["tm"] = max(0, p["tm"] + controls.get("import_tariff_change_pp", 0)/100)
        p["G"] *= 1 + controls.get("government_consumption_change_pct", 0)/100
        p["re"] *= 1 + controls.get("remittances_change_pct", 0)/100
        result = solve_cge(p)
    elif variant_id == "io-legacy-output-v0":
        from .io_model import run_demand_shock
        data = artifacts[variant["artifacts"][0]["path"]]
        result = run_demand_shock(data, **inputs)
    else:
        raise ModelReadinessError({**assessment, "status": "blocked", "reasons": assessment["reasons"] + [{"code": "route_variant_unsupported", "message": "This declared variant has no kernel on this route.", "blocking": True, "path": None}]})
    return {**result, "model_readiness": assessment}


def run_public_pe(payload, inputs):
    import math
    def rounded(value, digits=2):
        return math.floor(value*10**digits+.5)/10**digits
    from .pe_contract import filter_share, response_contract
    inputs = dict(inputs)
    for alias, canonical in (("country", "partner_name"), ("hs_section", "section_id")):
        if alias in inputs:
            if canonical in inputs and inputs[canonical] != inputs[alias]:
                raise ModelReadinessError({"variant": "pe-share-scaled-usd-v2", "intent": "diagnostic", "status": "blocked", "disclosures": response_contract(payload)["qualification"], "reasons": [{"code": "filter_incompatible", "path": canonical, "message": "Conflicting PE filter aliases.", "blocking": True}]})
            inputs[canonical] = inputs[alias]
    section_id = inputs.get("section_id", "all")
    share = filter_share(payload, inputs)
    scale = min(100, max(-100, inputs.get("tariff_cut_pct", 20))) / payload["metadata"]["default_tariff_cut_pct"]
    sections = [s for s in payload["sections"] if section_id == "all" or s["id"] == section_id]
    totals = {"import_base_usd": 0, "trade_creation_usd": 0, "trade_diversion_usd": 0, "trade_effect_usd": 0, "welfare_usd": 0, "revenue_change_usd": 0}
    rows = []
    for section in sections:
        row = {"section_id": section["id"], "section_name": section["name"], "import_usd": rounded(section["import_usd"]*share), "avg_mfn_rate": rounded(section["avg_mfn_rate"], 3), "elasticity": section["elasticity"]}
        totals["import_base_usd"] += rounded(section["import_usd"]*share)
        effect = section["baseline_20pct"]
        for key in ("trade_creation_usd", "trade_diversion_usd", "welfare_usd", "revenue_change_usd"):
            row[key] = rounded(effect[key]*scale*share)
            totals[key] += row[key]
        row["trade_effect_usd"] = rounded((effect["trade_creation_usd"]+effect["trade_diversion_usd"])*scale*share)
        rows.append(row)
        totals["trade_effect_usd"] += rounded((effect["trade_creation_usd"]+effect["trade_diversion_usd"])*scale*share)
    totals = {k: rounded(v) for k, v in totals.items()}
    totals["impact_pct"] = rounded(totals["trade_effect_usd"] / totals["import_base_usd"] * 100, 3) if totals["import_base_usd"] else 0
    totals["partner_import_share"] = rounded(share, 6)
    rows.sort(key=lambda row: abs(row["trade_effect_usd"]), reverse=True)
    return {"response_contract": response_contract(payload), "request": {"tariff_cut_pct": inputs.get("tariff_cut_pct", 20), "section_id": section_id, "partner_name": inputs.get("partner_name", "all"), "regime": inputs.get("regime", "all")}, "totals": totals, "top_sections": rows[:10], "sensitivity": [{"id": name, "elasticity_multiplier": multiplier, "trade_effect_usd": rounded(totals["trade_effect_usd"]*multiplier), "welfare_usd": rounded(totals["welfare_usd"]*multiplier)} for name, multiplier in (("low", .75), ("base", 1), ("high", 1.25))], "caveats": response_contract(payload)["qualification"]}


def run_scenario_lab_qpm(inputs):
    """Scenario Lab's declared judgment presentation, with explicit baseline inputs.

    Supplied initial levels are scenario judgments, never a validated live source.
    Default conditions reproduce the disclosed UI deterministic fallback.
    """
    import math
    from helpers.validation import validate_qpm_params
    from .qpm import _solve_core, _initial_conditions_from_levels, _baseline_exchange_rate_reference, _quarter_labels, output_level_paths
    p = validate_qpm_params({})
    a = inputs.get("assumptions", {})
    b = {"inflation": 10.5, "policyRate": 13.5, "outputGap": -1.5, "nerDepreciation": 8, "exchangeRateBase": 12650, "externalDemandGap": 0, "startYear": 2026, "startQuarter": 1, **inputs.get("baseline_inputs", {})}
    horizon = inputs.get("horizon", 12)
    if not isinstance(horizon, int) or not 4 <= horizon <= 32:
        raise ValueError("Horizon must be 4-32 quarter points")
    initial = _initial_conditions_from_levels(p, initial_inflation_yoy=b["inflation"], initial_policy_rate=b["policyRate"], initial_output_gap=b["outputGap"], initial_ner_depreciation=b["nerDepreciation"])
    baseline = _solve_core(p, None, 0, horizon-1, init_conds=initial, additional_shocks={"external_demand": b["externalDemandGap"]})
    shocks = {"demand": .12*a.get("gov_spending_change", 0)+.03*a.get("remittance_change", 0)+a.get("imported_cost_output_drag", 0), "inflation": .08*a.get("commodity_price_change", 0)+.04*a.get("tariff_change", 0)+a.get("direct_imported_inflation_shock", 0)+sum(a.get(k, 0) for k in ("fuel_transport_second_round", "fertilizer_food_second_round", "medicine_procurement_second_round", "expectations_margin_second_round")), "monetary": a.get("policy_rate_change", 0), "exchange": a.get("exchange_rate_change", 0), "risk": a.get("risk_premium_shock", 0), "external_demand": b["externalDemandGap"]+a.get("export_demand_change", 0)}
    scenario_p = {**p, "a4": p["a4"]*(1+min(.8, max(-.5, a.get("pass_through_adjustment", 0))))}
    scenario = _solve_core(scenario_p, None, 0, horizon-1, init_conds=initial, additional_shocks=shocks)
    er = _baseline_exchange_rate_reference(baseline["d4l_s"], p, b["exchangeRateBase"])
    def rounded(value, digits=4):
        # JavaScript Math.round convention, including negative ties.
        return math.floor(float(value)*10**digits+.5)/10**digits
    def output(raw):
        return {name: [rounded(v) for v in values] for name, values in output_level_paths(raw["gap"], b["outputGap"], p["potential_growth"]).items()}
    base = output(baseline)
    scen = output(scenario)
    base["inflation"] = [rounded(max(p["inflation_target"]+.75, b["inflation"]-1.5, b["inflation"]-.15*t)) for t in range(horizon)]
    base["policy_rate"] = [rounded(max(p["neutral_real_rate"]+p["inflation_target"]+2.5, b["policyRate"]-3, b["policyRate"]-.25*t)) for t in range(horizon)]
    base["exchange_rate"] = [rounded(v, 1) for v in er]
    for name, raw_name, offset in (("inflation", "pi4", p["inflation_target"]), ("policy_rate", "rs", p["inflation_target"]+p["neutral_real_rate"])):
        scen[name] = [rounded(base[name][t]+rounded(offset+scenario[raw_name][t])-rounded(offset+baseline[raw_name][t])) for t in range(horizon)]
    scen["exchange_rate"] = [rounded(base["exchange_rate"][t]+rounded(er[t]*math.exp(float(scenario["s"][t]-baseline["s"][t])/100), 1)-rounded(er[t], 1), 1) for t in range(horizon)]
    return {"variant": "level-consistent-judgment-v1", "baseline_basis": "explicit_initial_level_judgments" if "baseline_inputs" in inputs else "deterministic_fallback", "periods": _quarter_labels(b["startYear"], b["startQuarter"], horizon), "baseline": base, "scenario": scen}


def run_public_io(payload, inputs):
    """Same fixed-resource/bucket accounting kernel as Scenario Lab.

    Rounding tolerance: 0.001 billion UZS, one person. Coefficients are
    preserved from the artifact; no alternate domestic-output denominator.
    """
    import numpy as np
    sectors = payload["sectors"]
    amount = float(inputs["amount"])
    currency = inputs.get("currency", "bln_uzs")
    distribution = inputs.get("distribution", "final_demand")
    bucket = inputs.get("demand_bucket", "government")
    if currency not in ("bln_uzs", "mln_usd") or bucket not in ("consumption", "government", "investment", "export") or distribution not in ("final_demand", "output", "gva", "equal", "sector"):
        raise ValueError("Unsupported I-O input convention")
    if currency == "mln_usd":
        amount *= float(inputs.get("exchange_rate_uzs_per_usd", 12652.7)) / 1000
    weights = []
    for sector in sectors:
        fd = sector["final_demand"]
        if distribution == "sector":
            weight = int(sector["code"] == inputs.get("sector_code"))
        elif distribution == "equal":
            weight = 1
        elif distribution == "gva":
            weight = max(0, sector["gva_thousand_uzs"])
        elif distribution == "output":
            weight = max(0, sector["total_resources_thousand_uzs"])
        else:
            fields = {"consumption": ("household", "npish"), "government": ("government",), "investment": ("gfcf", "inventories"), "export": ("exports",)}[bucket]
            weight = sum(max(0, fd[key]) for key in fields)
        weights.append(weight)
    if distribution == "sector" and sum(weights) == 0:
        raise ValueError("Unknown sector")
    weights = np.array(weights, dtype=float)
    weights = weights / weights.sum() if weights.sum() > 0 else np.ones(len(sectors)) / len(sectors)
    output = np.array(payload["matrices"]["leontief_inverse"]) @ (amount * weights)
    va = sum(x * s["gva_thousand_uzs"] / s["total_resources_thousand_uzs"] if s["total_resources_thousand_uzs"] > 0 else 0 for x, s in zip(output, sectors))
    imports = sum(x * min(1, max(0, s["imports_thousand_uzs"] / s["total_resources_thousand_uzs"])) if s["total_resources_thousand_uzs"] > 0 else 0 for x, s in zip(output, sectors))
    employment = sum(x * s["employment_total"] / (s["total_resources_thousand_uzs"] / 1000) if s["total_resources_thousand_uzs"] > 0 else 0 for x, s in zip(output, sectors)) if all("employment_total" in s for s in sectors) else None
    return {"totals": {"demand_shock_bln_uzs": round(amount, 3), "output_effect_bln_uzs": round(float(output.sum()), 3), "value_added_effect_bln_uzs": round(float(va), 3), "import_content_effect_bln_uzs": round(float(imports), 3), "domestic_resource_effect_bln_uzs": round(float(output.sum() - imports), 3), "employment_effect_persons": round(float(employment)) if employment is not None else None, "aggregate_output_multiplier": round(float(output.sum()/amount), 3) if amount else None}}
