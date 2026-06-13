# Energy Hack: Solar Plant Digital Twin

Hackathon project for Enerparc track 2.1: **Digital Twin of a Solar Plant**.

The core task is a data twin, not a photorealistic 3D model. We learn normal inverter behavior from historical monitoring data, normalize across different inverter/module configurations, compare actual vs expected output over later years, and visualize the resulting deviations.

## What We Are Building

- ML model for expected normalized inverter output.
- Rolling health factor that separates slow degradation from sudden faults.
- Residual/anomaly scoring per inverter and timestamp.
- Explanations using curtailment, error codes, operational states, service tickets, and temperature.
- Frontend visualization that shows the plant/inverter groups and highlights abnormal behavior.

## Data

Raw provider data is not committed. It is restricted to the hackathon and includes files larger than GitHub's normal file limit.

To import the working dataset:

```bash
bash scripts/import_data.sh
```

Imported files are described in [Data/README.md](Data/README.md) and [Data/data_manifest.json](Data/data_manifest.json).

## Python Setup

```bash
python3 -m venv .venv
source .venv/bin/activate
python -m pip install -r requirements.txt
export MPLCONFIGDIR="$PWD/.cache/matplotlib"
```

Notes:
- `catboost` works locally and is the preferred boosted-tree fallback.
- `lightgbm` and `xgboost` need native `libomp.dylib` on macOS.

## Frontend Setup

```bash
npm install
npm run dev
```

## Useful Commands

Inspect imported data:

```bash
source .venv/bin/activate
python scripts/inspect_data.py
```

Run a quick ML smoke test:

```bash
source .venv/bin/activate
python scripts/train_solar_twin.py \
  --max-inverters 8 \
  --max-rows-per-year 12000 \
  --score-years 2019,2020 \
  --output-dir outputs/smoke_twin \
  --artifact-dir artifacts/smoke_twin
```

Run the Plant A frozen-baseline twin on all inverters:

```bash
source .venv/bin/activate
python scripts/train_solar_twin.py \
  --train-years 2017 \
  --calibration-years 2018 \
  --score-years 2019,2020,2021,2022,2023,2024,2025
```

Key exported outputs:

- `outputs/solar_twin/inverter_rankings.csv`
- `outputs/solar_twin/daily_inverter_scores.csv`
- `outputs/solar_twin/monthly_inverter_scores.csv`
- `outputs/solar_twin/plant_daily_scores.csv`
- `outputs/solar_twin/rolling_factor_history.csv`
- `outputs/solar_twin/degradation_summary.csv`
- `outputs/solar_twin/anomaly_events.csv`
- `outputs/solar_twin/top_anomaly_samples.csv`
- `artifacts/solar_twin/ac_twin_model.joblib`
- `artifacts/solar_twin/metrics.json`

## Repo Map

- [MEMORY.md](MEMORY.md): running project memory and decisions.
- [docs/model_plan.md](docs/model_plan.md): ML/twin plan.
- [docs/data_dictionary.md](docs/data_dictionary.md): important data fields and derived metrics.
- [scripts/import_data.sh](scripts/import_data.sh): reproducible data import.
- [scripts/inspect_data.py](scripts/inspect_data.py): quick data sanity check.
- [scripts/train_solar_twin.py](scripts/train_solar_twin.py): frozen-baseline ML pipeline.
- [scripts/demo_synthetic_step_drop.py](scripts/demo_synthetic_step_drop.py): rolling-factor demonstration.
