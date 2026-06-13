import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { loadAll, fmtEnergy, fmtDate, STATUS_COLOR, STATUS_LABEL, type Status, type TopEvent } from "@/lib/twin/data";
import { MotionBlock, MotionPage } from "@/components/twin/Motion";

export const Route = createFileRoute("/inverter/$id")({
  component: InverterPage,
  notFoundComponent: () => <Missing />,
  errorComponent: ({ error }) => <div className="p-10 text-sm text-muted-foreground">{error.message}</div>,
  loader: ({ params }) => {
    const all = loadAll();
    const inv = all.inverters.find(i => i.inverter_id === params.id);
    if (!inv) throw notFound();
    const ranking = all.rankings.find(r => r.inverter_id === params.id);
    const evt = all.events[params.id];
    const topEvents = all.agent.top_events.filter(e => e.inverter_id === params.id).slice(0, 8);
    const trendRows = all.degradation.inverter_years.filter(row => row.inverter_id === params.id);
    return { inv, ranking, evt, topEvents, trendRows };
  },
});

function Missing() {
  return (
    <div className="mx-auto max-w-[1280px] px-5 sm:px-8 py-16">
      <div className="eyebrow">Not found</div>
      <h1 className="mt-2 text-2xl font-semibold">Inverter not in dataset</h1>
      <Link to="/map" className="mt-4 inline-block text-[12px] mono uppercase tracking-[0.12em]">← Back to map</Link>
    </div>
  );
}

