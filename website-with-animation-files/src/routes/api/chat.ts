import { createFileRoute } from "@tanstack/react-router";
import { convertToModelMessages, streamText, type UIMessage } from "ai";
import { createLovableAiGatewayProvider } from "@/lib/ai-gateway.server";
import plantSummary from "@/data/twinsight/plant_summary.json";
import inverterRankings from "@/data/twinsight/inverter_rankings.json";
import agentContext from "@/data/twinsight/agent_context.json";
import eventSummary from "@/data/twinsight/event_summary.json";

function buildSystemPrompt() {
  const plant = plantSummary as Record<string, unknown>;
  const agent = agentContext as Record<string, unknown>;
  const rankings = inverterRankings as Array<Record<string, unknown>>;
  const top12 = rankings.slice(0, 12).map(r => ({
    id: r.inverter_id, status: r.primary_status, lost_kwh: r.total_lost_kwh,
    factor: r.latest_factor, pre_existing: r.baseline_excluded, reason: r.primary_reason,
  }));
  const evtSummary = Object.fromEntries(
    Object.entries(eventSummary as Record<string, Record<string, unknown>>).slice(0, 14)
  );
  return `You are the AI analyst for Plant A, a 65-inverter solar plant scored 2019–2025 against a frozen 2017 digital twin baseline.

HARD RULES:
- Every numeric claim must come from the DATA below. Never invent numbers.
- If a value is not in the data, say "that's not in the current dataset".
- For inverters listed in BASELINE_EXCLUDED, say "pre-existing fault, faulty since 2017", never "degraded over time".
- Performance loss EXCLUDES curtailment. Curtailment is deliberate grid throttling, not a fault.
- Reconciliation invariant: delivered + performance_loss + curtailment ≈ expected.
- Be concise and precise. Use units (kWh, MWh, GWh, %). Cite inverter IDs (e.g., INV 01.07.047).
- Do NOT invent a "degradation rate %/yr". The model does not export that.

PLANT TOTALS:
${JSON.stringify({
  expected_kwh: plant.total_expected_kwh,
  delivered_kwh: plant.total_actual_kwh,
  performance_loss_kwh: plant.total_lost_kwh,
  curtailment_kwh: plant.total_curtailment_kwh,
  yearly: plant.yearly,
}, null, 2)}

AGENT CONTEXT:
${JSON.stringify({
  headline: agent.plant_headline,
  model: agent.model_summary,
  guardrails: agent.guardrails,
  baseline_excluded: agent.baseline_excluded_inverters,
  findings: agent.top_findings,
  top_events: (agent.top_events as unknown[])?.slice(0, 10),
}, null, 2)}

TOP INVERTERS BY MODELED LOSS:
${JSON.stringify(top12, null, 2)}

EVENT SUMMARY (top inverters):
${JSON.stringify(evtSummary, null, 2)}`;
}

export const Route = createFileRoute("/api/chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const body = (await request.json()) as { messages?: UIMessage[] };
        if (!Array.isArray(body.messages)) return new Response("messages required", { status: 400 });
        const key = process.env.LOVABLE_API_KEY;
        if (!key) return new Response("Missing LOVABLE_API_KEY", { status: 500 });
        const gateway = createLovableAiGatewayProvider(key);
        const result = streamText({
          model: gateway("google/gemini-3-flash-preview"),
          system: buildSystemPrompt(),
          messages: await convertToModelMessages(body.messages),
        });
        return result.toUIMessageStreamResponse({ originalMessages: body.messages });
      },
    },
  },
});
