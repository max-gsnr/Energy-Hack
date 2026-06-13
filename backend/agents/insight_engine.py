"""Insight Engine / Root-Cause analyzer (always runs after the model).

For every inverter it produces one actionable Finding: severity, classification,
root-cause, recommended action, priority, lost kWh, assumed-tariff EUR, and a
qualitative repair-vs-replace verdict. Deterministic core; optional Gemini polish
for the top findings only.

Respects Max's guardrails: numbers are copied from exported values; baseline-excluded
inverters are framed as pre-existing faults, never degradation-over-time.
"""

from __future__ import annotations

import json
from typing import Any

from backend.agents import adapter, config, contacts
from backend.agents import tools as tools_mod
from backend.agents.llm import generate
from backend.agents.models import (
    Classification,
    Finding,
    InverterRanking,
    RepairAssessment,
    Severity,
)

_SEVERITY_RANK = {"critical": 3, "warning": 2, "watch": 1, "normal": 0}


def classify(r: InverterRanking) -> Classification:
    if r.baseline_excluded:
        return "pre_existing_fault"
    factor = r.latest_factor if r.latest_factor is not None else 1.0
    rel = r.latest_relative_factor if r.latest_relative_factor is not None else 1.0
    if r.outage_samples >= 500:
        return "outage"
    if r.primary_status in ("critical", "warning") and (
        r.outage_samples >= 50 or (r.worst_acute_residual_z or 0) <= -4
    ):
        return "acute_fault"
    if factor < 0.92 or (factor < 0.97 and rel < 0.96):
        return "degradation"
    if r.primary_status in ("critical", "warning", "watch"):
        return "acute_fault"
    return "healthy"


def repair_assessment(r: InverterRanking, classification: Classification) -> RepairAssessment:
    factor = r.latest_factor if r.latest_factor is not None else 1.0
    if classification == "pre_existing_fault":
        return RepairAssessment(
            verdict="investigate",
            rationale=(
                "Anomalous since the start of monitoring (excluded from the healthy baseline). "
                "Inspect hardware/DC side and historical tickets before deciding repair vs replace."
            ),
        )
    if classification in ("outage", "acute_fault"):
        return RepairAssessment(
            verdict="repair_service",
            rationale=(
                f"Fault pattern with {r.outage_samples} outage and {r.error_samples} error samples; "
                "typically recoverable by service (reset, component swap, string check)."
            ),
        )
    if classification == "degradation":
        if factor < 0.80:
            return RepairAssessment(
                verdict="replace_candidate",
                rationale=f"Sustained low health factor ({factor:.2f}); decline is large enough to weigh replacement.",
            )
        return RepairAssessment(
            verdict="repair_service",
            rationale=f"Health factor {factor:.2f} below cohort/expected; inspect strings, soiling and DC side.",
        )
    return RepairAssessment(verdict="monitor", rationale="No major modeled performance issue; keep under routine monitoring.")


def _recommended_action(classification: Classification, r: InverterRanking) -> str:
    label = adapter.display_label(r.inverter_id)
    actions = {
        "outage": f"Dispatch SCADA confirmation and a field check for {label}: repeated zero-output-while-sunny suggests a tripped/faulted inverter.",
        "acute_fault": f"Triage {label} in O&M: review error codes and recent anomaly windows, then schedule on-site service if confirmed.",
        "pre_existing_fault": f"Open an inspection on {label}: pre-existing/anomalous-since-start - check inverter condition, DC side and ticket history.",
        "degradation": f"Asset-management review for {label}: confirm the health-factor decline vs cohort, inspect strings/soiling, decide repair vs replacement.",
        "curtailment_driven": f"No fault action for {label}: loss is curtailment-driven; verify with grid/PPA team.",
        "healthy": f"No action needed for {label}; continue routine monitoring.",
    }
    return actions[classification]


def _headline(classification: Classification, r: InverterRanking, eur: float) -> str:
    label = adapter.display_label(r.inverter_id)
    pretty = classification.replace("_", " ")
    return (
        f"{label}: {pretty} - {r.total_lost_kwh:,.0f} kWh modeled loss "
        f"(~EUR {eur:,.0f} at assumed tariff), health factor "
        f"{r.latest_factor if r.latest_factor is not None else 'n/a'}."
    )


def _deterministic_root_cause(classification: Classification, r: InverterRanking) -> str:
    bits = []
    if r.baseline_excluded:
        bits.append("Excluded from the 2017 healthy baseline (anomalous since start of monitoring).")
    if r.outage_samples:
        bits.append(f"{r.outage_samples} outage samples (near-zero output while irradiated).")
    if r.error_samples:
        bits.append(f"{r.error_samples} samples overlap an inverter error code.")
    if r.latest_factor is not None:
        bits.append(f"Latest rolling health factor {r.latest_factor:.2f} (relative to cohort {r.latest_relative_factor}).")
    if r.worst_acute_residual_z is not None:
        bits.append(f"Worst acute residual z = {r.worst_acute_residual_z}.")
    if not bits:
        bits.append("No strong anomaly signature in the exported run.")
    return " ".join(bits)


