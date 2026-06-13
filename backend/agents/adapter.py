"""Adapter: load Max's exported model payloads into typed objects.

Primary source is `frontend/public/data/` (Plant A) or `frontend/public/data_plant_b/`
(Plant B). All reads are cached in-process per plant.
"""

from __future__ import annotations

import json
import re
from functools import lru_cache
from pathlib import Path
from typing import Any

from backend.agents import config
from backend.agents.models import InverterRanking

PLANT_DIRS: dict[str, Path] = {
    "A": config.PAYLOAD_DIR,
    "B": config.ROOT / "frontend/public/data_plant_b",
}


def safe_inverter_id(inverter_id: str) -> str:
    return re.sub(r"[^A-Za-z0-9]+", "_", inverter_id).strip("_")


def display_label(inverter_id: str) -> str:
    match = re.fullmatch(r"INV\s+(\d{2})\.(\d{2})\.(\d{3})", inverter_id)
    return ".".join(match.groups()) if match else inverter_id


def _plant_dir(plant_id: str) -> Path:
    return PLANT_DIRS.get(plant_id.upper(), config.PAYLOAD_DIR)


def ensure_payloads(plant_id: str = "A") -> None:
    d = _plant_dir(plant_id)
    if (d / "agent_context.json").exists():
        return
    if plant_id.upper() == "A":
        if not (config.MODEL_RUN_DIR / "run_summary.json").exists():
            raise FileNotFoundError(
                f"No payloads in {d} and no model run in {config.MODEL_RUN_DIR}. "
                "Run scripts/train_solar_twin.py then scripts/export_frontend_payloads.py."
            )
        import sys
        sys.path.insert(0, str(config.ROOT))
        from scripts.export_frontend_payloads import export_payloads
        export_payloads(config.MODEL_RUN_DIR, d)
    else:
        raise FileNotFoundError(f"No payloads found for plant {plant_id} in {d}")


@lru_cache(maxsize=4)
def _read_json(name: str, plant_id: str = "A") -> Any:
    ensure_payloads(plant_id)
    path = _plant_dir(plant_id) / name
    with path.open("r", encoding="utf-8") as f:
        return json.load(f)


def agent_context(plant_id: str = "A") -> dict[str, Any]:
    return _read_json("agent_context.json", plant_id)


def plant_summary(plant_id: str = "A") -> dict[str, Any]:
    return _read_json("plant_summary.json", plant_id)


def model_metadata(plant_id: str = "A") -> dict[str, Any]:
    return _read_json("model_run_metadata.json", plant_id)


@lru_cache(maxsize=4)
def rankings(plant_id: str = "A") -> list[InverterRanking]:
    raw = _read_json("inverter_rankings.json", plant_id)
    return [InverterRanking(**_coerce_ranking(item)) for item in raw]


def _coerce_ranking(item: dict[str, Any]) -> dict[str, Any]:
    fields = set(InverterRanking.model_fields.keys())
    return {k: v for k, v in item.items() if k in fields}


@lru_cache(maxsize=4)
def ranking_by_id(plant_id: str = "A") -> dict[str, InverterRanking]:
    return {r.inverter_id: r for r in rankings(plant_id)}


def inverter_map(plant_id: str = "A") -> list[dict[str, Any]]:
    return _read_json("inverter_map.json", plant_id)


def inverter_detail(inverter_id: str, plant_id: str = "A") -> dict[str, Any]:
    ensure_payloads(plant_id)
    path = _plant_dir(plant_id) / "inverters" / f"{safe_inverter_id(inverter_id)}.json"
    if not path.exists():
        raise KeyError(f"No detail payload for inverter {inverter_id}")
    with path.open("r", encoding="utf-8") as f:
        return json.load(f)


def baseline_excluded(plant_id: str = "A") -> set[str]:
    return set(model_metadata(plant_id).get("baseline_excluded_inverters", []))


def resolve_inverter_id(query: str, plant_id: str = "A") -> str | None:
    """Best-effort match of a free-text reference to a canonical inverter id."""
    query = query.strip()
    ids = list(ranking_by_id(plant_id).keys())
    if query in ranking_by_id(plant_id):
        return query
    digits = re.findall(r"\d+", query)
    for inverter_id in ids:
        if safe_inverter_id(inverter_id).lower() == safe_inverter_id(query).lower():
            return inverter_id
    if len(digits) >= 3:
        target = f"INV {int(digits[0]):02d}.{int(digits[1]):02d}.{int(digits[2]):03d}"
        if target in ranking_by_id(plant_id):
            return target
    if digits:
        last = digits[-1].zfill(3)
        matches = [i for i in ids if i.endswith(last)]
        if len(matches) == 1:
            return matches[0]
    return None
