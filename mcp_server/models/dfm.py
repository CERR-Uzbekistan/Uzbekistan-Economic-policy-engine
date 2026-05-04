"""Dynamic Factor Model (DFM) — GDP Nowcasting via Kalman Filter.

Ported from dfm_nowcast/index.html:507-575 (kalmanStep) and 450-499 (matrix ops).
Uses pre-estimated state-space matrices from dfm_data.json.
"""

import numpy as np


def _load_params(data: dict) -> dict:
    """Convert JSON data to numpy arrays (cached)."""
    if "_np" in data:
        return data["_np"]

    params = data["params"]
    vars_info = data.get("vars", {})
    np_data = {
        "C": np.array(params["C"], dtype=np.float64),    # n_vars × m
        "A": np.array(params["A"], dtype=np.float64),    # m × m
        "Q": np.array(params["Q"], dtype=np.float64),    # m × m
        "R": np.array(params["R"], dtype=np.float64),    # n × n
        "means": np.array(params["means"], dtype=np.float64),
        "sdevs": np.array(params["sdevs"], dtype=np.float64),
        "Z_last": np.array(params["Z_last"], dtype=np.float64),
        "V_last": np.array(params["V_last"], dtype=np.float64),
        "gdp_idx": vars_info.get("gdp_idx", params.get("gdp_idx", 0)),
    }
    data["_np"] = np_data
    return np_data


def run_nowcast(data: dict) -> dict:
    """Get the latest GDP nowcast using pre-estimated DFM parameters.

    Returns point estimate, confidence bands, factor loadings, and model info.
    """
    p = _load_params(data)
    meta = data.get("meta", {})
    gdp_data = data.get("gdp", {})
    loadings = data.get("loadings", [])

    # GDP prediction from last filtered state
    gdp_idx = p["gdp_idx"]
    Z = p["Z_last"]
    C = p["C"]

    gdp_pred = float(np.dot(C[gdp_idx], Z) * p["sdevs"][gdp_idx] + p["means"][gdp_idx])
    gdp_pred_yoy = gdp_pred * 100  # convert to percentage

    # Forecast: propagate state forward with A matrix
    forecasts = []
    Z_fwd = Z.copy()
    sigma_base = 0.45  # per-month uncertainty (from index.html)
    for h in range(1, 4):
        Z_fwd = p["A"] @ Z_fwd
        gdp_h = float(np.dot(C[gdp_idx], Z_fwd) * p["sdevs"][gdp_idx] + p["means"][gdp_idx])
        se = sigma_base * np.sqrt(h)
        forecasts.append({
            "horizon_months": h,
            "gdp_yoy_pct": round(gdp_h * 100, 2),
            "se": round(se, 3),
            "ci_68": [round(gdp_h * 100 - se, 2), round(gdp_h * 100 + se, 2)],
            "ci_90": [round(gdp_h * 100 - 1.645 * se, 2), round(gdp_h * 100 + 1.645 * se, 2)],
        })

    # GDP history from data
    gdp_history = []
    if gdp_data:
        dates = gdp_data.get("dates", [])
        grw = gdp_data.get("grw_yoy", [])
        nowcast = gdp_data.get("nowcast", [])
        for i, d in enumerate(dates):
            val = grw[i] if i < len(grw) and grw[i] is not None else None
            nc = nowcast[i] if i < len(nowcast) else None
            gdp_history.append({
                "date": d,
                "official_yoy": val,
                "nowcast_yoy": nc,
            })

    # Top contributors by |loading|
    top_contributors = []
    if loadings:
        if isinstance(loadings, dict):
            # Parallel arrays format: {names: [...], labels: [...], values: [...], contributions: [...]}
            ld_names = loadings.get("names", loadings.get("labels", []))
            ld_values = loadings.get("values", [])
            ld_contribs = loadings.get("contributions", [])
            items = []
            for i in range(min(len(ld_names), len(ld_values))):
                items.append((ld_names[i], ld_values[i], ld_contribs[i] if i < len(ld_contribs) else 0))
            items.sort(key=lambda x: abs(x[1]), reverse=True)
            for name, loading, contrib in items[:10]:
                top_contributors.append({
                    "indicator": name,
                    "loading": round(loading, 4),
                    "contribution": round(contrib, 4) if contrib else None,
                })
        elif isinstance(loadings, list):
            sorted_loadings = sorted(loadings, key=lambda x: abs(x.get("loading", 0)), reverse=True)
            for ld in sorted_loadings[:10]:
                top_contributors.append({
                    "indicator": ld.get("name", ""),
                    "loading": round(ld.get("loading", 0), 4),
                })

    return {
        "model": "DFM Nowcast",
        "gdp_nowcast_yoy_pct": round(gdp_pred_yoy, 2),
        "model_status": {
            "n_monthly_indicators": meta.get("n_vars", 36) - 1,
            "n_factors": meta.get("n_factors", 1),
            "em_iterations": meta.get("em_iters", 0),
            "log_likelihood": meta.get("loglik", None),
            "last_data_date": meta.get("last_data_date", meta.get("last_date", "")),
        },
        "forecasts": forecasts,
        "gdp_history": gdp_history[-20:],  # last 20 observations
        "top_contributors": top_contributors,
    }


