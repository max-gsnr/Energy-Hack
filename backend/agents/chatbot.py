"""Plant Analyst Chatbot.

Answers natural-language questions grounded in the model payloads. Uses Gemini with
automatic function calling over the tool registry; falls back to a deterministic
responder when no API key is configured.
"""

from __future__ import annotations

import json

from backend.agents import adapter
from backend.agents import tools as tools_mod
from backend.agents.llm import generate_with_tools
from backend.agents.models import ChatResponse


def _system_prompt() -> str:
    ctx = adapter.agent_context()
    guardrails = "\n".join(f"- {g}" for g in ctx.get("guardrails", []))
    return (
        "You are the SolarTwin Plant Analyst for Enerparc. Answer questions about the plant using the "
        "provided tools, which read the model's exported results. Call tools to get facts; do not rely on "
        "memory. Never invent numbers - if a value is unavailable, say so.\n\n"
        f"Plant headline: {ctx.get('plant_headline', '')}\n"
        f"Model: {ctx.get('model_summary', '')}\n\n"
        "Guardrails:\n"
        f"{guardrails}\n"
        "- EUR figures are estimates from an assumed feed-in tariff; always say so.\n"
        "- Repair-vs-replace has no cost data; keep it qualitative.\n"
        "Be concise and concrete. Cite inverter ids and numbers from tools."
    )


def _fallback(message: str) -> ChatResponse:
    ctx = adapter.agent_context()
    inverter_id = adapter.resolve_inverter_id(message)
    if inverter_id:
        r = adapter.ranking_by_id().get(inverter_id)
        if r:
            return ChatResponse(
                answer=(
                    f"{adapter.display_label(inverter_id)}: status {r.primary_status}, "
                    f"{r.total_lost_kwh:,.0f} kWh modeled loss, latest health factor {r.latest_factor}. "
                    f"{r.primary_reason} (No LLM key set, so this is a direct data lookup.)"
                ),
                used_tools=["get_inverter"],
                llm_generated=False,
            )
    top = ctx.get("top_findings", [])[:3]
    bullet = "; ".join(f"{t['inverter_id']} ({t['evidence'].get('total_lost_kwh')} kWh)" for t in top)
    return ChatResponse(
        answer=(
            f"{ctx.get('plant_headline', '')} Top loss inverters: {bullet}. "
            "Set GEMINI_API_KEY for full conversational answers."
        ),
        used_tools=["get_plant_summary"],
        llm_generated=False,
    )


def answer(message: str, history: list[dict] | None = None) -> ChatResponse:
    prompt_parts = []
    for turn in history or []:
        role = turn.get("role", "user")
        prompt_parts.append(f"{role}: {turn.get('content', '')}")
    prompt_parts.append(f"user: {message}")
    prompt = "\n".join(prompt_parts)

    text = generate_with_tools(prompt, tools=tools_mod.registry(), system=_system_prompt())
    if text:
        return ChatResponse(answer=text, grounded=True, llm_generated=True)
    return _fallback(message)
