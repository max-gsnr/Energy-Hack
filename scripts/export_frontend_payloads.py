#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import math
import re
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import numpy as np
import pandas as pd


REQUIRED_COLUMNS = {
    "plant_daily_scores.csv": {
        "date",
        "year",
        "expected_kwh",
        "actual_kwh",
        "lost_kwh",
        "strong_samples",
        "outage_samples",
        "slow_degradation_samples",
        "fast_degradation_samples",
        "error_samples",
        "explained_fault_samples",
    },
    "inverter_rankings.csv": {
        "inverter_id",
        "total_lost_kwh",
        "worst_residual_z",
        "worst_acute_residual_z",
        "strong_samples",
        "outage_samples",
        "slow_degradation_samples",
        "fast_degradation_samples",
        "error_samples",
        "explained_fault_samples",
    },
    "daily_inverter_scores.csv": {
        "date",
        "year",
        "inverter_id",
        "inverter_group",
        "expected_kwh",
        "current_expected_kwh",
        "actual_kwh",
        "lost_kwh",
        "mean_residual_z",
        "min_residual_z",
        "mean_acute_residual_z",
        "min_acute_residual_z",
        "mean_factor",
        "mean_relative_factor",
        "strong_samples",
        "outage_samples",
        "slow_degradation_samples",
        "fast_degradation_samples",
        "curtailed_samples",
        "error_samples",
        "explained_fault_samples",
        "sustained_underperformance",
        "event_type",
    },
    "anomaly_events.csv": {
        "date",
        "year",
        "inverter_id",
        "inverter_group",
        "expected_kwh",
        "current_expected_kwh",
        "actual_kwh",
        "lost_kwh",
        "mean_residual_z",
        "min_residual_z",
        "mean_acute_residual_z",
        "min_acute_residual_z",
        "mean_factor",
        "mean_relative_factor",
        "strong_samples",
        "outage_samples",
        "slow_degradation_samples",
        "fast_degradation_samples",
        "curtailed_samples",
        "error_samples",
        "explained_fault_samples",
        "sustained_underperformance",
        "event_type",
    },
    "degradation_trends.csv": {
        "year",
        "inverter_id",
        "inverter_group",
        "days_observed",
        "median_factor",
        "median_relative_factor",
        "min_factor",
        "min_relative_factor",
        "fast_degradation_days",
        "slow_degradation_days",
        "lost_kwh",
    },
    "rolling_factor_history.csv": {
        "inverter_id",
        "date",
        "factor",
        "relative_factor",
        "cohort_median_factor",
        "factor_slope_pct_yr",
        "fast_degradation",
        "warmup",
        "n_window_days",
    },
    "inverter_metadata.csv": {
        "inverter_id",
        "pdc_kwp",
        "module_type",
        "manufacturer",
        "module_wattage",
        "modules",
        "strings",
        "modules_per_string",
        "inverter_group",
        "capacity_band",
    },
}


FACTOR_THRESHOLDS = {
    "critical": 0.80,
    "warning": 0.92,
    "watch": 0.97,
}


STATUS_COLORS = {
    "critical": "red",
    "warning": "orange",
    "watch": "yellow",
    "normal": "green",
    "missing": "gray",
}


PRE_EXISTING_TEXT = (
    "Anomalous since start of monitoring / pre-existing fault, excluded from 2017 baseline."
)


@dataclass(frozen=True)
class ExportData:
    run_summary: dict[str, Any]
    plant_daily: pd.DataFrame
    rankings: pd.DataFrame
    daily: pd.DataFrame
    events: pd.DataFrame
    degradation_trends: pd.DataFrame
    rolling: pd.DataFrame
    metadata: pd.DataFrame


def safe_inverter_id(inverter_id: str) -> str:
    return re.sub(r"[^A-Za-z0-9]+", "_", inverter_id).strip("_")


def parse_display_label(inverter_id: str) -> str:
    match = re.fullmatch(r"INV\s+(\d{2})\.(\d{2})\.(\d{3})", inverter_id)
    if not match:
        return inverter_id
    return ".".join(match.groups())


def parse_group_row(inverter_id: str, fallback: int) -> int:
    match = re.fullmatch(r"INV\s+\d{2}\.(\d{2})\.\d{3}", inverter_id)
    return int(match.group(1)) if match else fallback


def finite_or_none(value: Any, digits: int | None = None) -> float | int | str | bool | None:
    if value is None:
        return None
    if isinstance(value, (bool, str, int)):
        return value
    try:
        numeric = float(value)
    except (TypeError, ValueError):
        return None
    if not math.isfinite(numeric):
        return None
    return round(numeric, digits) if digits is not None else numeric


