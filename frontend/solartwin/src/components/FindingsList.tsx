'use client';
import React, { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import type { Finding } from '@/lib/api';

const nf = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 });
const fmt = (n?: number | null) => (n == null ? '–' : nf.format(n));

function SevChip({ sev }: { sev: string }) {
  const map: Record<string, string> = { critical: 'chip-critical', warning: 'chip-warning', moderate: 'chip-moderate', normal: 'chip-normal' };
  return <span className={`chip ${map[sev] ?? 'chip-muted'}`}>{sev}</span>;
}

interface Props {
  findings: Finding[];
  selectedId?: string;
  onSelect: (f: Finding) => void;
  onDispatch: (f: Finding) => void;
}

export default function FindingsList({ findings, selectedId, onSelect, onDispatch }: Props) {
  const listRef = useRef<HTMLUListElement>(null);

  useEffect(() => {
    const items = listRef.current?.children;
    if (!items?.length) return;
    gsap.fromTo(items,
      { opacity: 0, y: 10 },
      { opacity: 1, y: 0, duration: 0.35, stagger: 0.04, ease: 'power2.out' }
    );
  }, [findings]);

  return (
    <div className="glass overflow-hidden">
      <div className="px-4 py-2.5 border-b flex items-center justify-between" style={{ borderColor: 'var(--border)' }}>
        <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--muted)' }}>
          Findings · ranked by priority
        </span>
        <span className="text-xs" style={{ color: 'var(--muted)' }}>{findings.length}</span>
      </div>
      <ul ref={listRef} className="divide-y" style={{ borderColor: 'var(--border)', maxHeight: 320, overflowY: 'auto' }}>
        {findings.map(f => (
          <li
            key={f.finding_id}
            className={`flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors hover:bg-white/[0.03] ${selectedId === f.finding_id ? 'bg-white/[0.05]' : ''}`}
            style={{ borderColor: 'var(--border)' }}
            onClick={() => onSelect(f)}
          >
            <span className="text-xs font-mono w-5 text-right flex-shrink-0" style={{ color: 'var(--muted)' }}>#{f.priority}</span>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <span className="text-xs font-semibold">{f.inverter_id.replace(/^INV\s+/, '')}</span>
                <SevChip sev={f.severity} />
              </div>
              <p className="text-[11px] truncate" style={{ color: 'var(--muted)' }}>{f.primary_reason}</p>
            </div>
            <div className="text-right flex-shrink-0 mr-2">
              <div className="text-xs font-semibold">{fmt(f.total_lost_kwh)} kWh</div>
              <div className="text-[10px]" style={{ color: 'var(--muted)' }}>~€ {fmt(f.euro?.eur)}</div>
            </div>
            <button
              className="flex-shrink-0 p-1.5 rounded-lg text-xs hover:bg-[var(--brand-dim)] transition-colors"
              style={{ color: 'var(--brand)' }}
              onClick={e => { e.stopPropagation(); onDispatch(f); }}
              title="Dispatch email"
            >✉</button>
          </li>
        ))}
      </ul>
    </div>
  );
}
