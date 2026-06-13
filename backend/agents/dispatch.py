"""Stakeholder Dispatch agent.

Turns a Finding into an Enerparc-tailored email to the responsible person/team, routed
via contacts.route_for. Mock-send by default (writes to outputs/agents/emails/); optional
real SMTP send to a single safe recipient when ENABLE_REAL_EMAIL=true.
"""

from __future__ import annotations

import json
import logging

from backend.agents import adapter, config
from backend.agents.llm import generate
from backend.agents.models import EmailDraft, Finding, Recipient

logger = logging.getLogger("agents.dispatch")


def _first_name(name: str) -> str:
    return name.split()[0] if name else "colleague"


def _deterministic_body(finding: Finding, rec: Recipient) -> str:
    label = adapter.display_label(finding.inverter_id)
    euro = finding.euro
    repair = finding.repair
    eur_line = (
        f"~EUR {euro.eur:,.0f} (assumed tariff {euro.tariff_eur_per_kwh} EUR/kWh - placeholder until confirmed)"
        if euro
        else "unavailable"
    )
    lines = [
        f"Dear {_first_name(rec.name)},",
        "",
        f"This is an automated finding from the SolarTwin digital-twin agent for Enerparc {config.PLANT_NAME}.",
        "",
        f"Inverter {label} ({finding.inverter_group}) - {finding.classification.replace('_', ' ')}, severity {finding.severity}.",
        "",
        "What we observed:",
        finding.root_cause,
        "",
        "Estimated impact:",
        f"- Modeled energy loss: {finding.total_lost_kwh:,.0f} kWh",
        f"- Estimated value: {eur_line}",
        f"- Latest health factor: {finding.latest_factor if finding.latest_factor is not None else 'n/a'}",
        "",
        "Recommended action:",
        finding.recommended_action,
    ]
    if repair:
        lines += [
            "",
            f"Repair vs replace (qualitative, no cost data): {repair.verdict.replace('_', ' ')} - {repair.rationale}",
        ]
    lines += [
        "",
        f"You were selected because: {rec.reason}",
        "",
        "This message was drafted by the SolarTwin O&M agent for your review before any real action is taken.",
        "",
        "Best regards,",
        config.AGENT_SENDER_NAME,
        f"Enerparc {config.PLANT_NAME} · SolarTwin",
    ]
    return "\n".join(lines)


_LLM_SYSTEM = (
    "You draft a concise, professional O&M email (English) from an automated solar digital-twin agent "
    "to a named Enerparc colleague. Use ONLY the provided JSON facts; never invent numbers. Always state "
    "that EUR is an assumed-tariff estimate, and that repair-vs-replace has no cost data and is qualitative. "
    "Keep it under ~180 words, with a clear recommended action and a short rationale for why this person was "
    "contacted. Sign as the SolarTwin O&M Agent. Return only the email body (no subject line)."
)


def draft_email(finding: Finding, use_llm: bool = True) -> EmailDraft:
    routing = finding.routing or []
    rec = routing[0] if routing else Recipient(
        name="Enerparc Corporate Contact",
        role="Generic",
        department="HQ",
        company="ENERPARC AG",
        email="mail@enerparc.com",
        email_is_synthetic=False,
        reason="No specific owner resolved.",
    )
    label = adapter.display_label(finding.inverter_id)
    subject = f"[SolarTwin] {finding.severity.upper()} - {label} {finding.classification.replace('_', ' ')} (~{finding.total_lost_kwh:,.0f} kWh)"
    body = _deterministic_body(finding, rec)
    llm_used = False

    if use_llm:
        facts = {
            "recipient_name": rec.name,
            "recipient_role": rec.role,
            "recipient_reason": rec.reason,
            "plant": config.PLANT_NAME,
            "inverter": label,
            "inverter_group": finding.inverter_group,
            "classification": finding.classification,
            "severity": finding.severity,
            "root_cause": finding.root_cause,
            "recommended_action": finding.recommended_action,
            "total_lost_kwh": finding.total_lost_kwh,
            "eur_estimate": finding.euro.eur if finding.euro else None,
            "tariff_eur_per_kwh": finding.euro.tariff_eur_per_kwh if finding.euro else None,
            "latest_factor": finding.latest_factor,
            "repair_verdict": finding.repair.verdict if finding.repair else None,
            "repair_rationale": finding.repair.rationale if finding.repair else None,
        }
        generated = generate(json.dumps(facts), system=_LLM_SYSTEM, temperature=0.4)
        if generated:
            body = generated
            llm_used = True

    return EmailDraft(
        finding_id=finding.finding_id,
        inverter_id=finding.inverter_id,
        to_name=rec.name,
        to_email=rec.email,
        to_email_is_synthetic=rec.email_is_synthetic,
        cc=[r.email for r in routing[1:3]],
        subject=subject,
        body=body,
        llm_generated=llm_used,
    )


def mock_send(draft: EmailDraft) -> EmailDraft:
    config.EMAIL_DIR.mkdir(parents=True, exist_ok=True)
    path = config.EMAIL_DIR / f"{draft.finding_id}.md"
    synthetic_note = " (SYNTHETIC demo address)" if draft.to_email_is_synthetic else ""
    content = (
        f"To: {draft.to_name} <{draft.to_email}>{synthetic_note}\n"
        f"Cc: {', '.join(draft.cc) if draft.cc else '-'}\n"
        f"From: {config.AGENT_SENDER_NAME} <{config.SMTP_FROM}>\n"
        f"Subject: {draft.subject}\n\n"
        f"{draft.body}\n"
    )
    path.write_text(content, encoding="utf-8")
    draft.sent = True
    draft.send_channel = "mock"
    return draft


def smtp_send(draft: EmailDraft) -> EmailDraft:
    """Real send to the single configured SMTP_TO recipient (never the synthetic address)."""
    if not (config.ENABLE_REAL_EMAIL and config.SMTP_HOST and config.SMTP_TO):
        return mock_send(draft)
    import smtplib
    from email.mime.text import MIMEText

    msg = MIMEText(draft.body)
    msg["Subject"] = draft.subject
    msg["From"] = config.SMTP_FROM
    msg["To"] = config.SMTP_TO  # safe override, not the synthetic address
    try:
        with smtplib.SMTP(config.SMTP_HOST, config.SMTP_PORT) as server:
            server.starttls()
            if config.SMTP_USER:
                server.login(config.SMTP_USER, config.SMTP_PASSWORD)
            server.sendmail(config.SMTP_FROM, [config.SMTP_TO], msg.as_string())
        draft.sent = True
        draft.send_channel = "smtp"
    except Exception as exc:
        logger.warning("SMTP send failed (%s); falling back to mock.", exc)
        return mock_send(draft)
    return draft


def dispatch(finding: Finding, use_llm: bool = True) -> EmailDraft:
    draft = draft_email(finding, use_llm=use_llm)
    if config.ENABLE_REAL_EMAIL:
        return smtp_send(draft)
    return mock_send(draft)