function InverterPage() {
  const { inv, ranking, evt, topEvents, trendRows } = Route.useLoaderData();
  const factor = inv.latest_factor;
  const factorPct = Math.max(0, Math.min(1.1, factor)) / 1.1 * 100;
  const trendDays = trendRows.reduce((sum, row) => sum + row.fast_degradation_days + row.slow_degradation_days, 0);
  const latestTrend = trendRows[trendRows.length - 1];

  const thresholds = [
    { from: 0, to: 0.80, label: "Critical", color: STATUS_COLOR.critical },
    { from: 0.80, to: 0.92, label: "Warning", color: STATUS_COLOR.warning },
    { from: 0.92, to: 0.97, label: "Watch", color: STATUS_COLOR.watch },
    { from: 0.97, to: 1.10, label: "Normal", color: STATUS_COLOR.normal },
  ];

  return (
    <MotionPage className="mx-auto max-w-[1280px] px-5 sm:px-8 py-10 sm:py-14">
      <Link to="/map" className="eyebrow hover:text-foreground transition-colors">← Inverter map</Link>

      {/* Header */}
      <MotionBlock className="mt-4 flex flex-col lg:flex-row lg:items-end justify-between gap-6">
        <div>
          <h1 className="mono text-[32px] sm:text-[40px] font-semibold tracking-tight leading-none">{inv.inverter_id}</h1>
          <div className="mt-3 flex flex-wrap items-center gap-3 text-[13px]">
            <span className="flex items-center gap-1.5"><span className="w-2 h-2" style={{ background: STATUS_COLOR[inv.status as Status] }} />{STATUS_LABEL[inv.status as Status]}</span>
            <span className="text-muted-foreground">·</span>
            <span className="text-muted-foreground">{inv.inverter_group}</span>
            {inv.baseline_excluded && (
              <>
                <span className="text-muted-foreground">·</span>
                <span className="mono text-[11px] uppercase tracking-[0.12em] px-1.5 py-0.5 border border-hairline rounded">Pre-existing fault</span>
              </>
            )}
            {ranking && (
              <>
                <span className="text-muted-foreground">·</span>
                <span className="num text-muted-foreground">Rank #{ranking.rank} of 65</span>
                <span className="text-muted-foreground">·</span>
                <span className="num text-muted-foreground">{ranking.pdc_kwp.toFixed(1)} kWp</span>
              </>
            )}
          </div>
        </div>
        <div className="grid grid-cols-3 gap-px bg-hairline card-flat overflow-hidden min-w-[320px]">
          <Tile label="Lost" value={fmtEnergy(inv.total_lost_kwh)} />
          <Tile label="Factor" value={factor.toFixed(3)} />
          <Tile label="kWh/kWp" value={inv.lost_kwh_per_kwp.toFixed(1)} />
        </div>
      </MotionBlock>

      {inv.baseline_excluded && (
        <MotionBlock className="mt-6 card-flat p-4 border-l-2 border-l-[color:var(--st-watch)]" delay={0.06}>
          <div className="text-[13px]">
            <span className="font-medium">Pre-existing fault.</span>{" "}
            <span className="text-muted-foreground">This inverter was already anomalous at the 2017 baseline, so it's excluded from the trained model. Its loss is not "degradation over time" — it has been faulty since monitoring began.</span>
          </div>
        </MotionBlock>
      )}

      {/* Health factor with thresholds */}
      <MotionBlock className="mt-10 card-flat p-5 sm:p-7">
        <div className="eyebrow">Health factor — current vs thresholds</div>
        <h2 className="mt-1 text-xl font-semibold">Latest factor sits at <span className="num">{factor.toFixed(3)}</span></h2>
        <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
          The health factor is the model's multiplier on expected output — <span className="num">1.00</span> is a healthy
          baseline. Threshold bands are fixed at <span className="num">0.97</span> (watch), <span className="num">0.92</span> (warning),
          and <span className="num">0.80</span> (critical).
        </p>

        <div className="mt-7">
          <div className="relative h-10 rounded-sm overflow-hidden border border-hairline">
            {thresholds.map(t => (
              <div key={t.label} className="absolute top-0 bottom-0" style={{
                left: `${(t.from / 1.1) * 100}%`,
                width: `${((t.to - t.from) / 1.1) * 100}%`,
                background: `color-mix(in oklab, ${t.color} 18%, var(--surface))`,
              }} />
            ))}
            {/* baseline 1.0 marker */}
            <div className="absolute top-0 bottom-0 w-px bg-foreground/40" style={{ left: `${(1 / 1.1) * 100}%` }}>
              <span className="absolute -top-5 -translate-x-1/2 text-[10px] mono text-muted-foreground">1.00</span>
            </div>
            {/* current */}
            <motion.div
              className="absolute top-0 bottom-0 w-[2px] bg-foreground"
              initial={{ left: "0%" }}
              animate={{ left: `${factorPct}%` }}
              transition={{ duration: 0.7, ease: "easeOut" }}
            >
              <span className="absolute -top-5 -translate-x-1/2 num text-[10px] font-medium">{factor.toFixed(3)}</span>
            </motion.div>
          </div>
          <div className="mt-2 flex justify-between text-[10px] mono text-muted-foreground">
            {[0, 0.8, 0.92, 0.97, 1.0, 1.1].map(v => <span key={v}>{v.toFixed(2)}</span>)}
          </div>
          <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-[11px]">
            {thresholds.slice().reverse().map(t => (
              <span key={t.label} className="flex items-center gap-1.5">
                <span className="w-2 h-2" style={{ background: t.color }} />{t.label}
                <span className="text-muted-foreground num">{t.from.toFixed(2)}–{t.to.toFixed(2)}</span>
              </span>
            ))}
          </div>
        </div>

        {ranking && (
          <div className="mt-8 grid grid-cols-2 sm:grid-cols-4 gap-px bg-hairline border border-hairline rounded-md overflow-hidden">
            <SubTile label="Outage samples" value={ranking.outage_samples.toLocaleString()} />
            <SubTile label="Strong samples" value={ranking.strong_samples.toLocaleString()} />
            <SubTile label="Trend days" value={trendDays.toLocaleString()} />
            <SubTile label="Error samples" value={ranking.error_samples.toLocaleString()} />
          </div>
        )}
      </MotionBlock>

      {/* Events */}
      <MotionBlock className="mt-10 grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 card-flat p-5 sm:p-7">
          <div className="eyebrow">Worst event days</div>
          <h2 className="mt-1 text-xl font-semibold">Largest single-day losses on this inverter</h2>
          {topEvents.length === 0 ? (
            <p className="mt-4 text-sm text-muted-foreground">No top-N event rows are exported for this inverter.</p>
          ) : (
            <table className="mt-5 w-full text-[13px]">
              <thead>
                <tr className="text-left text-[10.5px] mono uppercase tracking-[0.12em] text-muted-foreground">
                  <th className="font-normal pb-2">Date</th>
                  <th className="font-normal pb-2">Type</th>
                  <th className="font-normal pb-2 text-right">Expected</th>
                  <th className="font-normal pb-2 text-right">Actual</th>
                  <th className="font-normal pb-2 text-right">Lost</th>
                  <th className="font-normal pb-2 text-right">Code</th>
                </tr>
              </thead>
              <tbody>
                {(topEvents as TopEvent[]).map((e) => (
                  <motion.tr
                    key={e.date}
                    className="border-t border-hairline"
                    initial={{ opacity: 0, y: 6 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.25, ease: "easeOut" }}
                  >
                    <td className="py-2.5 num">{fmtDate(e.date)}</td>
                    <td className="py-2.5 text-muted-foreground">{e.event_type.replace("_", " ")}</td>
                    <td className="py-2.5 num text-right">{fmtEnergy(e.expected_kwh)}</td>
                    <td className="py-2.5 num text-right">{fmtEnergy(e.actual_kwh)}</td>
                    <td className="py-2.5 num text-right" style={{ color: e.severity === "critical" ? "var(--st-critical)" : undefined }}>{fmtEnergy(e.lost_kwh)}</td>
                    <td className="py-2.5 text-right">
                      {e.explained_by_error ? <span className="text-[10px] mono uppercase tracking-wider px-1.5 py-0.5 border border-hairline rounded">explained</span> : <span className="text-muted-foreground">—</span>}
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="card-flat p-5 sm:p-7">
          <div className="eyebrow">Event summary</div>
          <h2 className="mt-1 text-xl font-semibold">Lifetime counts</h2>
          {!evt ? (
            <p className="mt-4 text-sm text-muted-foreground">No event records for this inverter.</p>
          ) : (
            <dl className="mt-5 space-y-3 text-[13px]">
              <Stat label="Total events" v={evt.n.toLocaleString()} />
              <Stat label="Outages" v={evt.outage.toLocaleString()} />
              <Stat label="Acute faults" v={evt.acute_fault.toLocaleString()} />
              <Stat label="Total lost" v={fmtEnergy(evt.lost)} />
              <Stat label="First → last" v={`${fmtDate(evt.first)} → ${fmtDate(evt.last)}`} small />
            </dl>
          )}
        </div>
      </MotionBlock>

      <MotionBlock className="mt-10 card-flat p-5 sm:p-7">
        <div className="eyebrow">Chronic trend history</div>
        <h2 className="mt-1 text-xl font-semibold">
          {latestTrend ? `Latest exported trend year: ${latestTrend.year}` : "No trend rows exported"}
        </h2>
        <p className="mt-1 text-sm text-muted-foreground max-w-2xl">
          Trend days describe rolling health-factor state. They are useful for degradation
          explanation, but they are not independent acute event rows.
        </p>
        {trendRows.length > 0 && (
          <div className="mt-5 overflow-x-auto">
            <table className="w-full text-[13px] min-w-[620px]">
              <thead>
                <tr className="text-left text-[10.5px] mono uppercase tracking-[0.12em] text-muted-foreground border-b border-hairline">
                  <th className="font-normal py-2">Year</th>
                  <th className="font-normal py-2 text-right">Median factor</th>
                  <th className="font-normal py-2 text-right">Min factor</th>
                  <th className="font-normal py-2 text-right">Fast days</th>
                  <th className="font-normal py-2 text-right">Slow days</th>
                  <th className="font-normal py-2 text-right">Lost</th>
                </tr>
              </thead>
              <tbody>
                {trendRows.map(row => (
                  <motion.tr
                    key={row.year}
                    className="border-b border-hairline/60 last:border-0"
                    initial={{ opacity: 0, x: -8 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.25, ease: "easeOut" }}
                  >
                    <td className="py-2 num">{row.year}</td>
                    <td className="py-2 num text-right">{row.median_factor.toFixed(3)}</td>
                    <td className="py-2 num text-right" style={{ color: row.min_factor < 0.8 ? "var(--st-critical)" : undefined }}>{row.min_factor.toFixed(3)}</td>
                    <td className="py-2 num text-right">{row.fast_degradation_days.toLocaleString()}</td>
                    <td className="py-2 num text-right">{row.slow_degradation_days.toLocaleString()}</td>
                    <td className="py-2 num text-right">{fmtEnergy(row.lost_kwh)}</td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </MotionBlock>
    </MotionPage>
  );
}

function Tile({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-surface px-4 py-3">
      <div className="eyebrow">{label}</div>
      <div className="mt-1 num text-[18px] font-semibold leading-tight">{value}</div>
    </div>
  );
}
function SubTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-surface p-3.5">
      <div className="eyebrow">{label}</div>
      <div className="mt-1 num text-[16px]">{value}</div>
    </div>
  );
}
function Stat({ label, v, small }: { label: string; v: string; small?: boolean }) {
  return (
    <div className="flex justify-between items-baseline gap-3 border-b border-hairline pb-2.5 last:border-0">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className={`num text-right ${small ? "text-[11px]" : ""}`}>{v}</dd>
    </div>
  );
}

function Stat2() { return null; } // keep TS happy if unused
void Stat2;