def read_json(path: Path) -> dict[str, Any]:
    if not path.exists():
        raise FileNotFoundError(f"Missing required file: {path}")
    with path.open("r", encoding="utf-8") as f:
        return json.load(f)


def read_csv(input_dir: Path, name: str) -> pd.DataFrame:
    path = input_dir / name
    if not path.exists():
        raise FileNotFoundError(f"Missing required file: {path}")
    frame = pd.read_csv(path)
    missing = REQUIRED_COLUMNS[name] - set(frame.columns)
    if missing:
        raise ValueError(f"{name} missing required columns: {sorted(missing)}")
    return frame


def load_inputs(input_dir: Path) -> ExportData:
    run_summary = read_json(input_dir / "run_summary.json")
    for key in [
        "selected_model",
        "rows_used",
        "rolling_layer_enabled",
        "baseline_excluded_inverters",
        "calibration_mae_exogenous_only",
        "calibration_mae_with_module_temperature",
    ]:
        if key not in run_summary:
            raise ValueError(f"run_summary.json missing required key: {key}")
    return ExportData(
        run_summary=run_summary,
        plant_daily=read_csv(input_dir, "plant_daily_scores.csv"),
        rankings=read_csv(input_dir, "inverter_rankings.csv"),
        daily=read_csv(input_dir, "daily_inverter_scores.csv"),
        events=read_csv(input_dir, "anomaly_events.csv"),
        degradation_trends=read_csv(input_dir, "degradation_trends.csv"),
        rolling=read_csv(input_dir, "rolling_factor_history.csv"),
        metadata=read_csv(input_dir, "inverter_metadata.csv"),
    )


def generated_at_from_source(input_dir: Path) -> str:
    ts = (input_dir / "run_summary.json").stat().st_mtime
    return datetime.fromtimestamp(ts, timezone.utc).replace(microsecond=0).isoformat()


def canonical_factors(rolling: pd.DataFrame, recent_rows: int = 30) -> pd.DataFrame:
    roll = rolling.copy()
    roll["warmup"] = roll["warmup"].astype(bool)
    usable = roll[~roll["warmup"]].copy()
    if usable.empty:
        usable = roll.copy()
    rows = []
    for inverter_id, group in usable.sort_values(["inverter_id", "date"]).groupby(
        "inverter_id", sort=True
    ):
        recent = group.tail(recent_rows)
        rows.append(
            {
                "inverter_id": inverter_id,
                "latest_factor": float(recent["factor"].median()),
                "latest_relative_factor": float(recent["relative_factor"].median()),
                "recent_factor_points": int(len(recent)),
                "latest_factor_date": str(recent["date"].iloc[-1]),
            }
        )
    return pd.DataFrame(rows)


def severity_thresholds(rankings: pd.DataFrame, metadata: pd.DataFrame) -> dict[str, Any]:
    merged = rankings[["inverter_id", "total_lost_kwh"]].merge(
        metadata[["inverter_id", "pdc_kwp"]], on="inverter_id", how="left"
    )
    merged["lost_kwh_per_kwp"] = merged["total_lost_kwh"] / merged["pdc_kwp"]
    values = merged["lost_kwh_per_kwp"].replace([np.inf, -np.inf], np.nan).dropna()
    return {
        "lost_kwh_per_kwp": {
            "critical_high": round(float(values.quantile(0.90)), 4),
            "warning_med": round(float(values.quantile(0.75)), 4),
            "watch_low": round(float(values.quantile(0.50)), 4),
        },
        "factor": FACTOR_THRESHOLDS,
    }


def inverter_status(
    latest_factor: float | None, lost_kwh_per_kwp: float | None, thresholds: dict[str, Any]
) -> str:
    lost_thresholds = thresholds["lost_kwh_per_kwp"]
    factor = latest_factor if latest_factor is not None else math.inf
    loss = lost_kwh_per_kwp if lost_kwh_per_kwp is not None else -math.inf
    if factor < FACTOR_THRESHOLDS["critical"] or loss >= lost_thresholds["critical_high"]:
        return "critical"
    if factor < FACTOR_THRESHOLDS["warning"] or loss >= lost_thresholds["warning_med"]:
        return "warning"
    if factor < FACTOR_THRESHOLDS["watch"] or loss >= lost_thresholds["watch_low"]:
        return "watch"
    return "normal"


