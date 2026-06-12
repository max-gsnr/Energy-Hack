#!/usr/bin/env python3
from __future__ import annotations

import argparse
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from backend.solar_twin.pipeline import TwinConfig, run_pipeline


def parse_years(value: str) -> tuple[int, ...]:
    if not value:
        return ()
    return tuple(int(part.strip()) for part in value.split(",") if part.strip())


def main() -> None:
    parser = argparse.ArgumentParser(description="Train the Plant A frozen-baseline AC twin.")
    parser.add_argument("--train-years", default="2017")
    parser.add_argument("--calibration-years", default="2018")
    parser.add_argument("--score-years", default="2019,2020,2021,2022,2023,2024,2025")
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
    parser.add_argument("--output-dir", default="outputs/solar_twin")
    parser.add_argument("--artifact-dir", default="artifacts/solar_twin")
    args = parser.parse_args()

    config = TwinConfig(
        train_years=parse_years(args.train_years),
        calibration_years=parse_years(args.calibration_years),
        score_years=parse_years(args.score_years),
        max_inverters=args.max_inverters or None,
        max_rows_per_year=args.max_rows_per_year or None,
    )
    metrics = run_pipeline(config, Path(args.output_dir), Path(args.artifact_dir))
    print("selected_model:", metrics["selected_model"])
    print("rows_used:", metrics["rows_used"])
    print("calibration_mae_with_module_temperature:", metrics["calibration_mae_with_module_temperature"])
    print("calibration_mae_exogenous_only:", metrics["calibration_mae_exogenous_only"])
    print("baseline_excluded_inverters:", metrics["baseline_excluded_inverters"])


if __name__ == "__main__":
    main()
