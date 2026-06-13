from __future__ import annotations

import re
import math
from dataclasses import dataclass
from pathlib import Path

import numpy as np
import pandas as pd
import pyarrow.parquet as pq


ROOT = Path(__file__).resolve().parents[2]
PLANT_A_MAIN = ROOT / "Data/Plant_A/Main-monitoring-data/main_monitoring_data.parquet"
PLANT_A_ERRORS = ROOT / "Data/Plant_A/Errorcodes/errorcodes.parquet"
PLANT_A_SYSTEM = ROOT / "Data/Plant_A/Additional_Data/System_Overview.xlsx"

ENV_COLUMNS = {
    "irradiation": "Plant / Irradiation_average (W/m²)",
    "sun_altitude": "Plant / Altitude (°)",
    "ambient_temperature": "Temperature Sensor / Ambient (°C)",
    "module_temperature": "Temperature Sensor / Module (°C)",
    "dv": "DRD11A / DV (%)",
    "evu": "DRD11A / EVU (%)",
}


@dataclass(frozen=True)
class InverterColumns:
    inverter_id: str
    p_ac: str
    u_dc: str | None
    i_dc: str | None


def plant_a_columns(path: Path = PLANT_A_MAIN) -> list[str]:
    return pq.ParquetFile(path).schema.names


def inverter_columns(path: Path = PLANT_A_MAIN) -> list[InverterColumns]:
    columns = plant_a_columns(path)
    p_ac_cols = sorted(
        c for c in columns if c.startswith("INV ") and c.endswith("/ P_AC (kW)")
    )
    by_id: list[InverterColumns] = []
    for p_ac in p_ac_cols:
        inverter_id = p_ac.split(" / ")[0]
        by_id.append(
            InverterColumns(
                inverter_id=inverter_id,
                p_ac=p_ac,
                u_dc=f"{inverter_id} / U_DC (V)"
                if f"{inverter_id} / U_DC (V)" in columns
                else None,
                i_dc=f"{inverter_id} / I_DC_SUM (A)"
                if f"{inverter_id} / I_DC_SUM (A)" in columns
                else None,
            )
        )
    return by_id


def _normalize_wr_id(value: object) -> str | None:
    numbers = re.findall(r"\d+", str(value))
    if len(numbers) < 3:
        return None
    return f"INV {int(numbers[0]):02d}.{int(numbers[1]):02d}.{int(numbers[2]):03d}"


def load_system_overview(
    path: Path = PLANT_A_SYSTEM, measured_ids: list[str] | None = None
) -> pd.DataFrame:
    raw = pd.read_excel(path, sheet_name=0, header=None)
    header_idx = None
    for idx, row in raw.iterrows():
        values = [str(x).strip() for x in row.tolist()]
        if "Description" in values and "WR-Type" in values:
            header_idx = idx
            break
    if header_idx is None:
        raise ValueError(f"Could not find system overview header row in {path}")

    headers = [
        str(value).strip() if pd.notna(value) else f"col_{idx}"
        for idx, value in enumerate(raw.iloc[header_idx].tolist())
    ]
    meta = raw.iloc[header_idx + 1 :].copy()
    meta.columns = headers
    meta = meta[meta["WR-Type"].astype(str).str.contains("Inverter", na=False)].copy()
    meta["inverter_id"] = meta["Description"].map(_normalize_wr_id)
    meta = meta[meta["inverter_id"].notna()].copy()

    # Plant A has one split/extra overview row that is not represented as a
    # separate monitoring inverter. Drop it when aligning metadata to sensors.
    if measured_ids is not None and len(meta) == len(measured_ids) + 1:
        split_row = meta["Description"].astype(str).str.contains(
            "004.02", regex=False, na=False
        )
        if split_row.any():
            meta = meta[~split_row].copy()

    rename = {
        "PDC (kWp)": "pdc_kwp",
        "Module Type": "module_type",
        "Manufacturer": "manufacturer",
        "kWp Module": "module_wattage",
        "Wp Module": "module_wattage",
        "Modules": "modules",
        "Strings": "strings",
        "Modules/String": "modules_per_string",
    }
    meta = meta.rename(columns={k: v for k, v in rename.items() if k in meta.columns})
    for numeric in ["pdc_kwp", "module_wattage", "modules", "strings", "modules_per_string"]:
        if numeric in meta.columns:
            meta[numeric] = pd.to_numeric(meta[numeric], errors="coerce")

    keep = [
        "inverter_id",
        "pdc_kwp",
        "module_type",
        "manufacturer",
        "module_wattage",
        "modules",
        "strings",
        "modules_per_string",
    ]
    for col in keep:
        if col not in meta.columns:
            meta[col] = np.nan
    meta = meta[keep].drop_duplicates("inverter_id", keep="first")

    if measured_ids is not None:
        missing = sorted(set(measured_ids) - set(meta["inverter_id"]))
        if missing:
            raise ValueError(f"Missing system overview metadata for {missing[:8]}")
        meta = meta.set_index("inverter_id").loc[measured_ids].reset_index()

    meta["inverter_group"] = meta["inverter_id"].str.rsplit(".", n=1).str[0]
    meta["capacity_band"] = pd.cut(
        meta["pdc_kwp"],
        bins=[0, 10, 20, 27, 31, np.inf],
        labels=["tiny", "small", "medium", "standard", "large"],
        include_lowest=True,
    ).astype(str)
    return meta