def event_severity(
    event_type: str, event_lost_kwh_per_kwp: float | None, thresholds: dict[str, Any]
) -> str:
    loss = event_lost_kwh_per_kwp if event_lost_kwh_per_kwp is not None else -math.inf
    lost_thresholds = thresholds["lost_kwh_per_kwp"]
    if event_type == "outage" or loss >= lost_thresholds["critical_high"]:
        return "critical"
    if event_type == "acute_fault" or loss >= lost_thresholds["warning_med"]:
        return "warning"
    if loss >= lost_thresholds["watch_low"]:
        return "watch"
    return "normal"


def primary_reason(status: str, baseline_excluded: bool, latest_factor: float | None) -> str:
    if baseline_excluded:
        return PRE_EXISTING_TEXT
    if latest_factor is not None and latest_factor < FACTOR_THRESHOLDS["critical"]:
        return "Low rolling health factor relative to expected normalized output."
    if status == "critical":
        return "High capacity-normalized performance loss."
    if status == "warning":
        return "Elevated capacity-normalized loss or reduced rolling health factor."
    if status == "watch":
        return "Moderate loss or rolling health factor below watch threshold."
    return "No major modeled performance issue in the exported run."


def build_plant_summary(plant_daily: pd.DataFrame) -> dict[str, Any]:
    plant = plant_daily.copy()
    yearly = (
        plant.groupby("year", sort=True)
        .agg(
            expected_kwh=("expected_kwh", "sum"),
            actual_kwh=("actual_kwh", "sum"),
            lost_kwh=("lost_kwh", "sum"),
            curtailment_kwh=("curtailment_kwh", "sum"),
            strong_samples=("strong_samples", "sum"),
            outage_samples=("outage_samples", "sum"),
            slow_degradation_samples=("slow_degradation_samples", "sum"),
            fast_degradation_samples=("fast_degradation_samples", "sum"),
            error_samples=("error_samples", "sum"),
            explained_fault_samples=("explained_fault_samples", "sum"),
        )
        .reset_index()
    )
    yearly_rows = []
    for _, row in yearly.iterrows():
        # Curtailment is now measured directly during throttled periods. The
        # overperformance offset closes the reconciliation when actual exceeds
        # expected on some intervals: (lost + curtailment) - (expected - actual).
        curtailment = float(row["curtailment_kwh"])
        overperformance = max(
            0.0,
            float(row["lost_kwh"]) + curtailment
            - (float(row["expected_kwh"]) - float(row["actual_kwh"])),
        )
        yearly_rows.append(
            {
                "year": int(row["year"]),
                "expected_kwh": finite_or_none(row["expected_kwh"], 2),
                "actual_kwh": finite_or_none(row["actual_kwh"], 2),
                "lost_kwh": finite_or_none(row["lost_kwh"], 2),
                "curtailment_kwh": finite_or_none(curtailment, 2),
                "overperformance_offset_kwh": finite_or_none(overperformance, 2),
                "strong_samples": int(row["strong_samples"]),
                "outage_samples": int(row["outage_samples"]),
                "slow_degradation_samples": int(row["slow_degradation_samples"]),
                "fast_degradation_samples": int(row["fast_degradation_samples"]),
                "error_samples": int(row["error_samples"]),
                "explained_fault_samples": int(row["explained_fault_samples"]),
            }
        )
    total_expected = float(plant["expected_kwh"].sum())
    total_actual = float(plant["actual_kwh"].sum())
    total_lost = float(plant["lost_kwh"].sum())
    total_curtailment = float(plant["curtailment_kwh"].sum())
    total_overperformance = max(
        0.0, total_lost + total_curtailment - (total_expected - total_actual)
    )
    return {
        "total_expected_kwh": finite_or_none(total_expected, 2),
        "total_actual_kwh": finite_or_none(total_actual, 2),
        "total_lost_kwh": finite_or_none(total_lost, 2),
        "total_curtailment_kwh": finite_or_none(total_curtailment, 2),
        "total_overperformance_offset_kwh": finite_or_none(total_overperformance, 2),
        "lost_kwh_semantics": "performance loss excluding curtailment",
        "reconciliation": "actual_kwh + lost_kwh + curtailment_kwh - overperformance_offset_kwh = expected_kwh",
        "sample_count_semantics": {
            "strong_samples": "5-minute acute residual flags.",
            "outage_samples": "5-minute outage flags.",
            "slow_degradation_samples": "5-minute chronic trend-state rows, not independent events.",
            "fast_degradation_samples": "5-minute chronic trend-state rows, not independent events.",
        },
        "yearly": yearly_rows,
    }


