# Imported Enerparc Solar Plant Data

Imported from the shared Google Drive folder for the Enerparc "Digital Twin of a Solar Plant" challenge.

## What is included

- `Plant_A/Main-monitoring-data/main_monitoring_data.parquet`
  - Primary Plant A monitoring time series.
  - 990,442 rows, 206 columns.
  - Includes inverter `P_AC`, `I_DC_SUM`, `U_DC`, irradiation, altitude, temperature, curtailment, and Janitza grid measurements.

- `Plant_A/Errorcodes/errorcodes.parquet`
  - Plant A inverter error and operational-state time series.
  - 990,442 rows, 131 columns.

- `Plant_A/Additional_Data/`
  - Feed-in tariffs.
  - System overview / inverter capacity metadata.
  - Service tickets.

- `Plant_B/Main-monitoring-data/main_monitoring_data_plant_b.parquet`
  - Optional Plant B monitoring time series for soiling-focused analysis.
  - 885,297 rows, 118 columns.

- `Plant_B/Additional_Data/`
  - Coordinates, Google Earth KMZ, feed-in tariffs, and system overview.

- `Shared/Data_Use_Policy.txt`
  - Data-use restrictions from the provider.

## What is not included

The duplicate large `.csv` and `.xlsb` copies of the monitoring datasets were not imported. The Parquet files contain the same main table data and are the preferred format for ML and fast analysis.

