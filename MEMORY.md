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

Recommended first target:

```text
y_i,t = P_AC_i,t / PDC_i
```

Recommended features:
- irradiation
- sun altitude
- module temperature
- ambient temperature
- temperature delta
- EVU/DV curtailment
- hour/day/month/year features
- inverter ID/group
- installed capacity
- module type/manufacturer
- modules/strings/modules per string

Train on the first year or early baseline. Evaluate by year over later history.

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