def enrich_rankings(
    rankings: pd.DataFrame,
    metadata: pd.DataFrame,
    factors: pd.DataFrame,
    baseline_excluded: set[str],
    thresholds: dict[str, Any],
) -> list[dict[str, Any]]:
    merged = (
        rankings.merge(metadata, on="inverter_id", how="left")
        .merge(factors, on="inverter_id", how="left")
        .sort_values("total_lost_kwh", ascending=False)
        .reset_index(drop=True)
    )
    output = []
    for idx, row in merged.iterrows():
        pdc_kwp = finite_or_none(row.get("pdc_kwp"), 4)
        lost = finite_or_none(row["total_lost_kwh"], 4)
        lost_per_kwp = None if not pdc_kwp else float(lost) / float(pdc_kwp)
        factor = finite_or_none(row.get("latest_factor"), 4)
        relative_factor = finite_or_none(row.get("latest_relative_factor"), 4)
        status = inverter_status(factor, lost_per_kwp, thresholds)
        excluded = row["inverter_id"] in baseline_excluded
        output.append(
            {
                "rank": idx + 1,
                "inverter_id": row["inverter_id"],
                "inverter_group": row.get("inverter_group") or "unknown",
                "pdc_kwp": pdc_kwp,
                "total_lost_kwh": finite_or_none(lost, 2),
                "lost_kwh_per_kwp": finite_or_none(lost_per_kwp, 4),
                "latest_factor": factor,
                "latest_relative_factor": relative_factor,
                "recent_factor_points": int(row.get("recent_factor_points", 0) or 0),
                "worst_residual_z": finite_or_none(row["worst_residual_z"], 2),
                "worst_acute_residual_z": finite_or_none(row["worst_acute_residual_z"], 2),
                "strong_samples": int(row["strong_samples"]),
                "outage_samples": int(row["outage_samples"]),
                "slow_degradation_samples": int(row["slow_degradation_samples"]),
                "fast_degradation_samples": int(row["fast_degradation_samples"]),
                "error_samples": int(row["error_samples"]),
                "explained_fault_samples": int(row["explained_fault_samples"]),
                "baseline_excluded": excluded,
                "primary_status": status,
                "status_color": STATUS_COLORS[status],
                "primary_reason": primary_reason(status, excluded, factor),
            }
        )
    return output


def build_inverter_map(rankings: list[dict[str, Any]]) -> list[dict[str, Any]]:
    grouped: dict[int, list[dict[str, Any]]] = {}
    for idx, item in enumerate(rankings):
        row = parse_group_row(item["inverter_id"], fallback=idx + 1)
        grouped.setdefault(row, []).append(item)
    tiles = []
    used_positions = set()
    for row in sorted(grouped):
        for col, item in enumerate(grouped[row], start=1):
            if (row, col) in used_positions:
                raise ValueError(f"Duplicate inverter map position: {(row, col)}")
            used_positions.add((row, col))
            tiles.append(
                {
                    "inverter_id": item["inverter_id"],
                    "inverter_group": item["inverter_group"],
                    "display_label": parse_display_label(item["inverter_id"]),
                    "row": row,
                    "column": col,
                    "status": item["primary_status"],
                    "status_color": item["status_color"],
                    "baseline_excluded": item["baseline_excluded"],
                    "total_lost_kwh": item["total_lost_kwh"],
                    "lost_kwh_per_kwp": item["lost_kwh_per_kwp"],
                    "latest_factor": item["latest_factor"],
                    "latest_relative_factor": item["latest_relative_factor"],
                    "primary_reason": item["primary_reason"],
                }
            )
    return sorted(tiles, key=lambda x: (x["row"], x["column"], x["inverter_id"]))


