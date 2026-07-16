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
    "a4": (0.0, 0.35, 0.12),    # PC: direct import-price pass-through
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


# Exact CGE calibration defaults from the accepted 2021 workbook formulas
CGE_DEFAULTS = {
    "at": 2.417688609007712,
    "bt": 0.8212363629719106,
    "rho_t": 2.428571428571429,
    "sig_t": 0.70,
    "aq": 1.9082318341945435,
    "bq": 0.3205221500766939,
    "rho_q": 0.4285714285714286,
    "sig_q": 0.70,
    "wm": 0.9840982911714002,
    "we": 1.00,
    "tm": 0.016158659121002623,
    "te": 0.00,
    "ts": 0.06472233775029143,
    "ty": 0.02978092234143587,
    "sy": 0.37800992289321783,
    "G": 0.17578408687290673,
    "tr": -0.03594210180831692,
    "ft": 0.0005089419695851494,
    "re": 0.13738252291489128,
    "B": 0.03894920311694469,
    "X": 1.00,
    "Pf": 1.00,
}

CGE_BASE_ENDOGENOUS = {
    "E": 0.25591259520324877,
    "M": 0.43974597566829565,
    "Ds": 0.7440874047967512,
    "Dd": 0.7440874047967512,
    "Q": 1.183833380465047,
    "Qs": 1.183833380465047,
    "Qd": 1.183833380465047,
    "Y": 1.1014404211065743,
    "Cn": 0.612632117953076,
    "TAX": 0.11641508799884712,
    "S": 0.4210094996330418,
    "Sg": -0.0342951121378724,
    "Z": 0.39541717563906397,
    "Er": 1.00,
    "Pe": 1.00,
    "Pm": 1.00,
    "Pt": 1.0647223377502915,
    "Pq": 1.00,
    "Px": 1.00,
}