_LLM_SYSTEM = (
    "You are an O&M reliability engineer for a solar plant. Write a concise, factual root-cause "
    "note (2-3 sentences) for one inverter using ONLY the provided JSON evidence. Do not invent "
    "numbers. If the inverter is baseline_excluded, describe it as a pre-existing / anomalous-since-"
    "start fault, never as gradual degradation over time. No preamble."
)


def _llm_root_cause(r: InverterRanking, classification: Classification) -> str | None:
    evidence = {
        "inverter_id": r.inverter_id,
        "classification": classification,
        "baseline_excluded": r.baseline_excluded,
        "total_lost_kwh": r.total_lost_kwh,
        "lost_kwh_per_kwp": r.lost_kwh_per_kwp,
        "latest_factor": r.latest_factor,
        "latest_relative_factor": r.latest_relative_factor,
        "outage_samples": r.outage_samples,
        "error_samples": r.error_samples,
        "worst_residual_z": r.worst_residual_z,
        "worst_acute_residual_z": r.worst_acute_residual_z,
        "primary_status": r.primary_status,
    }
    return generate(json.dumps(evidence), system=_LLM_SYSTEM, temperature=0.2)


def build_findings(llm_top_n: int = 8, plant_id: str = "A") -> list[Finding]:
    rows = adapter.rankings(plant_id)
    findings: list[Finding] = []
    for r in rows:
        classification = classify(r)
        euro = tools_mod.euro_estimate(r.total_lost_kwh)
        repair = repair_assessment(r, classification)
        finding = Finding(
            finding_id=f"F-{adapter.safe_inverter_id(r.inverter_id)}",
            inverter_id=r.inverter_id,
            inverter_group=r.inverter_group,
            rank=r.rank,
            severity=r.primary_status,
            severity_color=r.status_color,
            classification=classification,
            headline=_headline(classification, r, euro.eur),
            root_cause=_deterministic_root_cause(classification, r),
            recommended_action=_recommended_action(classification, r),
            total_lost_kwh=round(r.total_lost_kwh, 2),
            lost_kwh_per_kwp=r.lost_kwh_per_kwp,
            euro=euro,
            latest_factor=r.latest_factor,
            latest_relative_factor=r.latest_relative_factor,
            baseline_excluded=r.baseline_excluded,
            repair=repair,
            evidence={
                "total_lost_kwh": r.total_lost_kwh,
                "lost_kwh_per_kwp": r.lost_kwh_per_kwp,
                "latest_factor": r.latest_factor,
                "latest_relative_factor": r.latest_relative_factor,
                "outage_samples": r.outage_samples,
                "error_samples": r.error_samples,
                "worst_residual_z": r.worst_residual_z,
                "worst_acute_residual_z": r.worst_acute_residual_z,
                "baseline_excluded": r.baseline_excluded,
                "primary_status": r.primary_status,
            },
        )
        finding.routing = contacts.route_for(finding)
        findings.append(finding)

    # Priority: severity, then EUR, then lower factor first.
    findings.sort(
        key=lambda f: (
            _SEVERITY_RANK.get(f.severity, 0),
            f.euro.eur if f.euro else 0.0,
            -(f.latest_factor if f.latest_factor is not None else 1.0),
        ),
        reverse=True,
    )
    for i, f in enumerate(findings, start=1):
        f.priority = i

    # LLM polish only the top N (cost/time control).
    if config.llm_available():
        for f in findings[: max(0, llm_top_n)]:
            r = adapter.ranking_by_id(plant_id)[f.inverter_id]
            polished = _llm_root_cause(r, f.classification)
            if polished:
                f.root_cause = polished
                f.llm_generated = True
    return findings


def actionable(findings: list[Finding]) -> list[Finding]:
    return [f for f in findings if f.classification != "healthy"]


def write_findings(findings: list[Finding]) -> dict[str, Any]:
    config.OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    payload = {
        "plant": config.PLANT_NAME,
        "tariff_eur_per_kwh": config.TARIFF_EUR_PER_KWH,
        "tariff_is_assumption": config.TARIFF_IS_ASSUMPTION,
        "total_findings": len(findings),
        "actionable_findings": len(actionable(findings)),
        "findings": [f.model_dump() for f in findings],
    }
    path = config.OUTPUT_DIR / "findings.json"
    with path.open("w", encoding="utf-8") as f:
        json.dump(payload, f, indent=2, ensure_ascii=False)
    return payload