def build_events(events: pd.DataFrame, metadata: pd.DataFrame, thresholds: dict[str, Any]) -> list[dict[str, Any]]:
    acute = events[events["event_type"].isin(["outage", "acute_fault"])].copy()
    merged = acute.merge(metadata[["inverter_id", "pdc_kwp"]], on="inverter_id", how="left")
    rows = []
    for _, row in merged.sort_values(["lost_kwh", "date"], ascending=[False, True]).iterrows():
        pdc_kwp = finite_or_none(row.get("pdc_kwp"), 4)
        lost = finite_or_none(row["lost_kwh"], 4)
        lost_per_kwp = None if not pdc_kwp else float(lost) / float(pdc_kwp)
        severity = event_severity(str(row["event_type"]), lost_per_kwp, thresholds)
        rows.append(
            {
                "date": str(row["date"]),
                "year": int(row["year"]),
                "inverter_id": row["inverter_id"],
                "inverter_group": row["inverter_group"],
                "event_type": row["event_type"],
                "severity": severity,
                "severity_color": STATUS_COLORS[severity],
                "expected_kwh": finite_or_none(row["expected_kwh"], 2),
                "current_expected_kwh": finite_or_none(row["current_expected_kwh"], 2),
                "actual_kwh": finite_or_none(row["actual_kwh"], 2),
                "lost_kwh": finite_or_none(lost, 2),
                "event_lost_kwh_per_kwp": finite_or_none(lost_per_kwp, 4),
                "mean_residual_z": finite_or_none(row["mean_residual_z"], 2),
                "min_residual_z": finite_or_none(row["min_residual_z"], 2),
                "mean_acute_residual_z": finite_or_none(row["mean_acute_residual_z"], 2),
                "min_acute_residual_z": finite_or_none(row["min_acute_residual_z"], 2),
                "strong_samples": int(row["strong_samples"]),
                "outage_samples": int(row["outage_samples"]),
                "curtailed_samples": int(row["curtailed_samples"]),
                "error_samples": int(row["error_samples"]),
                "explained_fault_samples": int(row["explained_fault_samples"]),
                "explained_by_error": int(row["error_samples"]) > 0,
            }
        )
    return rows


def build_degradation_trends(trends: pd.DataFrame) -> dict[str, Any]:
    frame = trends.copy()
    yearly = (
        frame.groupby("year", sort=True)
        .agg(
            inverters_observed=("inverter_id", "nunique"),
            median_factor=("median_factor", "median"),
            median_relative_factor=("median_relative_factor", "median"),
            min_factor=("min_factor", "min"),
            min_relative_factor=("min_relative_factor", "min"),
            inverter_years_with_fast_degradation=(
                "fast_degradation_days",
                lambda s: int((s > 0).sum()),
            ),
            inverter_years_with_slow_degradation=(
                "slow_degradation_days",
                lambda s: int((s > 0).sum()),
            ),
            fast_degradation_days=("fast_degradation_days", "sum"),
            slow_degradation_days=("slow_degradation_days", "sum"),
            lost_kwh=("lost_kwh", "sum"),
        )
        .reset_index()
    )
    yearly_rows = []
    for _, row in yearly.iterrows():
        yearly_rows.append(
            {
                "year": int(row["year"]),
                "inverters_observed": int(row["inverters_observed"]),
                "median_factor": finite_or_none(row["median_factor"], 4),
                "median_relative_factor": finite_or_none(row["median_relative_factor"], 4),
                "min_factor": finite_or_none(row["min_factor"], 4),
                "min_relative_factor": finite_or_none(row["min_relative_factor"], 4),
                "inverter_years_with_fast_degradation": int(
                    row["inverter_years_with_fast_degradation"]
                ),
                "inverter_years_with_slow_degradation": int(
                    row["inverter_years_with_slow_degradation"]
                ),
                "fast_degradation_days": int(row["fast_degradation_days"]),
                "slow_degradation_days": int(row["slow_degradation_days"]),
                "lost_kwh": finite_or_none(row["lost_kwh"], 2),
            }
        )

    inverter_rows = []
    for _, row in frame.sort_values(
        ["year", "lost_kwh", "inverter_id"], ascending=[True, False, True]
    ).iterrows():
        inverter_rows.append(
            {
                "year": int(row["year"]),
                "inverter_id": row["inverter_id"],
                "inverter_group": row["inverter_group"],
                "days_observed": int(row["days_observed"]),
                "median_factor": finite_or_none(row["median_factor"], 4),
                "median_relative_factor": finite_or_none(row["median_relative_factor"], 4),
                "min_factor": finite_or_none(row["min_factor"], 4),
                "min_relative_factor": finite_or_none(row["min_relative_factor"], 4),
                "fast_degradation_days": int(row["fast_degradation_days"]),
                "slow_degradation_days": int(row["slow_degradation_days"]),
                "lost_kwh": finite_or_none(row["lost_kwh"], 2),
            }
        )

    return {
        "semantics": (
            "Chronic rolling health-factor trend summary. These are not acute events "
            "and should not be counted as independent failures."
        ),
        "yearly": yearly_rows,
        "inverter_years": inverter_rows,
    }


