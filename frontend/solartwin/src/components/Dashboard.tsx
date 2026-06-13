'use client';
import React, { useEffect, useRef, useState } from 'react';
import { gsap } from 'gsap';
import { api, type PlantData, type HealthData, type Finding, type FindingsData, type InverterMapItem, type EmailDraft, type ChatMessage } from '@/lib/api';
import { useAsync } from '@/hooks/useAsync';
import TopBar from './TopBar';
import InverterHeatmap from './InverterHeatmap';
import FindingsList from './FindingsList';
import TimelinePanel from './TimelinePanel';
import DispatchTab from './DispatchTab';
import DispatchModal from './DispatchModal';
import ChatPanel from './ChatPanel';
import OverviewTab from './OverviewTab';

export type Tab = 'overview' | 'inverters' | 'dispatch';

export default function Dashboard() {
  const [tab, setTab] = useState<Tab>('overview');
  const [selectedInverter, setSelectedInverter] = useState<string | null>(null);
  const [selectedFinding, setSelectedFinding] = useState<Finding | null>(null);
  const [dispatchTarget, setDispatchTarget] = useState<Finding | null>(null);
  const [sentEmails, setSentEmails] = useState<EmailDraft[]>([]);
  const shellRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  const { data: health }   = useAsync(() => api.health(), []);
  const { data: plant }    = useAsync(() => api.plant(),  []);
  const { data: mapData }  = useAsync(() => api.map(),    []);
  const { data: findingsData } = useAsync(() => api.findings(), []);

  // Initial page-load reveal
  useEffect(() => {
    if (!shellRef.current) return;
    const els = shellRef.current.querySelectorAll('.gs-reveal');
    gsap.fromTo(els,
      { opacity: 0, y: 24 },
      { opacity: 1, y: 0, duration: 0.6, stagger: 0.08, ease: 'power3.out', delay: 0.15 }
    );
  }, []);

  // Animate tab switch
  useEffect(() => {
    if (!contentRef.current) return;
    gsap.fromTo(contentRef.current,
      { opacity: 0, x: -16 },
      { opacity: 1, x: 0,   duration: 0.4, ease: 'power2.out' }
    );
  }, [tab]);

  const openDispatch = (f: Finding) => setDispatchTarget(f);
  const closeDispatch = () => setDispatchTarget(null);
  const handleSent = (draft: EmailDraft) => {
    setSentEmails(prev => [...prev, draft]);
    setDispatchTarget(null);
  };

  return (
    <div ref={shellRef} className="flex flex-col h-screen overflow-hidden" style={{ background: 'var(--bg)' }}>
      {/* Top bar */}
      <TopBar plant={plant} health={health} />

      {/* Tab strip */}
      <div className="flex items-center gap-1 px-6 pt-3 border-b border-[var(--border)] gs-reveal" style={{ background: 'var(--bg1)' }}>
        {(['overview', 'inverters', 'dispatch'] as Tab[]).map(t => (
          <button
            key={t}
            className={`tab-btn${tab === t ? ' active' : ''}`}
            onClick={() => setTab(t)}
          >
            {t === 'overview'  && '🔭 Overview'}
            {t === 'inverters' && '⚡ Inverters'}
            {t === 'dispatch'  && `📨 Dispatch${sentEmails.length > 0 ? ` (${sentEmails.length})` : ''}`}
          </button>
        ))}
        {/* Plant sub-tabs (Excel style) */}
        <div className="ml-auto flex gap-1">
          <button className="tab-btn active text-xs">📍 Plant A</button>
          <button className="tab-btn text-xs opacity-40 cursor-not-allowed" disabled>Plant B</button>
        </div>
      </div>

      {/* Main 2-column area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left / centre: main content */}
        <div ref={contentRef} className="flex-1 overflow-y-auto p-6">
          {tab === 'overview' && (
            <OverviewTab
              plant={plant}
              findings={findingsData}
              onDispatch={openDispatch}
              onSelectInverter={(id) => { setSelectedInverter(id); setTab('inverters'); }}
            />
          )}
          {tab === 'inverters' && (
            <div className="flex gap-4 h-full">
              {/* Heatmap + findings list */}
              <div className="flex flex-col gap-4 flex-1 min-w-0">
                <InverterHeatmap
                  mapData={mapData ?? []}
                  selected={selectedInverter}
                  onSelect={setSelectedInverter}
                />
                <FindingsList
                  findings={findingsData?.findings ?? []}
                  selectedId={selectedFinding?.finding_id}
                  onSelect={f => { setSelectedFinding(f); setSelectedInverter(f.inverter_id); }}
                  onDispatch={openDispatch}
                />
              </div>
              {/* Timeline panel */}
              {selectedInverter && (
                <div className="w-96 flex-shrink-0">
                  <TimelinePanel inverterId={selectedInverter} />
                </div>
              )}
            </div>
          )}
          {tab === 'dispatch' && (
            <DispatchTab
              sentEmails={sentEmails}
              findings={findingsData?.findings ?? []}
              onNew={openDispatch}
            />
          )}
        </div>

        {/* Right: Chat panel */}
        <div className="w-80 flex-shrink-0 border-l border-[var(--border)] gs-reveal">
          <ChatPanel health={health} />
        </div>
      </div>

      {/* Dispatch modal */}
      {dispatchTarget && (
        <DispatchModal
          finding={dispatchTarget}
          onClose={closeDispatch}
          onSent={handleSent}
        />
      )}
    </div>
  );
}
