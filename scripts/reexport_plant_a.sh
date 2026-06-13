#!/usr/bin/env bash
# Re-run the Plant A twin with the corrected curtailment logic and re-export the
# frontend payloads. Run this on a machine with >=16 GB RAM (the full 65-inverter
# run needs ~6-10 GB). From the repo root:  bash scripts/reexport_plant_a.sh
set -euo pipefail
cd "$(dirname "$0")/.."

# Activate the project venv if present.
if [ -d ".venv" ]; then
  # shellcheck disable=SC1091
  source .venv/bin/activate
fi

export MPLCONFIGDIR="$PWD/.cache/matplotlib"
mkdir -p "$MPLCONFIGDIR"

echo "==> [1/2] Training + scoring Plant A (corrected curtailment)…"
python scripts/train_solar_twin.py --plant A \
  --output-dir outputs/current_model_run \
  --artifact-dir artifacts/current_model_run

echo "==> [2/2] Exporting frontend payloads…"
python scripts/export_frontend_payloads.py \
  --input-dir outputs/current_model_run \
  --output-dir frontend/public/data

echo "==> Done. Re-exported to frontend/public/data/"
echo "    Check outputs/current_model_run/run_summary.json (should read plant: A)."
