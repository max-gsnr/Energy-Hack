# Agent Patterns (reference notes)

These are general multi-agent engineering patterns I'm applying to the SolarTwin agent layer.
They are written in my own words as architectural guidance. No proprietary code, prompts, or
business logic from any external codebase is reproduced here; only well-known, reusable
engineering ideas.

## 1. Stepwise, resumable agent state

Model an agent run as an ordered list of named steps, each with a status
(`not_started -> running -> finished | failed | cancelled`), timestamps, and a result blob.
The runner walks the steps and stops early when a step needs human interaction or the run is
cancelled. Shared state accumulates in a single task object that every step can read/update.

Why: it makes long agent workflows observable, debuggable, and pausable for human approval.

Applied to SolarTwin: the dispatch flow is `investigate -> decide -> draft -> (await approval) -> send`.
The "await approval" step is exactly this pause point.

## 2. Self-declaring tool registry

Each tool is a small class/function that carries its own metadata: a stable string `key`, a
short description, an input schema, and the callable. Tools register themselves into a central
registry at import time; the runtime and any UI discover tools from that single source of truth
instead of a hand-maintained dispatch table.

Why: adding a tool is one file; nothing else needs editing. Avoids drift between "tools that
exist" and "tools the agent knows about".

Applied to SolarTwin: `backend/agents/tools/` exposes a registry of typed tools
(query findings/events, get inverter detail, euro conversion, draft email, mock send).

## 3. Schema-introspection + typed query pair

For letting an LLM query structured data safely, expose two tools:
- `describe_*` -> returns the catalogue (entities, fields, operators) so the model can form a
  valid query.
- `query_*` -> runs a typed, constrained query (explicit field/operator/values), never free SQL.

Keep the docstring rich: the docstring IS the instruction the model reads, so it should explain
when to use list vs aggregate, give examples, and warn against guessing.

Applied to SolarTwin: the chatbot uses typed tools over the already-structured payloads
(rankings, events, inverter details) rather than free-form SQL, so answers stay grounded.

## 4. Grounding and guardrails

Pass the model a compact, trusted context block and explicit guardrails ("every number must be
copied from provided values; if unavailable, say unknown"). Prefer retrieving the relevant
records and asking the model to reason over them to hallucinating from memory.

Applied to SolarTwin: we reuse the model's own `agent_context.json` guardrails and never let the
LLM invent metrics. EUR uses an explicitly-labeled assumed tariff; repair-vs-replace is
qualitative because no cost data exists.

## 5. Deterministic core, LLM polish

Compute the decision-relevant fields deterministically (severity, classification, ranking,
euro, repair-vs-replace heuristic). Use the LLM only to turn those facts into readable prose
(root-cause explanation, email body, chat answers). The system stays fully functional with no
API key; the LLM is an enhancement, not a dependency.

## 6. Conventions

- Pydantic `BaseModel` for data holders; `Literal[...]` for small closed sets instead of enums.
- Imports at top; small focused modules.
- Docstrings on tools are written for the model, not just for developers.
- Single source of truth for shared data (e.g. the contacts routing table).
