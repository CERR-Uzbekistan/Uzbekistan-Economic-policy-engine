"""Russia shock orchestration layer for the Uzbekistan policy engine.

This module is intentionally a transparent prototype. It maps scenario
primitives from the Russia shock memo into existing model blocks (CGE, QPM,
I-O) and small satellites for households, poverty, fiscal pressure, and bank
stress. It does not claim official Russia partner calibration or household
microdata.
"""

from __future__ import annotations

import argparse
import csv
import json

from dataclasses import asdict, dataclass
from pathlib import Path
from typing import Any

from helpers.validation import CGE_DEFAULTS, validate_qpm_params
from models.cge import solve_cge
from models.io_model import run_demand_shock
from models.qpm import run_level_scenario

MODULE_DIR = Path(__file__).resolve().parent
SERVER_DIR = MODULE_DIR.parent
REPO_DIR = SERVER_DIR.parent
DATA_DIR = SERVER_DIR / "data"
PARAMETER_REGISTRY = REPO_DIR / "shared" / "parameter-registry.json"


@dataclass(frozen=True)
class RussiaShockScenario:
    description: str
    remittance_shock_russia: float | None = None
    returning_migrants: int | None = None
    russia_export_demand_shock: float | None = None
    russia_import_supply_shock: float | None = None
    fuel_price_shock: float | None = None
    payment_friction: float | None = None
    risk_premium_bps: float | None = None
    external_financing_availability_usd: float | None = None
    russia_real_gdp_growth_deviation_pp: float = 0.0
    russia_real_wage_shock_pct: float = 0.0
    ruble_depreciation_pct: float = 0.0
    migrant_labor_market_stress: float = 0.0
    sector_export_demand_stress: float = 0.0
    fuel_disruption_index: float = 0.0
    payment_restriction_index: float = 0.0
    ifi_support_index: float = 0.0
    source_note: str = "Illustrative scenario input."


@dataclass(frozen=True)
class PolicyPackage:
    description: str
    household_transfer_usd: float
    public_works_jobs: int
    wage_subsidy_rate: float
    fx_reserve_use_usd: float
    ifi_financing_usd: float
    china_swap_cny: float
    fuel_reserve_release: float
    source_note: str = "Illustrative policy input."


@dataclass(frozen=True)
class Calibration:
    gdp_usd: float = 112_600_000_000.0
    exchange_rate_uzs_per_usd: float = 12_652.7
    total_remittances_usd: float = 18_900_000_000.0
    russia_remittance_share: float = 0.78
    migrants_in_russia: int = 1_300_000
    russia_exports_usd: float = 4_300_000_000.0
    russia_imports_usd: float = 8_600_000_000.0
    gasoline_import_share_from_russia: float = 0.80
    labor_force: int = 15_000_000
    baseline_unemployment_rate: float = 0.068
    poverty_line_usd: float = 1_200.0
    china_import_share: float = 0.18
    cny_per_usd: float = 7.2
    remittance_spending_response_low: float = 0.60
    remittance_spending_response_central: float = 0.80
    remittance_spending_response_high: float = 1.00
    household_consumption_domestic_share: float = 0.863841

    @property
    def remittance_domestic_demand_pass_through(self) -> float:
        return self.remittance_spending_response_central * self.household_consumption_domestic_share


HOUSEHOLD_GROUPS = [
    {
        "group": "urban_non_remittance",
        "population_share": 0.35,
        "remittance_income_share": 0.03,
        "baseline_income_usd": 2_450.0,
        "baseline_poverty_headcount": 0.07,
        "cpi_fuel_weight": 0.08,
    },
    {
        "group": "urban_remittance_dependent",
        "population_share": 0.15,
        "remittance_income_share": 0.28,
        "baseline_income_usd": 2_150.0,
        "baseline_poverty_headcount": 0.11,
        "cpi_fuel_weight": 0.09,
    },
    {
        "group": "rural_non_remittance",
        "population_share": 0.30,
        "remittance_income_share": 0.05,
        "baseline_income_usd": 1_700.0,
        "baseline_poverty_headcount": 0.16,
        "cpi_fuel_weight": 0.10,
    },
    {
        "group": "rural_remittance_dependent",
        "population_share": 0.20,
        "remittance_income_share": 0.35,
        "baseline_income_usd": 1_550.0,
        "baseline_poverty_headcount": 0.21,
        "cpi_fuel_weight": 0.11,
    },
]


def _parse_scalar(value: str) -> Any:
    value = value.strip()
    if value == "":
        return ""
    lowered = value.lower()
    if lowered in {"true", "false"}:
        return lowered == "true"
    try:
        if any(char in value for char in [".", "e", "E"]):
            return float(value)
        return int(value)
    except ValueError:
        return value


