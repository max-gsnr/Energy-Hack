'use client';
import React, { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import type { InverterMapItem } from '@/lib/api';

const COLOR_MAP: Record<string, string> = {
  red:    '#ff4757',
  orange: '#ffa502',
  yellow: '#f9ca24',
  green:  '#2ed573',
  grey:   '#4a5270',
};

const LABEL_MAP: Record<string, string> = {
  red:    'Critical',
  orange: 'Warning',
  yellow: 'Moderate',
  green:  'Normal',
  grey:   'Excluded',
};

interface Props {
  mapData: InverterMapItem[];
  selected: string | null;
  onSelect: (id: string) => void;
}

export default function InverterHeatmap({ mapData, selected, onSelect }: Props) {
  const gridRef = useRef<HTMLDivElement>(null);

  // Animate cells in on data load
  useEffect(() => {
    if (!gridRef.current || !mapData.length) return;
    const cells = gridRef.current.querySelectorAll('.hm-cell');
    gsap.fromTo(cells,
      { opacity: 0, scale: 0.5 },
      { opacity: 1, scale: 1, duration: 0.4, stagger: { each: 0.005, from: 'start' }, ease: 'back.out(1.2)' }
    );
  }, [mapData]);

  // Grid dimensions
  const maxRow = mapData.reduce((m, c) => Math.max(m, c.row), 0);
  const maxCol = mapData.reduce((m, c) => Math.max(m, c.column), 0);

  // Build grid
  const cells: Record<string, InverterMapItem> = {};
  mapData.forEach(c => { cells[`${c.row}-${c.column}`] = c; });

  const colorCounts: Record<string, number> = {};
  mapData.forEach(c => { colorCounts[c.status_color] = (colorCounts[c.status_color] ?? 0) + 1; });

  return (
    <div className="glass p-4 gs-reveal">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold" style={{ color: 'var(--text)' }}>
          Inverter health map — {mapData.length} units
        </h2>
        {/* Legend */}
        <div className="flex items-center gap-3">
          {Object.entries(colorCounts).map(([color, count]) => (
            <div key={color} className="flex items-center gap-1">
              <div className="w-2.5 h-2.5 rounded-sm" style={{ background: COLOR_MAP[color] ?? '#8892b0' }} />
              <span className="text-[10px]" style={{ color: 'var(--muted)' }}>{LABEL_MAP[color] ?? color} ({count})</span>
            </div>
          ))}
        </div>
      </div>

      <div
        ref={gridRef}
        className="grid gap-1"
        style={{
          gridTemplateColumns: `repeat(${maxCol}, minmax(0, 1fr))`,
          gridTemplateRows:    `repeat(${maxRow}, minmax(0, 1fr))`,
        }}
      >
        {Array.from({ length: maxRow }, (_, ri) =>
          Array.from({ length: maxCol }, (_, ci) => {
            const cell = cells[`${ri + 1}-${ci + 1}`];
            if (!cell) return <div key={`${ri}-${ci}`} />;
            const bg = COLOR_MAP[cell.status_color] ?? '#4a5270';
            const isSelected = cell.inverter_id === selected;
            return (
              <div
                key={cell.inverter_id}
                className={`hm-cell${isSelected ? ' selected' : ''}`}
                style={{ background: bg + (isSelected ? '' : '66'), opacity: cell.baseline_excluded ? 0.45 : 1 }}
                onClick={() => onSelect(cell.inverter_id)}
                title={`${cell.inverter_id}\n${cell.primary_reason}\nLost: ${Math.round(cell.total_lost_kwh).toLocaleString()} kWh`}
              />
            );
          })
        )}
      </div>
      {selected && (
        <p className="mt-2 text-[11px]" style={{ color: 'var(--muted)' }}>
          Selected: <span style={{ color: 'var(--brand)' }}>{selected}</span>
        </p>
      )}
    </div>
  );
}
