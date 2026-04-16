"""Tests for I-O Leontief model."""

import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

DATA_PATH = Path(__file__).parent.parent / "data" / "io_data.json"


def _load_data():
    if not DATA_PATH.exists():
        return None
    with open(DATA_PATH) as f:
        return json.load(f)


def test_io_demand_shock():
    """100 bln UZS consumption shock should produce positive effects."""
    from models.io_model import run_demand_shock
    data = _load_data()
    if data is None:
        print("  SKIP: io_data.json not found")
        return

    result = run_demand_shock(data, consumption=100.0)
    assert "error" not in result
    assert result["aggregate"]["total_demand_shock_bln_uzs"] == 100.0
    assert result["aggregate"]["total_output_effect_bln_uzs"] > 100.0  # multiplier > 1
    assert result["aggregate"]["aggregate_multiplier"] > 1.0


def test_io_sector_specific_shock():
    """Shock to a specific sector should work."""
    from models.io_model import run_demand_shock
    data = _load_data()
    if data is None:
        return

    codes = data["codes"]
    result = run_demand_shock(data, consumption=50.0, sector_code=codes[0])
    assert "error" not in result
    assert result["aggregate"]["total_demand_shock_bln_uzs"] == 50.0


def test_io_sector_info():
    """Should return sector metadata and multipliers."""
    from models.io_model import get_sector_info
    data = _load_data()
    if data is None:
        return

    result = get_sector_info(data, top_n=10)
    assert result["n_sectors"] == 136
    assert len(result["sectors"]) <= 10
    assert all(s["output_multiplier"] > 0 for s in result["sectors"])


def test_io_linkage_classification():
    """Filter by classification should work."""
    from models.io_model import get_sector_info
    data = _load_data()
    if data is None:
        return

    result = get_sector_info(data, classification="key", top_n=136)
    assert all(s["classification"] == "key" for s in result["sectors"])


if __name__ == "__main__":
    test_io_demand_shock()
    test_io_sector_specific_shock()
    test_io_sector_info()
    test_io_linkage_classification()
    print("All I-O tests passed!")
