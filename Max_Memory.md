# Project Memory

Last updated: 2026-06-13

## Challenge Interpretation

We are in Enerparc track 2.1: **Digital Twin of a Solar Plant**.

The judge clarified that the expected twin is primarily a **data/behavior twin**, not a 3D or VR model. A plain dashboard is only visualization; the twin is the learned expected behavior of the plant components.

Core idea:

```text
Normalize inverter data
→ train model on early "normal" behavior
→ predict expected output later
→ compare actual vs expected
→ explain deviations
→ visualize useful anomalies
```

## Judge Conversation Takeaways

- PV modules are connected in strings, multiple strings go into an inverter.
- The inverter uses MPP tracking, combines the DC-side input, and converts DC to AC.
- Monitoring data is recorded around the inverter.
- Plant A includes inverter DC input and AC output:
  - `I_DC_SUM (A)`
  - `U_DC (V)`
  - `P_AC (kW)`
- First step must be normalization because inverters have different installed capacities and module configurations.
- Raw high `P_AC` does not mean a better inverter; it may simply have more capacity connected.
- Plant A is intentionally messy and bad, with many module classes and many things to find.
- Irradiation is roughly linear with output.
- Module temperature matters because higher module temperature lowers efficiency.
- Train the twin on an early period to learn normal behavior, then measure deltas in later years.
- A large delta means either the model is bad or the plant has a problem.
- Live data is not required.
- Lost kWh and EUR can be calculated with feed-in tariffs.
- Plant B is optional and mainly for soiling. Plant A is too messy for clean soiling analysis.
- Visuals should explain operationally meaningful deviations, not just look flashy.

## Imported Data

Canonical local dataset lives under `Data/` after running `scripts/import_data.sh`.

Plant A:
- Main monitoring: `990,442` rows, `206` columns.
- Errorcodes: `990,442` rows, `131` columns.
- Time range: `2016-12-31 22:00` to `2026-06-01 21:55`.
- Mostly 5-minute intervals.
- 65 measured inverter IDs in monitoring data.

Plant B:
- Main monitoring: `885,297` rows, `118` columns.
- Time range: `2018-01-01 00:00` to `2026-06-01 21:55`.
- 107 inverter output columns.
- No `I_DC_SUM` or `U_DC` columns.

## Most Important Inputs

Plant A main model:
- `P_AC_i,t`: AC output per inverter.
- `U_DC_i,t`: DC voltage per inverter.
- `I_DC_SUM_i,t`: DC current per inverter.
- `PDC_i`: installed inverter capacity from `System_Overview.xlsx`.
- `G_t`: irradiation.
- `Alt_t`: sun altitude.
- `T_mod_t`: module temperature.
- `T_amb_t`: ambient temperature.
- `EVU_t`, `DV_t`: curtailment signals.
- Error code and operational state.
- Ticket category/start/end.
- Module type, manufacturer, module wattage, modules, strings, modules/string.

## Derived Metrics

```text
P_DC_i,t = U_DC_i,t * I_DC_SUM_i,t / 1000
Eff_i,t = P_AC_i,t / P_DC_i,t
P_norm_i,t = P_AC_i,t / PDC_i
DC_norm_i,t = P_DC_i,t / PDC_i
Temp_delta_t = T_mod_t - T_amb_t
G_norm_t = G_t / 1000
Lost_kW_i,t = max(0, P_expected_i,t - P_AC_i,t)
Lost_kWh_i,t = Lost_kW_i,t * (5 / 60)
Lost_EUR_i,t = Lost_kWh_i,t * tariff_i,t
Residual_i,t = P_norm_actual_i,t - P_norm_pred_i,t
```

## ML Direction

Implemented first target:

```text
y_i,t = P_AC_i,t / PDC_i
```

Primary AC twin features:
- irradiation
- sun altitude
- ambient temperature
- optional module temperature / temperature delta, tested by ablation
- hour/day-of-year cyclic features
- inverter ID/group
- installed capacity
- module type/manufacturer
- modules/strings/modules per string