def load_simple_yaml(path: Path) -> dict[str, dict[str, Any]]:
    """Load the small YAML subset used by this module's config files."""

    data: dict[str, dict[str, Any]] = {}
    current_key: str | None = None
    for raw_line in path.read_text(encoding="utf-8").splitlines():
        line = raw_line.split("#", 1)[0].rstrip()
        if not line:
            continue
        if not raw_line.startswith(" "):
            key = line.rstrip(":")
            if not key or key == line:
                raise ValueError(f"Invalid top-level YAML line: {raw_line}")
            data[key] = {}
            current_key = key
            continue
        if current_key is None:
            raise ValueError(f"Nested value before top-level key: {raw_line}")
        nested = line.strip()
        if ":" not in nested:
            raise ValueError(f"Invalid nested YAML line: {raw_line}")
        name, value = nested.split(":", 1)
        data[current_key][name.strip()] = _parse_scalar(value)
    return data


def load_channel_calibration(path: Path | None = None) -> dict[str, dict[str, Any]]:
    return load_simple_yaml(path or DATA_DIR / "russia_shock_channel_calibration.yaml")


def _channel_value(
    calibration: dict[str, dict[str, Any]], section: str, key: str, default: float
) -> float:
    return float(calibration.get(section, {}).get(key, default))


def _clip(value: float, lo: float, hi: float) -> float:
    return max(lo, min(hi, value))


def _derive_scenario_channels(
    scenario: RussiaShockScenario,
    channel_calibration: dict[str, dict[str, Any]],
) -> RussiaShockScenario:
    direct_fields = [
        scenario.remittance_shock_russia,
        scenario.returning_migrants,
        scenario.russia_export_demand_shock,
        scenario.russia_import_supply_shock,
        scenario.fuel_price_shock,
        scenario.payment_friction,
        scenario.risk_premium_bps,
        scenario.external_financing_availability_usd,
    ]
    if all(value is not None for value in direct_fields):
        return scenario

    gdp_shock = scenario.russia_real_gdp_growth_deviation_pp / 100
    wage_shock = scenario.russia_real_wage_shock_pct / 100
    ruble_dep = max(0.0, scenario.ruble_depreciation_pct / 100)
    migrant_stress = _clip(scenario.migrant_labor_market_stress, 0.0, 1.0)
    export_stress = _clip(scenario.sector_export_demand_stress, 0.0, 1.0)
    fuel_stress = _clip(scenario.fuel_disruption_index, 0.0, 1.0)
    payment_stress = _clip(scenario.payment_restriction_index, 0.0, 1.0)

    remittance_shock = (
        _channel_value(channel_calibration, "remittances", "gdp_elasticity_central", 1.4)
        * gdp_shock
        + _channel_value(channel_calibration, "remittances", "wage_elasticity_central", 0.5)
        * wage_shock
        - _channel_value(
            channel_calibration, "remittances", "ruble_depreciation_elasticity_central", 0.25
        )
        * ruble_dep
        - _channel_value(
            channel_calibration, "remittances", "migrant_stress_elasticity_central", 0.45
        )
        * migrant_stress
    )
    remittance_shock = _clip(
        remittance_shock,
        _channel_value(channel_calibration, "remittances", "min_shock", -0.65),
        _channel_value(channel_calibration, "remittances", "max_shock", 0.10),
    )

    return_share = _channel_value(
        channel_calibration, "return_migration", "labor_stress_return_share", 0.28
    ) * migrant_stress + _channel_value(
        channel_calibration, "return_migration", "gdp_shock_return_share_per_pp", 0.006
    ) * max(0.0, -scenario.russia_real_gdp_growth_deviation_pp)
    return_share = _clip(
        return_share,
        0.0,
        _channel_value(channel_calibration, "return_migration", "max_return_share", 0.35),
    )
    migrant_base_count = _channel_value(
        channel_calibration,
        "return_migration",
        "migrant_base_count",
        1_300_000,
    )
    returning_migrants = round(migrant_base_count * return_share)

    export_shock = (
        _channel_value(channel_calibration, "exports", "russia_gdp_elasticity_central", 1.2)
        * gdp_shock
        - _channel_value(channel_calibration, "exports", "sector_stress_elasticity_central", 0.75)
        * export_stress
        - _channel_value(channel_calibration, "exports", "payment_stress_elasticity_central", 0.25)
        * payment_stress
    )
    export_shock = _clip(
        export_shock,
        _channel_value(channel_calibration, "exports", "min_shock", -0.60),
        _channel_value(channel_calibration, "exports", "max_shock", 0.10),
    )

    import_supply_shock = -_clip(
        _channel_value(
            channel_calibration, "fuel_imports", "supply_loss_per_disruption_index", 0.55
        )
        * fuel_stress,
        0.0,
        _channel_value(channel_calibration, "fuel_imports", "max_supply_loss", 0.60),
    )
    fuel_price_shock = _clip(
        _channel_value(channel_calibration, "fuel_imports", "price_pass_through_central", 0.55)
        * fuel_stress
        + _channel_value(
            channel_calibration, "fuel_imports", "ruble_depreciation_price_pass_through", 0.10
        )
        * ruble_dep,
        0.0,
        _channel_value(channel_calibration, "fuel_imports", "max_price_shock", 0.55),
    )

    payment_friction = _clip(
        _channel_value(channel_calibration, "payments", "friction_per_restriction_index", 0.70)
        * payment_stress,
        0.0,
        _channel_value(channel_calibration, "payments", "max_payment_friction", 0.75),
    )
    risk_premium_bps = round(
        _channel_value(channel_calibration, "risk_premium", "base_bps", 0.0)
        + _channel_value(channel_calibration, "risk_premium", "bps_per_payment_index", 325.0)
        * payment_stress
        + _channel_value(channel_calibration, "risk_premium", "bps_per_fuel_index", 75.0)
        * fuel_stress
        + _channel_value(channel_calibration, "risk_premium", "bps_per_gdp_shock_pp", 25.0)
        * max(0.0, -scenario.russia_real_gdp_growth_deviation_pp)
    )
    external_financing = round(
        _clip(scenario.ifi_support_index, 0.0, 1.0)
        * _channel_value(
            channel_calibration,
            "external_financing",
            "max_fast_disbursing_support_usd",
            3_000_000_000.0,
        )
    )

    return RussiaShockScenario(
        description=scenario.description,
        remittance_shock_russia=round(remittance_shock, 4),
        returning_migrants=returning_migrants,
        russia_export_demand_shock=round(export_shock, 4),
        russia_import_supply_shock=round(import_supply_shock, 4),
        fuel_price_shock=round(fuel_price_shock, 4),
        payment_friction=round(payment_friction, 4),
        risk_premium_bps=risk_premium_bps,
        external_financing_availability_usd=external_financing,
        russia_real_gdp_growth_deviation_pp=scenario.russia_real_gdp_growth_deviation_pp,
        russia_real_wage_shock_pct=scenario.russia_real_wage_shock_pct,
        ruble_depreciation_pct=scenario.ruble_depreciation_pct,
        migrant_labor_market_stress=scenario.migrant_labor_market_stress,
        sector_export_demand_stress=scenario.sector_export_demand_stress,
        fuel_disruption_index=scenario.fuel_disruption_index,
        payment_restriction_index=scenario.payment_restriction_index,
        ifi_support_index=scenario.ifi_support_index,
        source_note=scenario.source_note,
    )


