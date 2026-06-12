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


def _model(numeric: list[str], categorical: list[str]) -> Pipeline:
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
        random_state=42,
    )
    return Pipeline([("preprocess", preprocessor), ("model", regressor)])


def _fit_predict(
    frame: pd.DataFrame,
    train_years: tuple[int, ...],
    eval_years: tuple[int, ...],
    include_module_temperature: bool,
):
    numeric, categorical = feature_columns(include_module_temperature)
    features = numeric + categorical
    train = frame[
        frame["year"].isin(train_years)
        & (~frame["curtailment_active"])
        & (~frame["baseline_excluded"])
    ].copy()
    model = _model(numeric, categorical)
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
    counts = baseline.groupby("inverter_id").size().rename("sample_count")
    stats = baseline.groupby("inverter_id").agg(
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


def calibrate_sigma(frame: pd.DataFrame, calibration_years: tuple[int, ...]) -> pd.DataFrame:
    cal = frame[
        frame["year"].isin(calibration_years)
        & (~frame["curtailment_active"])
        & (frame["p_pred_norm"] > 0.05)
    ].copy()
    cal = _add_sigma_bins(cal)
    sigma = (
        cal.groupby(["inverter_id", "sigma_key"])["residual"]
        .std()
        .reset_index(name="sigma")
    )
    sigma["sigma"] = sigma["sigma"].clip(lower=0.015)
    fallback = (
        cal.groupby("sigma_key")["residual"].std().reset_index(name="fallback_sigma")
    )
    fallback["fallback_sigma"] = fallback["fallback_sigma"].clip(lower=0.02)
    return sigma.merge(fallback, on="sigma_key", how="left")


def apply_sigma(frame: pd.DataFrame, sigma: pd.DataFrame) -> pd.DataFrame:
    out = _add_sigma_bins(frame)
    out = out.merge(sigma, on=["inverter_id", "sigma_key"], how="left")
    out["sigma"] = out["sigma"].fillna(out["fallback_sigma"]).fillna(0.05)
    out["residual_z"] = out["residual"] / out["sigma"]
    return out


def add_dc_diagnostic(frame: pd.DataFrame) -> pd.DataFrame:
    out = frame.copy()
    if "dc_norm" not in out.columns or "efficiency_proxy" not in out.columns:
        out["dc_diagnostic"] = "dc_unavailable"
        return out
    normal_dc = out["dc_norm"] >= np.maximum(out["p_pred_norm"] * 0.55, 0.06)
    low_eff = out["efficiency_proxy"] < 0.85
    low_dc = out["dc_norm"] < np.maximum(out["p_pred_norm"] * 0.45, 0.04)
    flagged = out["residual_z"] <= -2
    out["dc_diagnostic"] = "not_flagged"
    out.loc[flagged & low_dc, "dc_diagnostic"] = "likely_dc_side_low_input"
    out.loc[flagged & normal_dc & low_eff, "dc_diagnostic"] = "likely_conversion_side"
    out.loc[flagged & normal_dc & ~low_eff, "dc_diagnostic"] = "ac_underperformance_unexplained"
    out.loc[out["curtailment_active"], "dc_diagnostic"] = "curtailment_overlay"
    return out


def summarize_outputs(frame: pd.DataFrame, config: TwinConfig) -> dict[str, pd.DataFrame]:
    scored = frame.copy()
    scored["lost_kw"] = np.maximum(
        0, scored["p_pred_norm"] * scored["pdc_kwp"] - scored["p_ac_kw"]
    )
    scored.loc[scored["curtailment_active"], "lost_kw"] = 0
    scored["lost_kwh"] = scored["lost_kw"] * (5 / 60)
    scored["mild_anomaly"] = (scored["residual_z"] <= config.mild_sigma) & (
        ~scored["curtailment_active"]
    )
    scored["strong_anomaly"] = (scored["residual_z"] <= config.strong_sigma) & (
        ~scored["curtailment_active"]
    )
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

    daily = scored.groupby(["date", "year", "inverter_id", "inverter_group"]).agg(
        expected_kwh=("p_pred_norm", lambda s: float(np.sum(s * scored.loc[s.index, "pdc_kwp"] * (5 / 60)))),
        actual_kwh=("p_ac_kw", lambda s: float(np.sum(s * (5 / 60)))),
        lost_kwh=("lost_kwh", "sum"),
        mean_residual_z=("residual_z", "mean"),
        min_residual_z=("residual_z", "min"),
        strong_samples=("strong_anomaly", "sum"),
        outage_samples=("outage", "sum"),
        curtailed_samples=("curtailment_active", "sum"),
        error_samples=("has_error_code", "sum"),
        explained_fault_samples=("fault_explained_by_error", "sum"),
    ).reset_index()
    daily["sustained_underperformance"] = (
        daily["strong_samples"] >= config.sustained_samples_per_day
    )

    monthly = scored.groupby(["year", "month", "inverter_id", "inverter_group"]).agg(
        lost_kwh=("lost_kwh", "sum"),
        mean_residual_z=("residual_z", "mean"),
        min_residual_z=("residual_z", "min"),
        strong_samples=("strong_anomaly", "sum"),
        outage_samples=("outage", "sum"),
        curtailed_samples=("curtailment_active", "sum"),
        error_samples=("has_error_code", "sum"),
        explained_fault_samples=("fault_explained_by_error", "sum"),
    ).reset_index()

    plant_daily = scored.groupby(["date", "year"]).agg(
        expected_kwh=("p_pred_norm", lambda s: float(np.sum(s * scored.loc[s.index, "pdc_kwp"] * (5 / 60)))),
        actual_kwh=("p_ac_kw", lambda s: float(np.sum(s * (5 / 60)))),
        lost_kwh=("lost_kwh", "sum"),
        strong_samples=("strong_anomaly", "sum"),
        outage_samples=("outage", "sum"),
        error_samples=("has_error_code", "sum"),
        explained_fault_samples=("fault_explained_by_error", "sum"),
    ).reset_index()

    rankings = monthly.groupby("inverter_id").agg(
        total_lost_kwh=("lost_kwh", "sum"),
        worst_residual_z=("min_residual_z", "min"),
        strong_samples=("strong_samples", "sum"),
        outage_samples=("outage_samples", "sum"),
        error_samples=("error_samples", "sum"),
        explained_fault_samples=("explained_fault_samples", "sum"),
    ).sort_values("total_lost_kwh", ascending=False).reset_index()

    events = daily[
        daily["sustained_underperformance"] | (daily["outage_samples"] > 0)
    ].sort_values(["lost_kwh", "strong_samples"], ascending=False)

    sample_cols = [
        "timestamp",
        "inverter_id",
        "p_ac_kw",
        "p_norm",
        "p_pred_norm",
        "residual",
        "residual_z",
        "lost_kw",
        "curtailment_active",
        "error_code",
        "operational_state",
        "fault_explained_by_error",
        "dc_diagnostic",
    ]
    top_samples = scored.sort_values("residual_z").head(5000)[sample_cols]
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
        frame, config.train_years, eval_years, include_module_temperature=True
    )
    exog_model, exog_metrics, _ = _fit_predict(
        frame, config.train_years, eval_years, include_module_temperature=False
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
    sigma = calibrate_sigma(frame, config.calibration_years)
    scored = apply_sigma(frame, sigma)
    scored = add_dc_diagnostic(scored)

    outputs = summarize_outputs(scored[scored["year"].isin(config.score_years)], config)
    for name, table in outputs.items():
        table.to_csv(output_dir / f"{name}.csv", index=False)

    meta.to_csv(output_dir / "inverter_metadata.csv", index=False)
    baseline_stats.to_csv(output_dir / "baseline_vetting.csv", index=False)
    sigma.to_csv(output_dir / "sigma_calibration.csv", index=False)
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
