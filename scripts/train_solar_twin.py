#!/usr/bin/env python3
from __future__ import annotations

import argparse
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from backend.solar_twin.data import PLANTS
from backend.solar_twin.pipeline import TwinConfig, run_pipeline


# Per-plant default temporal splits. Plant A starts late 2016 (first full year
# 2017); Plant B starts 2018-01-01 (first full year 2018).
PLANT_DEFAULTS = {
    "A": {"train": "2017", "calibration": "2018",
          "score": "2019,2020,2021,2022,2023,2024,2025"},
    "B": {"train": "2018", "calibration": "2019",
          "score": "2020,2021,2022,2023,2024,2025"},
}


def parse_years(value: str) -> tuple[int, ...]:
    if not value:
        return ()
    return tuple(int(part.strip()) for part in value.split(",") if part.strip())


def main() -> None:
    parser = argparse.ArgumentParser(description="Train a frozen-baseline AC twin for Plant A or B.")
    parser.add_argument("--plant", choices=["A", "B"], default="A")
    parser.add_argument("--train-years", default=None)
    parser.add_argument("--calibration-years", default=None)
    parser.add_argument("--score-years", default=None)
    parser.add_argument(
        "--max-inverters",
        type=int,
        default=0,
        help="Use 0 for all inverters; use a smaller number for quick iteration.",
    )
    parser.add_argument(
        "--max-rows-per-year",
        type=int,
        default=0,
        help="Use 0 for all rows; use e.g. 40000 for a quick sampled run.",
    )
    parser.add_argument("--output-dir", default=None)
    parser.add_argument("--artifact-dir", default=None)
    args = parser.parse_args()

    plant = PLANTS[args.plant]
    d = PLANT_DEFAULTS[args.plant]
    output_dir = args.output_dir or f"outputs/plant_{args.plant.lower()}_twin"
    artifact_dir = args.artifact_dir or f"artifacts/plant_{args.plant.lower()}_twin"

    config = TwinConfig(
        plant=plant,
        train_years=parse_years(args.train_years or d["train"]),
        calibration_years=parse_years(args.calibration_years or d["calibration"]),
        score_years=parse_years(args.score_years or d["score"]),
        max_inverters=args.max_inverters or None,
        max_rows_per_year=args.max_rows_per_year or None,
    )
    metrics = run_pipeline(config, Path(output_dir), Path(artifact_dir))
    print("plant:", args.plant)
    print("selected_model:", metrics["selected_model"])
    print("rows_used:", metrics["rows_used"])
    print("calibration_mae_with_module_temperature:", metrics["calibration_mae_with_module_temperature"])
    print("calibration_mae_exogenous_only:", metrics["calibration_mae_exogenous_only"])
    print("baseline_excluded_inverters:", metrics["baseline_excluded_inverters"])


if __name__ == "__main__":
    main()
