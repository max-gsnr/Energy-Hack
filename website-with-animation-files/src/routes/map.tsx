import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { loadAll, fmtEnergy, STATUS_COLOR, STATUS_LABEL, type Status, type Inverter } from "@/lib/twin/data";
import { MotionBlock, MotionPage } from "@/components/twin/Motion";

export const Route = createFileRoute("/map")({ component: MapPage });

function MapPage() {
  const { inverters } = loadAll();
  const [statusFilter, setStatusFilter] = useState<Status | "all">("all");
  const [peOnly, setPeOnly] = useState(false);
  const [hover, setHover] = useState<Inverter | null>(null);

  const filtered = useMemo(() => inverters.filter(i =>
    (statusFilter === "all" || i.status === statusFilter) &&
    (!peOnly || i.baseline_excluded)
  ), [inverters, statusFilter, peOnly]);

  const byGroup = useMemo(() => {
    const groups = new Map<string, Inverter[]>();
    for (const inv of inverters) {
      if (!groups.has(inv.inverter_group)) groups.set(inv.inverter_group, []);
      groups.get(inv.inverter_group)!.push(inv);
    }
    for (const arr of groups.values()) arr.sort((a, b) => a.column - b.column);
    return Array.from(groups.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [inverters]);

  const maxLoss = Math.max(...inverters.map(i => i.total_lost_kwh));
  const filteredIds = new Set(filtered.map(i => i.inverter_id));
  const counts = inverters.reduce<Record<string, number>>((acc, i) => ({ ...acc, [i.status]: (acc[i.status] || 0) + 1 }), {});

  return (
    <MotionPage className="mx-auto max-w-[1280px] px-5 sm:px-8 py-10 sm:py-14">
      <MotionBlock className="max-w-3xl">
        <div className="eyebrow">Inverter map · plan view</div>
        <h1 className="mt-3 text-[28px] sm:text-[36px] font-semibold tracking-tight leading-[1.15]">
          65 inverters, laid out as they sit on the plant.
        </h1>
        <p className="mt-3 text-sm text-muted-foreground max-w-2xl">
          Each cell is one inverter. Colour shows status; the inline bar shows modelled loss
          relative to the worst case. Pre-existing faults — broken since the 2017 baseline —
          are tagged <span className="mono">PE</span>.
        </p>
      </MotionBlock>

      {/* Filters */}
      <MotionBlock className="mt-8 flex flex-wrap items-center gap-2" delay={0.05}>
        <FilterChip label="All" active={statusFilter === "all"} onClick={() => setStatusFilter("all")} count={65} />
        {(["normal", "watch", "warning", "critical"] as Status[]).map(s => (
          <FilterChip key={s} label={STATUS_LABEL[s]} dot={STATUS_COLOR[s]} active={statusFilter === s} onClick={() => setStatusFilter(s)} count={counts[s] || 0} />
        ))}
        <span className="mx-2 h-5 w-px bg-hairline" />
        <button onClick={() => setPeOnly(v => !v)} className={`text-[12px] px-2.5 py-1 rounded-md border transition-colors ${peOnly ? "bg-foreground text-background border-foreground" : "border-hairline hover:bg-secondary"}`}>
          Pre-existing only
        </button>
      </MotionBlock>

      {/* Grid */}
      <MotionBlock className="mt-8 card-flat p-4 sm:p-6 relative flow-scan" delay={0.08}>
        <div className="grid gap-2.5" style={{ gridTemplateColumns: "auto 1fr" }}>
          {byGroup.map(([group, items]) => {
            const cols = Math.max(...items.map(i => i.column));
            return (
              <RowGroup key={group} group={group} cols={cols} items={items} maxLoss={maxLoss} filteredIds={filteredIds} onHover={setHover} hover={hover} />
            );
          })}
        </div>
      </MotionBlock>

      {/* Detail panel */}
      <MotionBlock className="mt-6">
        {hover ? <HoverDetail inv={hover} /> : (
          <div className="text-[12px] text-muted-foreground">Hover an inverter to inspect.</div>
        )}
      </MotionBlock>
    </MotionPage>
  );
}

function RowGroup({ group, cols, items, maxLoss, filteredIds, onHover, hover }: {
  group: string; cols: number; items: Inverter[]; maxLoss: number;
  filteredIds: Set<string>; onHover: (i: Inverter | null) => void; hover: Inverter | null;
}) {
  return (
    <>
      <div className="text-[10px] mono uppercase tracking-[0.14em] text-muted-foreground self-center pr-3 whitespace-nowrap">
        {group}
      </div>
      <div className="grid gap-1.5" style={{ gridTemplateColumns: `repeat(${cols}, minmax(60px, 1fr))` }}>
        {Array.from({ length: cols }).map((_, ci) => {
          const inv = items.find(i => i.column === ci + 1);
          if (!inv) return <div key={ci} />;
          const inFilter = filteredIds.has(inv.inverter_id);
          const lossW = (inv.total_lost_kwh / maxLoss) * 100;
          const c = STATUS_COLOR[inv.status];
          const isHover = hover?.inverter_id === inv.inverter_id;
          return (
            <Link
              key={inv.inverter_id}
              to="/inverter/$id" params={{ id: inv.inverter_id }}
              onMouseEnter={() => onHover(inv)}
              className="block"
            >
              <motion.div
                className={`relative block border rounded-md p-2 transition-opacity duration-150 text-left
                  ${inFilter ? "opacity-100" : "opacity-25"}`}
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: inFilter ? 1 : 0.25, scale: 1 }}
                whileHover={{ y: -3, scale: 1.03 }}
                transition={{ duration: 0.18, ease: "easeOut" }}
                style={{
                  background: "var(--surface)",
                  borderColor: isHover
                    ? "var(--foreground)"
                    : inv.status === "normal"
                      ? `color-mix(in oklab, ${c} 35%, var(--hairline))`
                      : c,
                  boxShadow: inv.status !== "normal"
                    ? `inset 0 0 0 1px color-mix(in oklab, ${c} 22%, transparent)`
                    : undefined,
                }}
              >
                <div className="flex items-start justify-between gap-1.5">
                  <div className="w-1.5 h-1.5 mt-1 shrink-0" style={{ background: c }} />
                  {inv.baseline_excluded && (
                    <span className="text-[8.5px] mono uppercase tracking-wider px-1 py-[1px] border border-hairline rounded text-muted-foreground leading-none">PE</span>
                  )}
                </div>
                <div className="mt-1 mono text-[10.5px] font-medium leading-tight">{inv.display_label}</div>
                <div className="num text-[10px] text-muted-foreground mt-0.5 leading-tight">{Math.round(inv.total_lost_kwh).toLocaleString()} kWh</div>
                <div className="mt-1.5 h-[2px] bg-secondary rounded-full overflow-hidden">
                  <div className="bar-grow h-full" style={{ width: `${lossW}%`, background: c }} />
                </div>
              </motion.div>
            </Link>
          );
        })}
      </div>
    </>
  );
}

