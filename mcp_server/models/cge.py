"""CGE 1-2-3 Model — Computable General Equilibrium solver.

Ported from cge_model/index.html:605-708.
Devarajan-Go-Lewis-Robinson-Sinko framework with CET export supply,
CES Armington imports, and BoP closure via flexible exchange rate.
Calibrated to 2021 Uzbekistan SAM.
"""

import math

from helpers.validation import CGE_DEFAULTS, CGE_BASE_ENDOGENOUS

# CET/CES structural parameters (from calibration, not user-adjustable)
_STRUCT = {
    "at": 2.42, "bt": 0.82, "rho_t": 2.43, "sig_t": 0.70,
    "aq": 1.91, "bq": 0.32, "rho_q": 0.43, "sig_q": 0.70,
}


def solve_cge(params: dict) -> dict:
    """Solve the CGE 1-2-3 model for given policy parameters.

    Args:
        params: Dict with keys: tm, te, ts, ty, sy, G, wm, we, B, re, ft, X, Pf, tr.
            All in decimal form (e.g. tm=0.02 for 2% tariff).

    Returns:
        Dict with equilibrium values, changes from base, and solver info.
    """
    at = _STRUCT["at"]
    bt = _STRUCT["bt"]
    rho_t = _STRUCT["rho_t"]
    sig_t = _STRUCT["sig_t"]
    aq = _STRUCT["aq"]
    bq = _STRUCT["bq"]
    rho_q = _STRUCT["rho_q"]
    sig_q = _STRUCT["sig_q"]

    wm = params.get("wm", CGE_DEFAULTS["wm"])
    we = params.get("we", CGE_DEFAULTS["we"])
    tm = params.get("tm", CGE_DEFAULTS["tm"])
    te = params.get("te", CGE_DEFAULTS["te"])
    ts = params.get("ts", CGE_DEFAULTS["ts"])
    ty = params.get("ty", CGE_DEFAULTS["ty"])
    sy = params.get("sy", CGE_DEFAULTS["sy"])
    G = params.get("G", CGE_DEFAULTS["G"])
    tr = params.get("tr", CGE_DEFAULTS["tr"])
    ft = params.get("ft", CGE_DEFAULTS["ft"])
    re = params.get("re", CGE_DEFAULTS["re"])
    B = params.get("B", CGE_DEFAULTS["B"])
    X = params.get("X", CGE_DEFAULTS["X"])
    Pf = params.get("Pf", CGE_DEFAULTS["Pf"])
    Pd = 1.0  # numeraire

    def bop_residual(Er):
        Pe = we * (1 - te) * Er
        Pm = wm * (1 + tm) * Er

        if Pe <= 0 or Pm <= 0 or X <= 0:
            return 1e10

        # CET: FOC ratio E/Ds
        try:
            eRat = math.pow((1 - bt) / bt * Pe / Pd, sig_t)
        except (ValueError, OverflowError):
            return 1e10
        if not math.isfinite(eRat) or eRat <= 0:
            return 1e10

        inner_t = bt * math.pow(eRat, rho_t) + (1 - bt)
        if inner_t <= 0:
            return 1e10
        Ds = X / (at * math.pow(inner_t, 1.0 / rho_t))
        if not math.isfinite(Ds) or Ds <= 0:
            return 1e10

        E = eRat * Ds
        if not math.isfinite(E) or E < 0:
            return 1e10

        # CES: FOC ratio M/Dd
        try:
            mRat = math.pow(bq / (1 - bq) * Pd / Pm, sig_q)
        except (ValueError, OverflowError):
            return 1e10
        if not math.isfinite(mRat) or mRat < 0:
            return 1e10

        M = mRat * Ds
        if not math.isfinite(M) or M < 0:
            return 1e10

        # BoP: Pm*M = Pe*E + B + re + ft
        return Pm * M - Pe * E - B - re - ft

    # Bisection on Er in [0.001, 1000]
    lo, hi = 0.001, 1000.0
    fLo = bop_residual(lo)
    fHi = bop_residual(hi)
    Er = 1.0
    converged = False

    # Ensure bracket
    if fLo * fHi > 0:
        step = 0.1
        while step < 500:
            if bop_residual(step) * fHi <= 0:
                lo = step
                fLo = bop_residual(step)
                break
            step *= 1.5

    for _ in range(100):
        mid = (lo + hi) / 2
        fMid = bop_residual(mid)
        if abs(fMid) < 1e-10 or (hi - lo) < 1e-12:
            Er = mid
            converged = True
            break
        if fLo * fMid <= 0:
            hi = mid
            fHi = fMid
        else:
            lo = mid
            fLo = fMid
        Er = mid

    if abs(bop_residual(Er)) < 1e-6:
        converged = True

    if not converged:
        return {
            "model": "CGE 1-2-3",
            "error": True,
            "message": "Solver did not converge. Check parameter values.",
        }

    # Compute all endogenous at solved Er
    Pe = we * (1 - te) * Er
    Pm = wm * (1 + tm) * Er

    eRat = math.pow((1 - bt) / bt * Pe / Pd, sig_t)
    inner_t = bt * math.pow(eRat, rho_t) + (1 - bt)
    Ds = X / (at * math.pow(inner_t, 1.0 / rho_t))
    E = eRat * Ds

    mRat = math.pow(bq / (1 - bq) * Pd / Pm, sig_q)
    M = mRat * Ds

    # Composite good
    inner_q = bq * math.pow(M, -rho_q) + (1 - bq) * math.pow(Ds, -rho_q)
    Q = aq * math.pow(inner_q, -1.0 / rho_q)

    # Prices
    Pq = (Pm * M + Pd * Ds) / Q
    Pt = (Pe * E + Pd * Ds) / X
    Px = Pf * Pt

    # Fiscal/macro aggregates
    TAX = ts * Pq * Q + ty * Px * X + tm * wm * Er * M + te * we * Er * E
    Y = Px * X + tr + ft + re
    Sg = TAX - G - tr
    Cn = (1 - sy) * (Y - TAX)
    S = sy * (Y - TAX) + Sg + B
    Z = S
    TB = Pe * E - Pm * M

    results = {
        "Er": round(Er, 6), "Pe": round(Pe, 6), "Pm": round(Pm, 6), "Pd": Pd,
        "E": round(E, 6), "M": round(M, 6), "Ds": round(Ds, 6), "Q": round(Q, 6),
        "X": round(X, 6),
        "Pq": round(Pq, 6), "Pt": round(Pt, 6), "Px": round(Px, 6),
        "TAX": round(TAX, 6), "Y": round(Y, 6), "Sg": round(Sg, 6),
        "Cn": round(Cn, 6), "S": round(S, 6), "Z": round(Z, 6), "TB": round(TB, 6),
    }

    # Changes from base
    base = CGE_BASE_ENDOGENOUS
    changes = {}
    for key in ["Er", "E", "M", "Ds", "Q", "Y", "Cn", "TAX", "Sg", "S", "Z"]:
        base_val = base.get(key, 0)
        if base_val != 0:
            changes[f"{key}_pct_change"] = round((results[key] - base_val) / abs(base_val) * 100, 4)

    return {
        "model": "CGE 1-2-3 (Devarajan-Go)",
        "error": False,
        "solver": {"converged": converged, "method": "bisection", "exchange_rate": round(Er, 6)},
        "base_year": 2021,
        "results": results,
        "changes_from_base": changes,
        "parameters_used": {
            "tm": tm, "te": te, "ts": ts, "ty": ty, "sy": sy,
            "G": G, "wm": wm, "we": we, "B": B, "re": re, "ft": ft,
            "X": X, "Pf": Pf, "tr": tr,
        },
    }
