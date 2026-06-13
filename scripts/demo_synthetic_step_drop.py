#!/usr/bin/env python3
from __future__ import annotations

import sys
from pathlib import Path

import numpy as np
import pandas as pd

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from backend.solar_twin.rolling import daily_clean_factor, rolling_factor


def main() -> None:
    dates = pd.date_range("2021-01-01", periods=120, freq="D")
    rows = []
    for idx, date in enumerate(dates):
        health = 1.0 if idx < 60 else 0.75
        for sample in range(24):
            pred_norm = 0.6
            pdc_kwp = 30.0
            p_ac_kw = pred_norm * health * pdc_kwp
            rows.append(
                {
                    "timestamp": date + pd.Timedelta(minutes=5 * sample),
                    "date": str(date.date()),
                    "inverter_id": "INV SYNTH.001",
                    "p_pred_norm": pred_norm,
                    "p_norm": pred_norm * health,
                    "p_ac_kw": p_ac_kw,
                    "pdc_kwp": pdc_kwp,
                    "curtailment_active": False,
                    "error_code": 0,
                }
            )

    frame = pd.DataFrame(rows)
    daily = daily_clean_factor(frame, min_clean_samples=12)
    roll = rolling_factor(daily, window_days=45, min_days=10, clamp=(0.5, 1.1))
    scored = frame.merge(roll, on=["inverter_id", "date"], how="left")
    scored["factor"] = scored["factor"].fillna(1.0)
    scored["frozen_residual"] = scored["p_norm"] - scored["p_pred_norm"]
    scored["acute_residual"] = scored["p_norm"] - scored["p_pred_norm"] * scored["factor"]
    daily_scored = scored.groupby("date", as_index=False).agg(
        factor=("factor", "mean"),
        frozen_residual=("frozen_residual", "mean"),
        acute_residual=("acute_residual", "mean"),
    )
    daily_scored["acute_flag"] = daily_scored["acute_residual"] < -0.08

    onset = daily_scored.iloc[58:66]
    settled = daily_scored.iloc[100:106]
    print("Synthetic step drop: factor absorbs a persistent 25% loss.")
    print("\nOnset window:")
    print(onset.to_string(index=False))
    print("\nAfter rolling window:")
    print(settled.to_string(index=False))
    print(
        "\nInterpretation: frozen_residual stays negative, while acute_residual "
        "returns toward zero once the rolling factor catches up."
    )


if __name__ == "__main__":
    main()
