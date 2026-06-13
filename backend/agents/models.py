"""Typed data holders for the agent layer (Pydantic, per Lio conventions)."""

from __future__ import annotations

from typing import Any, Literal

from pydantic import BaseModel, Field

Severity = Literal["critical", "warning", "watch", "normal"]
Classification = Literal[
    "pre_existing_fault",
    "outage",
    "acute_fault",
    "degradation",
    "curtailment_driven",
    "healthy",
]
RepairVerdict = Literal["replace_candidate", "repair_service", "monitor", "investigate"]


class InverterRanking(BaseModel):
    inverter_id: str
    inverter_group: str = "unknown"
    rank: int = 0
    pdc_kwp: float | None = None
    total_lost_kwh: float = 0.0
    lost_kwh_per_kwp: float | None = None
    latest_factor: float | None = None
    latest_relative_factor: float | None = None
    worst_residual_z: float | None = None
    worst_acute_residual_z: float | None = None
    strong_samples: int = 0
    outage_samples: int = 0
    slow_degradation_samples: int = 0
    fast_degradation_samples: int = 0
    error_samples: int = 0
    explained_fault_samples: int = 0
    baseline_excluded: bool = False
    primary_status: Severity = "normal"
    status_color: str = "green"
    primary_reason: str = ""


class EuroEstimate(BaseModel):
    lost_kwh: float
    eur: float
    tariff_eur_per_kwh: float
    is_assumption: bool = True
    note: str = ""


class RepairAssessment(BaseModel):
    verdict: RepairVerdict
    rationale: str
    cost_data_available: bool = False
    note: str = "Qualitative recommendation - no repair/replace cost data available."


class Recipient(BaseModel):
    name: str
    role: str
    department: str
    company: str
    email: str
    email_is_synthetic: bool = True
    reason: str = ""


class Finding(BaseModel):
    """One actionable finding for an inverter (the Insight Engine's unit of output)."""

    finding_id: str
    inverter_id: str
    inverter_group: str = "unknown"
    rank: int = 0
    severity: Severity = "normal"
    severity_color: str = "green"
    classification: Classification = "healthy"
    headline: str = ""
    root_cause: str = ""
    recommended_action: str = ""
    priority: int = 0
    total_lost_kwh: float = 0.0
    lost_kwh_per_kwp: float | None = None
    euro: EuroEstimate | None = None
    latest_factor: float | None = None
    latest_relative_factor: float | None = None
    baseline_excluded: bool = False
    repair: RepairAssessment | None = None
    routing: list[Recipient] = Field(default_factory=list)
    evidence: dict[str, Any] = Field(default_factory=dict)
    llm_generated: bool = False


class TimelineMilestone(BaseModel):
    date: str
    kind: str
    detail: str
    factor: float | None = None


class InverterTimeline(BaseModel):
    inverter_id: str
    baseline_excluded: bool = False
    narrative: str = ""
    diagnosis: str = ""
    milestones: list[TimelineMilestone] = Field(default_factory=list)
    first_date: str | None = None
    last_date: str | None = None
    llm_generated: bool = False


class EmailDraft(BaseModel):
    finding_id: str
    inverter_id: str
    to_name: str
    to_email: str
    to_email_is_synthetic: bool = True
    cc: list[str] = Field(default_factory=list)
    subject: str
    body: str
    sent: bool = False
    send_channel: Literal["mock", "smtp", "none"] = "mock"
    llm_generated: bool = False


class ChatResponse(BaseModel):
    answer: str
    used_tools: list[str] = Field(default_factory=list)
    grounded: bool = True
    llm_generated: bool = False
