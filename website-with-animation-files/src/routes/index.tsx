import { createFileRoute, Link } from "@tanstack/react-router";
import { loadAll, fmtEnergy, fmtPct, STATUS_COLOR, STATUS_LABEL, type Status } from "@/lib/twin/data";
import { YearlyEnergyChart } from "@/components/twin/YearlyEnergyChart";
import { ExpectedVsActualChart } from "@/components/twin/ExpectedVsActualChart";
import { ReconBar } from "@/components/twin/ReconBar";
import { MotionBlock, MotionItem, MotionList, MotionPage } from "@/components/twin/Motion";

export const Route = createFileRoute("/")({ component: OverviewPage });

function OverviewPage() {
  const { plant, rankings, inverters, histogram, degradation } = loadAll();
  const expected = plant.total_expected_kwh;
  const delivered = plant.total_actual_kwh;
  const loss = plant.total_lost_kwh;
  const curt = plant.total_curtailment_kwh;
  const deliveredPct = (delivered / expected) * 100;
  const lossPct = (loss / expected) * 100;
  const curtPct = (curt / expected) * 100;

  const worst6 = rankings.slice(0, 6);
  const worstMax = Math.max(...worst6.map(r => r.total_lost_kwh));
  const acuteEvents = histogram.reduce((sum, row) => sum + row.critical + row.warning + row.watch, 0);
  const acuteLost = histogram.reduce((sum, row) => sum + row.lost, 0);
  const trendYears = degradation.yearly;
  const fastTrendDays = trendYears.reduce((sum, row) => sum + row.fast_degradation_days, 0);
  const earlyTrendDays = trendYears.filter(row => row.year <= 2020).reduce((sum, row) => sum + row.fast_degradation_days, 0);
  const latestTrend = trendYears[trendYears.length - 1];

  const statusMix = inverters.reduce<Record<Status, number>>((acc, i) => {
    acc[i.status] = (acc[i.status] || 0) + 1; return acc;
  }, { normal: 0, watch: 0, warning: 0, critical: 0 });

  return (
    <MotionPage className="mx-auto max-w-[1280px] px-5 sm:px-8 py-10 sm:py-14">
      {/* Insight headline */}
      <MotionBlock className="max-w-3xl">
        <div className="eyebrow">Plant A · 2019 — 2025</div>
        <h1 className="mt-3 text-[28px] sm:text-[44px] leading-[1.05] font-semibold tracking-tight">
          Plant A is a three-layer twin: energy balance, acute faults, and chronic health trend.
        </h1>
        <p className="mt-5 text-[15px] sm:text-base text-muted-foreground leading-relaxed max-w-2xl">
          The model separates recoverable equipment loss from grid curtailment, then keeps
          day-level outages/faults separate from slow rolling-factor drift.
        </p>
      </MotionBlock>

      {/* Metric tiles */}
      <MotionBlock className="mt-10 grid grid-cols-2 lg:grid-cols-4 gap-px bg-hairline card-flat overflow-hidden" delay={0.05}>
        <Tile label="Expected" value={fmtEnergy(expected)} sub="Twin baseline" />
        <Tile label="Delivered" value={fmtEnergy(delivered)} sub={`${deliveredPct.toFixed(1)}% of expected`} />
        <Tile label="Performance loss" value={fmtEnergy(loss)} sub={`${lossPct.toFixed(1)}% · recoverable`} tone="warning" />
        <Tile label="Curtailment" value={fmtEnergy(curt)} sub={`${curtPct.toFixed(1)}% · grid-imposed`} tone="muted" />
      </MotionBlock>

      {/* Operational split */}
      <MotionBlock className="mt-8 grid grid-cols-1 lg:grid-cols-3 gap-4" delay={0.08}>
        <SignalPanel
          label="Acute events"
          value={acuteEvents.toLocaleString()}
          sub={`${fmtEnergy(acuteLost)} tied to outage/fault event rows`}
          body="These are discrete inverter-days that the frontend can treat as timeline events."
          tone="critical"
        />
        <SignalPanel
          label="Chronic trend state"
          value={fastTrendDays.toLocaleString()}
          sub={`${earlyTrendDays.toLocaleString()} trend-days occurred in 2019–2020`}
          body="These are rolling health-factor days, not independent failures. Show them as trend bands."
          tone="watch"
        />
        <SignalPanel
          label="Latest fleet factor"
          value={latestTrend ? latestTrend.median_factor.toFixed(3) : "unknown"}
          sub={latestTrend ? `${latestTrend.inverters_observed} inverters observed in ${latestTrend.year}` : "No trend row"}
          body="Use factor and relative factor to explain longer-term health, not event counts."
        />
      </MotionBlock>

      {/* Reconciliation bar */}
      <MotionBlock className="mt-8">
        <div className="flex items-baseline justify-between mb-3">
          <div className="eyebrow">Reconciliation</div>
          <div className="text-[11px] mono text-muted-foreground">
            Delivered + Loss + Curtailment = Expected
          </div>
        </div>
        <ReconBar delivered={delivered} loss={loss} curtailment={curt} expected={expected} />
      </MotionBlock>

      {/* Yearly chart */}
      <MotionBlock className="mt-12 card-flat p-5 sm:p-7">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 mb-1">
          <div>
            <div className="eyebrow">Energy by year</div>
            <h2 className="mt-1 text-xl sm:text-2xl font-semibold">Performance loss is small beside curtailment, but still attributable.</h2>
          </div>
          <Legend />
        </div>
        <p className="text-sm text-muted-foreground max-w-2xl mb-6">
          Each column is one calendar year, stacked into delivered energy, recoverable
          performance loss, and grid curtailment. This is the plant balance sheet, not an event count.
        </p>
        <YearlyEnergyChart data={plant.yearly} />
      </MotionBlock>

      {/* Expected vs Actual */}
      <MotionBlock className="mt-12 card-flat p-5 sm:p-7">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 mb-1">
          <div>
            <div className="eyebrow">Digital twin vs reality</div>
            <h2 className="mt-1 text-xl sm:text-2xl font-semibold">Expected output, side-by-side with what the plant delivered.</h2>
          </div>
          <div className="flex flex-wrap items-center gap-4 text-[11px] mono uppercase tracking-[0.12em] text-muted-foreground">
            <span className="flex items-center gap-1.5"><span className="w-3 border-t-2 border-dashed" style={{ borderColor: "var(--muted-foreground)" }} />Expected</span>
            <span className="flex items-center gap-1.5"><span className="w-3 h-[2px] bg-foreground" />Actual</span>
          </div>
        </div>
        <p className="text-sm text-muted-foreground max-w-2xl mb-6">
          Two lines, one per year: dashed is what the twin expected the plant to produce;
          solid is what it actually delivered. The vertical gap is the shortfall.
        </p>
        <ExpectedVsActualChart data={plant.yearly} />
      </MotionBlock>

      {/* Worst inverters + status mix */}
      <MotionBlock className="mt-12 grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 card-flat p-5 sm:p-7">
          <div className="flex items-baseline justify-between mb-5">
            <div>
              <div className="eyebrow">Worst inverters</div>
              <h2 className="mt-1 text-xl font-semibold">Six assets carry most of the loss</h2>
            </div>
            <Link to="/map" className="text-[12px] mono uppercase tracking-[0.12em] text-muted-foreground hover:text-foreground">
              View map →
            </Link>
          </div>
          <MotionList className="space-y-3">
            {worst6.map((r, i) => {
              const w = (r.total_lost_kwh / worstMax) * 100;
              return (
                <MotionItem key={r.inverter_id}>
                  <Link to="/inverter/$id" params={{ id: r.inverter_id }} className="block group">
                    <div className="flex items-baseline justify-between gap-3 mb-1.5">
                      <div className="flex items-baseline gap-3 min-w-0">
                        <span className="num text-[11px] text-muted-foreground w-4">{i + 1}</span>
                        <span className="mono text-[13px] font-medium group-hover:text-amber transition-colors">{r.inverter_id}</span>
                        {r.baseline_excluded && (
                          <span className="text-[10px] mono uppercase tracking-wider px-1.5 py-0.5 border border-hairline rounded text-muted-foreground">PE</span>
                        )}
                      </div>
                      <div className="flex items-baseline gap-3 shrink-0">
                        <span className="num text-[13px]">{fmtEnergy(r.total_lost_kwh)}</span>
                        <span className="num text-[11px] text-muted-foreground w-14 text-right">factor {r.latest_factor.toFixed(3)}</span>
                      </div>
                    </div>
                    <div className="h-[3px] bg-secondary rounded-full overflow-hidden">
                      <div className="bar-grow h-full transition-all duration-150" style={{ width: `${w}%`, background: STATUS_COLOR[r.primary_status as Status] || "var(--st-warning)", animationDelay: `${i * 70}ms` }} />
                    </div>
                  </Link>
                </MotionItem>
              );
            })}
          </MotionList>
          <div className="mt-5 text-[12px] text-muted-foreground">
            <span className="mono">PE</span> = pre-existing fault, faulty since 2017 baseline (not "degraded over time").
          </div>
        </div>

        <div className="card-flat p-5 sm:p-7">
          <div className="eyebrow">Fleet status</div>
          <h2 className="mt-1 text-xl font-semibold">65 inverters</h2>
          <ul className="mt-6 space-y-3.5">
            {(["normal", "watch", "warning", "critical"] as Status[]).map(s => {
              const n = statusMix[s];
              const pct = (n / 65) * 100;
              return (
                <li key={s}>
                  <div className="flex items-baseline justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2" style={{ background: STATUS_COLOR[s] }} />
                      <span className="text-[13px]">{STATUS_LABEL[s]}</span>
                    </div>
                    <span className="num text-[13px]"><span>{n}</span><span className="text-muted-foreground text-[11px] ml-2">{fmtPct(pct, 0)}</span></span>
                  </div>
                  <div className="h-[3px] bg-secondary rounded-full overflow-hidden">
                    <div className="bar-grow h-full" style={{ width: `${pct}%`, background: STATUS_COLOR[s] }} />
                  </div>
                </li>
              );
            })}
          </ul>
          <Link to="/map" className="mt-6 inline-block text-[12px] mono uppercase tracking-[0.12em] text-muted-foreground hover:text-foreground">
            Open inverter map →
          </Link>
        </div>
      </MotionBlock>
    </MotionPage>
  );
}

