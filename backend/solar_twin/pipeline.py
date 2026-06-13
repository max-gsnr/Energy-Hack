from __future__ import annotations

import json
from dataclasses import dataclass
from pathlib import Path

import joblib
import numpy as np
import pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.ensemble import HistGradientBoostingRegressor
from sklearn.metrics import mean_absolute_error, r2_score
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OrdinalEncoder

from .data import build_long_frame, feature_columns
from .rolling import (
    clean_day_filter,
    daily_clean_factor,
    factor_trend,
    fleet_relative_factor,
    rolling_factor,
)


@dataclass(frozen=True)
class TwinConfig:
    train_years: tuple[int, ...] = (2017,)
    calibration_years: tuple[int, ...] = (2018,)
    score_years: tuple[int, ...] = (2019, 2020, 2021, 2022, 2023, 2024, 2025)
    max_inverters: int | None = None
    max_rows_per_year: int | None = None
    random_state: int = 42
    strong_sigma: float = -3.0
    mild_sigma: float = -2.0
    sustained_samples_per_day: int = 24
    use_rolling_layer: bool = True
    window_days: int = 45
    min_clean_days: int = 10
    clamp: tuple[float, float] = (0.5, 1.1)
    cohort_key: str = "module_type"
    fast_degradation_threshold: float = -3.0
    factor_trend_lookback_days: int = 180


def _model(numeric: list[str], categorical: list[str], random_state: int) -> Pipeline:
    preprocessor = ColumnTransformer(
        transformers=[
            ("num", "passthrough", numeric),
            (
                "cat",
                OrdinalEncoder(
                    handle_unknown="use_encoded_value",
                    unknown_value=-1,
                    encoded_missing_value=-1,
                ),
                categorical,
            ),
        ],
        remainder="drop",
    )
    regressor = HistGradientBoostingRegressor(
        max_iter=220,
        learning_rate=0.06,
        max_leaf_nodes=31,
        l2_regularization=0.05,
        random_state=random_state,
    )
    return Pipeline([("preprocess", preprocessor), ("model", regressor)])


def _fit_predict(
    frame: pd.DataFrame,
    train_years: tuple[int, ...],
    eval_years: tuple[int, ...],
    include_module_temperature: bool,
    random_state: int,
):
    numeric, categorical = feature_columns(include_module_temperature)
    features = numeric + categorical
    train = frame[
        frame["year"].isin(train_years)
        & (~frame["curtailment_active"])
        & (~frame["baseline_excluded"])
    ].copy()
    if include_module_temperature:
        train = train.dropna(subset=["module_temperature", "temp_delta"])
    model = _model(numeric, categorical, random_state=random_state)
    model.fit(train[features], train["p_norm"])

    rows = []
    predictions = {}
    for year in eval_years:
        test = frame[frame["year"] == year].copy()
        if test.empty:
            continue
        pred = model.predict(test[features])
        predictions[year] = pred
        rows.append(
            {
                "year": int(year),
                "n": int(len(test)),
                "mae_norm": float(mean_absolute_error(test["p_norm"], pred)),
                "median_abs_error": float(np.median(np.abs(test["p_norm"] - pred))),
                "r2": float(r2_score(test["p_norm"], pred)),
            }
        )
    return model, pd.DataFrame(rows), predictions


