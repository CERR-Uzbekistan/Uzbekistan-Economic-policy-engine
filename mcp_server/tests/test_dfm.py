"""Tests for DFM Kalman filter."""

import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

DATA_PATH = Path(__file__).parent.parent / "data" / "dfm_data.json"


def _load_data():
    if not DATA_PATH.exists():
        return None
    with open(DATA_PATH) as f:
        return json.load(f)


def test_dfm_nowcast():
    """Nowcast should produce a reasonable GDP estimate."""
    from models.dfm import run_nowcast
    data = _load_data()
    if data is None:
        print("  SKIP: dfm_data.json not found")
        return

    result = run_nowcast(data)
    assert "gdp_nowcast_yoy_pct" in result
    # GDP growth should be in a reasonable range
    gdp = result["gdp_nowcast_yoy_pct"]
    assert -10 < gdp < 20
    # Should have forecasts
    assert len(result["forecasts"]) == 3


def test_dfm_model_status():
    """Model status should report correct dimensions."""
    from models.dfm import run_nowcast
    data = _load_data()
    if data is None:
        return

    result = run_nowcast(data)
    status = result["model_status"]
    assert status["n_monthly_indicators"] >= 30
    assert status["n_factors"] >= 1


if __name__ == "__main__":
    test_dfm_nowcast()
    test_dfm_model_status()
    print("All DFM tests passed!")