function Tile({ label, value, sub, tone }: { label: string; value: string; sub: string; tone?: "warning" | "muted" }) {
  const isWarn = tone === "warning";
  return (
    <div className={`p-5 sm:p-6 ${isWarn ? "bg-[color:color-mix(in_oklab,var(--amber)_6%,var(--surface))]" : "bg-surface"}`}>
      <div className={`eyebrow ${isWarn ? "text-[color:var(--amber)]" : ""}`}>{label}</div>
      <div className={`mt-3 num text-[26px] sm:text-[32px] font-bold tracking-tight leading-none ${isWarn ? "text-[color:var(--amber)]" : ""}`}>
        {value}
      </div>
      <div className={`mt-2 text-[11px] mono uppercase tracking-[0.1em] ${isWarn ? "text-[color:var(--amber)]/70" : "text-muted-foreground"}`}>{sub}</div>
    </div>
  );
}

function SignalPanel({ label, value, sub, body, tone }: {
  label: string;
  value: string;
  sub: string;
  body: string;
  tone?: "critical" | "watch";
}) {
  const color = tone === "critical" ? "var(--st-critical)" : tone === "watch" ? "var(--st-watch)" : "var(--foreground)";
  return (
    <div className="card-flat p-5 sm:p-6">
      <div className="flex items-center justify-between gap-4">
        <div className="eyebrow">{label}</div>
        <span className="w-2 h-2" style={{ background: color }} />
      </div>
      <div className="mt-3 num text-[28px] sm:text-[34px] font-bold leading-none" style={{ color }}>
        {value}
      </div>
      <div className="mt-2 text-[11px] mono uppercase tracking-[0.1em] text-muted-foreground">{sub}</div>
      <p className="mt-4 text-[12.5px] text-muted-foreground leading-relaxed">{body}</p>
    </div>
  );
}

function Legend() {
  return (
    <div className="flex flex-wrap items-center gap-4 text-[11px] mono uppercase tracking-[0.12em] text-muted-foreground">
      <span className="flex items-center gap-1.5"><span className="w-3 h-2 bg-foreground" />Delivered</span>
      <span className="flex items-center gap-1.5"><span className="w-3 h-2" style={{ background: "var(--st-warning)" }} />Loss</span>
      <span className="flex items-center gap-1.5"><span className="w-3 h-2" style={{ background: "var(--amber-soft)" }} />Curtailment</span>
    </div>
  );
}