def vet_baseline(frame: pd.DataFrame, train_years: tuple[int, ...]) -> tuple[pd.DataFrame, pd.DataFrame]:
    baseline = frame[
        frame["year"].isin(train_years)
        & (~frame["curtailment_active"])
        & (frame["irradiation"] > 200)
    ].copy()
    counts = baseline.groupby("inverter_id", observed=True).size().rename("sample_count")
    stats = baseline.groupby("inverter_id", observed=True).agg(
        median_p_norm=("p_norm", "median"),
        std_p_norm=("p_norm", "std"),
        mean_p_norm=("p_norm", "mean"),
        pdc_kwp=("pdc_kwp", "first"),
        module_type=("module_type", "first"),
        inverter_group=("inverter_group", "first"),
        capacity_band=("capacity_band", "first"),
    )
    stats = stats.join(counts)
    stats["peer_key"] = stats["module_type"].astype(str)
    peer_sizes = stats.groupby("peer_key")["median_p_norm"].transform("size")
    stats.loc[peer_sizes < 3, "peer_key"] = (
        stats.loc[peer_sizes < 3, "inverter_group"].astype(str)
        + ":"
        + stats.loc[peer_sizes < 3, "capacity_band"].astype(str)
    )
    stats["peer_median"] = stats.groupby("peer_key")["median_p_norm"].transform("median")
    stats["peer_delta"] = stats["median_p_norm"] - stats["peer_median"]
    stats["stability_score"] = stats["std_p_norm"].fillna(stats["std_p_norm"].median())
    stats["baseline_excluded"] = (
        (stats["peer_delta"] < -0.08)
        | (stats["sample_count"] < stats["sample_count"].median() * 0.35)
        | (stats["stability_score"] > stats["stability_score"].quantile(0.95))
    )
    flags = stats[["baseline_excluded"]].reset_index()
    out = frame.merge(flags, on="inverter_id", how="left")
    out["baseline_excluded"] = out["baseline_excluded"].fillna(False)
    return out, stats.reset_index()


def _add_sigma_bins(frame: pd.DataFrame) -> pd.DataFrame:
    out = frame.copy()
    out["irr_bin"] = pd.cut(
        out["irradiation"],
        bins=[100, 250, 450, 650, 850, np.inf],
        labels=["100-250", "250-450", "450-650", "650-850", "850+"],
        include_lowest=True,
    ).astype(str)
    out["alt_bin"] = pd.cut(
        out["sun_altitude"],
        bins=[8, 18, 30, 45, 60, np.inf],
        labels=["8-18", "18-30", "30-45", "45-60", "60+"],
        include_lowest=True,
    ).astype(str)
    out["sigma_key"] = out["irr_bin"] + "|" + out["alt_bin"]
    return out


def calibrate_sigma(
    frame: pd.DataFrame,
    calibration_years: tuple[int, ...],
    residual_col: str = "residual",
    sigma_col: str = "sigma",
    fallback_col: str = "fallback_sigma",
    clean_only: bool = False,
    non_warmup: bool = False,
) -> pd.DataFrame:
    cal = frame[
        frame["year"].isin(calibration_years)
        & (~frame["curtailment_active"])
        & (frame["p_pred_norm"] > 0.05)
    ].copy()
    if clean_only and "clean_for_factor" in cal.columns:
        cal = cal[cal["clean_for_factor"]].copy()
    if non_warmup and "warmup" in cal.columns:
        cal = cal[~cal["warmup"]].copy()
    cal = _add_sigma_bins(cal)
    sigma = (
        cal.groupby(["inverter_id", "sigma_key"], observed=True)[residual_col]
        .std()
        .reset_index(name=sigma_col)
    )
    sigma[sigma_col] = sigma[sigma_col].clip(lower=0.015)
    fallback = (
        cal.groupby("sigma_key", observed=True)[residual_col].std().reset_index(name=fallback_col)
    )
    fallback[fallback_col] = fallback[fallback_col].clip(lower=0.02)
    return sigma.merge(fallback, on="sigma_key", how="left")


def apply_sigma(
    frame: pd.DataFrame,
    sigma: pd.DataFrame,
    residual_col: str = "residual",
    z_col: str = "residual_z",
    sigma_col: str = "sigma",
    fallback_col: str = "fallback_sigma",
) -> pd.DataFrame:
    out = _add_sigma_bins(frame)
    out = out.merge(sigma, on=["inverter_id", "sigma_key"], how="left")
    out[sigma_col] = out[sigma_col].fillna(out[fallback_col]).fillna(0.05)
    out[z_col] = out[residual_col] / out[sigma_col]
    return out