def load_scenarios(path: Path | None = None) -> dict[str, RussiaShockScenario]:
    raw = load_simple_yaml(path or DATA_DIR / "russia_shock_scenarios.yaml")
    channel_calibration = load_channel_calibration()
    scenarios = {
        name: _derive_scenario_channels(RussiaShockScenario(**values), channel_calibration)
        for name, values in raw.items()
    }
    for name, scenario in scenarios.items():
        _validate_scenario(name, scenario)
    return scenarios


def load_policies(path: Path | None = None) -> dict[str, PolicyPackage]:
    raw = load_simple_yaml(path or DATA_DIR / "russia_shock_policies.yaml")
    policies = {name: PolicyPackage(**values) for name, values in raw.items()}
    for name, policy in policies.items():
        _validate_policy(name, policy)
    return policies


def _validate_scenario(name: str, scenario: RussiaShockScenario) -> None:
    required = {
        "remittance_shock_russia": scenario.remittance_shock_russia,
        "returning_migrants": scenario.returning_migrants,
        "russia_export_demand_shock": scenario.russia_export_demand_shock,
        "russia_import_supply_shock": scenario.russia_import_supply_shock,
        "fuel_price_shock": scenario.fuel_price_shock,
        "payment_friction": scenario.payment_friction,
        "risk_premium_bps": scenario.risk_premium_bps,
        "external_financing_availability_usd": scenario.external_financing_availability_usd,
    }
    missing = [field for field, value in required.items() if value is None]
    if missing:
        raise ValueError(f"{name}: scenario channels were not derived: {', '.join(missing)}")
    if int(scenario.returning_migrants or 0) < 0:
        raise ValueError(f"{name}: returning_migrants cannot be negative")
    shock_fields = [
        float(scenario.remittance_shock_russia or 0),
        float(scenario.russia_export_demand_shock or 0),
        float(scenario.russia_import_supply_shock or 0),
        float(scenario.fuel_price_shock or 0),
        float(scenario.payment_friction or 0),
    ]
    if any(value < -1 or value > 1 for value in shock_fields):
        raise ValueError(f"{name}: shock shares must be between -1 and 1")
    if float(scenario.risk_premium_bps or 0) < 0:
        raise ValueError(f"{name}: risk_premium_bps cannot be negative")


def _validate_policy(name: str, policy: PolicyPackage) -> None:
    non_negative = [
        policy.household_transfer_usd,
        policy.public_works_jobs,
        policy.fx_reserve_use_usd,
        policy.ifi_financing_usd,
        policy.china_swap_cny,
        policy.fuel_reserve_release,
    ]
    if any(value < 0 for value in non_negative):
        raise ValueError(f"{name}: policy amounts cannot be negative")
    if policy.wage_subsidy_rate < 0 or policy.wage_subsidy_rate > 1:
        raise ValueError(f"{name}: wage_subsidy_rate must be between 0 and 1")
    if policy.fuel_reserve_release > 1:
        raise ValueError(f"{name}: fuel_reserve_release must be between 0 and 1")


