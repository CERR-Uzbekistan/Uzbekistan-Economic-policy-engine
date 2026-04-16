"""QPM (Quarterly Projection Model) — New-Keynesian DSGE solver.

Ported from qpm_uzbekistan/index.html:539-667 (solveIRF) and 745-813 (runBL).
Bidirectional Gauss-Seidel solver for IS curve, Phillips curve, Taylor rule, UIP.
"""

import numpy as np


def solve_irf(
    params: dict,
    shock_type: str,
    shock_size: float,
    horizon: int,
) -> dict:
    """Run impulse response function analysis.

    Args:
        params: Structural parameters (b1-e1, inflation_target, neutral_real_rate, potential_growth).
        shock_type: One of 'demand', 'cost_push', 'depreciation', 'monetary'.
        shock_size: Shock magnitude in percentage points.
        horizon: Number of quarters (8-32).

    Returns:
        dict with IRF paths, convergence info, and peak values.
    """
    b1 = params["b1"]
    b2 = params["b2"]
    b4 = params["b4"]
    a1 = params["a1"]
    a2 = params["a2"]
    a3 = params["a3"]
    g1 = params["g1"]
    g2 = params["g2"]
    g3 = params["g3"]
    e1 = params["e1"]

    T = int(np.clip(horizon, 8, 32))
    N = T + 8  # buffer for t+4 lookups
    ST = 1     # shock period index

    # Allocate arrays
    gap = np.zeros(N)
    pi = np.zeros(N)
    pi4 = np.zeros(N)
    rs = np.zeros(N)
    rr_gap = np.zeros(N)
    mci = np.zeros(N)
    rmc = np.zeros(N)
    s = np.zeros(N)
    l_cpi = np.zeros(N)
    l_z_gap = np.zeros(N)
    d4l_s = np.zeros(N)

    # Shock vectors
    shk_gap = np.zeros(N)
    shk_pi = np.zeros(N)
    shk_s = np.zeros(N)
    shk_rs = np.zeros(N)

    shock_map = {
        "demand": shk_gap,
        "cost_push": shk_pi,
        "depreciation": shk_s,
        "monetary": shk_rs,
    }
    if shock_type in shock_map:
        shock_map[shock_type][ST] = shock_size

    def g(arr, t):
        """Safe array accessor (zero outside bounds)."""
        return arr[t] if 0 <= t < N else 0.0

    iters = 0
    converged = False

    for iteration in range(600):
        iters = iteration + 1
        pi0 = pi.copy()
        s0 = s.copy()
        gap0 = gap.copy()

        # PASS 1: Backward sweep for UIP (exchange rate)
        for t in range(N - 2, ST - 1, -1):
            s[t] = (1 - e1) * g(s, t + 1) + e1 * g(s, t - 1) - rs[t] / 4 + shk_s[t]

        # PASS 2: Forward sweep for IS/PC/Taylor
        for t in range(ST, N - 1):
            # CPI price level
            l_cpi[t] = l_cpi[t - 1] + g(pi, t - 1) / 4

            # RER gap
            l_z_gap[t] = g(s, t) - l_cpi[t]

            # Real Marginal Cost
            rmc[t] = a3 * g(gap, t - 1) + (1 - a3) * l_z_gap[t]

            # Phillips curve (hybrid NK)
            pi[t] = a1 * g(pi, t - 1) + (1 - a1) * g(pi, t + 1) + a2 * rmc[t] + shk_pi[t]

            # Refresh l_cpi and z_gap with updated pi[t]
            l_cpi[t] = l_cpi[t - 1] + pi[t] / 4
            l_z_gap[t] = g(s, t) - l_cpi[t]

            # YoY inflation
            pi4[t] = (g(pi, t) + g(pi, t - 1) + g(pi, t - 2) + g(pi, t - 3)) / 4

            # Taylor rule
            rs[t] = (
                g1 * g(rs, t - 1)
                + (1 - g1) * (g(pi, t + 1) + g2 * g(pi4, t + 4) + g3 * g(gap, t - 1))
                + shk_rs[t]
            )

            # Real interest rate gap
            rr_gap[t] = rs[t] - g(pi, t + 1)

            # MCI
            mci[t] = b4 * rr_gap[t] - (1 - b4) * l_z_gap[t]

            # IS curve
            gap[t] = b1 * g(gap, t - 1) - b2 * mci[t] + shk_gap[t]

            # Final refresh: update RMC and Phillips with realised gap
            rmc[t] = a3 * gap[t] + (1 - a3) * l_z_gap[t]
            pi[t] = a1 * g(pi, t - 1) + (1 - a1) * g(pi, t + 1) + a2 * rmc[t] + shk_pi[t]
            l_cpi[t] = l_cpi[t - 1] + pi[t] / 4
            l_z_gap[t] = g(s, t) - l_cpi[t]
            pi4[t] = (g(pi, t) + g(pi, t - 1) + g(pi, t - 2) + g(pi, t - 3)) / 4

            # Final Taylor and MCI with updated gap and pi
            rs[t] = (
                g1 * g(rs, t - 1)
                + (1 - g1) * (g(pi, t + 1) + g2 * g(pi4, t + 4) + g3 * gap[t])
                + shk_rs[t]
            )
            rr_gap[t] = rs[t] - g(pi, t + 1)
            mci[t] = b4 * rr_gap[t] - (1 - b4) * l_z_gap[t]

        # YoY NER depreciation
        for t in range(N):
            d4l_s[t] = g(s, t) - g(s, t - 4)

        # Convergence check
        diff = max(
            np.max(np.abs(pi - pi0)),
            np.max(np.abs(s - s0)),
            np.max(np.abs(gap - gap0)),
        )
        if iteration > 3 and diff < 1e-10:
            converged = True
            break

    # Slice output: Q0 (=ST) to QT (=ST+T), inclusive -> T+1 points
    def sl(arr):
        return [float(g(arr, ST + i)) for i in range(T + 1)]

    irf_paths = {
        "output_gap": sl(gap),
        "inflation_yoy": sl(pi4),
        "policy_rate": sl(rs),
        "ner_depreciation_yoy": sl(d4l_s),
        "rer_gap": sl(l_z_gap),
        "mci": sl(mci),
    }

    # Compute peaks
    peaks = {}
    for key, path in irf_paths.items():
        if key in ("rer_gap", "mci"):
            continue
        abs_vals = [abs(v) for v in path]
        peak_idx = abs_vals.index(max(abs_vals))
        peaks[key] = {"value": round(path[peak_idx], 4), "quarter": peak_idx}

    return {
        "model": "QPM",
        "shock": {"type": shock_type, "size": shock_size, "horizon": T},
        "solver": {"converged": converged, "iterations": iters},
        "irf_paths": {k: [round(v, 6) for v in vals] for k, vals in irf_paths.items()},
        "peaks": peaks,
        "parameters_used": params,
    }