Important implementation decisions:
- Do not use `U_DC`, `I_DC_SUM`, `P_DC`, or efficiency as primary AC model features.
- Use DC measurements only after an AC anomaly is detected to classify likely DC-side vs conversion-side issues.
- Treat EVU/DV as a curtailment overlay, not learned model features.
- Use error codes and operational state only as explanations, not training inputs.
- Use year only for train/calibration/test split, not as a model feature.
- Use z-scored residuals from daylight/non-curtailed sigma bins instead of flat residual thresholds.
- Rank underperformers by aggregated lost kWh, not instantaneous residual.

Train on 2017, calibrate on 2018, evaluate 2019-2025. Optionally compare a 2017-2018 training run, but avoid continuous fine-tuning because it can hide degradation/faults.

The implemented pipeline now separates three signals:

```text
Frozen residual = p_norm - p_pred_norm
Acute residual = p_norm - p_pred_norm * rolling_factor
Relative factor = rolling_factor / cohort_median_factor
```

Use frozen residual/lost kWh for total decline versus the healthy 2017 baseline. Use acute residual z-score for new fault detection after slow degradation has been accounted for. Use relative factor and factor trend for degradation versus the peer/fleet cohort.

Runnable command:

```bash
python scripts/train_solar_twin.py
```

## Product Direction

Frontend should show:
- plant health overview
- inverter/group residual heatmap
- expected vs actual output chart
- anomaly timeline
- error/ticket/curtailment explanations
- lost kWh / lost EUR
- ranked underperforming inverters

Use visual layout/schematic only to make deviations understandable.

## Data Safety

The provider policy says the data is restricted to the hackathon and not public information. Raw data and large Parquet files are ignored in git. Teammates should import data locally with `scripts/import_data.sh`.

## Repo Status

- GitHub remote: `https://github.com/max-gsnr/Energy-Hack.git`
- Initial organization commit pushed to `main`.
- Raw downloaded data remains local and ignored.
- Teammates should clone the repo, install dependencies, then run `bash scripts/import_data.sh`.

## Implemented ML Pipeline

Implemented `scripts/train_solar_twin.py` with backend modules under `backend/solar_twin/`.

The pipeline:
- builds a long-format Plant A dataset
- trains a frozen AC baseline model on normalized output
- adds a causal rolling health-factor layer without retraining the frozen model
- keeps DC voltage/current out of AC model features
- uses DC only for post-hoc diagnostics keyed from acute anomaly flags
- vets 2017 baseline inverters against peer cohorts
- compares module-temperature vs exogenous-only ablation
- treats EVU/DV curtailment as a rule overlay
- calibrates sigma-binned standardized frozen and acute residuals
- exports daily/monthly lost-kWh rankings, rolling factor history, degradation summary, anomaly events, top 5-minute samples, baseline vetting, sigma calibration, and model artifacts

Smoke validation completed:
- `python scripts/train_solar_twin.py --max-inverters 8 --max-rows-per-year 12000 --score-years 2019,2020`
- `python scripts/train_solar_twin.py --max-rows-per-year 15000 --score-years 2019`
- `python scripts/demo_synthetic_step_drop.py`
- `python scripts/train_solar_twin.py --max-inverters 8 --score-years 2019`

## Event vs Degradation Export Fix

The yearly frontend table was too dramatic because `fast_degradation` was exported as one anomaly event per inverter-day. That made broad 2019-2020 rolling-factor behavior look like thousands of independent failures.

Decision:
- `events.json` and `anomaly_events.csv` should contain acute outages and acute faults only.
- Chronic rolling health behavior belongs in `degradation_trends.csv` and `frontend/public/data/degradation_trends.json`.
- Frontend wording should distinguish acute events from degradation trend state.

Full rerun after the fix:
- `selected_model = exogenous_only`
- `rows_used = 17,641,185`
- `events.json` now has 377 acute events total
- 2019 acute event count is 270 critical outages and 15 warning acute faults
- 2019 chronic trend state is still visible separately as 8,566 fast-degradation days in `degradation_trends.json`

## Plant B twin (added)

