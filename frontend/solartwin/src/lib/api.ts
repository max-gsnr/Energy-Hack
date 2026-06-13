// Central API client – all calls go to /api/* which Next.js proxies to :8088
const BASE = '/api';

export interface PlantSummary {
  total_lost_kwh: number;
  total_lost_eur?: number;
  total_curtailment_kwh: number;
  total_curtailment_eur?: number;
  average_tariff_eur_per_kwh?: number;
  tariff_is_assumption?: boolean;
  inverter_count: number;
  critical_count?: number;
}
export interface PlantData {
  summary: PlantSummary;
  metadata: Record<string, unknown>;
  context: Record<string, unknown>;
  tariff_eur_per_kwh: number;
  tariff_is_assumption: boolean;
}
export interface HealthData {
  status: string;
  llm: boolean;
  model: string;
}
export interface InverterMapItem {
  inverter_id: string;
  display_label: string;
  row: number;
  column: number;
  status: string;
  status_color: string;
  latest_factor: number;
  latest_relative_factor: number;
  total_lost_kwh: number;
  total_lost_eur?: number;
  average_tariff_eur_per_kwh?: number;
  lost_kwh_per_kwp: number;
  primary_reason: string;
  baseline_excluded: boolean;
  inverter_group: string;
}
export interface Recipient { name: string; email: string; role: string; department: string; }
export interface EuroEstimate { eur: number; lost_kwh: number; tariff_eur_per_kwh: number; is_assumption: boolean; }
export interface Finding {
  finding_id: string;
  inverter_id: string;
  priority: number;
  severity: string;
  classification: string;
  primary_reason: string;
  total_lost_kwh: number;
  total_lost_eur?: number;
  latest_factor: number;
  euro?: EuroEstimate;
  recommended_action: string;
  routing?: Recipient[];
  repair_replace?: string;
  rank?: number;
}
export interface FindingsData {
  tariff_eur_per_kwh: number;
  tariff_is_assumption: boolean;
  total: number;
  findings: Finding[];
}
export interface Milestone { date: string; event: string; severity?: string; }
export interface TimelineData {
  inverter_id: string;
  narrative: string;
  milestones: Milestone[];
  baseline_excluded: boolean;
  total_lost_kwh: number;
}
export interface EmailDraft {
  subject: string;
  body: string;
  recipients: Recipient[];
  finding_id: string;
  finding_summary: string;
}
export interface ChatMessage { role: 'user' | 'assistant'; content: string; }
export interface ChatResponse { response: string; tools_used?: string[]; }

async function get<T>(path: string): Promise<T> {
  const r = await fetch(`${BASE}${path}`);
  if (!r.ok) throw new Error(`${path} → ${r.status}`);
  return r.json();
}
async function post<T>(path: string, body: unknown): Promise<T> {
  const r = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!r.ok) throw new Error(`${path} → ${r.status}`);
  return r.json();
}

export const api = {
  health:        ()                    => get<HealthData>('/health'),
  plant:         ()                    => get<PlantData>('/plant'),
  map:           ()                    => get<InverterMapItem[]>('/map'),
  findings:      (refresh = false)     => get<FindingsData>(`/findings${refresh ? '?refresh=true' : ''}`),
  timeline:      (id: string)          => get<TimelineData>(`/timeline/${id}`),
  dispatch:      (finding_id: string)  => post<EmailDraft>('/dispatch', { finding_id, use_llm: true }),
  chat:          (msg: string, history: ChatMessage[]) =>
                   post<ChatResponse>('/chat', { message: msg, history }),
};
