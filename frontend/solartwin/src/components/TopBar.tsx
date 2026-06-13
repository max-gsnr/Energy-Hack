'use client';
import React, { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import type { PlantData, HealthData } from '@/lib/api';

const nf = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 });
const fmt = (n?: number | null) => (n == null ? '–' : nf.format(n));

function KpiCard({ label, value, sub, className }: { label: string; value: string; sub?: string; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!ref.current) return;
    gsap.from(ref.current, { opacity: 0, scale: 0.85, duration: 0.5, ease: 'back.out(1.4)', delay: 0.2 });
  }, []);
  return (
    <div ref={ref} className={`gs-reveal flex flex-col gap-0.5 ${className ?? ''}`}>
      <span className="text-[10px] uppercase tracking-widest font-semibold" style={{ color: 'var(--muted)' }}>{label}</span>
      <span className="text-xl font-bold" style={{ color: 'var(--brand)' }}>{value}</span>
      {sub && <span className="text-[10px]" style={{ color: 'var(--muted)' }}>{sub}</span>}
    </div>
  );
}

export default function TopBar({ plant, health }: { plant: PlantData | null; health: HealthData | null }) {
  const s = plant?.summary;
  const tariff = plant?.tariff_eur_per_kwh ?? 0.1;
  const eur = s ? Math.round(s.total_lost_kwh * tariff) : null;

  const logoRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!logoRef.current) return;
    gsap.to(logoRef.current, { rotation: 360, duration: 20, repeat: -1, ease: 'none' });
  }, []);

  return (
    <header className="topbar flex items-center px-6 py-3 gap-8 gs-reveal">
      {/* Brand */}
      <div className="flex items-center gap-3 min-w-max">
        <div className="logo-ring w-10 h-10 flex items-center justify-center">
          <div ref={logoRef} className="text-2xl select-none">☀️</div>
        </div>
        <div>
          <h1 className="text-base font-bold tracking-tight" style={{ color: 'var(--text)' }}>SolarTwin</h1>
          <p className="text-[10px]" style={{ color: 'var(--muted)' }}>
            Enerparc O&amp;M Agent Console
            {plant?.metadata && ` · ${(plant.metadata as { selected_model?: string }).selected_model ?? ''}`}
          </p>
        </div>
      </div>

      {/* KPIs */}
      <div className="flex items-center gap-8 flex-1">
        <KpiCard
          label="Modeled loss"
          value={`${fmt(s?.total_lost_kwh)} kWh`}
          sub="excl. curtailment"
        />
        <KpiCard
          label="Est. value lost"
          value={`€ ${fmt(eur)}`}
          sub={plant?.tariff_is_assumption ? `assumed ${tariff} €/kWh` : `${tariff} €/kWh`}
        />
        <KpiCard
          label="Curtailment"
          value={`${fmt(s?.total_curtailment_kwh)} kWh`}
        />
        <KpiCard
          label="Inverters"
          value={fmt(s?.inverter_count)}
          sub={s?.critical_count ? `${s.critical_count} critical` : undefined}
        />
      </div>

      {/* LLM status */}
      <div className="flex items-center gap-2 ml-auto">
        <span className={`w-2 h-2 rounded-full ${health?.llm ? 'animate-pulse-glow' : ''}`}
          style={{ background: health?.llm ? 'var(--normal)' : 'var(--critical)' }} />
        <span className="text-xs" style={{ color: 'var(--muted)' }}>
          {health?.llm ? `Gemini · ${health.model}` : 'AI offline'}
        </span>
      </div>
    </header>
  );
}