def load_calibration() -> Calibration:
    """Load available project calibration and fall back to memo defaults."""

    channel_calibration = load_channel_calibration()
    remittance = channel_calibration.get("remittances", {})
    return_migration = channel_calibration.get("return_migration", {})
    remittance_consumption = {
        "russia_remittance_share": float(remittance.get("russia_share", 0.78)),
        "migrants_in_russia": int(return_migration.get("migrant_base_count", 1_300_000)),
        "remittance_spending_response_low": float(remittance.get("spending_response_low", 0.60)),
        "remittance_spending_response_central": float(
            remittance.get("spending_response_central", 0.80)
        ),
        "remittance_spending_response_high": float(remittance.get("spending_response_high", 1.00)),
        "household_consumption_domestic_share": float(
            remittance.get("household_consumption_domestic_share", 0.863841)
        ),
    }
    if not PARAMETER_REGISTRY.exists():
        return Calibration(**remittance_consumption)
    registry = json.loads(PARAMETER_REGISTRY.read_text(encoding="utf-8"))
    fiscal = registry.get("fiscal", {})
    macro = registry.get("macro_baseline", {})
    return Calibration(
        gdp_usd=float(fiscal.get("gdp_2024_bln_usd", 112.6)) * 1_000_000_000,
        exchange_rate_uzs_per_usd=12_652.7,
        baseline_unemployment_rate=float(macro.get("nairu", 0.068)),
        **remittance_consumption,
    )


def _billion_usd_to_billion_uzs(value_usd: float, calibration: Calibration) -> float:
    return value_usd / 1_000_000_000 * calibration.exchange_rate_uzs_per_usd


def _run_cge_block(
    scenario: RussiaShockScenario,
    policy: PolicyPackage,
    calibration: Calibration,
) -> dict[str, Any]:
    params = dict(CGE_DEFAULTS)
    remittance_total_shock = scenario.remittance_shock_russia * calibration.russia_remittance_share
    import_cost_shock = (
        0.30 * scenario.fuel_price_shock * (1 - policy.fuel_reserve_release)
        + 0.20 * abs(scenario.russia_import_supply_shock)
        + 0.15 * scenario.payment_friction
    )
    export_price_or_demand_shock = 0.25 * scenario.russia_export_demand_shock
    financing_boost = (
        scenario.external_financing_availability_usd
        + policy.ifi_financing_usd
        + min(policy.fx_reserve_use_usd, 5_000_000_000)
    ) / calibration.gdp_usd

    params["re"] = max(0.0, CGE_DEFAULTS["re"] * (1 + remittance_total_shock))
    params["wm"] = max(0.2, CGE_DEFAULTS["wm"] * (1 + import_cost_shock))
    params["we"] = max(0.2, CGE_DEFAULTS["we"] * (1 + export_price_or_demand_shock))
    params["B"] = max(0.0, CGE_DEFAULTS["B"] + financing_boost)
    return solve_cge(params)


def _run_qpm_block(
    scenario: RussiaShockScenario,
    policy: PolicyPackage,
    calibration: Calibration,
) -> dict[str, Any]:
    params = validate_qpm_params({})
    household_transfer_offset_pp = min(1.0, policy.household_transfer_usd / 1_500_000_000)
    public_works_offset_pp = min(0.8, policy.public_works_jobs / 250_000)
    external_demand_shock = (
        1.2 * scenario.russia_export_demand_shock
        + 0.9 * scenario.remittance_shock_russia * calibration.russia_remittance_share
        - 0.15 * scenario.payment_friction
        + 0.25 * household_transfer_offset_pp
        + 0.20 * public_works_offset_pp
    )
    fuel_cost_shock = 2.5 * scenario.fuel_price_shock * (1 - policy.fuel_reserve_release)
    payment_cost_shock = 0.8 * scenario.payment_friction
    risk_shock_pp = scenario.risk_premium_bps / 100.0
    return run_level_scenario(
        params,
        {
            "external_demand": external_demand_shock,
            "inflation": fuel_cost_shock + payment_cost_shock,
            "risk": risk_shock_pp,
        },
        horizon=8,
    )