def add_dc_diagnostic(frame: pd.DataFrame) -> pd.DataFrame:
    out = frame.copy()
    if "dc_norm" not in out.columns or "efficiency_proxy" not in out.columns:
        out["dc_diagnostic"] = "dc_unavailable"
        return out
    normal_dc = out["dc_norm"] >= np.maximum(out["p_pred_norm"] * 0.55, 0.06)
    low_eff = out["efficiency_proxy"] < 0.85
    low_dc = out["dc_norm"] < np.maximum(out["p_pred_norm"] * 0.45, 0.04)
    flag_col = "acute_residual_z" if "acute_residual_z" in out.columns else "residual_z"
    flagged = out[flag_col] <= -2
    out["dc_diagnostic"] = "not_flagged"
    out.loc[flagged & low_dc, "dc_diagnostic"] = "likely_dc_side_low_input"
    out.loc[flagged & normal_dc & low_eff, "dc_diagnostic"] = "likely_conversion_side"
    out.loc[flagged & normal_dc & ~low_eff, "dc_diagnostic"] = "ac_underperformance_unexplained"
    out.loc[out["curtailment_active"], "dc_diagnostic"] = "curtailment_overlay"
    return out


def _disabled_rolling(frame: pd.DataFrame) -> pd.DataFrame:
    dates = frame[["inverter_id", "date"]].drop_duplicates().copy()
    dates["factor"] = 1.0
    dates["relative_factor"] = 1.0
    dates["cohort_median_factor"] = 1.0
    dates["factor_slope_pct_yr"] = 0.0
    dates["fast_degradation"] = False
    dates["warmup"] = True
    dates["n_window_days"] = 0
    return dates


def apply_rolling_layer(
    frame: pd.DataFrame, meta: pd.DataFrame, config: TwinConfig
) -> tuple[pd.DataFrame, pd.DataFrame, pd.DataFrame]:
    out = frame.copy()
    rolling_enabled = config.use_rolling_layer and config.max_rows_per_year is None
    out["clean_for_factor"] = clean_day_filter(out)

    if rolling_enabled:
        daily = daily_clean_factor(out)
        roll = rolling_factor(
            daily,
            window_days=config.window_days,
            min_days=config.min_clean_days,
            clamp=config.clamp,
        )
        roll = fleet_relative_factor(roll, meta, cohort_key=config.cohort_key)
        trend = factor_trend(
            roll,
            lookback_days=config.factor_trend_lookback_days,
            fast_degradation_threshold=config.fast_degradation_threshold,
        )
        roll = roll.merge(trend, on=["inverter_id", "date"], how="left")
    else:
        daily = pd.DataFrame(
            columns=["inverter_id", "date", "factor_day", "n_clean_samples"]
        )
        roll = _disabled_rolling(out)

    all_dates = out[["inverter_id", "date"]].drop_duplicates().copy()
    all_dates["date_dt"] = pd.to_datetime(all_dates["date"])
    roll = roll.copy()
    if not roll.empty:
        roll["date_dt"] = pd.to_datetime(roll["date"])
    if isinstance(out["inverter_id"].dtype, pd.CategoricalDtype):
        inverter_dtype = out["inverter_id"].dtype
        all_dates["inverter_id"] = all_dates["inverter_id"].astype(inverter_dtype)
        if not roll.empty:
            roll["inverter_id"] = roll["inverter_id"].astype(inverter_dtype)
    all_dates = all_dates.sort_values(["inverter_id", "date_dt"])
    roll = roll.sort_values(["inverter_id", "date_dt"])
    factor_cols = [
        "inverter_id",
        "date",
        "factor",
        "relative_factor",
        "cohort_median_factor",
        "factor_slope_pct_yr",
        "fast_degradation",
        "warmup",
        "n_window_days",
    ]
    if rolling_enabled and not roll.empty:
        factor_daily = []
        for inverter_id, dates in all_dates.groupby("inverter_id", observed=True):
            inv_roll = roll[roll["inverter_id"] == inverter_id]
            merged = pd.merge_asof(
                dates.sort_values("date_dt"),
                inv_roll.drop(columns=["date"]).sort_values("date_dt"),
                on="date_dt",
                by="inverter_id",
                direction="backward",
            )
            merged["date"] = merged["date_dt"].dt.date.astype(str)
            factor_daily.append(merged)
        factor_daily = pd.concat(factor_daily, ignore_index=True)
    else:
        factor_daily = all_dates.merge(
            roll[factor_cols], on=["inverter_id", "date"], how="left"
        )

    defaults = {
        "factor": 1.0,
        "relative_factor": 1.0,
        "cohort_median_factor": 1.0,
        "factor_slope_pct_yr": 0.0,
        "fast_degradation": False,
        "warmup": True,
        "n_window_days": 0,
    }
    for col, value in defaults.items():
        if col not in factor_daily.columns:
            factor_daily[col] = value
        if col in {"fast_degradation", "warmup"}:
            factor_daily[col] = factor_daily[col].where(
                factor_daily[col].notna(), value
            )
        else:
            factor_daily[col] = factor_daily[col].fillna(value)
    factor_daily["fast_degradation"] = factor_daily["fast_degradation"].astype(bool)
    factor_daily["warmup"] = factor_daily["warmup"].astype(bool)
    factor_daily["n_window_days"] = factor_daily["n_window_days"].astype(int)

    factor_daily = factor_daily[factor_cols].drop_duplicates(["inverter_id", "date"])
    out = out.merge(factor_daily, on=["inverter_id", "date"], how="left")
    for col, value in defaults.items():
        if col in {"fast_degradation", "warmup"}:
            out[col] = out[col].where(out[col].notna(), value)
        else:
            out[col] = out[col].fillna(value)
    out["fast_degradation"] = out["fast_degradation"].astype(bool)
    out["warmup"] = out["warmup"].astype(bool)
    out["n_window_days"] = out["n_window_days"].astype(int)
    out["current_expected_norm"] = out["p_pred_norm"] * out["factor"]
    out["acute_residual"] = out["p_norm"] - out["current_expected_norm"]
    return out, factor_daily, daily