def build_agent_context(
    run_summary: dict[str, Any],
    plant_summary: dict[str, Any],
    rankings: list[dict[str, Any]],
    events: list[dict[str, Any]],
    degradation_trends: dict[str, Any],
    baseline_excluded: list[str],
) -> dict[str, Any]:
    total_lost = plant_summary["total_lost_kwh"]
    total_curtailment = plant_summary["total_curtailment_kwh"]
    top_findings = []
    for item in rankings[:10]:
        if item["baseline_excluded"]:
            finding = (
                f"{item['inverter_id']} has {item['total_lost_kwh']} kWh modeled performance loss "
                "and is anomalous since start of monitoring / pre-existing fault."
            )
            next_action = (
                "Treat as a pre-existing fault candidate and inspect historical tickets, "
                "DC-side behavior, and inverter condition."
            )
        else:
            finding = (
                f"{item['inverter_id']} has {item['total_lost_kwh']} kWh modeled performance loss "
                f"with latest health factor {item['latest_factor']}."
            )
            next_action = "Inspect recent anomaly events, factor history, error overlap, and DC diagnostics."
        top_findings.append(
            {
                "inverter_id": item["inverter_id"],
                "finding": finding,
                "evidence": {
                    "total_lost_kwh": item["total_lost_kwh"],
                    "lost_kwh_per_kwp": item["lost_kwh_per_kwp"],
                    "latest_factor": item["latest_factor"],
                    "latest_relative_factor": item["latest_relative_factor"],
                    "baseline_excluded": item["baseline_excluded"],
                    "status": item["primary_status"],
                    "error_samples": item["error_samples"],
                    "outage_samples": item["outage_samples"],
                },
                "recommended_next_action": next_action,
            }
        )
    return {
        "plant_headline": (
            f"Plant A has {total_lost} kWh modeled performance loss excluding curtailment; "
            f"estimated curtailment bucket is {total_curtailment} kWh."
        ),
        "model_summary": (
            f"Selected model is {run_summary['selected_model']}, trained on "
            f"{run_summary.get('train_years', 'unknown')} and calibrated on "
            f"{run_summary.get('calibration_years', 'unknown')}."
        ),
        "baseline_excluded_inverters": baseline_excluded,
        "guardrails": [
            "Every numeric claim in this context is copied from exported model-run values.",
            "Unavailable values must be answered as unknown.",
            "Baseline-excluded inverters are pre-existing/anomalous-since-start candidates, not degradation-over-time claims.",
            "Use latest_factor and latest_relative_factor for health/degradation explanations.",
            "Use degradation_trends for chronic health changes; events are acute outages or acute faults only.",
        ],
        "top_findings": top_findings,
        "top_events": events[:10],
        "degradation_trend_summary": degradation_trends["yearly"],
        "answerable_questions": [
            "Which inverter has the highest modeled performance loss?",
            "Is the top issue pre-existing or a new acute fault?",
            "How much energy was lost excluding curtailment?",
            "How large is the estimated curtailment bucket?",
            "Does an anomaly overlap with error samples?",
        ],
    }


def build_detail_files(
    output_dir: Path,
    rankings: list[dict[str, Any]],
    daily: pd.DataFrame,
    rolling: pd.DataFrame,
    events: list[dict[str, Any]],
) -> None:
    detail_dir = output_dir / "inverters"
    detail_dir.mkdir(parents=True, exist_ok=True)
    events_by_inverter: dict[str, list[dict[str, Any]]] = {}
    for event in events:
        events_by_inverter.setdefault(event["inverter_id"], []).append(event)

    daily_groups = {k: v for k, v in daily.sort_values(["inverter_id", "date"]).groupby("inverter_id", sort=True)}
    rolling_groups = {
        k: v
        for k, v in rolling.sort_values(["inverter_id", "date"]).groupby("inverter_id", sort=True)
    }
    for item in rankings:
        inverter_id = item["inverter_id"]
        daily_rows = []
        for _, row in daily_groups.get(inverter_id, pd.DataFrame()).iterrows():
            daily_rows.append(
                {
                    "date": str(row["date"]),
                    "year": int(row["year"]),
                    "expected_kwh": finite_or_none(row["expected_kwh"], 2),
                    "current_expected_kwh": finite_or_none(row["current_expected_kwh"], 2),
                    "actual_kwh": finite_or_none(row["actual_kwh"], 2),
                    "lost_kwh": finite_or_none(row["lost_kwh"], 2),
                    "mean_residual_z": finite_or_none(row["mean_residual_z"], 2),
                    "mean_acute_residual_z": finite_or_none(row["mean_acute_residual_z"], 2),
                    "mean_factor": finite_or_none(row["mean_factor"], 4),
                    "mean_relative_factor": finite_or_none(row["mean_relative_factor"], 4),
                    "daily_state": row["event_type"],
                    "is_acute_event": row["event_type"] in {"outage", "acute_fault"},
                    "strong_samples": int(row["strong_samples"]),
                    "outage_samples": int(row["outage_samples"]),
                    "error_samples": int(row["error_samples"]),
                }
            )
        factor_rows = []
        for _, row in rolling_groups.get(inverter_id, pd.DataFrame()).iterrows():
            factor_rows.append(
                {
                    "date": str(row["date"]),
                    "factor": finite_or_none(row["factor"], 4),
                    "relative_factor": finite_or_none(row["relative_factor"], 4),
                    "cohort_median_factor": finite_or_none(row["cohort_median_factor"], 4),
                    "warmup": bool(row["warmup"]),
                    "n_window_days": int(row["n_window_days"]),
                    "provisional_factor_slope_pct_yr": finite_or_none(
                        row["factor_slope_pct_yr"], 6
                    ),
                }
            )
        detail = {
            "inverter_id": inverter_id,
            "baseline_excluded": item["baseline_excluded"],
            "summary": item,
            "daily": daily_rows,
            "factor_history": factor_rows,
            "events": events_by_inverter.get(inverter_id, []),
        }
        write_json(detail_dir / f"{safe_inverter_id(inverter_id)}.json", detail)


