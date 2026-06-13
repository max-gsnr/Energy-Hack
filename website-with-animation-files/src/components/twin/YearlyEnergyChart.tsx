import { useState } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis, LabelList } from "recharts";
import type { YearStat } from "@/lib/twin/data";
import { fmtEnergy } from "@/lib/twin/data";

type Row = { year: string; delivered: number; loss: number; curtailment: number; total: number };

export function YearlyEnergyChart({ data }: { data: YearStat[] }) {
  const [hover, setHover] = useState<number | null>(null);
  const rows: Row[] = data.map(d => ({
    year: String(d.year),
    delivered: Math.max(0, d.actual_kwh),
    loss: Math.max(0, d.lost_kwh),
    curtailment: Math.max(0, d.curtailment_kwh),
    total: d.expected_kwh,
  }));

  const fmtAxisY = (v: number) => {
    if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)} GWh`;
    if (v >= 1_000) return `${Math.round(v / 1_000)} MWh`;
    return `${v}`;
  };

  return (
    <div className="w-full h-[360px] sm:h-[420px]">
      <ResponsiveContainer>
        <BarChart data={rows} margin={{ top: 28, right: 12, bottom: 8, left: 8 }} onMouseLeave={() => setHover(null)}>
          <CartesianGrid stroke="var(--hairline)" strokeDasharray="0" vertical={false} />
          <XAxis dataKey="year" axisLine={{ stroke: "var(--hairline)" }} tickLine={false}
            tick={{ fill: "var(--muted-foreground)", fontSize: 11, fontFamily: "var(--font-mono)" }} dy={6} />
          <YAxis tickFormatter={fmtAxisY} axisLine={false} tickLine={false}
            tick={{ fill: "var(--muted-foreground)", fontSize: 11, fontFamily: "var(--font-mono)" }} width={58} />
          <Tooltip cursor={{ fill: "var(--secondary)" }} content={<ChartTooltip />} />
          <Bar dataKey="delivered" stackId="a" fill="var(--ink)" maxBarSize={64} isAnimationActive
            onMouseOver={(_, i) => setHover(i)} />
          <Bar dataKey="loss" stackId="a" fill="var(--st-warning)" maxBarSize={64} isAnimationActive>
            <LabelList dataKey="loss" position="insideTop" content={LossLabel} />
          </Bar>
          <Bar dataKey="curtailment" stackId="a" fill="var(--amber-soft)" maxBarSize={64} isAnimationActive>
            <LabelList dataKey="curtailment" position="top" content={CurtLabel} />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      <div className="sr-only">{hover}</div>
    </div>
  );
}

function ChartTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ payload: Row }>; label?: string }) {
  if (!active || !payload?.length) return null;
  const r = payload[0].payload;
  return (
    <div className="card-flat px-3 py-2.5 shadow-none">
      <div className="text-[11px] mono uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="mt-1.5 space-y-1 text-[12.5px]">
        <Row k="Expected" v={fmtEnergy(r.total)} />
        <Row k="Delivered" v={fmtEnergy(r.delivered)} dot="var(--ink)" />
        <Row k="Loss" v={fmtEnergy(r.loss)} dot="var(--st-warning)" />
        <Row k="Curtailment" v={fmtEnergy(r.curtailment)} dot="var(--amber-soft)" />
      </div>
    </div>
  );
}
function Row({ k, v, dot }: { k: string; v: string; dot?: string }) {
  return (
    <div className="flex items-center justify-between gap-6">
      <span className="flex items-center gap-1.5 text-muted-foreground">
        {dot && <span className="w-2 h-2" style={{ background: dot }} />}{k}
      </span>
      <span className="num">{v}</span>
    </div>
  );
}

function LossLabel(props: { x?: number | string; y?: number | string; width?: number | string; value?: number | string }) {
  const value = Number(props.value);
  const x = Number(props.x); const y = Number(props.y); const width = Number(props.width);
  if (!value || value < 8000 || !isFinite(x) || !isFinite(y) || !isFinite(width)) return null;
  const v = value >= 1000 ? `${Math.round(value / 1000)} MWh` : `${Math.round(value)} kWh`;
  return <text x={x + width / 2} y={y + 12} fill="#FFFFFF" fontSize={10} fontFamily="var(--font-mono)" textAnchor="middle">{v}</text>;
}
function CurtLabel(props: { x?: number | string; y?: number | string; width?: number | string; value?: number | string }) {
  const value = Number(props.value);
  const x = Number(props.x); const y = Number(props.y); const width = Number(props.width);
  if (!value || value < 1000 || !isFinite(x) || !isFinite(y) || !isFinite(width)) return null;
  const v = `${Math.round(value / 1000)} MWh`;
  return <text x={x + width / 2} y={y - 6} fill="var(--ink)" fontSize={10} fontFamily="var(--font-mono)" textAnchor="middle">{v}</text>;
}