def degradation_summary(
    scored: pd.DataFrame, rolling_history: pd.DataFrame, config: TwinConfig
) -> pd.DataFrame:
    score = scored[scored["year"].isin(config.score_years)].copy()
    score["lost_kw"] = np.maximum(0, score["p_pred_norm"] * score["pdc_kwp"] - score["p_ac_kw"])
    score.loc[score["curtailment_active"], "lost_kw"] = 0
    score["lost_kwh"] = score["lost_kw"] * (5 / 60)
    lost = score.groupby("inverter_id", as_index=False, observed=True).agg(
        total_frozen_lost_kwh=("lost_kwh", "sum")
    )
    history = rolling_history.sort_values(["inverter_id", "date"]).copy()
    usable = history[~history["warmup"]].copy()
    if usable.empty:
        usable = history.copy()

    recent_rows = []
    recent_points = 30
    for inverter_id, group in usable.groupby("inverter_id", observed=True):
        recent = group.tail(recent_points).copy()
        slope = np.nan
        if len(recent) >= 3:
            dates = pd.to_datetime(recent["date"])
            x = (dates - dates.min()).dt.days.to_numpy(dtype=float)
            y = recent["factor"].to_numpy(dtype=float)
            if np.ptp(x) > 0 and np.isfinite(y).all():
                slope = float(np.polyfit(x, y, 1)[0] * 365 * 100)
        if not np.isfinite(slope):
            slope = float(recent["factor_slope_pct_yr"].dropna().tail(1).iloc[0]) if recent["factor_slope_pct_yr"].notna().any() else 0.0
        recent_rows.append(
            {
                "inverter_id": inverter_id,
                "date": recent["date"].iloc[-1],
                "latest_factor": float(recent["factor"].median()),
                "latest_relative_factor": float(recent["relative_factor"].median()),
                "degradation_rate_pct_per_year": slope,
                "fast_degradation": bool(slope < config.fast_degradation_threshold),
                "recent_factor_points": int(len(recent)),
            }
        )
    latest = pd.DataFrame(recent_rows)
    summary = latest.merge(lost, on="inverter_id", how="left")
    summary["total_frozen_lost_kwh"] = summary["total_frozen_lost_kwh"].fillna(0.0)
    summary = summary.sort_values(
        ["total_frozen_lost_kwh", "degradation_rate_pct_per_year"],
        ascending=[False, True],
    ).reset_index(drop=True)
    summary["rank"] = np.arange(1, len(summary) + 1)
    return summary[
        [
            "rank",
            "inverter_id",
            "date",
            "latest_factor",
            "latest_relative_factor",
            "degradation_rate_pct_per_year",
            "fast_degradation",
            "recent_factor_points",
            "total_frozen_lost_kwh",
        ]
    ]


