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

## Implemented Pipeline

Implemented in `scripts/train_solar_twin.py` and `backend/solar_twin/`.

Raw inverter output is not comparable because installed capacity and module configurations differ.

Core normalized target:

```text
P_norm_i,t = P_AC_i,t / PDC_i
```

Primary AC model features:

```text
irradiation
sun altitude
ambient temperature
optional module temperature / temp_delta
hour and day-of-year cyclic features
inverter ID and inverter group
installed capacity and module metadata
```

The primary AC model explicitly excludes `U_DC`, `I_DC_SUM`, `P_DC`, and `Eff`. DC signals are only used after an AC anomaly is detected to localize the likely fault side.

DC diagnostic:

```text
P_DC_i,t = U_DC_i,t * I_DC_SUM_i,t / 1000
Eff_i,t = P_AC_i,t / P_DC_i,t
```

Curtailment is handled as a rule overlay: EVU/DV-active rows are labeled as curtailment and excluded from residual-based fault scoring.

Error codes are explanation-only fields in exported anomaly outputs; they are not model features.

## Training Strategy

1. Reshape wide inverter columns into long format:

```text
timestamp, inverter_id, P_AC, metadata, environment, optional DC diagnostics
```

2. Join inverter metadata from system overview.
3. Compute normalized AC target/features.
4. Vet 2017 baseline inverters against healthy peer cohorts.
5. Train on 2017 and calibrate on 2018.
6. Compare module-temperature model against exogenous-only ablation.
7. Predict expected normalized output on later years.
8. Compute residuals:

```text
Residual_i,t = P_norm_actual_i,t - P_norm_pred_i,t
```

9. Add a causal rolling health factor, estimated only from clean daylight days:

```text
factor_i,d = rolling_median(actual_clean_kWh / frozen_expected_clean_kWh)
current_expected_norm_i,t = P_norm_pred_i,t * factor_i,d
acute_residual_i,t = P_norm_actual_i,t - current_expected_norm_i,t
relative_factor_i,d = factor_i,d / cohort_median_factor_d
```

The frozen residual remains the total decline versus the healthy baseline. The acute residual is used for new fault detection after slow degradation has been accounted for. The relative factor shows inverter-specific degradation versus the peer/fleet cohort.

10. Standardize both frozen and acute residuals by irradiance/altitude sigma bins.
11. Aggregate lost kWh by day/month and rank inverters by energy impact.

## Anomaly Types

- outage: expected high, actual near zero
- acute fault: acute residual strongly negative after rolling health correction
- slow degradation: frozen residual persistently negative while acute residual is near normal
- fast degradation: rolling factor trend falls faster than the configured threshold
- conversion issue: DC input normal, AC output low
- DC-side issue: current/voltage abnormal under good irradiation
- curtailment: EVU/DV active, labeled directly rather than learned
- thermal derating: high module temperature, lower output
- group-level issue: several grouped inverters abnormal together
- data issue: missing values, impossible values, flatlines
- degradation: rolling factor or relative factor worsens over months/years

## Rolling Layer

The rolling layer does not retrain or fine-tune the frozen model. It is a causal multiplier on top of the frozen prediction.

Clean-day selection excludes curtailment, active errors, outages, missing values, and very low expected output. It does not use frozen residual or residual z-score, because that would hide real degradation by removing the exact days needed to estimate it.

Sampled smoke runs automatically disable this layer because row sampling breaks daily continuity.
