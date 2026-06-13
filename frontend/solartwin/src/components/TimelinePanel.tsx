'use client';
import React, { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { api } from '@/lib/api';
import { useAsync } from '@/hooks/useAsync';

interface Props { inverterId: string; }

export default function TimelinePanel({ inverterId }: Props) {
  const { data: tl, loading } = useAsync(() => api.timeline(inverterId), [inverterId]);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!panelRef.current || loading || !tl) return;
    gsap.fromTo(panelRef.current,
      { opacity: 0, x: 40 },
      { opacity: 1, x: 0, duration: 0.5, ease: 'power3.out' }
    );
    const dots = panelRef.current.querySelectorAll('.tl-dot');
    gsap.fromTo(dots,
      { scale: 0, opacity: 0 },
      { scale: 1, opacity: 1, duration: 0.3, stagger: 0.06, ease: 'back.out(2)', delay: 0.3 }
    );
  }, [tl, loading]);

  if (loading) return (
    <div className="glass p-4 h-full flex items-center justify-center">
      <div className="animate-spin text-2xl">☀️</div>
    </div>
  );
  if (!tl) return null;

  const nf = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 });

  return (
    <div ref={panelRef} className="glass p-4 h-full overflow-y-auto">
      <div className="flex items-center gap-2 mb-3">
        <h2 className="text-sm font-semibold" style={{ color: 'var(--text)' }}>🏥 Inverter Doctor</h2>
        {tl.baseline_excluded && (
          <span className="chip chip-warning text-[9px]">pre-existing</span>
        )}
      </div>

      <div className="mb-3">
        <div className="text-[10px] uppercase tracking-widest mb-0.5" style={{ color: 'var(--muted)' }}>Total loss</div>
        <div className="text-xl font-bold" style={{ color: 'var(--brand)' }}>{nf.format(Math.round(tl.total_lost_kwh))} kWh</div>
      </div>

      {/* Narrative */}
      <p className="text-xs mb-4 leading-relaxed" style={{ color: 'var(--muted)', whiteSpace: 'pre-wrap' }}>{tl.narrative}</p>

      {/* Timeline milestones */}
      {tl.milestones.length > 0 && (
        <div>
          <div className="text-[10px] uppercase tracking-widest mb-3" style={{ color: 'var(--muted)' }}>Milestones</div>
          <div className="tl-line space-y-5">
            {tl.milestones.map((m, i) => {
              const colors: Record<string, string> = { critical: 'var(--critical)', warning: 'var(--warning)', moderate: 'var(--moderate)' };
              const dotColor = colors[m.severity ?? ''] ?? 'var(--brand)';
              return (
                <div key={i} className="relative pl-1">
                  <div className="tl-dot" style={{ top: 2, borderColor: dotColor }} />
                  <div className="text-[10px] font-mono" style={{ color: 'var(--muted)' }}>{m.date}</div>
                  <div className="text-xs mt-0.5" style={{ color: 'var(--text)' }}>{m.event}</div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
