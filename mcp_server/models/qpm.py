"""QPM (Quarterly Projection Model) solver.

Canonical Python port of ``scripts/export_qpm.R``.  The same equations are used
for MCP impulse responses and the baseline forecast: IS curve, hybrid Phillips
curve with direct import-price pass-through, Taylor rule, and UIP with a
one-period risk-premium shock.
"""

from __future__ import annotations

import math
from typing import TypedDict

import numpy as np

EXTERNAL_DEMAND_RHO = 0.75
EXCHANGE_RATE_BASE_UZS_PER_USD = 12650.0


class InitialConditions(TypedDict):
    """QPM initial conditions in deviation form."""

    pi: float
    rs: float
    gap: float
    d4ls: float


def _safe_get(arr: np.ndarray, index: int) -> float:
    return float(arr[index]) if 0 <= index < len(arr) else 0.0


def _normalise_shock_type(shock_type: str | None) -> str | None:
    aliases = {
        None: None,
        "cost_push": "inflation",
        "depreciation": "exchange",
        "external": "external_demand",
    }
    return aliases.get(shock_type, shock_type)


def _initial_conditions_from_levels(
    params: dict,
    *,
    initial_inflation_yoy: float,
    initial_policy_rate: float,
    initial_output_gap: float,
    initial_ner_depreciation: float,
) -> InitialConditions:
    target = params["inflation_target"]
    neutral_nominal = params["neutral_real_rate"] + target
    return {
        "pi": initial_inflation_yoy - target,
        "rs": initial_policy_rate - neutral_nominal,
        "gap": initial_output_gap,
        "d4ls": initial_ner_depreciation - target,
    }


def _quarter_labels(start_year: int, start_quarter: int, n: int) -> list[str]:
    labels: list[str] = []
    year = start_year
    quarter = start_quarter
    for _ in range(n):
        labels.append(f"Q{quarter} {year}")
        quarter += 1
        if quarter > 4:
            quarter = 1
            year += 1
    return labels