def summarize_outputs(frame: pd.DataFrame, config: TwinConfig) -> dict[str, pd.DataFrame]:
    scored = frame.copy()
    scored["expected_kwh"] = scored["p_pred_norm"] * scored["pdc_kwp"] * (5 / 60)
    scored["current_expected_kwh"] = (
        scored["current_expected_norm"] * scored["pdc_kwp"] * (5 / 60)
    )
    scored["actual_kwh"] = scored["p_ac_kw"] * (5 / 60)
    scored["lost_kw"] = np.maximum(
        0, scored["p_pred_norm"] * scored["pdc_kwp"] - scored["p_ac_kw"]
    )
    scored.loc[scored["curtailment_active"], "lost_kw"] = 0
    scored["lost_kwh"] = scored["lost_kw"] * (5 / 60)
    scoreable = (~scored["curtailment_active"]) & (~scored["warmup"].fillna(True))
    scored["mild_anomaly"] = (scored["acute_residual_z"] <= config.mild_sigma) & scoreable
    scored["strong_anomaly"] = (
        scored["acute_residual_z"] <= config.strong_sigma
    ) & scoreable
    scored["outage"] = (
        (scored["p_pred_norm"] > 0.2)
        & (scored["p_norm"] < 0.02)
        & (~scored["curtailment_active"])
    )
    if "error_code" in scored.columns:
        scored["has_error_code"] = scored["error_code"].fillna(0) != 0
    else:
        scored["error_code"] = np.nan
        scored["has_error_code"] = False
    if "operational_state" in scored.columns:
        scored["has_operational_state"] = scored["operational_state"].notna()
    else:
        scored["operational_state"] = np.nan
        scored["has_operational_state"] = False
    scored["fault_explained_by_error"] = (
        (scored["mild_anomaly"] | scored["strong_anomaly"] | scored["outage"])
        & scored["has_error_code"]
    )
    scored["slow_degradation"] = (
        (scored["residual_z"] <= config.mild_sigma)
        & (scored["acute_residual_z"] > config.mild_sigma)
        & (~scored["curtailment_active"])
    )
    scored["event_type"] = np.select(
        [
            scored["outage"],
            scored["strong_anomaly"],
            scored["fast_degradation"].fillna(False),
            scored["slow_degradation"],
            scored["curtailment_active"],
        ],
        [
            "outage",
            "acute_fault",
            "fast_degradation",
            "slow_degradation",
            "curtailment",
        ],
        default="normal",
    )

    daily = scored.groupby(["date", "year", "inverter_id", "inverter_group"], observed=True).agg(
        expected_kwh=("expected_kwh", "sum"),
        current_expected_kwh=("current_expected_kwh", "sum"),
        actual_kwh=("actual_kwh", "sum"),
        lost_kwh=("lost_kwh", "sum"),
        mean_residual_z=("residual_z", "mean"),
        min_residual_z=("residual_z", "min"),
        mean_acute_residual_z=("acute_residual_z", "mean"),
        min_acute_residual_z=("acute_residual_z", "min"),
        mean_factor=("factor", "mean"),
        mean_relative_factor=("relative_factor", "mean"),
        strong_samples=("strong_anomaly", "sum"),
        outage_samples=("outage", "sum"),
        slow_degradation_samples=("slow_degradation", "sum"),
        fast_degradation_samples=("fast_degradation", "sum"),
        curtailed_samples=("curtailment_active", "sum"),
        error_samples=("has_error_code", "sum"),
        explained_fault_samples=("fault_explained_by_error", "sum"),
    ).reset_index()
    daily["sustained_underperformance"] = (
        daily["strong_samples"] >= config.sustained_samples_per_day
    )
    daily["event_type"] = np.select(
        [
            daily["outage_samples"] > 0,
            daily["strong_samples"] > 0,
            daily["fast_degradation_samples"] > 0,
            daily["slow_degradation_samples"] >= config.sustained_samples_per_day,
            daily["curtailed_samples"] > 0,
        ],
        [
            "outage",
            "acute_fault",
            "fast_degradation",
            "slow_degradation",
            "curtailment",
        ],
        default="normal",
    )

    monthly = scored.groupby(["year", "month", "inverter_id", "inverter_group"], observed=True).agg(
        lost_kwh=("lost_kwh", "sum"),
        mean_residual_z=("residual_z", "mean"),
        min_residual_z=("residual_z", "min"),
        mean_acute_residual_z=("acute_residual_z", "mean"),
        min_acute_residual_z=("acute_residual_z", "min"),
        mean_factor=("factor", "mean"),
        mean_relative_factor=("relative_factor", "mean"),
        strong_samples=("strong_anomaly", "sum"),
        outage_samples=("outage", "sum"),
        slow_degradation_samples=("slow_degradation", "sum"),
        fast_degradation_samples=("fast_degradation", "sum"),
        curtailed_samples=("curtailment_active", "sum"),
        error_samples=("has_error_code", "sum"),
        explained_fault_samples=("fault_explained_by_error", "sum"),
    ).reset_index()

    plant_daily = scored.groupby(["date", "year"], observed=True).agg(
        expected_kwh=("expected_kwh", "sum"),
        actual_kwh=("actual_kwh", "sum"),
        lost_kwh=("lost_kwh", "sum"),
        strong_samples=("strong_anomaly", "sum"),
        outage_samples=("outage", "sum"),
        slow_degradation_samples=("slow_degradation", "sum"),
        fast_degradation_samples=("fast_degradation", "sum"),
        error_samples=("has_error_code", "sum"),
        explained_fault_samples=("fault_explained_by_error", "sum"),
    ).reset_index()

    rankings = monthly.groupby("inverter_id", observed=True).agg(
        total_lost_kwh=("lost_kwh", "sum"),
        worst_residual_z=("min_residual_z", "min"),
        worst_acute_residual_z=("min_acute_residual_z", "min"),
        latest_mean_factor=("mean_factor", "last"),
        latest_mean_relative_factor=("mean_relative_factor", "last"),
        strong_samples=("strong_samples", "sum"),
        outage_samples=("outage_samples", "sum"),
        slow_degradation_samples=("slow_degradation_samples", "sum"),
        fast_degradation_samples=("fast_degradation_samples", "sum"),
        error_samples=("error_samples", "sum"),
        explained_fault_samples=("explained_fault_samples", "sum"),
    ).sort_values("total_lost_kwh", ascending=False).reset_index()

    events = daily[
        daily["sustained_underperformance"]
        | (daily["outage_samples"] > 0)
        | (daily["fast_degradation_samples"] > 0)
        | (daily["slow_degradation_samples"] >= config.sustained_samples_per_day)
    ].sort_values(["lost_kwh", "strong_samples"], ascending=False)

    sample_cols = [
        "timestamp",
        "inverter_id",
        "p_ac_kw",
        "p_norm",
        "p_pred_norm",
        "current_expected_norm",
        "residual",
        "residual_z",
        "acute_residual",
        "acute_residual_z",
        "factor",
        "relative_factor",
        "factor_slope_pct_yr",
        "lost_kw",
        "event_type",
        "curtailment_active",
        "error_code",
        "operational_state",
        "fault_explained_by_error",
        "dc_diagnostic",
    ]
    top_samples = scored.sort_values("acute_residual_z").head(5000)[sample_cols]
    return {
        "daily_inverter_scores": daily,
        "monthly_inverter_scores": monthly,
        "plant_daily_scores": plant_daily,
        "inverter_rankings": rankings,
        "anomaly_events": events,
        "top_anomaly_samples": top_samples,
    }