def _run_io_block(
    scenario: RussiaShockScenario,
    policy: PolicyPackage,
    calibration: Calibration,
) -> dict[str, Any]:
    data_path = DATA_DIR / "io_data.json"
    if not data_path.exists():
        return {"error": "io_data.json not found"}
    data = json.loads(data_path.read_text(encoding="utf-8"))
    remittance_loss_usd = (
        calibration.total_remittances_usd
        * calibration.russia_remittance_share
        * abs(min(0.0, scenario.remittance_shock_russia))
    )
    export_loss_usd = calibration.russia_exports_usd * abs(
        min(0.0, scenario.russia_export_demand_shock)
    )
    consumption_offset_usd = policy.household_transfer_usd * 0.85
    public_works_spend_usd = policy.public_works_jobs * 3_000
    wage_subsidy_offset_usd = policy.wage_subsidy_rate * 0.15 * remittance_loss_usd

    remittance_domestic_demand_loss_usd = (
        calibration.remittance_domestic_demand_pass_through * remittance_loss_usd
    )
    consumption_shock_bln_uzs = _billion_usd_to_billion_uzs(
        -remittance_domestic_demand_loss_usd + consumption_offset_usd + wage_subsidy_offset_usd,
        calibration,
    )
    government_shock_bln_uzs = _billion_usd_to_billion_uzs(public_works_spend_usd, calibration)
    export_shock_bln_uzs = _billion_usd_to_billion_uzs(-export_loss_usd, calibration)
    result = run_demand_shock(
        data,
        consumption=consumption_shock_bln_uzs,
        government=government_shock_bln_uzs,
        exports=export_shock_bln_uzs,
        distribution="output",
    )
    result["assumptions"] = {
        "remittance_loss_usd": round(remittance_loss_usd, 2),
        "remittance_spending_response": round(calibration.remittance_spending_response_central, 6),
        "household_consumption_domestic_share": round(
            calibration.household_consumption_domestic_share, 6
        ),
        "remittance_domestic_demand_pass_through": round(
            calibration.remittance_domestic_demand_pass_through, 6
        ),
        "remittance_domestic_demand_loss_usd": round(remittance_domestic_demand_loss_usd, 2),
        "export_loss_usd": round(export_loss_usd, 2),
        "consumption_shock_bln_uzs": round(consumption_shock_bln_uzs, 2),
        "government_shock_bln_uzs": round(government_shock_bln_uzs, 2),
        "export_shock_bln_uzs": round(export_shock_bln_uzs, 2),
    }
    return result


def _avg(values: list[float], n: int = 4) -> float:
    trimmed = values[: min(n, len(values))]
    return sum(trimmed) / len(trimmed) if trimmed else 0.0


def _derive_external_balance(
    scenario: RussiaShockScenario,
    policy: PolicyPackage,
    calibration: Calibration,
) -> dict[str, float]:
    remittance_loss_usd = (
        calibration.total_remittances_usd
        * calibration.russia_remittance_share
        * abs(min(0.0, scenario.remittance_shock_russia))
    )
    export_loss_usd = calibration.russia_exports_usd * abs(
        min(0.0, scenario.russia_export_demand_shock)
    )
    fuel_price_pressure_usd = (
        calibration.russia_imports_usd
        * calibration.gasoline_import_share_from_russia
        * max(0.0, scenario.fuel_price_shock)
        * (1 - policy.fuel_reserve_release)
    )
    import_compression_usd = (
        calibration.russia_imports_usd * abs(min(0.0, scenario.russia_import_supply_shock)) * 0.35
    )
    payment_friction_cost_usd = (
        calibration.russia_imports_usd * max(0.0, scenario.payment_friction) * 0.08
    )
    risk_premium_cost_usd = calibration.gdp_usd * (scenario.risk_premium_bps / 10_000) * 0.04
    china_swap_usd_equivalent = policy.china_swap_cny / calibration.cny_per_usd
    china_linked_usd_demand_reduction_usd = min(
        china_swap_usd_equivalent,
        calibration.gdp_usd * calibration.china_import_share * 0.08,
    )
    gross_pressure_usd = (
        remittance_loss_usd
        + export_loss_usd
        + fuel_price_pressure_usd
        + payment_friction_cost_usd
        + risk_premium_cost_usd
        - import_compression_usd
    )
    non_reserve_financing_usd = (
        scenario.external_financing_availability_usd
        + policy.ifi_financing_usd
        + china_linked_usd_demand_reduction_usd
    )
    gap_before_reserves_usd = max(0.0, gross_pressure_usd - non_reserve_financing_usd)
    reserve_use_usd = min(policy.fx_reserve_use_usd, gap_before_reserves_usd)
    external_financing_gap_usd = max(0.0, gap_before_reserves_usd - reserve_use_usd)
    return {
        "remittance_loss_usd": round(remittance_loss_usd, 2),
        "export_loss_usd": round(export_loss_usd, 2),
        "fuel_price_pressure_usd": round(fuel_price_pressure_usd, 2),
        "payment_friction_cost_usd": round(payment_friction_cost_usd, 2),
        "risk_premium_cost_usd": round(risk_premium_cost_usd, 2),
        "import_compression_usd": round(import_compression_usd, 2),
        "ifi_financing_usd": round(policy.ifi_financing_usd, 2),
        "reserve_use_usd": round(reserve_use_usd, 2),
        "china_swap_usd_equivalent": round(china_swap_usd_equivalent, 2),
        "china_linked_usd_demand_reduction_usd": round(china_linked_usd_demand_reduction_usd, 2),
        "usd_reserve_addition_from_china_swap": 0.0,
        "external_financing_gap_usd": round(external_financing_gap_usd, 2),
    }


