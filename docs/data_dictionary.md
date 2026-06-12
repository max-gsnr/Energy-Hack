# Data Dictionary

## Plant A Main Monitoring

File:

```text
Data/Plant_A/Main-monitoring-data/main_monitoring_data.parquet
```

Important columns:

```text
INV xx.xx.xxx / P_AC (kW)
INV xx.xx.xxx / I_DC_SUM (A)
INV xx.xx.xxx / U_DC (V)
Plant / Irradiation_average (W/m²)
Plant / Altitude (°)
Temperature Sensor / Ambient (°C)
Temperature Sensor / Module (°C)
DRD11A / DV (%)
DRD11A / EVU (%)
Janitza UMG 604 - DRD11A / CosPhi_L1..L3
Janitza UMG 604 - DRD11A / I_AC_L1-L3 (A)
Janitza UMG 604 - DRD11A / P_AC_L1..L3 (kW)
Janitza UMG 604 - DRD11A / S_AC_L1..L3 (kVA)
```

## Plant A Errorcodes

File:

```text
Data/Plant_A/Errorcodes/errorcodes.parquet
```

Columns:

```text
INV xx.xx.xxx / Error
INV xx.xx.xxx / Operational State
```

Error descriptions:

```text
Data/Plant_A/Errorcodes/errorcodes description (important).xlsx
```

## System Overview

Plant A:

```text
Data/Plant_A/Additional_Data/System_Overview.xlsx
```

Important fields:

```text
Description
WR-Type
Location
Module Type
Manufacturer
kWp Module
Modules
PDC (kWp)
Strings
Modules/String
```

## Derived Numeric Inputs

```text
P_DC = U_DC * I_DC_SUM / 1000
Eff = P_AC / P_DC
P_norm = P_AC / PDC
DC_norm = P_DC / PDC
I_norm = I_DC_SUM / PDC
Temp_delta = Module temperature - Ambient temperature
G_norm = Irradiation / 1000
Curtailment = max(EVU, DV) / 100
Lost_kW = max(0, Expected_P_AC - Actual_P_AC)
Lost_kWh = Lost_kW * timestep_hours
Lost_EUR = Lost_kWh * feed_in_tariff
```

