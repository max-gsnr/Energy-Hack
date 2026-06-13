"""Central configuration for the agent layer.

Single source of truth for paths, feed-in tariff fallback values, and LLM settings.
Everything degrades gracefully when no API key is set.
"""

from __future__ import annotations

import os
from pathlib import Path

try:
    from dotenv import load_dotenv

    load_dotenv()
except Exception:  # dotenv is optional
    pass


ROOT = Path(__file__).resolve().parents[2]

# Primary source: Max's exported, guardrailed JSON payloads.
PAYLOAD_DIR = Path(os.getenv("AGENT_PAYLOAD_DIR", str(ROOT / "frontend/public/data")))
# Fallback source: raw model-run CSVs.
MODEL_RUN_DIR = Path(os.getenv("AGENT_MODEL_RUN_DIR", str(ROOT / "outputs/current_model_run")))
# Where agent artifacts are written.
OUTPUT_DIR = Path(os.getenv("AGENT_OUTPUT_DIR", str(ROOT / "outputs/agents")))
EMAIL_DIR = OUTPUT_DIR / "emails"
TIMELINE_DIR = OUTPUT_DIR / "timelines"

# --- Financial fallback -----------------------------------------------------
# Exported payloads may include provider feed-in-tariff EUR values. This fallback
# is used only when a payload lacks real tariff-derived EUR fields.
TARIFF_EUR_PER_KWH = float(os.getenv("TARIFF_EUR_PER_KWH", "0.10"))
TARIFF_IS_ASSUMPTION = os.getenv("TARIFF_EUR_PER_KWH") is None
CURRENCY = "EUR"

# --- LLM -------------------------------------------------------------------
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY")
GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")

# --- Dispatch --------------------------------------------------------------
# Real sending is OFF by default. When enabled, emails go to SMTP_TO only.
ENABLE_REAL_EMAIL = os.getenv("ENABLE_REAL_EMAIL", "false").lower() == "true"
SMTP_HOST = os.getenv("SMTP_HOST", "")
SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))
SMTP_USER = os.getenv("SMTP_USER", "")
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD", "")
SMTP_TO = os.getenv("SMTP_TO", "")  # safe override recipient for live demos
SMTP_FROM = os.getenv("SMTP_FROM", "solartwin-agent@example.com")

# Sender identity used in drafted emails (the "agent" persona).
AGENT_SENDER_NAME = os.getenv("AGENT_SENDER_NAME", "SolarTwin O&M Agent")
PLANT_NAME = os.getenv("PLANT_NAME", "Plant A")


def llm_available() -> bool:
    return bool(GEMINI_API_KEY)