def _unemployment_rate(
    scenario: RussiaShockScenario,
    policy: PolicyPackage,
    calibration: Calibration,
) -> float:
    public_works_offset = min(policy.public_works_jobs, scenario.returning_migrants) / max(
        1, calibration.labor_force
    )
    return max(
        0.0,
        calibration.baseline_unemployment_rate
        + scenario.returning_migrants * 0.65 / max(1, calibration.labor_force)
        - public_works_offset
        - policy.wage_subsidy_rate * 0.01,
    )


def _derive_households(
    scenario: RussiaShockScenario,
    policy: PolicyPackage,
    qpm_result: dict[str, Any],
    external: dict[str, float],
    calibration: Calibration,
) -> list[dict[str, Any]]:
    baseline_growth = _avg(qpm_result["baseline"]["gdp_growth"])
    scenario_growth = _avg(qpm_result["scenario"]["gdp_growth"])
    baseline_inflation = _avg(qpm_result["baseline"]["inflation"])
    scenario_inflation = _avg(qpm_result["scenario"]["inflation"])
    output_gap_proxy = (scenario_growth - baseline_growth) / 100
    cpi_extra = max(-0.05, (scenario_inflation - baseline_inflation) / 100)
    transfer_per_person_usd = policy.household_transfer_usd / 37_000_000
    new_unemployment_rate = _unemployment_rate(scenario, policy, calibration)
    unemployment_delta = new_unemployment_rate - calibration.baseline_unemployment_rate

    rows = []
    for group in HOUSEHOLD_GROUPS:
        remittance_income_loss = group["remittance_income_share"] * abs(
            min(0.0, scenario.remittance_shock_russia)
        )
        wage_income_change = (
            0.45 * output_gap_proxy - 0.35 * unemployment_delta + policy.wage_subsidy_rate * 0.08
        )
        nominal_income_change = wage_income_change - remittance_income_loss
        transfer_gain = transfer_per_person_usd / group["baseline_income_usd"]
        household_cpi = cpi_extra + group["cpi_fuel_weight"] * scenario.fuel_price_shock * (
            1 - policy.fuel_reserve_release
        )
        real_income_change = nominal_income_change + transfer_gain - household_cpi
        poverty_headcount = min(
            0.95,
            max(0.0, group["baseline_poverty_headcount"] + max(0.0, -real_income_change) * 0.85),
        )
        rows.append(
            {
                "group": group["group"],
                "population_share": group["population_share"],
                "baseline_poverty_headcount": round(group["baseline_poverty_headcount"], 4),
                "poverty_headcount": round(poverty_headcount, 4),
                "real_income_change_pct": round(real_income_change * 100, 3),
                "remittance_income_loss_pct": round(remittance_income_loss * 100, 3),
                "household_cpi_extra_pct": round(household_cpi * 100, 3),
                "transfer_gain_pct": round(transfer_gain * 100, 3),
            }
        )
    weighted_poverty = sum(row["poverty_headcount"] * row["population_share"] for row in rows)
    weighted_income = sum(row["real_income_change_pct"] * row["population_share"] for row in rows)
    rows.append(
        {
            "group": "weighted_total",
            "population_share": 1.0,
            "baseline_poverty_headcount": round(
                sum(
                    g["baseline_poverty_headcount"] * g["population_share"]
                    for g in HOUSEHOLD_GROUPS
                ),
                4,
            ),
            "poverty_headcount": round(weighted_poverty, 4),
            "real_income_change_pct": round(weighted_income, 3),
            "remittance_income_loss_pct": round(
                external["remittance_loss_usd"] / calibration.gdp_usd * 100, 3
            ),
            "household_cpi_extra_pct": round(cpi_extra * 100, 3),
            "transfer_gain_pct": round(transfer_per_person_usd / 1_900 * 100, 3),
        }
    )
    return rows


def _derive_fiscal(
    policy: PolicyPackage,
    qpm_result: dict[str, Any],
    io_result: dict[str, Any],
    calibration: Calibration,
) -> dict[str, float]:
    baseline_growth = _avg(qpm_result["baseline"]["gdp_growth"])
    scenario_growth = _avg(qpm_result["scenario"]["gdp_growth"])
    gdp_growth_deviation_pp = scenario_growth - baseline_growth
    revenue_loss_usd = max(0.0, -gdp_growth_deviation_pp / 100 * calibration.gdp_usd * 0.278)
    trade_related_revenue_loss_usd = (
        max(
            0.0,
            -io_result.get("assumptions", {}).get("export_shock_bln_uzs", 0),
        )
        * 1_000_000
    )
    trade_related_revenue_loss_usd *= 0.076 / calibration.exchange_rate_uzs_per_usd
    policy_cost_usd = (
        policy.household_transfer_usd
        + policy.public_works_jobs * 3_000
        + policy.wage_subsidy_rate * 650_000_000
    )
    return {
        "revenue_loss_usd": round(revenue_loss_usd, 2),
        "trade_related_revenue_loss_usd": round(trade_related_revenue_loss_usd, 2),
        "policy_cost_usd": round(policy_cost_usd, 2),
        "deficit_change_usd": round(
            revenue_loss_usd + trade_related_revenue_loss_usd + policy_cost_usd,
            2,
        ),
        "deficit_change_pct_gdp": round(
            (revenue_loss_usd + trade_related_revenue_loss_usd + policy_cost_usd)
            / calibration.gdp_usd
            * 100,
            3,
        ),
    }


