#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

mkdir -p \
  Data/Plant_A/Main-monitoring-data \
  Data/Plant_A/Additional_Data \
  Data/Plant_A/Errorcodes \
  Data/Plant_B/Main-monitoring-data \
  Data/Plant_B/Additional_Data \
  Data/Shared

download() {
  local id="$1"
  local out="$2"
  if [[ -s "$out" ]]; then
    echo "exists: $out"
    return
  fi
  echo "downloading: $out"
  curl -L --fail --progress-bar \
    -o "$out" \
    "https://drive.usercontent.google.com/download?id=${id}&export=download&confirm=t"
}

download "13YbdSBfGz6tHfvEHf1mFzsYEp6fPeY_c" "Data/Plant_A/Main-monitoring-data/main_monitoring_data.parquet"
download "1j4C-7L7aupKAax3XxhvtAxQatb45zx_0" "Data/Plant_A/Errorcodes/errorcodes.parquet"
download "1HmZoVE0pBxHs4B4Rfsc0dFWCHAP67BkY" "Data/Plant_B/Main-monitoring-data/main_monitoring_data_plant_b.parquet"

download "1-NCtU3KAKtGWdx1SQgsA6dmuckthvSQL" "Data/Shared/Data_Use_Policy.txt"
download "1DrTJu06vSOpu-ww2W7XqnUi5yNax9F4b" "Data/Plant_A/General_information_plant_A.pdf"
download "17OflgAFovzZ1Ge2yfe4p4OPDiP5jcztM" "Data/Plant_B/General_information_plant_B.pdf"

download "1FhBWlDL32mxeyqKMXSaz3PdSY0YrB-eJ" "Data/Plant_A/Main-monitoring-data/main_monitoring_data_legend.xlsb"
download "1EzxGZWeQE_WMj7lNOItD97klQua9uMpU" "Data/Plant_A/Additional_Data/feed-in-tarrifs.xlsx"
download "1nHuvoPkrgkhi5SMiCkg24HycIIaLboI2" "Data/Plant_A/Additional_Data/System_Overview.xlsx"
download "12e65_CFlDmIk94aTywhq9f9K6KStmPmw" "Data/Plant_A/Additional_Data/Tickets.xlsx"
download "19NDSlFsod7FGeuN3lI_07yTQaSFRTGSF" "Data/Plant_A/Errorcodes/errorcodes description (important).xlsx"

download "13eDYSONXQ5NuIJtHzDHD9oa6G7XeWHui" "Data/Plant_B/Additional_Data/Coordinate.txt"
download "1DFixNPsYuKodPPr0MYYpAwFc36v1oiS8" "Data/Plant_B/Additional_Data/Coordinate(google earth).kmz"
download "1KPwn3ppXUIFLZKnFLOqsDhw3NUU8DoZD" "Data/Plant_B/Additional_Data/feed-in-tarrifs plant b.xlsx"
download "1HnSWlgtmzJjYN96jzFy0DGoBWA2S6vT-" "Data/Plant_B/Additional_Data/System_Overview_plant b.xlsx"

echo "Data import complete."