function FilterChip({ label, active, onClick, count, dot }: { label: string; active: boolean; onClick: () => void; count: number; dot?: string }) {
  return (
    <button onClick={onClick} className={`text-[12px] px-2.5 py-1 rounded-md border flex items-center gap-1.5 transition-colors ${active ? "bg-foreground text-background border-foreground" : "border-hairline hover:bg-secondary"}`}>
      {dot && <span className="w-1.5 h-1.5" style={{ background: dot }} />}
      {label}
      <span className={`num text-[10px] ${active ? "opacity-70" : "text-muted-foreground"}`}>{count}</span>
    </button>
  );
}

function HoverDetail({ inv }: { inv: Inverter }) {
  return (
    <div className="card-flat p-4 sm:p-5 grid grid-cols-2 sm:grid-cols-5 gap-5">
      <div>
        <div className="eyebrow">Inverter</div>
        <div className="mt-1 mono text-[14px] font-medium">{inv.inverter_id}</div>
        <div className="text-[11px] text-muted-foreground mt-0.5">{inv.inverter_group}</div>
      </div>
      <div>
        <div className="eyebrow">Status</div>
        <div className="mt-1 flex items-center gap-1.5 text-[13px]">
          <span className="w-2 h-2" style={{ background: STATUS_COLOR[inv.status] }} />{STATUS_LABEL[inv.status]}
        </div>
      </div>
      <div>
        <div className="eyebrow">Health factor</div>
        <div className="mt-1 num text-[14px]">{inv.latest_factor.toFixed(3)}</div>
      </div>
      <div>
        <div className="eyebrow">Lost</div>
        <div className="mt-1 num text-[14px]">{fmtEnergy(inv.total_lost_kwh)}</div>
        <div className="text-[11px] text-muted-foreground mt-0.5 num">{inv.lost_kwh_per_kwp.toFixed(1)} kWh/kWp</div>
      </div>
      <div className="col-span-2 sm:col-span-1">
        <div className="eyebrow">{inv.baseline_excluded ? "Pre-existing" : "Reason"}</div>
        <div className="mt-1 text-[12px] leading-snug">{inv.baseline_excluded ? "Faulty since 2017 baseline." : inv.primary_reason}</div>
      </div>
    </div>
  );
}