def _derive_banking(
    household_rows: list[dict[str, Any]],
    qpm_result: dict[str, Any],
    io_result: dict[str, Any],
    external: dict[str, float],
    calibration: Calibration,
) -> dict[str, float]:
    total_household = next(row for row in household_rows if row["group"] == "weighted_total")
    baseline_er = _avg(qpm_result["baseline"]["exchange_rate"])
    scenario_er = _avg(qpm_result["scenario"]["exchange_rate"])
    exchange_depreciation_pct = max(0.0, (scenario_er / baseline_er - 1) * 100)
    output_loss_pct = abs(
        min(0.0, io_result.get("aggregate", {}).get("total_va_effect_bln_uzs", 0.0))
        / max(1.0, calibration.gdp_usd / 1_000_000_000 * calibration.exchange_rate_uzs_per_usd)
        * 100
    )
    household_npl = 25 + max(0.0, -total_household["real_income_change_pct"]) * 2.2
    sme_npl = 22 + output_loss_pct * 4.0
    fx_liquidity = (
        20
        + exchange_depreciation_pct * 2.0
        + external["external_financing_gap_usd"] / 1_000_000_000 * 3.0
    )
    bank_stress = 0.4 * household_npl + 0.35 * sme_npl + 0.25 * fx_liquidity
    return {
        "household_npl_risk_index": round(min(100.0, household_npl), 2),
        "sme_npl_risk_index": round(min(100.0, sme_npl), 2),
        "fx_liquidity_pressure_index": round(min(100.0, fx_liquidity), 2),
        "bank_stress_score": round(min(100.0, bank_stress), 2),
    }


def run_russia_shock(
    scenario_name: str,
    policy_name: str = "none",
    *,
    scenarios: dict[str, RussiaShockScenario] | None = None,
    policies: dict[str, PolicyPackage] | None = None,
    calibration: Calibration | None = None,
) -> dict[str, Any]:
    scenarios = scenarios or load_scenarios()
    policies = policies or load_policies()
    calibration = calibration or load_calibration()
    scenario = scenarios[scenario_name]
    policy = policies[policy_name]
    _validate_scenario(scenario_name, scenario)
    _validate_policy(policy_name, policy)

    cge = _run_cge_block(scenario, policy, calibration)
    qpm = _run_qpm_block(scenario, policy, calibration)
    io = _run_io_block(scenario, policy, calibration)
    external = _derive_external_balance(scenario, policy, calibration)
    households = _derive_households(scenario, policy, qpm, external, calibration)
    fiscal = _derive_fiscal(policy, qpm, io, calibration)
    banking = _derive_banking(households, qpm, io, external, calibration)

    baseline_growth = _avg(qpm["baseline"]["gdp_growth"])
    scenario_growth = _avg(qpm["scenario"]["gdp_growth"])
    baseline_inflation = _avg(qpm["baseline"]["inflation"])
    scenario_inflation = _avg(qpm["scenario"]["inflation"])
    baseline_er = _avg(qpm["baseline"]["exchange_rate"])
    scenario_er = _avg(qpm["scenario"]["exchange_rate"])
    total_household = next(row for row in households if row["group"] == "weighted_total")

    summary = {
        "scenario": scenario_name,
        "policy": policy_name,
        "real_gdp_growth_deviation_pp": round(scenario_growth - baseline_growth, 3),
        "inflation_deviation_pp": round(scenario_inflation - baseline_inflation, 3),
        "exchange_rate_depreciation_pct": round((scenario_er / baseline_er - 1) * 100, 3),
        "cge_exchange_rate_index": cge.get("results", {}).get("Er"),
        "unemployment_rate_pct": round(_unemployment_rate(scenario, policy, calibration) * 100, 3),
        "remittance_loss_usd": external["remittance_loss_usd"],
        "export_loss_usd": external["export_loss_usd"],
        "external_financing_gap_usd": external["external_financing_gap_usd"],
        "reserve_use_usd": external["reserve_use_usd"],
        "poverty_headcount": total_household["poverty_headcount"],
        "average_real_income_change_pct": total_household["real_income_change_pct"],
        "bank_stress_score": banking["bank_stress_score"],
    }

    return {
        "attribution": {
            "module": "mcp_server.models.russia_shock",
            "version": "0.2.0",
            "status": "prototype",
            "model_blocks": [
                "CGE 1-2-3",
                "QPM",
                "Input-Output",
                "household satellite",
                "banking satellite",
            ],
        },
        "scenario": asdict(scenario),
        "policy": asdict(policy),
        "calibration": asdict(calibration),
        "evidence": {
            "channel_calibration": {
                section: {
                    "confidence": values.get("confidence", "not_stated"),
                    "note": values.get("evidence_note", "No evidence note supplied."),
                }
                for section, values in load_channel_calibration().items()
            }
        },
        "summary": summary,
        "qpm": qpm,
        "cge": cge,
        "io": io,
        "external_balance": external,
        "households": households,
        "fiscal": fiscal,
        "banking": banking,
        "caveats": [
            "Russia partner splits beyond memo figures are illustrative placeholders.",
            "Household and poverty outputs use synthetic groups, not official microdata.",
            "Banking stress is an index satellite, not a balance-sheet banking model.",
            "Exchange rate, inflation, GDP, unemployment, and fiscal effects are outputs, not scenario inputs.",
            "Fiscal trade-related revenue loss is a simple satellite proxy tied to the export shock, not a tax microsimulation.",
        ],
    }