def run_baseline(
    params: dict,
    initial_inflation_yoy: float = 10.5,
    initial_policy_rate: float = 13.5,
    initial_output_gap: float = -1.5,
    initial_ner_depreciation: float = 8.0,
    horizon: int = 16,
) -> dict:
    """Generate baseline macro forecast.

    Ported from qpm_uzbekistan/index.html:745-813 (runBL).
    """
    T = int(np.clip(horizon, 4, 32))
    tar = params["inflation_target"]
    rrbar = params["neutral_real_rate"]
    gdpbar = params["potential_growth"]
    neutral_nominal = rrbar + tar

    b1 = params["b1"]
    b2 = params["b2"]
    a1 = params["a1"]
    a2 = params["a2"]
    a3 = params["a3"]
    g1 = params["g1"]
    g2 = params["g2"]
    g3 = params["g3"]

    pi = np.zeros(T + 2)
    rs = np.zeros(T + 2)
    gap_arr = np.zeros(T + 2)
    dep = np.zeros(T + 2)

    pi[0] = initial_inflation_yoy
    rs[0] = initial_policy_rate
    gap_arr[0] = initial_output_gap
    dep[0] = initial_ner_depreciation

    for t in range(1, T + 1):
        pi_f = pi[t - 1] * 0.75 + tar * 0.25
        pi_gap = pi[t - 1] - tar

        rs[t] = g1 * rs[t - 1] + (1 - g1) * (neutral_nominal + g2 * pi_gap + g3 * gap_arr[t - 1])
        rr = rs[t - 1] - pi[t - 1]
        gap_arr[t] = b1 * gap_arr[t - 1] - b2 * max(0, rr - rrbar) * 0.4
        rmc_val = a3 * gap_arr[t]
        pi[t] = a1 * pi[t - 1] + (1 - a1) * pi_f + a2 * rmc_val * 3
        dep[t] = max(0, dep[t - 1] * 0.65 + max(0, pi[t - 1] - tar) * 0.6)

    # Quarter labels starting from Q1 2024
    labels = []
    for t in range(T):
        q_label = ["Q1", "Q2", "Q3", "Q4"][t % 4]
        year = 2024 + t // 4
        labels.append(f"{q_label} {year}")

    sl_pi = [round(float(pi[t]), 4) for t in range(T)]
    sl_rs = [round(float(rs[t]), 4) for t in range(T)]
    sl_gap = [round(float(gap_arr[t]), 4) for t in range(T)]
    sl_dep = [round(float(dep[t]), 4) for t in range(T)]

    # Summary: 2025 avg inflation, Q8 values
    q8 = min(7, T - 1)
    avg_2025 = sum(sl_pi[4:8]) / max(1, len(sl_pi[4:8])) if T > 4 else sl_pi[-1]

    return {
        "model": "QPM Baseline",
        "horizon_quarters": T,
        "paths": {
            "inflation_yoy": sl_pi,
            "policy_rate": sl_rs,
            "output_gap": sl_gap,
            "ner_depreciation": sl_dep,
        },
        "labels": labels,
        "summary": {
            "inflation_2025_avg": round(avg_2025, 2),
            "policy_rate_q8": round(float(rs[q8]), 2),
            "gdp_growth_2025": round(gdpbar + float(gap_arr[q8]), 2),
            "ner_depreciation_q8": round(float(dep[q8]), 2),
        },
        "parameters_used": params,
    }