def _solve_core(
    params: dict,
    shock_type: str | None,
    shock_size: float,
    horizon: int,
    *,
    init_conds: InitialConditions | None = None,
    additional_shocks: dict[str, float] | None = None,
) -> dict[str, np.ndarray | int | bool]:
    """Solve QPM in deviation form and return raw arrays.

    ``horizon`` is the number of post-shock transitions.  Returned paths contain
    ``horizon + 1`` points, matching ``scripts/export_qpm.R``.
    """

    T = int(np.clip(horizon, 0, 32))
    has_init = init_conds is not None
    shock_idx = 5 if has_init else 1
    n = T + shock_idx + 11

    gap = np.zeros(n)
    pi = np.zeros(n)
    pi4 = np.zeros(n)
    rs = np.zeros(n)
    rr_gap = np.zeros(n)
    mci = np.zeros(n)
    rmc = np.zeros(n)
    s = np.zeros(n)
    l_cpi = np.zeros(n)
    l_z_gap = np.zeros(n)
    d4l_s = np.zeros(n)
    dpm = np.zeros(n)

    if init_conds is not None:
        for t in range(shock_idx):
            gap[t] = init_conds["gap"]
            pi[t] = init_conds["pi"]
            rs[t] = init_conds["rs"]
            s[t] = init_conds["d4ls"] * t / max(1, shock_idx - 1)
        for t in range(1, shock_idx):
            l_cpi[t] = l_cpi[t - 1] + pi[t - 1] / 4
            l_z_gap[t] = s[t] - l_cpi[t]

    shock_vectors = {
        "demand": np.zeros(n),
        "inflation": np.zeros(n),
        "exchange": np.zeros(n),
        "monetary": np.zeros(n),
        "risk": np.zeros(n),
        "external_demand": np.zeros(n),
    }

    def add_shock(name: str | None, size: float) -> None:
        normalised = _normalise_shock_type(name)
        if normalised is None:
            return
        if normalised not in shock_vectors:
            raise ValueError(f"Unknown shock_type: {name}")
        shock_vectors[normalised][shock_idx] += float(size)

    add_shock(shock_type, shock_size)
    for name, size in (additional_shocks or {}).items():
        add_shock(name, size)

    gap_star = shock_vectors["external_demand"]
    for t in range(shock_idx + 1, n):
        gap_star[t] = EXTERNAL_DEMAND_RHO * gap_star[t - 1]

    b1 = params["b1"]
    b2 = params["b2"]
    b3 = params["b3"]
    b4 = params["b4"]
    a1 = params["a1"]
    a2 = params["a2"]
    a3 = params["a3"]
    a4 = params["a4"]
    g1 = params["g1"]
    g2 = params["g2"]
    g3 = params["g3"]
    e1 = params["e1"]

    iters = 0
    converged = False

    for iteration in range(600):
        iters = iteration + 1
        pi0 = pi.copy()
        s0 = s.copy()
        gap0 = gap.copy()

        for t in range(n - 2, shock_idx - 1, -1):
            s[t] = (
                (1 - e1) * _safe_get(s, t + 1)
                + e1 * _safe_get(s, t - 1)
                - (rs[t] - shock_vectors["risk"][t]) / 4
                + shock_vectors["exchange"][t]
            )

        for t in range(shock_idx, n - 1):
            l_cpi[t] = l_cpi[t - 1] + _safe_get(pi, t - 1) / 4
            l_z_gap[t] = _safe_get(s, t) - l_cpi[t]
            dpm[t] = _safe_get(s, t) - _safe_get(s, t - 1)
            rmc[t] = a3 * _safe_get(gap, t - 1) + (1 - a3) * l_z_gap[t]

            pi[t] = (
                a1 * _safe_get(pi, t - 1)
                + (1 - a1) * _safe_get(pi, t + 1)
                + a2 * rmc[t]
                + a4 * dpm[t]
                + shock_vectors["inflation"][t]
            )

            l_cpi[t] = l_cpi[t - 1] + pi[t] / 4
            l_z_gap[t] = _safe_get(s, t) - l_cpi[t]
            pi4[t] = (
                _safe_get(pi, t)
                + _safe_get(pi, t - 1)
                + _safe_get(pi, t - 2)
                + _safe_get(pi, t - 3)
            ) / 4

            rs[t] = (
                g1 * _safe_get(rs, t - 1)
                + (1 - g1)
                * (
                    _safe_get(pi, t + 1)
                    + g2 * _safe_get(pi4, t + 4)
                    + g3 * _safe_get(gap, t - 1)
                )
                + shock_vectors["monetary"][t]
            )

            rr_gap[t] = rs[t] - _safe_get(pi, t + 1)
            mci[t] = b4 * rr_gap[t] - (1 - b4) * l_z_gap[t]
            gap[t] = (
                b1 * _safe_get(gap, t - 1)
                - b2 * mci[t]
                + b3 * gap_star[t]
                + shock_vectors["demand"][t]
            )

            rmc[t] = a3 * gap[t] + (1 - a3) * l_z_gap[t]
            pi[t] = (
                a1 * _safe_get(pi, t - 1)
                + (1 - a1) * _safe_get(pi, t + 1)
                + a2 * rmc[t]
                + a4 * dpm[t]
                + shock_vectors["inflation"][t]
            )
            l_cpi[t] = l_cpi[t - 1] + pi[t] / 4
            l_z_gap[t] = _safe_get(s, t) - l_cpi[t]
            pi4[t] = (
                _safe_get(pi, t)
                + _safe_get(pi, t - 1)
                + _safe_get(pi, t - 2)
                + _safe_get(pi, t - 3)
            ) / 4

            rs[t] = (
                g1 * _safe_get(rs, t - 1)
                + (1 - g1)
                * (_safe_get(pi, t + 1) + g2 * _safe_get(pi4, t + 4) + g3 * gap[t])
                + shock_vectors["monetary"][t]
            )
            rr_gap[t] = rs[t] - _safe_get(pi, t + 1)
            mci[t] = b4 * rr_gap[t] - (1 - b4) * l_z_gap[t]

        for t in range(n):
            d4l_s[t] = _safe_get(s, t) - _safe_get(s, t - 4)

        max_diff = max(
            float(np.max(np.abs(pi[shock_idx:] - pi0[shock_idx:]))),
            float(np.max(np.abs(s[shock_idx:] - s0[shock_idx:]))),
            float(np.max(np.abs(gap[shock_idx:] - gap0[shock_idx:]))),
        )
        if iteration > 3 and max_diff < 1e-8:
            converged = True
            break

    out_idx = slice(shock_idx, shock_idx + T + 1)
    return {
        "gap": gap[out_idx],
        "pi4": pi4[out_idx],
        "rs": rs[out_idx],
        "s": s[out_idx],
        "d4l_s": d4l_s[out_idx],
        "l_z_gap": l_z_gap[out_idx],
        "mci": mci[out_idx],
        "iters": iters,
        "converged": converged,
    }