def _write_csv(path: Path, rows: list[dict[str, Any]]) -> None:
    if not rows:
        path.write_text("", encoding="utf-8")
        return
    fieldnames = list(rows[0].keys())
    with path.open("w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)


def write_outputs(result: dict[str, Any], out_dir: Path) -> None:
    out_dir.mkdir(parents=True, exist_ok=True)
    (out_dir / "result.json").write_text(json.dumps(result, indent=2), encoding="utf-8")
    _write_csv(out_dir / "summary.csv", [result["summary"]])
    _write_csv(out_dir / "household_outputs.csv", result["households"])
    _write_csv(out_dir / "external_balance.csv", [result["external_balance"]])
    _write_csv(out_dir / "fiscal_outputs.csv", [result["fiscal"]])
    _write_csv(out_dir / "banking_stress.csv", [result["banking"]])

    sectors = result["io"].get("top_sectors", []) if isinstance(result.get("io"), dict) else []
    _write_csv(out_dir / "sector_outputs.csv", sectors)

    summary = result["summary"]
    summary_md = [
        f"# Russia Shock Result: {summary['scenario']} / {summary['policy']}",
        "",
        "Prototype output. Scenario drivers are converted to channel shocks through the calibration table; policy package amounts remain illustrative.",
        "",
        f"- Real GDP growth deviation: {summary['real_gdp_growth_deviation_pp']} pp",
        f"- Inflation deviation: {summary['inflation_deviation_pp']} pp",
        f"- Exchange-rate depreciation: {summary['exchange_rate_depreciation_pct']}%",
        f"- Remittance loss: ${summary['remittance_loss_usd']:,.0f}",
        f"- Export loss: ${summary['export_loss_usd']:,.0f}",
        f"- External financing gap: ${summary['external_financing_gap_usd']:,.0f}",
        f"- Poverty headcount: {summary['poverty_headcount']}",
        f"- Bank stress score: {summary['bank_stress_score']}",
        "",
        "## Caveats",
        *[f"- {caveat}" for caveat in result["caveats"]],
    ]
    (out_dir / "summary.md").write_text("\n".join(summary_md) + "\n", encoding="utf-8")


def compare_scenarios(scenario_names: list[str], policy_name: str = "none") -> list[dict[str, Any]]:
    return [run_russia_shock(name, policy_name)["summary"] for name in scenario_names]


def compare_policies(scenario_name: str, policy_names: list[str]) -> list[dict[str, Any]]:
    return [run_russia_shock(scenario_name, name)["summary"] for name in policy_names]


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Run Uzbekistan Russia-shock prototype.")
    parser.add_argument("command", choices=["run", "compare", "compare-policies"])
    parser.add_argument("--scenario", default="stagnation")
    parser.add_argument("--policy", default="none")
    parser.add_argument(
        "--scenarios", nargs="*", default=["baseline", "stagnation", "recession", "combined_shock"]
    )
    parser.add_argument(
        "--policies", nargs="*", default=["none", "minimal", "stabilization", "full_crisis"]
    )
    parser.add_argument("--out", required=True)
    args = parser.parse_args(argv)

    out_dir = Path(args.out)
    if args.command == "run":
        result = run_russia_shock(args.scenario, args.policy)
        write_outputs(result, out_dir)
        print(json.dumps(result["summary"], indent=2))
        return 0

    out_dir.mkdir(parents=True, exist_ok=True)
    if args.command == "compare":
        rows = compare_scenarios(args.scenarios, args.policy)
        _write_csv(out_dir / "summary.csv", rows)
        (out_dir / "result.json").write_text(json.dumps(rows, indent=2), encoding="utf-8")
        print(json.dumps(rows, indent=2))
        return 0

    rows = compare_policies(args.scenario, args.policies)
    _write_csv(out_dir / "summary.csv", rows)
    (out_dir / "result.json").write_text(json.dumps(rows, indent=2), encoding="utf-8")
    print(json.dumps(rows, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