The loader is now multi-plant via `PlantConfig` in `backend/solar_twin/data.py`
(`PLANT_A` default, `PLANT_B`). Plant B is AC-only (no DC, no error codes), 107
inverters, very uniform (one module type, 73.92 kWp each), data 2018-2026.
- Run it: `python scripts/train_solar_twin.py --plant B`
  (defaults: train 2018, calibrate 2019, score 2020-2025; outputs to
  `outputs/plant_b_twin/`). Same frozen AC twin + rolling layer as Plant A; the
  DC diagnostic auto-reports `dc_unavailable`.
- The frozen AC twin and `export_frontend_payloads.py` are plant-agnostic and work
  unchanged on Plant B outputs.
- Soiling shows up directly in the rolling health factor: a seasonal envelope
  (factor ~1.02 in winter, dipping to ~0.96 in mid-summer) = dry-season soiling
  accumulation and rain recovery. This is Plant B's intended story.
- Fixed a real curtailment bug along the way: DV/EVU are percent of allowed
  feed-in (100 = normal, <100 = throttling), so the old `max(dv,evu)>0` flag
  marked normal operation as curtailment. Now `min(dv,evu) < 99`. Was masked on
  Plant A (DV/EVU NaN in the loss-heavy 2019-2020 window) but broke Plant B (78%
  -> 4.6% flagged). Plant A 2-inverter regression is byte-identical after the fix.
- Sandbox note: full 107-inverter unsampled run OOMs at 4 GB (same as Plant A);
  run it on a real machine. Validated end-to-end on subsets here.

## Inverter severity fix (OPEN DECISION → resolved)

Problem: per-inverter status used ABSOLUTE factor thresholds (0.80/0.92/0.97)
against a fresh baseline, so normal multi-year aging tripped almost everything
(Plant A 64/65 elevated). A second compounding bug: status also used
`lost_kwh_per_kwp` fleet QUANTILES (0.90/0.75/0.50), which by construction always
flag the top 50% regardless of health.

Resolution (in `scripts/export_frontend_payloads.py`), three layers, none hiding
the others:
1. Plant-health KPI (Layer 1, absolute): `plant_summary.plant_health` — fleet
   median health factor vs the expected normal-aging envelope + multi-year trend.
   Stays loud on systemic/common-mode decline. Surfaced as a banner number, not a
   per-tile status. Also mirrored into `agent_context.plant_health`.
2. Per-inverter map status (Layer 2): anchored to an EXPECTED-DEGRADATION ENVELOPE
   `expected_factor = 1 - 0.005*years_since_baseline` (0.5%/yr normal aging from the
   baseline/train year). Status = factor points BELOW the envelope, banded
   watch≥0.04 / warning≥0.09 / critical≥0.16. Replaces the absolute thresholds and
   the quantile-loss logic. Whole-fleet-below still flags everyone (correct) and
   Layer 1 carries the systemic number.
3. Acute layer (Layer 3): `events.json` severity left unchanged.

New exported fields (names preserved for the frontend/adapter): rankings/map gain
`status_basis`, `expected_factor_envelope`, `factor_shortfall_vs_envelope`;
`plant_summary.plant_health`; `model_run_metadata.degradation_envelope`.
`baseline_excluded` framing unchanged (pre-existing, never "degrading").

Results after re-export — Plant A: 5 critical / 24 warning / 17 watch / 19 normal
(was 10/39/15/1), plant_health = significant_systemic_decline (median 0.875 vs 0.96
envelope, ~1.2%/yr). Plant B: 7 watch / 100 normal (was 11/20/26/50), plant_health
= healthy (median 0.982 tracking 0.965 envelope). Reconciliation still closes for
both.

Re-export commands (export only; reads existing CSV/JSON, no retraining):
- Plant A (has source CSVs): `python scripts/export_frontend_payloads.py
  --input-dir outputs/current_model_run --output-dir frontend/public/data`
- Plant B (no local source CSVs — re-status from existing payloads):
  `python scripts/export_frontend_payloads.py --restatus-only --output-dir
  frontend/public/data_plant_b`. When Plant B's model run is regenerated on a real
  machine, run the normal full export instead and the same envelope logic applies.
- Note: the app venv needs `numpy`+`pandas` for the export script (the agent layer
  itself stays pandas-free).
