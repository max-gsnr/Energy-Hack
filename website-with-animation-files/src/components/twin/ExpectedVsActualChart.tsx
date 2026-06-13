import { CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis, Line, LineChart } from "recharts";
import type { YearStat } from "@/lib/twin/data";
import { fmtEnergy } from "@/lib/twin/data";

type Row = {
  year: string;
  expected: number;
  actual: number;
  gap: number;
};

export function ExpectedVsActualChart({ data }: { data: YearStat[] }) {
  const rows: Row[] = data.map(d => ({
    year: String(d.year),
    expected: d.expected_kwh,
    actual: d.actual_kwh,
    gap: d.expected_kwh - d.actual_kwh,
  }));

  const fmtAxisY = (v: number) => {
    if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)} GWh`;
    if (v >= 1_000) return `${Math.round(v / 1_000)} MWh`;
    return `${v}`;
  };

  return (
    <div className="w-full h-[340px] sm:h-[400px]">
      <ResponsiveContainer>
        <LineChart data={rows} margin={{ top: 20, right: 24, bottom: 8, left: 8 }}>
          <CartesianGrid stroke="var(--hairline)" strokeDasharray="0" vertical={false} />
          <XAxis dataKey="year" axisLine={{ stroke: "var(--hairline)" }} tickLine={false}
            tick={{ fill: "var(--muted-foreground)", fontSize: 11, fontFamily: "var(--font-mono)" }} dy={6} />
          <YAxis tickFormatter={fmtAxisY} axisLine={false} tickLine={false}
            tick={{ fill: "var(--muted-foreground)", fontSize: 11, fontFamily: "var(--font-mono)" }} width={64} />
          <Tooltip cursor={{ stroke: "var(--hairline)", strokeWidth: 1 }} content={<TT />} />
          <Line dataKey="expected" stroke="var(--muted-foreground)" strokeWidth={1.5} strokeDasharray="4 3"
            dot={{ r: 3, fill: "var(--surface)", stroke: "var(--muted-foreground)", strokeWidth: 1.5 }}
            activeDot={{ r: 4 }} type="monotone" />
          <Line dataKey="actual" stroke="var(--ink)" strokeWidth={1.75}
            dot={{ r: 3, fill: "var(--ink)", stroke: "var(--surface)", strokeWidth: 1 }}
            activeDot={{ r: 4 }} type="monotone" />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

function TT({ active, payload, label }: { active?: boolean; payload?: { payload: Row }[]; label?: string }) {
  if (!active || !payload || !payload.length) return null;
  const r = payload[0].payload;
  return (
    <div className="card-flat p-3 text-[12px] min-w-[200px]">
      <div className="mono uppercase tracking-[0.12em] text-[10px] text-muted-foreground mb-2">{label}</div>
      <Row label="Expected" v={fmtEnergy(r.expected)} dot="var(--muted-foreground)" dashed />
      <Row label="Actual" v={fmtEnergy(r.actual)} dot="var(--ink)" />
      <div className="mt-1.5 pt-1.5 border-t border-hairline flex justify-between">
        <span className="text-muted-foreground">Gap</span>
        <span className="num">{fmtEnergy(r.gap)}</span>
      </div>
    </div>
  );
}
function Row({ label, v, dot, dashed }: { label: string; v: string; dot: string; dashed?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-4 py-0.5">
      <span className="flex items-center gap-1.5 text-muted-foreground">
        <span className="w-3 h-[2px]" style={{ background: dashed ? "transparent" : dot, borderTop: dashed ? `2px dashed ${dot}` : undefined }} />
        {label}
      </span>
      <span className="num">{v}</span>
    </div>
  );
}
