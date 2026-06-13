"""FastAPI server for the agent console.

Serves the SolarTwin frontend at / and the agent API at /api/*.

Endpoints:
  GET  /                        → SolarTwin.html
  GET  /api/health
  GET  /api/plant?plant=A|B
  GET  /api/map?plant=A|B
  GET  /api/contacts
  GET  /api/findings?plant=A|B
  GET  /api/findings/{finding_id}?plant=A|B
  GET  /api/timeline/{inverter_id}?plant=A|B
  POST /api/dispatch
  POST /api/chat
"""

from __future__ import annotations

from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

from backend.agents import adapter, chatbot, config, contacts, dispatch, insight_engine, timeline
from backend.agents.models import Finding

# Path to the Claude Design frontend directory
FRONTEND_DIR = Path(__file__).resolve().parents[2] / "test 2" / "project"

app = FastAPI(title="SolarTwin Agent API", version="0.1.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── findings cache per plant ──────────────────────────────────────────────────
_FINDINGS: dict[str, list[Finding]] = {}


def get_findings(plant_id: str = "A", refresh: bool = False) -> list[Finding]:
    key = plant_id.upper()
    if key not in _FINDINGS or refresh:
        _FINDINGS[key] = insight_engine.build_findings(llm_top_n=0, plant_id=key)
    return _FINDINGS[key]


# ── request models ────────────────────────────────────────────────────────────
class ChatRequest(BaseModel):
    message: str
    history: list[dict] = []


class ChatDirectRequest(BaseModel):
    prompt: str


class DispatchRequest(BaseModel):
    finding_id: str
    use_llm: bool = True


# ── frontend ──────────────────────────────────────────────────────────────────
@app.get("/", include_in_schema=False)
def root() -> FileResponse:
    return FileResponse(FRONTEND_DIR / "SolarTwin.html")


# ── API routes ────────────────────────────────────────────────────────────────
@app.get("/api/health")
def health() -> dict:
    return {"status": "ok", "llm": config.llm_available(), "model": config.GEMINI_MODEL}


@app.get("/api/plant")
def plant(plant: str = "A") -> dict:
    pid = plant.upper()
    summary = adapter.plant_summary(pid)
    return {
        "plant_id": pid,
        "summary": summary,
        "metadata": adapter.model_metadata(pid),
        "context": adapter.agent_context(pid),
        "tariff_eur_per_kwh": summary.get("average_tariff_eur_per_kwh", config.TARIFF_EUR_PER_KWH),
        "tariff_is_assumption": summary.get("tariff_is_assumption", config.TARIFF_IS_ASSUMPTION),
        "tariff_source": summary.get("tariff_source", "fallback"),
    }


@app.get("/api/map")
def plant_map(plant: str = "A") -> list:
    return adapter.inverter_map(plant.upper())


@app.get("/api/contacts")
def contact_list() -> list:
    return [c.model_dump() for c in contacts.all_contacts()]


@app.get("/api/findings")
def findings(plant: str = "A", refresh: bool = False, include_normal: bool = False) -> dict:
    items = get_findings(plant_id=plant, refresh=refresh)
    summary = adapter.plant_summary(plant.upper())
    # An "anomaly" is a flagged inverter. Inverters tracking the expected
    # degradation envelope (severity "normal") are NOT anomalies and are excluded
    # by default so the count/list match the map. Pass include_normal=true for all.
    if not include_normal:
        items = [f for f in items if f.severity != "normal"]
    return {
        "plant_id": plant.upper(),
        "tariff_eur_per_kwh": summary.get("average_tariff_eur_per_kwh", config.TARIFF_EUR_PER_KWH),
        "tariff_is_assumption": summary.get("tariff_is_assumption", config.TARIFF_IS_ASSUMPTION),
        "total": len(items),
        "findings": [f.model_dump() for f in items],
    }


@app.get("/api/findings/{finding_id}")
def finding_detail(finding_id: str, plant: str = "A") -> dict:
    for f in get_findings(plant_id=plant):
        if f.finding_id == finding_id:
            return f.model_dump()
    raise HTTPException(status_code=404, detail=f"unknown finding {finding_id}")


@app.get("/api/timeline/{inverter_id}")
def inverter_timeline(inverter_id: str, plant: str = "A", llm: bool = True) -> dict:
    pid = plant.upper()
    resolved = adapter.resolve_inverter_id(inverter_id, pid)
    if resolved is None:
        raise HTTPException(status_code=404, detail=f"unknown inverter {inverter_id}")
    return timeline.build_timeline(resolved, use_llm=llm, plant_id=pid).model_dump()


@app.post("/api/dispatch")
def dispatch_finding(req: DispatchRequest) -> dict:
    # Search across both plants
    target = None
    for pid in ("A", "B"):
        target = next((f for f in get_findings(plant_id=pid) if f.finding_id == req.finding_id), None)
        if target:
            break
    if target is None:
        raise HTTPException(status_code=404, detail=f"unknown finding {req.finding_id}")
    draft = dispatch.dispatch(target, use_llm=req.use_llm)
    return draft.model_dump()


@app.post("/api/chat")
def chat(req: ChatRequest) -> dict:
    return chatbot.answer(req.message, history=req.history).model_dump()


@app.post("/api/chat-direct")
def chat_direct(req: ChatDirectRequest) -> dict:
    """Accept a pre-built prompt from the browser (system + grounding + history already included)
    and pass it straight to Gemini — no extra system prompt added server-side."""
    from backend.agents.llm import generate
    text = generate(req.prompt, system=None, temperature=0.3)
    if text == "__QUOTA_EXCEEDED__":
        return {"reply": (
            "**API quota reached.** The free-tier Gemini key has hit its daily limit (20 req/day). "
            "The key is valid — the assistant will work again once the quota resets (midnight Pacific), "
            "or you can swap in a paid API key in `.env`."
        )}
    if text:
        return {"reply": text}
    return {"reply": (
        "No Gemini API key is configured. Add `GEMINI_API_KEY=<your key>` to `.env` "
        "and restart the server to enable the SolarTwin Assistant."
    )}


# ── static files (JS, CSS, assets) — mounted last so /api/* routes take priority
app.mount("/", StaticFiles(directory=str(FRONTEND_DIR), html=True), name="frontend")
