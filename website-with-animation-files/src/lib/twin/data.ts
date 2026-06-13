import plantSummary from "@/data/twinsight/plant_summary.json";
import inverterMap from "@/data/twinsight/inverter_map.json";
import inverterRankings from "@/data/twinsight/inverter_rankings.json";
import eventSummary from "@/data/twinsight/event_summary.json";
import eventsHistogram from "@/data/twinsight/events_histogram.json";
import degradationTrends from "@/data/twinsight/degradation_trends.json";
import agentContext from "@/data/twinsight/agent_context.json";

export type Status = "normal" | "watch" | "warning" | "critical";

export type InverterCell = {
  inverter_id: string;
  inverter_group: string;
  display_label: string;
  row: number;
  column: number;
  status: string; // raw status (may be "strong" in source — normalize)
  baseline_excluded: boolean;
  latest_factor: number;
  latest_relative_factor: number;
  lost_kwh_per_kwp: number;
  total_lost_kwh: number;
  primary_reason: string;
};
export type Inverter = Omit<InverterCell, "status"> & { status: Status };

export type Ranking = {
  rank: number;
  inverter_id: string;
  inverter_group: string;
  baseline_excluded: boolean;
  primary_status: string;
  total_lost_kwh: number;
  lost_kwh_per_kwp: number;
  latest_factor: number;
  latest_relative_factor: number;
  outage_samples: number;
  error_samples: number;
  explained_fault_samples: number;
  fast_degradation_samples: number;
  slow_degradation_samples: number;
  strong_samples: number;
  worst_residual_z: number;
  worst_acute_residual_z: number;
  primary_reason: string;
  pdc_kwp: number;
};

export type YearStat = {
  year: number;
  expected_kwh: number;
  actual_kwh: number;
  lost_kwh: number;
  curtailment_kwh: number;
  outage_samples: number;
  explained_fault_samples: number;
  strong_samples?: number;
  fast_degradation_samples?: number;
  slow_degradation_samples?: number;
};

export type PlantSummary = {
  total_actual_kwh: number;
  total_expected_kwh: number;
  total_lost_kwh: number;
  total_curtailment_kwh: number;
  yearly: YearStat[];
};

export type EventSummaryEntry = {
  outage: number; acute_fault: number;
  n: number; lost: number; explained: number; first: string; last: string;
};

export type HistogramMonth = { ym: string; critical: number; warning: number; watch: number; lost: number };

export type DegradationYear = {
  year: number;
  inverters_observed: number;
  median_factor: number;
  median_relative_factor: number;
  min_factor: number;
  min_relative_factor: number;
  inverter_years_with_fast_degradation: number;
  inverter_years_with_slow_degradation: number;
  fast_degradation_days: number;
  slow_degradation_days: number;
  lost_kwh: number;
};

export type DegradationInverterYear = {
  year: number;
  inverter_id: string;
  inverter_group: string;
  days_observed: number;
  median_factor: number;
  median_relative_factor: number;
  min_factor: number;
  min_relative_factor: number;
  fast_degradation_days: number;
  slow_degradation_days: number;
  lost_kwh: number;
};

export type DegradationTrends = {
  semantics: string;
  yearly: DegradationYear[];
  inverter_years: DegradationInverterYear[];
};

export type TopEvent = {
  date: string;
  inverter_id: string;
  inverter_group: string;
  event_type: string;
  severity: string;
  lost_kwh: number;
  expected_kwh: number;
  actual_kwh: number;
  explained_by_error: boolean;
  mean_residual_z?: number;
  year?: number;
};

export type AgentContext = {
  plant_headline: string;
  model_summary: string;
  guardrails: string[];
  answerable_questions: string[];
  baseline_excluded_inverters: string[];
  degradation_trend_summary?: DegradationYear[];
  top_findings?: { inverter_id: string; finding: string; recommended_next_action: string; evidence: Record<string, unknown> }[];
  top_events: TopEvent[];
};

function normalizeStatus(s: string): Status {
  if (s === "strong") return "normal";
  if (s === "watch" || s === "warning" || s === "critical") return s;
  return "normal";
}

export function loadAll() {
  const plant = plantSummary as PlantSummary;
  const inverters: Inverter[] = (inverterMap as InverterCell[]).map(i => ({ ...i, status: normalizeStatus(i.status) }));
  const rankings = inverterRankings as Ranking[];
  const events = eventSummary as Record<string, EventSummaryEntry>;
  const histogram = eventsHistogram as HistogramMonth[];
  const degradation = degradationTrends as DegradationTrends;
  const agent = agentContext as AgentContext;
  return { plant, inverters, rankings, events, histogram, degradation, agent };
}

export const STATUS_COLOR: Record<Status, string> = {
  normal: "var(--st-normal)",
  watch: "var(--st-watch)",
  warning: "var(--st-warning)",
  critical: "var(--st-critical)",
};
export const STATUS_LABEL: Record<Status, string> = {
  normal: "Normal", watch: "Watch", warning: "Warning", critical: "Critical",
};

// ---- Formatting helpers (tabular, smart units, signed) ----
export function fmtEnergy(kwh: number, opts: { sign?: boolean } = {}): string {
  const sign = opts.sign && kwh > 0 ? "+" : kwh < 0 ? "−" : "";
  const v = Math.abs(kwh);
  if (v >= 1_000_000) return `${sign}${(v / 1_000_000).toFixed(2)} GWh`;
  if (v >= 1_000) return `${sign}${(v / 1_000).toFixed(v >= 100_000 ? 0 : 1)} MWh`;
  return `${sign}${Math.round(v).toLocaleString("en-US")} kWh`;
}
export function fmtPct(n: number, d = 1) { return `${n >= 0 ? "" : "−"}${Math.abs(n).toFixed(d)}%`; }
export function fmtInt(n: number) { return Math.round(n).toLocaleString("en-US"); }
export function fmtDate(s: string) {
  const d = new Date(s);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}