def run_kalman_update(data: dict, observations: dict) -> dict:
    """Run one Kalman filter step with new indicator observations.

    Args:
        data: Loaded dfm_data.json.
        observations: Dict mapping indicator names to new values (month-on-month %).
    """
    p = _load_params(data)
    var_info = data.get("vars", {})
    var_names = var_info.get("names", []) if isinstance(var_info, dict) else []

    C = p["C"]
    A = p["A"]
    Q = p["Q"]
    R = p["R"]
    means = p["means"]
    sdevs = p["sdevs"]
    gdp_idx = p["gdp_idx"]
    Z = p["Z_last"].copy()
    V = p["V_last"].copy()
    n = C.shape[0]

    # Build name-to-index map
    name_map = {}
    for i, name in enumerate(var_names):
        name_map[name.lower()] = i

    # Build observation vector (NaN for missing)
    y_raw = np.full(n, np.nan)
    matched = []
    for name, value in observations.items():
        idx = name_map.get(name.lower())
        if idx is not None:
            y_raw[idx] = value
            matched.append({"indicator": name, "index": idx, "value": value})

    if not matched:
        return {
            "error": "No matching indicators found. Use dfm_nowcast to see available indicators.",
            "available_indicators": list(name_map.keys())[:20],
        }

    # Prediction step
    Z_pred = A @ Z
    V_pred = A @ V @ A.T + Q

    # GDP prediction before update
    gdp_before = float(np.dot(C[gdp_idx], Z_pred) * sdevs[gdp_idx] + means[gdp_idx]) * 100

    # Find observed indices
    obs_idx = [i for i in range(n) if not np.isnan(y_raw[i])]

    # Standardize observations
    y_std = np.array([(y_raw[i] / 100 - means[i]) / sdevs[i] for i in obs_idx])

    # Extract sub-matrices for observed variables
    C_obs = C[obs_idx]      # k × m
    R_obs = R[np.ix_(obs_idx, obs_idx)]  # k × k

    # Innovation covariance: S = C_obs @ V_pred @ C_obs.T + R_obs
    S = C_obs @ V_pred @ C_obs.T + R_obs

    # Kalman gain: K = V_pred @ C_obs.T @ S^-1
    K = V_pred @ C_obs.T @ np.linalg.solve(S.T, np.eye(len(obs_idx))).T

    # Innovation
    innov = y_std - C_obs @ Z_pred

    # Update
    Z_new = Z_pred + K @ innov

    # GDP prediction after update
    gdp_after = float(np.dot(C[gdp_idx], Z_new) * sdevs[gdp_idx] + means[gdp_idx]) * 100

    # News decomposition
    news = []
    for ki, var_idx in enumerate(obs_idx):
        K_col = K[:, ki]
        contrib = float(np.dot(C[gdp_idx], K_col) * innov[ki] * sdevs[gdp_idx]) * 100
        var_name = var_names[var_idx] if var_idx < len(var_names) else f"var_{var_idx}"
        news.append({
            "indicator": var_name,
            "new_value_pct": float(y_raw[var_idx]),
            "surprise": round(float(innov[ki]), 4),
            "gdp_contribution_pp": round(contrib, 4),
            "direction": "positive" if contrib > 0 else "negative",
        })

    news.sort(key=lambda x: abs(x["gdp_contribution_pp"]), reverse=True)

    return {
        "model": "DFM Kalman Update",
        "gdp_before_update_yoy_pct": round(gdp_before, 2),
        "gdp_after_update_yoy_pct": round(gdp_after, 2),
        "revision_pp": round(gdp_after - gdp_before, 4),
        "indicators_used": len(matched),
        "news_decomposition": news,
    }
