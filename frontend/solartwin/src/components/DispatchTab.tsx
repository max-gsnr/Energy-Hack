'use client';
import React from 'react';
import type { Finding, EmailDraft } from '@/lib/api';

const nf = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 });
const fmt = (n?: number | null) => (n == null ? '–' : nf.format(n));

const STATUS_COLORS: Record<string, string> = {
  Sent:    'chip-normal',
  Draft:   'chip-muted',
  Pending: 'chip-warning',
};

interface Props {
  sentEmails: EmailDraft[];
  findings: Finding[];
  onNew: (f: Finding) => void;
}

export default function DispatchTab({ sentEmails, findings, onNew }: Props) {
  const unsent = findings.filter(f =>
    !sentEmails.some(e => e.finding_id === f.finding_id)
  );

  return (
    <div className="flex gap-4 h-full">
      {/* Left: status sidebar */}
      <div className="w-48 flex-shrink-0 flex flex-col gap-2">
        <div className="glass p-3">
          <div className="text-[10px] uppercase tracking-widest font-semibold mb-2" style={{ color: 'var(--muted)' }}>Status</div>
          {['Sent', 'Draft', 'Pending'].map(s => (
            <div key={s} className="flex items-center justify-between py-1.5 text-xs border-b" style={{ borderColor: 'var(--border)' }}>
              <span>{s}</span>
              <span className={`chip ${STATUS_COLORS[s]}`}>
                {s === 'Sent' ? sentEmails.length : s === 'Pending' ? unsent.filter(f => f.severity === 'critical').length : 0}
              </span>
            </div>
          ))}
        </div>

        {/* Contacts quick list */}
        <div className="glass p-3 flex-1 overflow-y-auto">
          <div className="text-[10px] uppercase tracking-widest font-semibold mb-2" style={{ color: 'var(--muted)' }}>Recipients</div>
          {[...new Set(sentEmails.flatMap(e => e.recipients.map(r => r.name)))].map(name => (
            <div key={name} className="py-1.5 text-xs border-b truncate" style={{ borderColor: 'var(--border)', color: 'var(--muted)' }}>{name}</div>
          ))}
        </div>
      </div>

      {/* Centre: email list */}
      <div className="flex-1 flex flex-col gap-3">
        <div className="glass overflow-hidden">
          <div className="px-4 py-3 border-b flex items-center justify-between" style={{ borderColor: 'var(--border)' }}>
            <span className="text-sm font-semibold" style={{ color: 'var(--text)' }}>Sent dispatches</span>
            <span className="text-xs" style={{ color: 'var(--muted)' }}>{sentEmails.length}</span>
          </div>
          {sentEmails.length === 0 ? (
            <div className="p-6 text-center text-xs" style={{ color: 'var(--muted)' }}>No emails sent yet. Select a finding to draft one.</div>
          ) : (
            <div className="divide-y" style={{ borderColor: 'var(--border)' }}>
              {sentEmails.map((e, i) => (
                <div key={i} className="px-4 py-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-semibold" style={{ color: 'var(--text)' }}>{e.subject}</span>
                    <span className="chip chip-normal">Sent</span>
                  </div>
                  <p className="text-xs truncate" style={{ color: 'var(--muted)' }}>To: {e.recipients.map(r => r.name).join(', ')}</p>
                  <p className="text-xs mt-0.5 truncate" style={{ color: 'var(--muted)' }}>{e.finding_summary}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Pending / unsent critical */}
        <div className="glass overflow-hidden">
          <div className="px-4 py-3 border-b" style={{ borderColor: 'var(--border)' }}>
            <span className="text-sm font-semibold" style={{ color: 'var(--text)' }}>Pending critical findings</span>
          </div>
          <div className="divide-y" style={{ borderColor: 'var(--border)', maxHeight: 280, overflowY: 'auto' }}>
            {unsent.filter(f => f.severity === 'critical').map(f => (
              <div key={f.finding_id} className="flex items-center gap-3 px-4 py-3">
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-semibold">{f.inverter_id.replace(/^INV\s+/, '')}</div>
                  <div className="text-[11px] truncate" style={{ color: 'var(--muted)' }}>{f.primary_reason}</div>
                </div>
                <span className="text-xs" style={{ color: 'var(--muted)' }}>{fmt(f.total_lost_kwh)} kWh</span>
                <button
                  className="px-3 py-1 text-xs font-medium rounded-lg transition-colors"
                  style={{ background: 'var(--brand)', color: '#000' }}
                  onClick={() => onNew(f)}
                >Draft ✉</button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
