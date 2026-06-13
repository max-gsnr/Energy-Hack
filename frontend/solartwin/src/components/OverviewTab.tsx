'use client';
import React, { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import type { PlantData, FindingsData, Finding } from '@/lib/api';

const nf = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 });
const fmt = (n?: number | null) => (n == null ? '–' : nf.format(n));

function SevChip({ sev }: { sev: string }) {
  const map: Record<string, string> = { critical: 'chip chip-critical', warning: 'chip chip-warning', moderate: 'chip chip-moderate', normal: 'chip chip-normal' };
  return <span className={map[sev] ?? 'chip chip-muted'}>{sev}</span>;
}

interface Props {
  plant: PlantData | null;
  findings: FindingsData | null;
  onDispatch: (f: Finding) => void;
  onSelectInverter: (id: string) => void;
}

export default function OverviewTab({ plant, findings, onDispatch, onSelectInverter }: Props) {
  const summaryRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Degradation trend for chart
  const context = plant?.context as { degradation_trend_summary?: { year: number; lost_kwh: number; median_factor: number; }[] } | undefined;
  const chartData = context?.degradation_trend_summary?.map(d => ({
    year: d.year,
    lostKwh: Math.round(d.lost_kwh),
    factor: +(d.median_factor * 100).toFixed(2),
  })) ?? [];

  useEffect(() => {
    const items = listRef.current?.querySelectorAll('.finding-row');
    if (items?.length) {
      gsap.fromTo(items,
        { opacity: 0, x: -20 },
        { opacity: 1, x: 0, duration: 0.5, stagger: 0.05, ease: 'power2.out', delay: 0.3 }
      );
    }
  }, [findings]);

  const top10 = findings?.findings.slice(0, 10) ?? [];
  const stats = findings ? {
    critical:  findings.findings.filter(f => f.severity === 'critical').length,
    warning:   findings.findings.filter(f => f.severity === 'warning').length,
    moderate:  findings.findings.filter(f => f.severity === 'moderate').length,
    total_kwh: findings.findings.reduce((s, f) => s + (f.total_lost_kwh ?? 0), 0),
  } : null;

  return (
    <div className="flex flex-col gap-6">
      {/* Summary cards */}
      <div ref={summaryRef} className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Critical anomalies', value: stats?.critical ?? '–', color: 'var(--critical)' },
          { label: 'Warnings', value: stats?.warning ?? '–', color: 'var(--warning)' },
          { label: 'Total findings', value: findings?.total ?? '–', color: 'var(--brand)' },
          { label: 'Findings loss', value: `${fmt(stats?.total_kwh)} kWh`, color: 'var(--muted)' },
        ].map(c => (
          <div key={c.label} className="glass p-4 gs-reveal">
            <div className="text-[10px] uppercase tracking-widest font-semibold mb-1" style={{ color: 'var(--muted)' }}>{c.label}</div>
            <div className="text-2xl font-bold" style={{ color: c.color }}>{c.value}</div>
          </div>
        ))}
      </div>

      {/* Degradation trend chart */}
      {chartData.length > 0 && (
        <div className="glass p-4 gs-reveal">
          <div className="text-sm font-semibold mb-3" style={{ color: 'var(--text)' }}>Fleet degradation trend — lost kWh / year</div>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={chartData} margin={{ top: 8, right: 8, bottom: 0, left: 8 }}>
              <defs>
                <linearGradient id="lossGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#f5a623" stopOpacity={0.35} />
                  <stop offset="95%" stopColor="#f5a623" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#2a3050" />
              <XAxis dataKey="year" tick={{ fill: '#8892b0', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#8892b0', fontSize: 11 }} axisLine={false} tickLine={false} width={60}
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                tickFormatter={(v: any) => `${(Number(v)/1000).toFixed(0)}k`} />
              <Tooltip
                contentStyle={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }}
                labelStyle={{ color: 'var(--brand)' }}
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                formatter={(v: any) => [`${nf.format(Number(v))} kWh`, 'Lost']}
              />
              <Area type="monotone" dataKey="lostKwh" stroke="#f5a623" strokeWidth={2} fill="url(#lossGrad)" dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Top findings */}
      <div ref={listRef} className="glass overflow-hidden gs-reveal">
        <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: 'var(--border)' }}>
          <h2 className="text-sm font-semibold" style={{ color: 'var(--text)' }}>Top findings — ranked by priority</h2>
          <span className="text-xs" style={{ color: 'var(--muted)' }}>{findings?.total ?? 0} total</span>
        </div>
        {top10.map(f => (
          <div
            key={f.finding_id}
            className="finding-row flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-white/[0.03] transition-colors border-b"
            style={{ borderColor: 'var(--border)' }}
            onClick={() => onSelectInverter(f.inverter_id)}
          >
            <span className="text-xs font-mono w-6 text-center" style={{ color: 'var(--muted)' }}>#{f.priority}</span>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <span className="text-sm font-semibold truncate">{f.inverter_id.replace(/^INV\s+/, '')}</span>
                <SevChip sev={f.severity} />
                <span className="chip chip-muted">{f.classification.replace(/_/g, ' ')}</span>
              </div>
              <p className="text-xs truncate" style={{ color: 'var(--muted)' }}>{f.primary_reason}</p>
            </div>
            <div className="text-right flex-shrink-0">
              <div className="text-sm font-semibold" style={{ color: 'var(--text)' }}>{fmt(f.total_lost_kwh)} kWh</div>
              <div className="text-xs" style={{ color: 'var(--muted)' }}>~€ {fmt(f.euro?.eur)}</div>
            </div>
            <button
              className="ml-2 p-1.5 rounded-lg text-xs hover:bg-[var(--brand-dim)] transition-colors"
              style={{ color: 'var(--brand)' }}
              onClick={e => { e.stopPropagation(); onDispatch(f); }}
              title="Dispatch email"
            >✉</button>
          </div>
        ))}
      </div>
    </div>
  );
}