def select_inverters(max_inverters: int | None = None) -> list[InverterColumns]:
    columns = inverter_columns()
    if max_inverters and max_inverters > 0:
        return columns[:max_inverters]
    return columns


def _load_error_wide(
    inverters: list[InverterColumns], timestamps: pd.Series | None = None
) -> pd.DataFrame:
    error_cols = []
    for inv in inverters:
        error_cols.append(f"{inv.inverter_id} / Error")
        error_cols.append(f"{inv.inverter_id} / Operational State")
    available = set(pq.ParquetFile(PLANT_A_ERRORS).schema.names)
    cols = [col for col in error_cols if col in available]
    errors = pd.read_parquet(PLANT_A_ERRORS, columns=cols)
    errors["timestamp"] = pd.to_datetime(errors.index, errors="coerce")
    if timestamps is not None:
        keep = pd.Index(pd.to_datetime(timestamps, errors="coerce"))
        errors = errors[errors["timestamp"].isin(keep)].copy()
    return errors.reset_index(drop=True)


def load_wide_frame(inverters: list[InverterColumns], include_dc: bool = True) -> pd.DataFrame:
    cols = list(ENV_COLUMNS.values()) + [inv.p_ac for inv in inverters]
    if include_dc:
        cols += [inv.u_dc for inv in inverters if inv.u_dc]
        cols += [inv.i_dc for inv in inverters if inv.i_dc]
    df = pd.read_parquet(PLANT_A_MAIN, columns=cols)
    df = df.rename(columns={source: target for target, source in ENV_COLUMNS.items()})
    float_cols = df.select_dtypes("float64").columns
    df[float_cols] = df[float_cols].astype("float32")
    df["timestamp"] = pd.to_datetime(df.index, errors="coerce")
    return df


def add_time_features(df: pd.DataFrame) -> pd.DataFrame:
    ts = df["timestamp"]
    hour_float = ts.dt.hour + ts.dt.minute / 60.0
    day_of_year = ts.dt.dayofyear.astype(float)
    out = df.copy()
    out["year"] = ts.dt.year
    out["date"] = ts.dt.date.astype(str)
    out["month"] = ts.dt.month
    out["hour"] = hour_float
    out["sin_hour"] = np.sin(2 * np.pi * hour_float / 24)
    out["cos_hour"] = np.cos(2 * np.pi * hour_float / 24)
    out["sin_doy"] = np.sin(2 * np.pi * day_of_year / 366)
    out["cos_doy"] = np.cos(2 * np.pi * day_of_year / 366)
    out["temp_delta"] = out["module_temperature"] - out["ambient_temperature"]
    out["curtailment_active"] = (
        out[["dv", "evu"]].fillna(0).max(axis=1) > 0
    )
    return out


