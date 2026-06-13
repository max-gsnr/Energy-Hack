"""Enerparc stakeholder routing - single source of truth.

Contacts are taken from public sources (Enerparc team page / LinkedIn). Personal
email addresses are SYNTHETIC, generated from the observed published pattern
`f.lastname@enerparc.com` (e.g. k.schmalz@enerparc.com) and are flagged as such.
`mail@enerparc.com` is the published generic fallback.

Routing maps a finding's classification (and event mix) to an ordered recipient
chain; later entries are escalation targets.
"""

from __future__ import annotations

from backend.agents.models import Finding, Recipient

GENERIC_FALLBACK_EMAIL = "mail@enerparc.com"
_DOMAIN = "enerparc.com"


def _translit(value: str) -> str:
    table = {"ä": "ae", "ö": "oe", "ü": "ue", "ß": "ss", "é": "e"}
    out = value.lower()
    for src, dst in table.items():
        out = out.replace(src, dst)
    return "".join(ch for ch in out if ch.isalnum())


def _synthetic_email(full_name: str) -> str:
    parts = [p for p in full_name.replace(".", " ").split() if p]
    if len(parts) < 2:
        return GENERIC_FALLBACK_EMAIL
    return f"{_translit(parts[0])[0]}.{_translit(parts[-1])}@{_DOMAIN}"


def _c(name: str, role: str, department: str, company: str = "ENERPARC AG", synthetic: bool = True) -> Recipient:
    email = _synthetic_email(name) if synthetic else GENERIC_FALLBACK_EMAIL
    return Recipient(
        name=name,
        role=role,
        department=department,
        company=company,
        email=email,
        email_is_synthetic=synthetic,
    )


# --- Named contacts (public roles) -----------------------------------------
SCADA_KAUSHIK = _c("Vishal Kaushik", "SCADA Engineer", "Plant Monitoring / SCADA")
SCADA_ABDALNABE = _c("Ahmed Abdalnabe", "SCADA ASE", "Plant Monitoring / SCADA")
OM_MAY = _c("Raphael May", "Senior O&M Engineer", "O&M / Field Operations")
OM_KLIEMT = _c("Frederik Kliemt", "Senior O&M Engineer", "O&M / Field Operations")
OM_KOERNER = _c("Sonja Körner", "Senior O&M Engineer", "O&M / Field Operations")
FIELD_BEHRENDT = _c("Mathias Behrendt", "Regionalleiter (field service)", "O&M / Field Operations", company="Enerparc Service GmbH")
ASSET_KOSSMANN = _c("Paul Christian Kossmann", "Asset Manager", "Asset Management")
ASSET_GWEN = _c("Gwen Schliemann", "Financial Asset Manager", "Asset Management / Finance")
TECH_ASSET_JAVIER = _c("Javier Larios", "Head of Technical Asset Management", "Technical Asset Management")
GRID_SCHOELL = _c("Vanessa Schöll", "Teamleader Grid Connection Management", "Grid / Network")
PPA_AHRENS = _c("Nils Ahrens", "PPA Portfolio Manager", "Finance / Commercial")
ENG_STEEGE = _c("Matthias Steege", "Head of Engineering & Project Management", "Engineering")
FIN_LANGONE = _c("Marco Langone", "Head of Finance", "Finance / Commercial")
CFO_MUELLEJANS = _c("Frank Müllejans", "CFO", "Executive / Finance")
COO_MUELLER = _c("Stefan Müller", "COO", "Executive / Operations")
CEO_KOEPPEN = _c("Christoph Koeppen", "CEO", "Executive")
GENERIC = Recipient(
    name="Enerparc Corporate Contact",
    role="Generic / fallback",
    department="HQ",
    company="ENERPARC AG",
    email=GENERIC_FALLBACK_EMAIL,
    email_is_synthetic=False,
)


# classification -> ordered recipient chain (escalation later)
_ROUTING: dict[str, list[Recipient]] = {
    "outage": [SCADA_KAUSHIK, OM_MAY, FIELD_BEHRENDT, TECH_ASSET_JAVIER],
    "acute_fault": [OM_MAY, SCADA_ABDALNABE, FIELD_BEHRENDT, TECH_ASSET_JAVIER],
    "pre_existing_fault": [OM_MAY, TECH_ASSET_JAVIER, ENG_STEEGE],
    "degradation": [ASSET_KOSSMANN, TECH_ASSET_JAVIER, ENG_STEEGE],
    "curtailment_driven": [GRID_SCHOELL, PPA_AHRENS],
    "healthy": [GENERIC],
}

# financial summary escalation (used by reports)
FINANCE_CHAIN = [ASSET_GWEN, FIN_LANGONE, CFO_MUELLEJANS]
EXECUTIVE_CHAIN = [ENG_STEEGE, COO_MUELLER, CEO_KOEPPEN]


def route_for(finding: Finding) -> list[Recipient]:
    """Return the ordered recipient chain for a finding, with per-recipient reason."""
    chain = list(_ROUTING.get(finding.classification, [GENERIC]))

    # Large financial impact -> add a finance escalation target.
    if finding.total_lost_kwh >= 2000 and ASSET_GWEN not in chain:
        chain.append(ASSET_GWEN)
    # Severe / systemic -> add an executive escalation target.
    if finding.severity == "critical" and ENG_STEEGE not in chain:
        chain.append(ENG_STEEGE)

    reasons = {
        "outage": "Outage requires SCADA confirmation and field intervention.",
        "acute_fault": "Acute fault needs O&M triage and possible on-site service.",
        "pre_existing_fault": "Pre-existing/anomalous-since-start fault needs inspection and asset review.",
        "degradation": "Sustained performance decline is an asset-management decision.",
        "curtailment_driven": "Curtailment-driven loss is a grid/PPA matter, not a fault.",
        "healthy": "No major issue; informational only.",
    }
    out: list[Recipient] = []
    for rec in chain:
        out.append(rec.model_copy(update={"reason": reasons.get(finding.classification, "")}))
    return out


def all_contacts() -> list[Recipient]:
    seen: dict[str, Recipient] = {}
    for chain in _ROUTING.values():
        for rec in chain:
            seen[rec.email] = rec
    for rec in FINANCE_CHAIN + EXECUTIVE_CHAIN + [GENERIC]:
        seen[rec.email] = rec
    return list(seen.values())
