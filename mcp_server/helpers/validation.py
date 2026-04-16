"""Input validation and parameter clamping for MCP tools."""


def clamp(value: float, lo: float, hi: float) -> float:
    return max(lo, min(hi, value))


# QPM parameter ranges: (min, max, default)
QPM_PARAM_RANGES = {
    "b1": (0.3, 0.95, 0.70),   # IS: output gap persistence
    "b2": (0.05, 0.6, 0.20),   # IS: MCI sensitivity
    "b3": (0.05, 0.6, 0.30),   # IS: external demand
    "b4": (0.1, 0.9, 0.60),    # MCI: interest rate weight
    "a1": (0.3, 0.9, 0.60),    # PC: inflation persistence
    "a2": (0.05, 0.5, 0.20),   # PC: marginal cost pass-through
    "a3": (0.2, 0.9, 0.65),    # PC: domestic cost share
    "g1": (0.3, 0.95, 0.80),   # TR: rate smoothing
    "g2": (1.0, 3.0, 1.50),    # TR: inflation response
    "g3": (0.1, 1.5, 0.50),    # TR: output gap response
    "e1": (0.1, 0.9, 0.70),    # UIP: backward weight
}

QPM_DEFAULTS = {
    "inflation_target": 5.0,
    "neutral_real_rate": 3.5,
    "potential_growth": 6.0,
}


def validate_qpm_params(params: dict) -> dict:
    """Clamp QPM structural parameters to valid ranges and fill defaults."""
    result = {}
    for key, (lo, hi, default) in QPM_PARAM_RANGES.items():
        val = params.get(key, default)
        result[key] = clamp(float(val), lo, hi)
    for key, default in QPM_DEFAULTS.items():
        result[key] = float(params.get(key, default))
    return result


# CGE parameter ranges
CGE_DEFAULTS = {
    "at": 2.42, "bt": 0.82, "rho_t": 2.43, "sig_t": 0.70,
    "aq": 1.91, "bq": 0.32, "rho_q": 0.43, "sig_q": 0.70,
    "wm": 0.98, "we": 1.00,
    "tm": 0.02, "te": 0.00,
    "ts": 0.06, "ty": 0.03,
    "sy": 0.38, "G": 0.18,
    "tr": -0.04, "ft": 0.00,
    "re": 0.14, "B": 0.04,
    "X": 1.00, "Pf": 1.00,
}

CGE_BASE_ENDOGENOUS = {
    "E": 0.26, "M": 0.44, "Ds": 0.74, "Q": 1.18,
    "Y": 1.10, "Cn": 0.61, "TAX": 0.12, "S": 0.42,
    "Sg": -0.03, "Z": 0.36,
    "Er": 1.00, "Pe": 1.00, "Pm": 1.00,
    "Pt": 1.00, "Pq": 1.00, "Px": 1.00,
}
