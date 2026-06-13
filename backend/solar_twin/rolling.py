from __future__ import annotations

import numpy as np
import pandas as pd

"""
Rolling health layer for the frozen AC twin.

The frozen model remains the healthy 2017 reference. This module adds a
multiplicative, causal slow-health factor on top of that frozen prediction so
the pipeline can separate total decline versus the healthy baseline from acute
new faults. Clean-day gating must never use frozen residuals or z-scores:
otherwise persistent degradation would be labeled unclean and the factor would
be unable to learn the real slow health state.
"""


def clean_day_filter(frame: pd.DataFrame) -> pd.Series:
    """Return rows usable for slow-factor estimation without residual gating."""
    clean = (
        frame["curtailment_active"].fillna(False).eq(False)
        & frame["p_norm"].notna()
        & frame["p_pred_norm"].notna()
        & frame["p_ac_kw"].notna()
        & frame["pdc_kwp"].notna()
        & (frame["p_pred_norm"] > 0.05)
    )
    if "error_code" in frame.columns:
        clean &= frame["error_code"].fillna(0).eq(0)
    outage = (frame["p_pred_norm"] > 0.2) & (frame["p_norm"] < 0.02)
    return clean & ~outage


def daily_clean_factor(
    frame: pd.DataFrame,
    min_clean_samples: int = 20,
    min_expected_kwh_frac: float = 0.15,
) -> pd.DataFrame:
    clean = clean_day_filter(frame)
    rows = frame.loc[clean].copy()
    if rows.empty:
        return pd.DataFrame(
            columns=["inverter_id", "date", "factor_day", "n_clean_samples"]
        )

    rows["actual_kwh_clean"] = rows["p_ac_kw"] * (5 / 60)
    rows["expected_kwh_clean"] = rows["p_pred_norm"] * rows["pdc_kwp"] * (5 / 60)
    daily = rows.groupby(["inverter_id", "date"], as_index=False).agg(
        actual_kwh_clean=("actual_kwh_clean", "sum"),
        expected_kwh_clean=("expected_kwh_clean", "sum"),
        n_clean_samples=("timestamp", "count"),
    )
    daily = daily[
        (daily["n_clean_samples"] >= min_clean_samples)
        & (daily["expected_kwh_clean"] > 0)
    ].copy()
    if daily.empty:
        return daily.assign(factor_day=pd.Series(dtype=float))[
            ["inverter_id", "date", "factor_day", "n_clean_samples"]
        ]

    median_expected = daily.groupby("inverter_id")["expected_kwh_clean"].transform(
        "median"
    )
    daily = daily[
        daily["expected_kwh_clean"] >= min_expected_kwh_frac * median_expected
    ].copy()
    daily["factor_day"] = (
        daily["actual_kwh_clean"] / daily["expected_kwh_clean"]
    ).replace([np.inf, -np.inf], np.nan)
    daily = daily.dropna(subset=["factor_day"])
    return daily[["inverter_id", "date", "factor_day", "n_clean_samples"]]


def rolling_factor(
    daily: pd.DataFrame,
    window_days: int = 45,
    min_days: int = 10,
    clamp: tuple[float, float] = (0.5, 1.1),
) -> pd.DataFrame:
    if daily.empty:
        return pd.DataFrame(
            columns=["inverter_id", "date", "factor", "warmup", "n_window_days"]
        )

    pieces = []
    window = f"{int(window_days)}D"
    for inverter_id, group in daily.copy().groupby("inverter_id"):
        group = group.sort_values("date").copy()
        group["date"] = pd.to_datetime(group["date"])
        indexed = group.set_index("date")
        rolled = indexed["factor_day"].rolling(window=window, min_periods=1)
        factor = rolled.median()
        count = rolled.count()
        out = pd.DataFrame(
            {
                "inverter_id": inverter_id,
                "date": factor.index.astype(str),
                "factor": factor.to_numpy(),
                "n_window_days": count.to_numpy().astype(int),
            }
        )
        out["warmup"] = out["n_window_days"] < min_days
        out.loc[out["warmup"], "factor"] = 1.0
        out["factor"] = out["factor"].clip(lower=clamp[0], upper=clamp[1])
        pieces.append(out)
    return pd.concat(pieces, ignore_index=True)


def fleet_relative_factor(
    rolling: pd.DataFrame,
    frame_meta: pd.DataFrame,
    cohort_key: str = "module_type",
    min_cohort: int = 4,
) -> pd.DataFrame:
    if rolling.empty:
        return rolling.assign(
            cohort_median_factor=pd.Series(dtype=float),
            relative_factor=pd.Series(dtype=float),
        )

    meta_cols = ["inverter_id", cohort_key, "capacity_band"]
    meta_cols = [col for col in meta_cols if col in frame_meta.columns]
    out = rolling.merge(
        frame_meta[meta_cols].drop_duplicates("inverter_id"),
        on="inverter_id",
        how="left",
    )

    fleet_median = out.groupby("date")["factor"].transform("median")
    out["cohort_median_factor"] = np.nan

    if cohort_key in out.columns:
        cohort_group = out.groupby(["date", cohort_key])["factor"]
        cohort_count = cohort_group.transform("count")
        cohort_median = cohort_group.transform("median")
        use_cohort = cohort_count >= min_cohort
        out.loc[use_cohort, "cohort_median_factor"] = cohort_median.loc[use_cohort]

    if "capacity_band" in out.columns:
        band_group = out.groupby(["date", "capacity_band"])["factor"]
        band_count = band_group.transform("count")
        band_median = band_group.transform("median")
        use_band = out["cohort_median_factor"].isna() & (band_count >= min_cohort)
        out.loc[use_band, "cohort_median_factor"] = band_median.loc[use_band]

    out["cohort_median_factor"] = out["cohort_median_factor"].fillna(fleet_median)
    out["relative_factor"] = out["factor"] / out["cohort_median_factor"].replace(0, np.nan)
    return out.drop(columns=[col for col in [cohort_key, "capacity_band"] if col in out])


def factor_trend(
    rolling: pd.DataFrame,
    lookback_days: int = 180,
    fast_degradation_threshold: float = -3.0,
) -> pd.DataFrame:
    if rolling.empty:
        return pd.DataFrame(
            columns=[
                "inverter_id",
                "date",
                "factor_slope_pct_yr",
                "fast_degradation",
            ]
        )

    rows = []
    lookback = pd.Timedelta(days=lookback_days)
    for inverter_id, group in rolling.groupby("inverter_id"):
        group = group.sort_values("date").copy()
        group["date_dt"] = pd.to_datetime(group["date"])
        for _, row in group.iterrows():
            start = row["date_dt"] - lookback
            window = group[(group["date_dt"] >= start) & (group["date_dt"] <= row["date_dt"])]
            window = window[~window["warmup"] & window["factor"].notna()]
            slope = np.nan
            if len(window) >= 10:
                x = (window["date_dt"] - window["date_dt"].min()).dt.days.to_numpy(
                    dtype=float
                )
                y = window["factor"].to_numpy(dtype=float)
                if np.ptp(x) > 0 and np.isfinite(y).all():
                    slope = float(np.polyfit(x, y, 1)[0] * 365 * 100)
            rows.append(
                {
                    "inverter_id": inverter_id,
                    "date": row["date"],
                    "factor_slope_pct_yr": slope,
                    "fast_degradation": bool(
                        np.isfinite(slope) and slope < fast_degradation_threshold
                    ),
                }
            )
    return pd.DataFrame(rows)