def run_pipeline(config: TwinConfig, output_dir: Path, artifact_dir: Path) -> dict:
    output_dir.mkdir(parents=True, exist_ok=True)
    artifact_dir.mkdir(parents=True, exist_ok=True)

    frame, meta = build_long_frame(
        max_inverters=config.max_inverters,
        include_dc=True,
        max_rows_per_year=config.max_rows_per_year,
        random_state=config.random_state,
    )
    frame, baseline_stats = vet_baseline(frame, config.train_years)

    eval_years = config.calibration_years + config.score_years
    full_model, full_metrics, _ = _fit_predict(
        frame,
        config.train_years,
        eval_years,
        include_module_temperature=True,
        random_state=config.random_state,
    )
    exog_model, exog_metrics, _ = _fit_predict(
        frame,
        config.train_years,
        eval_years,
        include_module_temperature=False,
        random_state=config.random_state,
    )
    full_cal_mae = full_metrics[full_metrics["year"].isin(config.calibration_years)][
        "mae_norm"
    ].mean()
    exog_cal_mae = exog_metrics[exog_metrics["year"].isin(config.calibration_years)][
        "mae_norm"
    ].mean()
    use_exogenous = exog_cal_mae <= full_cal_mae * 1.05 + 0.002
    selected_model = exog_model if use_exogenous else full_model
    include_module_temperature = not use_exogenous
    numeric, categorical = feature_columns(include_module_temperature)
    features = numeric + categorical

    frame["p_pred_norm"] = selected_model.predict(frame[features])
    frame["residual"] = frame["p_norm"] - frame["p_pred_norm"]
    frame, rolling_history, clean_daily_factors = apply_rolling_layer(frame, meta, config)
    sigma = calibrate_sigma(frame, config.calibration_years)
    scored = apply_sigma(frame, sigma)
    acute_sigma = calibrate_sigma(
        scored,
        config.calibration_years,
        residual_col="acute_residual",
        sigma_col="acute_sigma",
        fallback_col="fallback_acute_sigma",
        clean_only=True,
        non_warmup=True,
    )
    scored = apply_sigma(
        scored,
        acute_sigma,
        residual_col="acute_residual",
        z_col="acute_residual_z",
        sigma_col="acute_sigma",
        fallback_col="fallback_acute_sigma",
    )
    scored = add_dc_diagnostic(scored)

    outputs = summarize_outputs(scored[scored["year"].isin(config.score_years)], config)
    outputs["rolling_factor_history"] = rolling_history[
        [
            "inverter_id",
            "date",
            "factor",
            "relative_factor",
            "cohort_median_factor",
            "factor_slope_pct_yr",
            "fast_degradation",
            "warmup",
            "n_window_days",
        ]
    ]
    outputs["degradation_summary"] = degradation_summary(scored, rolling_history, config)
    for name, table in outputs.items():
        table.to_csv(output_dir / f"{name}.csv", index=False)

    meta.to_csv(output_dir / "inverter_metadata.csv", index=False)
    baseline_stats.to_csv(output_dir / "baseline_vetting.csv", index=False)
    sigma.to_csv(output_dir / "sigma_calibration.csv", index=False)
    acute_sigma.to_csv(output_dir / "acute_sigma_calibration.csv", index=False)
    clean_daily_factors.to_csv(output_dir / "clean_daily_factors.csv", index=False)
    full_metrics.to_csv(output_dir / "metrics_with_module_temperature.csv", index=False)
    exog_metrics.to_csv(output_dir / "metrics_exogenous_only.csv", index=False)
    joblib.dump(selected_model, artifact_dir / "ac_twin_model.joblib")

    metrics = {
        "selected_model": "exogenous_only" if use_exogenous else "with_module_temperature",
        "train_years": list(config.train_years),
        "calibration_years": list(config.calibration_years),
        "score_years": list(config.score_years),
        "max_inverters": config.max_inverters,
        "max_rows_per_year": config.max_rows_per_year,
        "rolling_layer_enabled": bool(
            config.use_rolling_layer and config.max_rows_per_year is None
        ),
        "rolling_window_days": config.window_days,
        "rolling_min_clean_days": config.min_clean_days,
        "rolling_clamp": list(config.clamp),
        "rolling_cohort_key": config.cohort_key,
        "rows_used": int(len(frame)),
        "baseline_excluded_inverters": baseline_stats[
            baseline_stats["baseline_excluded"]
        ]["inverter_id"].tolist(),
        "calibration_mae_with_module_temperature": float(full_cal_mae),
        "calibration_mae_exogenous_only": float(exog_cal_mae),
        "full_metrics": full_metrics.to_dict(orient="records"),
        "exogenous_metrics": exog_metrics.to_dict(orient="records"),
    }
    with open(artifact_dir / "metrics.json", "w", encoding="utf-8") as f:
        json.dump(metrics, f, indent=2)
    with open(output_dir / "run_summary.json", "w", encoding="utf-8") as f:
        json.dump(metrics, f, indent=2)
    return metrics