def solve_irf(
    params: dict,
    shock_type: str,
    shock_size: float,
    horizon: int,
) -> dict:
    """Run impulse response analysis in deviation form.

    Args:
        params: Structural parameters.
        shock_type: One of ``demand``, ``cost_push``/``inflation``,
            ``depreciation``/``exchange``, ``monetary``, ``risk``,
            ``external_demand``/``external``.
        shock_size: Shock magnitude in percentage points.
        horizon: Number of quarters (8-32).
    """

    T = int(np.clip(horizon, 8, 32))
    normalised_shock = _normalise_shock_type(shock_type)
    raw = _solve_core(params, normalised_shock, shock_size, T)

    def sl(key: str) -> list[float]:
        return [float(value) for value in raw[key]]  # type: ignore[index]

    irf_paths = {
        "output_gap": sl("gap"),
        "inflation_yoy": sl("pi4"),
        "policy_rate": sl("rs"),
        "ner_depreciation_yoy": sl("d4l_s"),
        "exchange_rate_gap": sl("s"),
        "rer_gap": sl("l_z_gap"),
        "mci": sl("mci"),
    }

    peaks = {}
    for key, path in irf_paths.items():
        if key in ("rer_gap", "mci"):
            continue
        abs_vals = [abs(v) for v in path]
        peak_idx = abs_vals.index(max(abs_vals))
        peaks[key] = {"value": round(path[peak_idx], 4), "quarter": peak_idx}

    return {
        "model": "QPM",
        "shock": {"type": normalised_shock, "size": shock_size, "horizon": T},
        "solver": {"converged": bool(raw["converged"]), "iterations": int(raw["iters"])},
        "irf_paths": {k: [round(v, 6) for v in vals] for k, vals in irf_paths.items()},
        "peaks": peaks,
        "parameters_used": params,
    }


def _baseline_exchange_rate_reference(
    d4l_s_deviation: np.ndarray,
    params: dict,
    er_base: float = EXCHANGE_RATE_BASE_UZS_PER_USD,
) -> list[float]:
    d4ls_level = params["inflation_target"] + d4l_s_deviation
    er = [er_base]
    for value in d4ls_level[1:]:
        er.append(er[-1] * (1 + float(value) / 400))
    return er


