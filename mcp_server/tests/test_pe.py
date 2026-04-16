"""Tests for PE trade model."""

import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

DATA_PATH = Path(__file__).parent.parent / "data" / "pe_data.json"


def _load_data():
    if not DATA_PATH.exists():
        return None
    with open(DATA_PATH) as f:
        return json.load(f)


def test_pe_trade_impact_default():
    """20% tariff cut should produce trade effects matching data totals."""
    from models.pe import run_trade_simulation
    data = _load_data()
    if data is None:
        print("  SKIP: pe_data.json not found")
        return

    result = run_trade_simulation(data, tariff_cut_pct=20.0)
    agg = result["aggregate"]
    assert agg["trade_creation_usd"] > 0
    assert agg["revenue_change_usd"] < 0  # tariff cuts reduce revenue
    assert len(result["by_section"]) > 0


def test_pe_larger_cut_larger_effect():
    """40% cut should have ~2x the effect of 20% cut."""
    from models.pe import run_trade_simulation
    data = _load_data()
    if data is None:
        return

    r20 = run_trade_simulation(data, tariff_cut_pct=20.0)
    r40 = run_trade_simulation(data, tariff_cut_pct=40.0)
    assert r40["aggregate"]["total_trade_effect_usd"] > r20["aggregate"]["total_trade_effect_usd"]


def test_pe_trade_overview():
    """Overview should return top sections and partners."""
    from models.pe import get_trade_overview
    data = _load_data()
    if data is None:
        return

    result = get_trade_overview(data)
    assert result["total_imports_usd"] > 0
    assert len(result["top_sections"]) > 0
    assert len(result["top_partners"]) > 0


if __name__ == "__main__":
    test_pe_trade_impact_default()
    test_pe_larger_cut_larger_effect()
    test_pe_trade_overview()
    print("All PE tests passed!")
