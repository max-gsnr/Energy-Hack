"""Self-registering agent tools (Lio-style registry).

Each tool is a plain function with a rich docstring (the docstring is what the LLM
reads). Tools are registered into `_REGISTRY` and can be handed directly to Gemini
for automatic function calling, or called from Python.

All tools read from Max's exported payloads via the adapter and never invent values.
"""

from __future__ import annotations

import json
from functools import lru_cache
from typing import Any, Callable

from backend.agents import adapter, config

_REGISTRY: dict[str, Callable[..., Any]] = {}


def tool(fn: Callable[..., Any]) -> Callable[..., Any]:
    _REGISTRY[fn.__name__] = fn
    return fn


def registry() -> list[Callable[..., Any]]:
    return list(_REGISTRY.values())


@lru_cache(maxsize=1)
def _events() -> list[dict[str, Any]]:
    path = config.PAYLOAD_DIR / "events.json"
    if not path.exists():
        return []
    with path.open("r", encoding="utf-8") as f:
        return json.load(f)


@tool
def describe_dataset() -> str:
    """List the data this assistant can query and the fields available on each entity.

    Call this first if unsure which entity or field to use. Returns a JSON catalogue of
    entities: plant_summary, inverters (rankings), inverter_detail, events.
    """
    catalogue = {
        "plant_summary": {
            "fields": ["total_expected_kwh", "total_actual_kwh", "total_lost_kwh", "total_curtailment_kwh", "yearly[]"],
            "note": "lost_kwh excludes curtailment; actual+lost+curtailment-overperformance=expected",
        },
        "inverters": {
            "fields": [
                "inverter_id", "inverter_group", "rank", "total_lost_kwh", "lost_kwh_per_kwp",
                "latest_factor", "latest_relative_factor", "primary_status", "baseline_excluded",
                "outage_samples", "error_samples", "primary_reason",
            ],
            "note": "primary_status in {critical,warning,watch,normal}; baseline_excluded = pre-existing fault",
        },
        "inverter_detail": {"fields": ["summary", "daily[]", "factor_history[]", "events[]"]},
        "events": {
            "fields": ["date", "year", "inverter_id", "event_type", "severity", "lost_kwh", "min_residual_z", "explained_by_error"],
            "event_types": ["outage", "acute_fault", "fast_degradation", "slow_degradation", "curtailment", "normal"],
        },
    }
    return json.dumps(catalogue)


@tool
def get_plant_summary() -> str:
    """Return plant-wide energy totals (expected/actual/lost/curtailment kWh) and the per-year breakdown."""
    return json.dumps(adapter.plant_summary())


@tool
def list_top_inverters(limit: int = 10, status: str = "", baseline_excluded_only: bool = False) -> str:
    """List inverters ranked by modeled performance loss (highest first).

    Args:
        limit: how many to return (max 65).
        status: optional filter, one of "critical","warning","watch","normal".
        baseline_excluded_only: if true, only pre-existing/anomalous-since-start inverters.
    """
    rows = adapter.rankings()
    if status:
        rows = [r for r in rows if r.primary_status == status]
    if baseline_excluded_only:
        rows = [r for r in rows if r.baseline_excluded]
    rows = rows[: max(1, min(limit, 65))]
    return json.dumps([r.model_dump() for r in rows])


@tool
def get_inverter(inverter_id: str) -> str:
    """Get the full record for one inverter: ranking summary, recent daily rows, factor history bounds, and its events.

    Accepts ids like "INV 01.07.047" or loose forms like "1.7.47" or "47".
    """
    resolved = adapter.resolve_inverter_id(inverter_id)
    if resolved is None:
        return json.dumps({"error": f"unknown inverter: {inverter_id}"})
    detail = adapter.inverter_detail(resolved)
    factor = detail.get("factor_history", [])
    compact = {
        "inverter_id": resolved,
        "baseline_excluded": detail.get("baseline_excluded"),
        "summary": detail.get("summary"),
        "factor_first": factor[0] if factor else None,
        "factor_last": factor[-1] if factor else None,
        "event_count": len(detail.get("events", [])),
        "top_events": sorted(detail.get("events", []), key=lambda e: e.get("lost_kwh", 0), reverse=True)[:5],
    }
    return json.dumps(compact)


@tool
def query_events(inverter_id: str = "", event_type: str = "", year: int = 0, min_lost_kwh: float = 0.0, limit: int = 10) -> str:
    """Search anomaly events. All filters optional and ANDed. Sorted by lost_kwh (desc).

    Args:
        inverter_id: restrict to one inverter (loose forms accepted).
        event_type: one of "outage","acute_fault","fast_degradation","slow_degradation","curtailment".
        year: restrict to a year (e.g. 2019); 0 means any.
        min_lost_kwh: only events losing at least this many kWh.
        limit: max events to return (max 50).
    """
    events = _events()
    resolved = adapter.resolve_inverter_id(inverter_id) if inverter_id else None
    out = []
    for ev in events:
        if resolved and ev.get("inverter_id") != resolved:
            continue
        if event_type and ev.get("event_type") != event_type:
            continue
        if year and int(ev.get("year", 0)) != year:
            continue
        if float(ev.get("lost_kwh", 0)) < min_lost_kwh:
            continue
        out.append(ev)
    out.sort(key=lambda e: e.get("lost_kwh", 0), reverse=True)
    return json.dumps(out[: max(1, min(limit, 50))])


@tool
def euro_from_kwh(kwh: float) -> str:
    """Convert arbitrary lost kWh to estimated EUR using the configured fallback tariff.

    Prefer exported total_lost_eur when available. This helper is only for ad hoc kWh
    values that do not already carry provider tariff-derived EUR.
    """
    eur = round(float(kwh) * config.TARIFF_EUR_PER_KWH, 2)
    return json.dumps(
        {
            "lost_kwh": float(kwh),
            "eur": eur,
            "tariff_eur_per_kwh": config.TARIFF_EUR_PER_KWH,
            "is_assumption": config.TARIFF_IS_ASSUMPTION,
            "note": "EUR is an estimate from the configured fallback feed-in tariff.",
        }
    )


# Convenience (not exposed to the LLM): build a EuroEstimate object.
def euro_estimate(
    kwh: float,
    eur: float | None = None,
    tariff_eur_per_kwh: float | None = None,
    is_assumption: bool | None = None,
):
    from backend.agents.models import EuroEstimate

    if eur is not None:
        tariff = tariff_eur_per_kwh if tariff_eur_per_kwh is not None else (
            float(eur) / float(kwh) if float(kwh) else config.TARIFF_EUR_PER_KWH
        )
        assumed = bool(is_assumption) if is_assumption is not None else False
        return EuroEstimate(
            lost_kwh=round(float(kwh), 2),
            eur=round(float(eur), 2),
            tariff_eur_per_kwh=round(float(tariff), 6),
            is_assumption=assumed,
            note="Computed from provider feed-in tariff file."
            if not assumed
            else "Estimate from assumed flat feed-in tariff.",
        )

    return EuroEstimate(
        lost_kwh=round(float(kwh), 2),
        eur=round(float(kwh) * config.TARIFF_EUR_PER_KWH, 2),
        tariff_eur_per_kwh=config.TARIFF_EUR_PER_KWH,
        is_assumption=config.TARIFF_IS_ASSUMPTION,
        note="Estimate from configured fallback feed-in tariff."
        if config.TARIFF_IS_ASSUMPTION
        else "Computed from configured tariff.",
    )