def run_baseline(
    params: dict,
    initial_inflation_yoy: float = 10.5,
    initial_policy_rate: float = 13.5,
    initial_output_gap: float = -1.5,
    initial_ner_depreciation: float = 8.0,
    horizon: int = 16,
) -> dict:
    """Generate a QPM baseline forecast using the canonical solver."""

    periods = int(np.clip(horizon, 4, 32))
    init_conds = _initial_conditions_from_levels(
        params,
        initial_inflation_yoy=initial_inflation_yoy,
        initial_policy_rate=initial_policy_rate,
        initial_output_gap=initial_output_gap,
        initial_ner_depreciation=initial_ner_depreciation,
    )
    raw = _solve_core(params, None, 0, periods - 1, init_conds=init_conds)

    gap = raw["gap"]  # type: ignore[assignment]
    pi4 = raw["pi4"]  # type: ignore[assignment]
    rs = raw["rs"]  # type: ignore[assignment]
    d4l_s = raw["d4l_s"]  # type: ignore[assignment]
    potential_growth = params["potential_growth"]
    target = params["inflation_target"]
    neutral_nominal = params["neutral_real_rate"] + target

    gdp_growth = [round(float(potential_growth + value), 4) for value in gap]
    inflation = [round(float(target + value), 4) for value in pi4]
    policy_rate = [round(float(neutral_nominal + value), 4) for value in rs]
    output_gap = [round(float(value), 4) for value in gap]
    ner_depreciation = [round(float(target + value), 4) for value in d4l_s]
    exchange_rate = [
        round(value, 1)
        for value in _baseline_exchange_rate_reference(d4l_s, params)
    ]

    q8 = min(7, periods - 1)
    avg_first_year = sum(inflation[:4]) / min(4, len(inflation))

    return {
        "model": "QPM Baseline",
        "horizon_quarters": periods,
        "paths": {
            "gdp_growth": gdp_growth,
            "inflation_yoy": inflation,
            "policy_rate": policy_rate,
            "output_gap": output_gap,
            "ner_depreciation": ner_depreciation,
            "exchange_rate": exchange_rate,
        },
        "labels": _quarter_labels(2026, 1, periods),
        "summary": {
            "inflation_first_year_avg": round(avg_first_year, 2),
            "policy_rate_q8": round(policy_rate[q8], 2),
            "gdp_growth_q8": round(gdp_growth[q8], 2),
            "ner_depreciation_q8": round(ner_depreciation[q8], 2),
        },
        "solver": {"converged": bool(raw["converged"]), "iterations": int(raw["iters"])},
        "parameters_used": params,
    }


def run_level_scenario(
    params: dict,
    shocks: dict[str, float],
    *,
    horizon: int = 8,
    initial_inflation_yoy: float = 10.5,
    initial_policy_rate: float = 13.5,
    initial_output_gap: float = -1.5,
    initial_ner_depreciation: float = 8.0,
) -> dict:
    """Run a level-path scenario against the canonical baseline.

    This helper is used by tests to compare the MCP solver with the public JSON
    artifact and the React Scenario Lab implementation.
    """

    periods = int(np.clip(horizon, 4, 32))
    init_conds = _initial_conditions_from_levels(
        params,
        initial_inflation_yoy=initial_inflation_yoy,
        initial_policy_rate=initial_policy_rate,
        initial_output_gap=initial_output_gap,
        initial_ner_depreciation=initial_ner_depreciation,
    )
    baseline = _solve_core(params, None, 0, periods - 1, init_conds=init_conds)
    scenario = _solve_core(
        params,
        None,
        0,
        periods - 1,
        init_conds=init_conds,
        additional_shocks=shocks,
    )
    baseline_er = _baseline_exchange_rate_reference(baseline["d4l_s"], params)  # type: ignore[arg-type]

    def levels(raw: dict[str, np.ndarray | int | bool]) -> dict[str, list[float]]:
        target = params["inflation_target"]
        neutral_nominal = params["neutral_real_rate"] + target
        gap = raw["gap"]  # type: ignore[assignment]
        pi4 = raw["pi4"]  # type: ignore[assignment]
        rs = raw["rs"]  # type: ignore[assignment]
        s = raw["s"]  # type: ignore[assignment]
        baseline_s = baseline["s"]  # type: ignore[assignment]
        er = [
            baseline_er[index] * math.exp(float(s[index] - baseline_s[index]) / 100)
            for index in range(periods)
        ]
        return {
            "gdp_growth": [round(float(params["potential_growth"] + value), 4) for value in gap],
            "inflation": [round(float(target + value), 4) for value in pi4],
            "policy_rate": [round(float(neutral_nominal + value), 4) for value in rs],
            "exchange_rate": [round(float(value), 1) for value in er],
        }

    return {
        "periods": _quarter_labels(2026, 1, periods),
        "baseline": levels(baseline),
        "scenario": levels(scenario),
        "solver": {
            "baseline_converged": bool(baseline["converged"]),
            "scenario_converged": bool(scenario["converged"]),
            "baseline_iterations": int(baseline["iters"]),
            "scenario_iterations": int(scenario["iters"]),
        },
    }
