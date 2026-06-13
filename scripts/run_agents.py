#!/usr/bin/env python3
"""Run the SolarTwin agent layer headlessly.

Builds findings (Insight Engine), writes outputs/agents/findings.json, generates
forensic timelines for the top inverters, and drafts + mock-sends dispatch emails
for the top actionable findings.

Usage:
  python scripts/run_agents.py                 # full run, LLM polish on top findings if key set
  python scripts/run_agents.py --no-llm        # deterministic only
  python scripts/run_agents.py --top 5         # how many to dispatch/timeline
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from backend.agents import config, dispatch, insight_engine, timeline


def main() -> None:
    parser = argparse.ArgumentParser(description="Run the SolarTwin O&M agents.")
    parser.add_argument("--top", type=int, default=5, help="How many top findings to dispatch + timeline.")
    parser.add_argument("--llm-top", type=int, default=8, help="How many findings get LLM-polished root cause.")
    parser.add_argument("--no-llm", action="store_true", help="Disable all LLM calls (deterministic).")
    args = parser.parse_args()

    use_llm = not args.no_llm
    llm_top = 0 if args.no_llm else args.llm_top

    print(f"LLM available: {config.llm_available() and use_llm}  (model={config.GEMINI_MODEL})")
    print(f"Tariff: {config.TARIFF_EUR_PER_KWH} EUR/kWh  assumption={config.TARIFF_IS_ASSUMPTION}")

    findings = insight_engine.build_findings(llm_top_n=llm_top)
    payload = insight_engine.write_findings(findings)
    print(f"\nWrote {payload['total_findings']} findings ({payload['actionable_findings']} actionable) "
          f"-> {config.OUTPUT_DIR / 'findings.json'}")

    actionable = insight_engine.actionable(findings)[: args.top]

    print(f"\nTop {len(actionable)} findings:")
    for f in actionable:
        eur = f.euro.eur if f.euro else 0.0
        print(f"  #{f.priority:>2} [{f.severity:<8}] {f.inverter_id}  {f.classification:<18} "
              f"{f.total_lost_kwh:>9,.0f} kWh  ~EUR {eur:>8,.0f}  -> {f.routing[0].name if f.routing else '-'}")

    config.TIMELINE_DIR.mkdir(parents=True, exist_ok=True)
    for f in actionable:
        tl = timeline.build_timeline(f.inverter_id, use_llm=use_llm)
        out = config.TIMELINE_DIR / f"{f.finding_id}.json"
        out.write_text(json.dumps(tl.model_dump(), indent=2, ensure_ascii=False), encoding="utf-8")
    print(f"\nWrote {len(actionable)} timelines -> {config.TIMELINE_DIR}")

    drafts = [dispatch.dispatch(f, use_llm=use_llm) for f in actionable]
    print(f"\nDrafted + {'sent' if config.ENABLE_REAL_EMAIL else 'mock-sent'} {len(drafts)} emails "
          f"-> {config.EMAIL_DIR}")
    for d in drafts:
        flag = " (synthetic addr)" if d.to_email_is_synthetic else ""
        print(f"  {d.finding_id} -> {d.to_name} <{d.to_email}>{flag}")


if __name__ == "__main__":
    main()
