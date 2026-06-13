#!/usr/bin/env bash
# SolarTwin – start the app
# Usage: ./start.sh
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"

source .venv/bin/activate 2>/dev/null || true

echo ""
echo "✅  SolarTwin starting..."
echo "   → http://localhost:8088"
echo ""

uvicorn backend.agents.api:app --host 0.0.0.0 --port 8088 --reload
