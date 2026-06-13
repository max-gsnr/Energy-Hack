"""Thin Gemini wrapper. Never raises to callers: returns None when unavailable,
so the deterministic core can take over.
"""

from __future__ import annotations

import logging
from functools import lru_cache
from typing import Any, Callable

from backend.agents import config

logger = logging.getLogger("agents.llm")


@lru_cache(maxsize=1)
def _client():
    if not config.GEMINI_API_KEY:
        return None
    try:
        from google import genai

        return genai.Client(api_key=config.GEMINI_API_KEY)
    except Exception as exc:  # pragma: no cover - defensive
        logger.warning("Gemini client init failed: %s", exc)
        return None


def generate(prompt: str, system: str | None = None, temperature: float = 0.3) -> str | None:
    """Single-shot text generation. Returns None on any failure/no key."""
    client = _client()
    if client is None:
        return None
    try:
        from google.genai import types

        resp = client.models.generate_content(
            model=config.GEMINI_MODEL,
            contents=prompt,
            config=types.GenerateContentConfig(
                system_instruction=system,
                temperature=temperature,
            ),
        )
        text = (resp.text or "").strip()
        return text or None
    except Exception as exc:
        msg = str(exc)
        if "429" in msg or "RESOURCE_EXHAUSTED" in msg:
            logger.warning("Gemini quota exhausted: %s", exc)
            return "__QUOTA_EXCEEDED__"
        logger.warning("Gemini generate failed: %s", exc)
        return None


def generate_with_tools(
    prompt: str,
    tools: list[Callable[..., Any]],
    system: str | None = None,
    temperature: float = 0.2,
) -> str | None:
    """Generation with automatic function calling. Returns None on failure/no key."""
    client = _client()
    if client is None:
        return None
    try:
        from google.genai import types

        resp = client.models.generate_content(
            model=config.GEMINI_MODEL,
            contents=prompt,
            config=types.GenerateContentConfig(
                system_instruction=system,
                temperature=temperature,
                tools=tools,
            ),
        )
        text = (resp.text or "").strip()
        return text or None
    except Exception as exc:
        logger.warning("Gemini tool-call generate failed: %s", exc)
        return None