def write_json(path: Path, payload: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8") as f:
        json.dump(payload, f, indent=2, sort_keys=True, ensure_ascii=False)
        f.write("\n")


def rel_close(left: float, right: float, tolerance: float = 0.005) -> bool:
    denom = max(abs(left), abs(right), 1.0)
    return abs(left - right) / denom <= tolerance


def assert_no_headline_degradation_rate(value: Any, path: str = "") -> None:
    if isinstance(value, dict):
        for key, child in value.items():
            next_path = f"{path}.{key}" if path else key
            if key == "degradation_rate_pct_per_year":
                raise AssertionError(f"Headline degradation_rate_pct_per_year found at {next_path}")
            assert_no_headline_degradation_rate(child, next_path)
    elif isinstance(value, list):
        for idx, child in enumerate(value):
            assert_no_headline_degradation_rate(child, f"{path}[{idx}]")


def validate_outputs(
    output_dir: Path,
    plant_summary: dict[str, Any],
    rankings: list[dict[str, Any]],
    inverter_map: list[dict[str, Any]],
    agent_context: dict[str, Any],
) -> None:
    for path in output_dir.rglob("*.json"):
        with path.open("r", encoding="utf-8") as f:
            json.load(f)

    total_expected = float(plant_summary["total_expected_kwh"])
    total_actual = float(plant_summary["total_actual_kwh"])
    total_lost = float(plant_summary["total_lost_kwh"])
    total_curtailment = float(plant_summary["total_curtailment_kwh"])
    total_overperformance = float(plant_summary["total_overperformance_offset_kwh"])
    if not rel_close(total_actual + total_lost + total_curtailment - total_overperformance, total_expected):
        raise AssertionError("Plant total actual + lost + curtailment does not reconcile to expected")
    for row in plant_summary["yearly"]:
        if not rel_close(
            float(row["actual_kwh"])
            + float(row["lost_kwh"])
            + float(row["curtailment_kwh"])
            - float(row["overperformance_offset_kwh"]),
            float(row["expected_kwh"]),
        ):
            raise AssertionError(f"Yearly reconciliation failed for {row['year']}")

    ranking_lost = sum(float(item["total_lost_kwh"]) for item in rankings)
    if not rel_close(ranking_lost, total_lost):
        raise AssertionError("Ranking lost kWh does not reconcile to plant lost kWh")

    ranking_by_id = {item["inverter_id"]: item for item in rankings}
    if "INV 01.07.047" in ranking_by_id:
        if rankings[0]["inverter_id"] != "INV 01.07.047":
            raise AssertionError("Top-ranked inverter is not INV 01.07.047")
        if not ranking_by_id["INV 01.07.047"]["baseline_excluded"]:
            raise AssertionError("INV 01.07.047 should be baseline_excluded")

        finding = next(
            item for item in agent_context["top_findings"] if item["inverter_id"] == "INV 01.07.047"
        )
        text = json.dumps(finding).lower()
        if "anomalous since start" not in text and "pre-existing" not in text:
            raise AssertionError("INV 01.07.047 finding lacks pre-existing/anomalous-since-start language")
        if "degraded over time" in text:
            raise AssertionError("INV 01.07.047 finding incorrectly says degraded over time")

    for payload_name in [
        "model_run_metadata.json",
        "plant_summary.json",
        "inverter_rankings.json",
        "inverter_map.json",
        "events.json",
        "degradation_trends.json",
        "agent_context.json",
    ]:
        with (output_dir / payload_name).open("r", encoding="utf-8") as f:
            assert_no_headline_degradation_rate(json.load(f), payload_name)

    ranking_ids = [item["inverter_id"] for item in rankings]
    map_ids = [item["inverter_id"] for item in inverter_map]
    if sorted(ranking_ids) != sorted(map_ids):
        raise AssertionError("Inverter map does not contain exactly the ranked inverters")
    positions = [(item["row"], item["column"]) for item in inverter_map]
    if len(positions) != len(set(positions)):
        raise AssertionError("Duplicate inverter map positions found")

    detail_dir = output_dir / "inverters"
    detail_files = sorted(p.name for p in detail_dir.glob("*.json"))
    expected_files = sorted(f"{safe_inverter_id(inverter_id)}.json" for inverter_id in ranking_ids)
    if detail_files != expected_files:
        raise AssertionError("Per-inverter detail files do not match rankings")


def export_payloads(input_dir: Path, output_dir: Path) -> None:
    data = load_inputs(input_dir)
    baseline_excluded = set(data.run_summary["baseline_excluded_inverters"])
    factors = canonical_factors(data.rolling)
    thresholds = severity_thresholds(data.rankings, data.metadata)
    plant_summary = build_plant_summary(data.plant_daily)
    rankings = enrich_rankings(data.rankings, data.metadata, factors, baseline_excluded, thresholds)
    inverter_map = build_inverter_map(rankings)
    events = build_events(data.events, data.metadata, thresholds)
    degradation_trends = build_degradation_trends(data.degradation_trends)

    selected_model = data.run_summary["selected_model"]
    calibration_key = (
        "calibration_mae_exogenous_only"
        if selected_model == "exogenous_only"
        else "calibration_mae_with_module_temperature"
    )
    metadata = {
        "generated_at": generated_at_from_source(input_dir),
        "source_run_dir": str(input_dir),
        "selected_model": selected_model,
        "train_years": data.run_summary.get("train_years", []),
        "calibration_years": data.run_summary.get("calibration_years", []),
        "score_years": data.run_summary.get("score_years", []),
        "rows_used": int(data.run_summary["rows_used"]),
        "rolling_layer_enabled": bool(data.run_summary["rolling_layer_enabled"]),
        "calibration_mae_norm": finite_or_none(data.run_summary[calibration_key], 6),
        "calibration_mae_exogenous_only": finite_or_none(
            data.run_summary["calibration_mae_exogenous_only"], 6
        ),
        "calibration_mae_with_module_temperature": finite_or_none(
            data.run_summary["calibration_mae_with_module_temperature"], 6
        ),
        "baseline_excluded_inverters": sorted(baseline_excluded),
        "severity_thresholds": thresholds,
        "event_semantics": "events.json contains acute outages and acute faults only; chronic degradation is exported in degradation_trends.json.",
    }
    agent_context = build_agent_context(
        data.run_summary,
        plant_summary,
        rankings,
        events,
        degradation_trends,
        sorted(baseline_excluded),
    )

    output_dir.mkdir(parents=True, exist_ok=True)
    (output_dir / "inverters").mkdir(parents=True, exist_ok=True)
    write_json(output_dir / "model_run_metadata.json", metadata)
    write_json(output_dir / "plant_summary.json", plant_summary)
    write_json(output_dir / "inverter_rankings.json", rankings)
    write_json(output_dir / "inverter_map.json", inverter_map)
    write_json(output_dir / "events.json", events)
    write_json(output_dir / "degradation_trends.json", degradation_trends)
    write_json(output_dir / "agent_context.json", agent_context)
    build_detail_files(output_dir, rankings, data.daily, data.rolling, events)
    validate_outputs(output_dir, plant_summary, rankings, inverter_map, agent_context)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Export frontend/agent JSON payloads from a solar twin model run."
    )
    parser.add_argument("--input-dir", default="outputs/current_model_run")
    parser.add_argument("--output-dir", default="frontend/public/data")
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    export_payloads(Path(args.input_dir), Path(args.output_dir))
    print(f"Exported frontend payloads to {args.output_dir}")


if __name__ == "__main__":
    main()
