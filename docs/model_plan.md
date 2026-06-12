# Model Plan

## Objective

Build a solar plant data twin that learns expected inverter behavior and identifies operationally meaningful deviations.

## Main Dataset

Use Plant A first:

- `Data/Plant_A/Main-monitoring-data/main_monitoring_data.parquet`
- `Data/Plant_A/Errorcodes/errorcodes.parquet`
- `Data/Plant_A/Additional_Data/System_Overview.xlsx`
- `Data/Plant_A/Additional_Data/Tickets.xlsx`
- `Data/Plant_A/Additional_Data/feed-in-tarrifs.xlsx`

Plant B is optional and focused on soiling.

## Normalization

Raw inverter output is not comparable because installed capacity and module configurations differ.

Core normalized target:

```text
P_norm_i,t = P_AC_i,t / PDC_i
```

Efficiency proxy:

```text
P_DC_i,t = U_DC_i,t * I_DC_SUM_i,t / 1000
Eff_i,t = P_AC_i,t / P_DC_i,t
```

Filter efficiency calculations to daylight and meaningful DC power:

```text
G_t > threshold
Alt_t > threshold
P_DC_i,t > threshold
```

## Features

Per timestamp:
- irradiation
- sun altitude
- ambient temperature
- module temperature
- temperature delta
- EVU/DV curtailment
- hour
- day of year
- month
- year

Per inverter:
- inverter ID
- inverter group
- installed capacity
- module type
- manufacturer
- module wattage
- modules
- strings
- modules per string

Optional labels/context:
- error code
- operational state
- ticket active flag
- ticket category

## Training Strategy

1. Reshape wide inverter columns into long format:

```text
timestamp, inverter_id, P_AC, U_DC, I_DC_SUM, ...
```

2. Join inverter metadata from system overview.
3. Compute normalized target/features.
4. Train on first year or early baseline.
5. Predict expected normalized output on later years.
6. Compute residuals:

```text
Residual_i,t = P_norm_actual_i,t - P_norm_pred_i,t
```

7. Flag negative residuals as underperformance.

## Anomaly Types

- outage: expected high, actual near zero
- underperformance: actual persistently below expected
- conversion issue: DC input normal, AC output low
- DC-side issue: current/voltage abnormal under good irradiation
- curtailment: EVU/DV active during output drop
- thermal derating: high module temperature, lower output
- group-level issue: several grouped inverters abnormal together
- data issue: missing values, impossible values, flatlines
- degradation: residual trend worsens over months/years