def build_long_frame(
    max_inverters: int | None = None,
    include_dc: bool = True,
    include_errors: bool = True,
    max_rows_per_year: int | None = None,
    random_state: int = 42,
) -> tuple[pd.DataFrame, pd.DataFrame]:
    inverters = select_inverters(max_inverters)
    measured_ids = [inv.inverter_id for inv in inverters]
    meta = load_system_overview(measured_ids=measured_ids)
    wide = add_time_features(load_wide_frame(inverters, include_dc=include_dc))
    wide = wide[(wide["irradiation"] > 100) & (wide["sun_altitude"] > 8)].copy()
    if max_rows_per_year and max_rows_per_year > 0:
        wide_rows_per_year = max(
            1, math.ceil((max_rows_per_year / max(len(inverters), 1)) * 1.6)
        )
        sampled_wide = []
        for _, frame in wide.groupby("year"):
            sampled_wide.append(
                frame.sample(min(len(frame), wide_rows_per_year), random_state=random_state)
            )
        wide = pd.concat(sampled_wide, ignore_index=True)
    errors = _load_error_wide(inverters, wide["timestamp"]) if include_errors else None
    if include_errors and errors is not None:
        errors = (
            wide[["timestamp"]].reset_index(drop=True)
            .merge(errors.drop_duplicates("timestamp"), on="timestamp", how="left")
        )

    base_cols = [
        "timestamp",
        "year",
        "date",
        "month",
        "hour",
        "sin_hour",
        "cos_hour",
        "sin_doy",
        "cos_doy",
        "irradiation",
        "sun_altitude",
        "ambient_temperature",
        "module_temperature",
        "temp_delta",
        "dv",
        "evu",
        "curtailment_active",
    ]
    parts = []
    meta_by_id = meta.set_index("inverter_id")
    required = [
        "irradiation",
        "sun_altitude",
        "ambient_temperature",
        "module_temperature",
        "p_norm",
        "pdc_kwp",
    ]
    for inv in inverters:
        part = wide[base_cols + [inv.p_ac]].rename(columns={inv.p_ac: "p_ac_kw"}).copy()
        part["inverter_id"] = inv.inverter_id
        if include_dc and inv.u_dc and inv.i_dc:
            part["u_dc_v"] = wide[inv.u_dc]
            part["i_dc_a"] = wide[inv.i_dc]
        if include_errors and errors is not None:
            error_col = f"{inv.inverter_id} / Error"
            state_col = f"{inv.inverter_id} / Operational State"
            if error_col in errors.columns:
                part["error_code"] = errors[error_col].to_numpy()
            if state_col in errors.columns:
                part["operational_state"] = errors[state_col].to_numpy()
        meta_row = meta_by_id.loc[inv.inverter_id]
        for col in meta.columns:
            if col != "inverter_id":
                part[col] = meta_row[col]
        part["pdc_kwp"] = part["pdc_kwp"].astype("float64")
        part["p_norm"] = part["p_ac_kw"] / part["pdc_kwp"]
        if include_dc and {"u_dc_v", "i_dc_a"}.issubset(part.columns):
            part["p_dc_kw"] = part["u_dc_v"] * part["i_dc_a"] / 1000
            part["efficiency_proxy"] = part["p_ac_kw"] / part["p_dc_kw"].replace(0, np.nan)
            part["dc_norm"] = part["p_dc_kw"] / part["pdc_kwp"]
        part = part[
            (part["irradiation"] > 100)
            & (part["sun_altitude"] > 8)
            & part["p_norm"].notna()
            & np.isfinite(part["p_norm"])
            & (part["p_norm"] >= 0)
            & (part["p_norm"] < 1.3)
        ].dropna(subset=required)
        parts.append(part)

    long = pd.concat(parts, ignore_index=True)
    for col in ["inverter_id", "inverter_group", "module_type", "manufacturer", "capacity_band"]:
        long[col] = long[col].astype("category")

    if max_rows_per_year and max_rows_per_year > 0 and len(long) > max_rows_per_year * long["year"].nunique():
        sampled = []
        for _, frame in long.groupby("year"):
            sampled.append(
                frame.sample(min(len(frame), max_rows_per_year), random_state=random_state)
            )
        long = pd.concat(sampled, ignore_index=True)
    return long, meta


def feature_columns(include_module_temperature: bool = True) -> tuple[list[str], list[str]]:
    numeric = [
        "irradiation",
        "sun_altitude",
        "ambient_temperature",
        "sin_hour",
        "cos_hour",
        "sin_doy",
        "cos_doy",
        "pdc_kwp",
        "module_wattage",
        "modules",
        "strings",
        "modules_per_string",
    ]
    if include_module_temperature:
        numeric += ["module_temperature", "temp_delta"]
    categorical = ["inverter_id", "inverter_group", "module_type", "manufacturer", "capacity_band"]
    return numeric, categorical
