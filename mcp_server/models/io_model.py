"""Input-Output (Leontief) Model — 136-sector supply chain analysis.

Ported from io_model/index.html:645-695 (initialization), 953-1061 (demand model),
1147-1248 (price model).
Uses pre-computed Leontief inverse matrix L = (I-A)^-1 from io_data.json.
"""

import numpy as np


def _init_arrays(data: dict) -> dict:
    """Compute derived arrays from raw I-O data (cached after first call)."""
    if "_computed" in data:
        return data["_computed"]

    codes = data["codes"]
    names = data["names"]
    X = np.array(data["X"], dtype=np.float64)      # output in mln UZS
    GVA = np.array(data["GVA"], dtype=np.float64)
    L = np.array(data["L"], dtype=np.float64)       # 136x136 Leontief inverse
    emp_total = np.array(data["EmpTotal"], dtype=np.float64)
    emp_formal = np.array(data["EmpFormal"], dtype=np.float64)
    emp_informal = np.array(data["EmpInformal"], dtype=np.float64)

    n = len(codes)

    # VA share per unit output
    v = np.where(X > 0, GVA / X, 0)

    # Employment per billion UZS output (X is in mln, so X/1e3 = bln)
    X_bln = np.where(X > 0, X / 1e3, 1e-10)
    e_total = emp_total / X_bln
    e_formal = emp_formal / X_bln
    e_informal = emp_informal / X_bln

    # Output multiplier = col sum of L
    out_mult = L.sum(axis=0)

    # VA multiplier
    va_mult = (v[:, np.newaxis] * L).sum(axis=0)

    # Employment multiplier
    emp_mult = (e_total[:, np.newaxis] * L).sum(axis=0)

    # Linkages
    col_sum = L.sum(axis=0)
    row_sum = L.sum(axis=1)
    total_L = L.sum()
    BL = n * col_sum / total_L
    FL = n * row_sum / total_L

    def get_type(j):
        if BL[j] > 1 and FL[j] > 1:
            return "key"
        if BL[j] > 1:
            return "backward"
        if FL[j] > 1:
            return "forward"
        return "weak"

    computed = {
        "n": n, "codes": codes, "names": names,
        "X": X, "GVA": GVA, "L": L,
        "v": v, "e_total": e_total, "e_formal": e_formal, "e_informal": e_informal,
        "out_mult": out_mult, "va_mult": va_mult, "emp_mult": emp_mult,
        "BL": BL, "FL": FL, "get_type": get_type,
        "emp_total": emp_total, "emp_formal": emp_formal, "emp_informal": emp_informal,
    }
    data["_computed"] = computed
    return computed


def run_demand_shock(
    data: dict,
    consumption: float = 0,
    government: float = 0,
    investment: float = 0,
    exports: float = 0,
    distribution: str = "output",
    sector_code: str | None = None,
) -> dict:
    """Propagate a final demand shock through the I-O model.

    Args:
        data: Loaded io_data.json.
        consumption/government/investment/exports: Shock in billion UZS.
        distribution: How to distribute across sectors ("output", "gva", "equal").
        sector_code: If set, apply entire shock to one sector.
    """
    c = _init_arrays(data)
    n = c["n"]
    L = c["L"]

    total_shock = consumption + government + investment + exports

    if sector_code is not None:
        # Apply to specific sector
        dY = np.zeros(n)
        try:
            j = c["codes"].index(sector_code)
            dY[j] = total_shock
        except ValueError:
            return {"error": f"Sector code '{sector_code}' not found. Use io_sector_info to list sectors."}
    else:
        # Distribute across sectors
        if distribution == "gva":
            weights = c["GVA"].copy()
        elif distribution == "equal":
            weights = np.ones(n)
        else:  # output
            weights = c["X"].copy()

        w_sum = weights.sum()
        if w_sum > 0:
            dY = total_shock * (weights / w_sum)
        else:
            dY = np.zeros(n)

    # dX = L @ dY
    dX = L @ dY

    # VA effect
    dVA = dX * c["v"]

    # Employment effect
    dEmp = dX * c["e_total"]

    total_dY = float(dY.sum())
    total_dX = float(dX.sum())
    total_dVA = float(dVA.sum())
    total_dEmp = float(dEmp.sum())
    multiplier = total_dX / total_dY if total_dY != 0 else None

    # Top 30 sectors by |dX|
    sorted_idx = np.argsort(-np.abs(dX))[:30]
    top_sectors = []
    for j in sorted_idx:
        if abs(dX[j]) < 0.001:
            break
        top_sectors.append({
            "code": c["codes"][j],
            "name": c["names"][j][:60],
            "demand_shock_bln_uzs": round(float(dY[j]), 3),
            "output_effect_bln_uzs": round(float(dX[j]), 3),
            "va_effect_bln_uzs": round(float(dVA[j]), 3),
            "employment_effect_persons": round(float(dEmp[j])),
        })

    return {
        "model": "Input-Output (Leontief)",
        "n_sectors": n,
        "base_year": 2022,
        "aggregate": {
            "total_demand_shock_bln_uzs": round(total_dY, 2),
            "total_output_effect_bln_uzs": round(total_dX, 2),
            "total_va_effect_bln_uzs": round(total_dVA, 2),
            "total_employment_effect_persons": round(total_dEmp),
            "aggregate_multiplier": round(multiplier, 3) if multiplier else None,
        },
        "top_sectors": top_sectors,
    }


def get_sector_info(
    data: dict,
    sector_code: str | None = None,
    classification: str | None = None,
    top_n: int = 20,
) -> dict:
    """Get sector metadata, multipliers, and linkage classification."""
    c = _init_arrays(data)
    n = c["n"]

    sectors = []
    for j in range(n):
        stype = c["get_type"](j)
        if classification and stype != classification:
            continue
        if sector_code and c["codes"][j] != sector_code:
            continue

        sectors.append({
            "code": c["codes"][j],
            "name": c["names"][j][:60],
            "output_mln_uzs": round(float(c["X"][j]), 1),
            "gva_mln_uzs": round(float(c["GVA"][j]), 1),
            "employment_total": int(c["emp_total"][j]),
            "output_multiplier": round(float(c["out_mult"][j]), 4),
            "va_multiplier": round(float(c["va_mult"][j]), 4),
            "employment_multiplier": round(float(c["emp_mult"][j]), 1),
            "backward_linkage": round(float(c["BL"][j]), 4),
            "forward_linkage": round(float(c["FL"][j]), 4),
            "classification": stype,
        })

    # Sort by output multiplier descending
    sectors.sort(key=lambda s: s["output_multiplier"], reverse=True)
    sectors = sectors[:min(top_n, 136)]

    # Summary counts
    all_types = [c["get_type"](j) for j in range(n)]
    type_counts = {t: all_types.count(t) for t in ["key", "backward", "forward", "weak"]}

    return {
        "model": "Input-Output Sector Info",
        "n_sectors": n,
        "base_year": 2022,
        "type_counts": type_counts,
        "sectors": sectors,
    }
