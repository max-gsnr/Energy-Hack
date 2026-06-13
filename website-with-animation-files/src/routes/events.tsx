import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { loadAll, fmtEnergy, fmtDate } from "@/lib/twin/data";
import { MotionBlock, MotionPage } from "@/components/twin/Motion";

export const Route = createFileRoute("/events")({ component: EventsPage });

type SeverityFilter = "all" | "critical" | "warning";
type TypeFilter = "all" | "outage" | "acute_fault";

function EventsPage() {
  const { agent, histogram, degradation } = loadAll();
  const allEvents = agent.top_events;
  const years = useMemo(() => {
    const ys = new Set<number>();
    for (const e of allEvents) ys.add(new Date(e.date).getFullYear());
    return Array.from(ys).sort();
  }, [allEvents]);

  const [year, setYear] = useState<number | "all">("all");
  const [sev, setSev] = useState<SeverityFilter>("all");
  const [type, setType] = useState<TypeFilter>("all");

  const filtered = useMemo(() => allEvents.filter(e => {
    if (year !== "all" && new Date(e.date).getFullYear() !== year) return false;
    if (sev !== "all" && e.severity !== sev) return false;
    if (type !== "all" && e.event_type !== type) return false;
    return true;
  }).sort((a, b) => b.lost_kwh - a.lost_kwh), [allEvents, year, sev, type]);

  const maxLost = Math.max(...filtered.map(e => e.lost_kwh), 1);

  // Histogram bars by year
  const monthsByYear = useMemo(() => {
    const m = new Map<number, typeof histogram>();
    for (const h of histogram) {
      const y = Number(h.ym.slice(0, 4));
      if (!m.has(y)) m.set(y, []);
      m.get(y)!.push(h);
    }
    return Array.from(m.entries()).sort((a, b) => a[0] - b[0]);
  }, [histogram]);

  const maxMonthly = Math.max(...histogram.map(h => h.critical + h.warning + h.watch), 1);
  const trendYears = degradation.yearly;

  return (
    <MotionPage className="mx-auto max-w-[1280px] px-5 sm:px-8 py-10 sm:py-14">
      <MotionBlock className="max-w-3xl">
        <div className="eyebrow">Events</div>
        <h1 className="mt-3 text-[28px] sm:text-[36px] font-semibold tracking-tight leading-[1.15]">
          Acute event ledger, separated from chronic trend state.
        </h1>
        <p className="mt-3 text-sm text-muted-foreground max-w-2xl">
          Outages and acute faults are event rows. Rolling degradation is summarized below as
          health-factor trend state so it does not inflate the event count.
        </p>
      </MotionBlock>

      {/* Histogram */}
      <MotionBlock className="mt-10 card-flat p-5 sm:p-7">
        <div className="flex items-baseline justify-between mb-4">
          <div>
            <div className="eyebrow">Monthly event density</div>
            <h2 className="mt-1 text-lg font-semibold">Discrete outages and acute faults by month.</h2>
          </div>
          <div className="hidden sm:flex items-center gap-4 text-[11px] mono uppercase tracking-[0.12em] text-muted-foreground">
            <span className="flex items-center gap-1.5"><span className="w-3 h-2" style={{ background: "var(--st-critical)" }} />Critical</span>
            <span className="flex items-center gap-1.5"><span className="w-3 h-2" style={{ background: "var(--st-warning)" }} />Warning</span>
            <span className="flex items-center gap-1.5"><span className="w-3 h-2" style={{ background: "var(--st-watch)" }} />Watch</span>
          </div>
        </div>
        <p className="text-[12px] text-muted-foreground mb-4 max-w-2xl">
          Bar heights use a square-root scale so the dense 2019 outage period does not crush
          smaller later events into invisibility. Chronic degradation is not included here.
        </p>
        <div className="flex items-end gap-3 overflow-x-auto pb-2">
          {monthsByYear.map(([y, months]) => {
            const byMonth = new Map(months.map(m => [Number(m.ym.slice(5, 7)), m]));
            const filled = Array.from({ length: 12 }, (_, i) => byMonth.get(i + 1) ?? { ym: `${y}-${String(i+1).padStart(2,"0")}`, critical: 0, warning: 0, watch: 0, lost: 0 });
            const yearTotal = filled.reduce((s, m) => s + m.critical + m.warning + m.watch, 0);
            const scale = (n: number) => n <= 0 ? 0 : Math.max(1.5, (Math.sqrt(n) / Math.sqrt(maxMonthly)) * 120);
            return (
              <div key={y} className="shrink-0">
                <div className="flex items-end gap-[2px] h-[120px]">
                  {filled.map(m => {
                    const cH = scale(m.critical);
                    const wH = scale(m.warning);
                    const aH = scale(m.watch);
                    return (
                      <motion.div
                        key={m.ym}
                        className="w-[6px] flex flex-col-reverse"
                        title={`${m.ym}\nCrit ${m.critical} · Warn ${m.warning} · Watch ${m.watch}\nLost ${fmtEnergy(m.lost)}`}
                        initial={{ scaleY: 0, opacity: 0.35 }}
                        whileInView={{ scaleY: 1, opacity: 1 }}
                        viewport={{ once: true, margin: "-80px" }}
                        transition={{ duration: 0.36, ease: "easeOut" }}
                        style={{ transformOrigin: "bottom" }}
                      >
                        <div style={{ height: `${aH}px`, background: "var(--st-watch)" }} />
                        <div style={{ height: `${wH}px`, background: "var(--st-warning)" }} />
                        <div style={{ height: `${cH}px`, background: "var(--st-critical)" }} />
                      </motion.div>
                    );
                  })}
                </div>
                <div className="text-[10px] mono text-muted-foreground text-center mt-2">{y}</div>
                <div className="text-[9.5px] mono text-muted-foreground/70 text-center num">{yearTotal.toLocaleString()}</div>
              </div>
            );
          })}
        </div>
        <div className="mt-3 text-[10.5px] mono uppercase tracking-[0.12em] text-muted-foreground">
          √-scaled · numbers below each year = acute event rows
        </div>
      </MotionBlock>

      {/* Yearly totals — derived from acute-event histogram */}
      <MotionBlock className="mt-10 card-flat p-5 sm:p-7">
        <div className="eyebrow">By year · 2019 – 2025</div>
        <h2 className="mt-1 text-lg font-semibold">Acute event rows and event lost energy.</h2>
        <div className="mt-5 overflow-x-auto">
          <table className="w-full text-[13px] min-w-[520px]">
            <thead>
              <tr className="text-left text-[10.5px] mono uppercase tracking-[0.12em] text-muted-foreground border-b border-hairline">
                <th className="font-normal py-2">Year</th>
                <th className="font-normal py-2 text-right">Critical</th>
                <th className="font-normal py-2 text-right">Warning</th>
                <th className="font-normal py-2 text-right">Watch</th>
                <th className="font-normal py-2 text-right">Lost</th>
              </tr>
            </thead>
            <tbody>
              {monthsByYear.map(([y, months]) => {
                const tot = months.reduce((s, m) => ({
                  c: s.c + m.critical, w: s.w + m.warning, a: s.a + m.watch, l: s.l + m.lost,
                }), { c: 0, w: 0, a: 0, l: 0 });
                return (
                  <motion.tr
                    key={y}
                    className="border-b border-hairline/60 last:border-0"
                    initial={{ opacity: 0, x: -8 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.28, ease: "easeOut" }}
                  >
                    <td className="py-2 num">{y}</td>
                    <td className="py-2 num text-right" style={{ color: tot.c > 0 ? "var(--st-critical)" : undefined }}>{tot.c.toLocaleString()}</td>
                    <td className="py-2 num text-right" style={{ color: tot.w > 0 ? "var(--st-warning)" : "var(--muted-foreground)" }}>{tot.w.toLocaleString()}</td>
                    <td className="py-2 num text-right text-muted-foreground">{tot.a.toLocaleString()}</td>
                    <td className="py-2 num text-right">{fmtEnergy(tot.l)}</td>
                  </motion.tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </MotionBlock>

      {/* Chronic trends */}
      <MotionBlock className="mt-10 card-flat p-5 sm:p-7">
        <div className="eyebrow">Chronic trend layer</div>
        <h2 className="mt-1 text-lg font-semibold">Rolling health-factor state, not independent failures.</h2>
        <p className="mt-2 text-[12px] text-muted-foreground max-w-2xl">
          This table preserves the degradation signal without making 2019–2020 look like
          thousands of separate faults. Use these values for trend bands, factor charts, and
          fleet-health explanations.
        </p>
        <div className="mt-5 overflow-x-auto">
          <table className="w-full text-[13px] min-w-[640px]">
            <thead>
              <tr className="text-left text-[10.5px] mono uppercase tracking-[0.12em] text-muted-foreground border-b border-hairline">
                <th className="font-normal py-2">Year</th>
                <th className="font-normal py-2 text-right">Median factor</th>
                <th className="font-normal py-2 text-right">Min factor</th>
                <th className="font-normal py-2 text-right">Fast trend days</th>
                <th className="font-normal py-2 text-right">Affected inverters</th>
                <th className="font-normal py-2 text-right">Trend-layer loss</th>
              </tr>
            </thead>
            <tbody>
              {trendYears.map(row => (
                <motion.tr
                  key={row.year}
                  className="border-b border-hairline/60 last:border-0"
                  initial={{ opacity: 0, x: -8 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.28, ease: "easeOut" }}
                >
                  <td className="py-2 num">{row.year}</td>
                  <td className="py-2 num text-right">{row.median_factor.toFixed(3)}</td>
                  <td className="py-2 num text-right" style={{ color: row.min_factor < 0.8 ? "var(--st-critical)" : undefined }}>{row.min_factor.toFixed(3)}</td>
                  <td className="py-2 num text-right">{row.fast_degradation_days.toLocaleString()}</td>
                  <td className="py-2 num text-right">{row.inverter_years_with_fast_degradation.toLocaleString()}</td>
                  <td className="py-2 num text-right">{fmtEnergy(row.lost_kwh)}</td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      </MotionBlock>

      {/* Filters */}
      <MotionBlock className="mt-10">
        <div className="flex items-baseline justify-between mb-4 gap-4">
          <div>
            <div className="eyebrow">Highest-impact event days</div>
            <h2 className="mt-1 text-lg font-semibold">The ten single days that cost the most energy.</h2>
            <p className="mt-1 text-[12.5px] text-muted-foreground max-w-xl">
              All ten fall in 2019 — the commissioning year dominates the ranking. Post-2019
              events were smaller in magnitude; see the yearly table above for the full record.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <FilterGroup label="Year">
            <Chip active={year === "all"} onClick={() => setYear("all")}>All</Chip>
            {years.map(y => (
              <Chip key={y} active={year === y} onClick={() => setYear(y)}>{y}</Chip>
            ))}
          </FilterGroup>
          <span className="mx-1 h-5 w-px bg-hairline" />
          <FilterGroup label="Severity">
            <Chip active={sev === "all"} onClick={() => setSev("all")}>All</Chip>
            <Chip active={sev === "critical"} onClick={() => setSev("critical")} dot="var(--st-critical)">Critical</Chip>
            <Chip active={sev === "warning"} onClick={() => setSev("warning")} dot="var(--st-warning)">Warning</Chip>
          </FilterGroup>
          <span className="mx-1 h-5 w-px bg-hairline" />
          <FilterGroup label="Type">
            <Chip active={type === "all"} onClick={() => setType("all")}>All</Chip>
            <Chip active={type === "outage"} onClick={() => setType("outage")}>Outage</Chip>
            <Chip active={type === "acute_fault"} onClick={() => setType("acute_fault")}>Acute fault</Chip>
          </FilterGroup>
        </div>

        {/* Table */}
        <div className="mt-6 card-flat overflow-hidden">
          <table className="w-full text-[13px]">
            <thead className="bg-secondary/40">
              <tr className="text-left text-[10.5px] mono uppercase tracking-[0.12em] text-muted-foreground">
                <th className="font-normal px-4 py-2.5">Date</th>
                <th className="font-normal px-4 py-2.5">Inverter</th>
                <th className="font-normal px-4 py-2.5">Type</th>
                <th className="font-normal px-4 py-2.5">Severity</th>
                <th className="font-normal px-4 py-2.5 text-right">Lost</th>
                <th className="font-normal px-4 py-2.5"></th>
                <th className="font-normal px-4 py-2.5 text-right">Code</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(e => {
                const w = (e.lost_kwh / maxLost) * 100;
                const sevColor = e.severity === "critical" ? "var(--st-critical)" : e.severity === "warning" ? "var(--st-warning)" : "var(--st-watch)";
                return (
                  <motion.tr
                    key={`${e.date}-${e.inverter_id}`}
                    className="border-t border-hairline hover:bg-secondary/50 transition-colors"
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.22, ease: "easeOut" }}
                  >
                    <td className="px-4 py-2.5 num whitespace-nowrap">{fmtDate(e.date)}</td>
                    <td className="px-4 py-2.5">
                      <Link to="/inverter/$id" params={{ id: e.inverter_id }} className="mono hover:text-amber transition-colors">{e.inverter_id}</Link>
                    </td>
                    <td className="px-4 py-2.5 text-muted-foreground capitalize">{e.event_type.replace("_", " ")}</td>
                    <td className="px-4 py-2.5">
                      <span className="flex items-center gap-1.5 text-[12px]">
                        <span className="w-1.5 h-1.5" style={{ background: sevColor }} /><span className="capitalize">{e.severity}</span>
                      </span>
                    </td>
                    <td className="px-4 py-2.5 num text-right whitespace-nowrap">{fmtEnergy(e.lost_kwh)}</td>
                    <td className="px-4 py-2.5 w-[120px]">
                      <div className="h-[3px] bg-secondary rounded-full overflow-hidden">
                        <div className="bar-grow h-full" style={{ width: `${w}%`, background: sevColor }} />
                      </div>
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      {e.explained_by_error ? <span className="text-[10px] mono uppercase tracking-wider px-1.5 py-0.5 border border-hairline rounded">explained</span> : <span className="text-muted-foreground">—</span>}
                    </td>
                  </motion.tr>
                );
              })}
              {filtered.length === 0 && (
                <tr><td colSpan={7} className="px-4 py-10 text-center text-sm text-muted-foreground">No events match the current filters.</td></tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="mt-3 text-[11px] mono text-muted-foreground">
          {filtered.length} of {allEvents.length} top events shown · sorted by lost energy
        </div>
      </MotionBlock>
    </MotionPage>
  );
}

function FilterGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-[10.5px] mono uppercase tracking-[0.12em] text-muted-foreground mr-1">{label}</span>
      {children}
    </div>
  );
}
function Chip({ active, onClick, children, dot }: { active: boolean; onClick: () => void; children: React.ReactNode; dot?: string }) {
  return (
    <button onClick={onClick} className={`text-[12px] px-2.5 py-1 rounded-md border flex items-center gap-1.5 transition-colors ${active ? "bg-foreground text-background border-foreground" : "border-hairline hover:bg-secondary"}`}>
      {dot && <span className="w-1.5 h-1.5" style={{ background: dot }} />}
      {children}
    </button>
  );
}
