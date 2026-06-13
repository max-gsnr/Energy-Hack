"""Forensic Timeline agent - the 'inverter doctor'.

Reconstructs an inverter's life story from its factor history + events. Deterministic
milestone extraction with an optional Gemini narrative. Respects the guardrail:
baseline-excluded inverters are framed as pre-existing, not degradation-over-time.
"""

from __future__ import annotations

import json

from backend.agents import adapter
from backend.agents.llm import generate
from backend.agents.models import InverterTimeline, TimelineMilestone


def _non_warmup(factor_history: list[dict]) -> list[dict]:
    pts = [p for p in factor_history if not p.get("warmup")]
    return pts or factor_history


def _extract_milestones(detail: dict) -> list[TimelineMilestone]:
    factor = _non_warmup(detail.get("factor_history", []))
    events = detail.get("events", [])
    excluded = detail.get("baseline_excluded", False)
    milestones: list[TimelineMilestone] = []

    if factor:
        first = factor[0]
        milestones.append(
            TimelineMilestone(
                date=str(first["date"]),
                kind="baseline" if not excluded else "pre_existing",
                detail=(
                    "Monitoring baseline established at health factor "
                    f"{first.get('factor')}." if not excluded
                    else "Anomalous from the start of monitoring (excluded from healthy baseline)."
                ),
                factor=first.get("factor"),
            )
        )
        # Largest single drop between consecutive non-warmup points.
        worst_drop = None
        for prev, cur in zip(factor, factor[1:]):
            delta = (cur.get("factor") or 0) - (prev.get("factor") or 0)
            if worst_drop is None or delta < worst_drop[0]:
                worst_drop = (delta, cur)
        if worst_drop and worst_drop[0] < -0.05:
            cur = worst_drop[1]
            milestones.append(
                TimelineMilestone(
                    date=str(cur["date"]),
                    kind="drop",
                    detail=f"Health factor dropped by {abs(worst_drop[0]):.2f} to {cur.get('factor')}.",
                    factor=cur.get("factor"),
                )
            )
        # Minimum factor point.
        low = min(factor, key=lambda p: p.get("factor", 1.0))
        if low.get("factor", 1.0) < 0.92:
            milestones.append(
                TimelineMilestone(
                    date=str(low["date"]),
                    kind="low",
                    detail=f"Lowest health factor {low.get('factor')} (relative {low.get('relative_factor')}).",
                    factor=low.get("factor"),
                )
            )

    # Worst few events by lost kWh.
    for ev in sorted(events, key=lambda e: e.get("lost_kwh", 0), reverse=True)[:3]:
        milestones.append(
            TimelineMilestone(
                date=str(ev.get("date")),
                kind=str(ev.get("event_type", "event")),
                detail=(
                    f"{ev.get('event_type')} losing {ev.get('lost_kwh')} kWh "
                    f"(min residual z {ev.get('min_residual_z')}"
                    + (", overlaps error code" if ev.get("explained_by_error") else "")
                    + ")."
                ),
            )
        )

    if factor:
        last = factor[-1]
        milestones.append(
            TimelineMilestone(
                date=str(last["date"]),
                kind="current",
                detail=f"Most recent health factor {last.get('factor')} (relative {last.get('relative_factor')}).",
                factor=last.get("factor"),
            )
        )
    milestones.sort(key=lambda m: m.date)
    return milestones


def _deterministic_narrative(inverter_id: str, milestones: list[TimelineMilestone], excluded: bool) -> str:
    label = adapter.display_label(inverter_id)
    lines = [f"Patient: inverter {label}."]
    if excluded:
        lines.append("History: abnormal since the first monitoring data - treated as a pre-existing fault, not a gradual decline.")
    for m in milestones:
        lines.append(f"- {m.date} [{m.kind}] {m.detail}")
    return "\n".join(lines)


_LLM_SYSTEM = (
    "You are a reliability engineer writing a short 'inverter health history' (4-6 sentences) like a "
    "doctor's case note. Use ONLY the provided milestones JSON; do not invent dates or numbers. If "
    "baseline_excluded is true, state it was abnormal since monitoring began (pre-existing), not a "
    "gradual degradation. Be concrete about dates and what changed."
)


def build_timeline(inverter_id: str, use_llm: bool = True, plant_id: str = "A") -> InverterTimeline:
    resolved = adapter.resolve_inverter_id(inverter_id, plant_id) or inverter_id
    detail = adapter.inverter_detail(resolved, plant_id)
    excluded = bool(detail.get("baseline_excluded", False))
    milestones = _extract_milestones(detail)
    first_date = milestones[0].date if milestones else None
    last_date = milestones[-1].date if milestones else None

    summary = detail.get("summary", {})
    diagnosis = (
        f"{adapter.display_label(resolved)} - status {summary.get('primary_status')}, "
        f"{summary.get('total_lost_kwh')} kWh modeled loss, latest factor {summary.get('latest_factor')}. "
        + (summary.get("primary_reason") or "")
    )

    timeline = InverterTimeline(
        inverter_id=resolved,
        baseline_excluded=excluded,
        diagnosis=diagnosis,
        milestones=milestones,
        first_date=first_date,
        last_date=last_date,
        narrative=_deterministic_narrative(resolved, milestones, excluded),
    )

    if use_llm:
        payload = {
            "inverter_id": resolved,
            "baseline_excluded": excluded,
            "summary": summary,
            "milestones": [m.model_dump() for m in milestones],
        }
        narrative = generate(json.dumps(payload), system=_LLM_SYSTEM, temperature=0.3)
        if narrative:
            timeline.narrative = narrative
            timeline.llm_generated = True
    return timeline
