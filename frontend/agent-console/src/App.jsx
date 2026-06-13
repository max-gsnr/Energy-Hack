import React, { useEffect, useMemo, useState } from 'react';
import { api } from './api.js';

const nf = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 });
const fmt = (n) => (n === null || n === undefined ? '–' : nf.format(n));
const label = (id) => (id || '').replace(/^INV\s+/, '');

function Chip({ kind, children }) {
  return <span className={`chip ${kind}`}>{children}</span>;
}

function Kpi({ label, value, sub }) {
  return (
    <div className="kpi">
      <div className="label">{label}</div>
      <div className="value">{value}</div>
      {sub && <div className="label" style={{ marginTop: 2 }}>{sub}</div>}
    </div>
  );
}

function Header({ plant, health }) {
  const s = plant?.summary;
  const tariff = plant?.tariff_eur_per_kwh ?? 0.1;
  const eur = s ? Math.round(s.total_lost_kwh * tariff) : null;
  return (
    <header className="top">
      <div className="brand">
        <div className="logo">☀️</div>
        <div>
          <h1>SolarTwin · O&amp;M Agent Console</h1>
          <div className="sub">Enerparc {plant ? '· ' + (plant.metadata?.selected_model || '') : ''}</div>
        </div>
      </div>
      <div className="kpis">
        <Kpi label="Modeled loss" value={`${fmt(s?.total_lost_kwh)} kWh`} sub="excl. curtailment" />
        <Kpi label="Est. value lost" value={`€ ${fmt(eur)}`} sub={`assumed ${tariff} €/kWh`} />
        <Kpi label="Curtailment" value={`${fmt(s?.total_curtailment_kwh)} kWh`} />
        <Kpi
          label="Assistant"
          value={
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <span className={`dot ${health?.llm ? 'on' : 'off'}`} />
              {health?.llm ? 'Gemini' : 'offline'}
            </span>
          }
        />
      </div>
    </header>
  );
}

function FindingRow({ f, selected, onClick }) {
  return (
    <div className={`row ${selected ? 'selected' : ''}`} onClick={onClick}>
      <div className="pri">#{f.priority}</div>
      <div>
        <div className="title">{label(f.inverter_id)} <Chip kind={f.severity}>{f.severity}</Chip></div>
        <div className="meta">
          <Chip kind="class">{f.classification.replace(/_/g, ' ')}</Chip>{' '}
          → {f.routing?.[0]?.name || '—'}
        </div>
      </div>
      <div className="right">
        <div className="kwh">{fmt(f.total_lost_kwh)} kWh</div>
        <div className="eur">~€ {fmt(f.euro?.eur)}</div>
      </div>
    </div>
  );
}

function Timeline({ tl }) {
  if (!tl) return null;
  return (
    <div className="panel">
      <h2>Forensic timeline · inverter doctor</h2>
      {tl.baseline_excluded && (
        <div className="badges"><span className="assumption">pre-existing / anomalous since start</span></div>
      )}
      <p style={{ whiteSpace: 'pre-wrap' }}>{tl.narrative}</p>
      <h3>Milestones</h3>
      <div className="timeline">
        {tl.milestones.map((m, i) => (
          <div className="milestone" key={i}>
            <span className="when">{m.date}</span><span className="kind">{m.kind}</span>
            <div className="what">{m.detail}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Detail({ f, onTimeline, onDispatch, tl, busy }) {
  if (!f) return <div className="empty">Select a finding to see the agent's analysis, routing and actions.</div>;
  const e = f.evidence || {};
  return (
    <>
      <div className="panel">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <h2>{label(f.inverter_id)}</h2>
          <Chip kind={f.severity}>{f.severity}</Chip>
          <Chip kind="class">{f.classification.replace(/_/g, ' ')}</Chip>
        </div>
        <p>{f.headline}</p>
        <div className="grid2">
          <div className="stat"><div className="l">Lost energy</div><div className="v">{fmt(f.total_lost_kwh)} kWh</div></div>
          <div className="stat"><div className="l">Est. value</div><div className="v">€ {fmt(f.euro?.eur)}</div></div>
          <div className="stat"><div className="l">Health factor</div><div className="v">{f.latest_factor ?? '–'}</div></div>
          <div className="stat"><div className="l">vs cohort</div><div className="v">{f.latest_relative_factor ?? '–'}</div></div>
        </div>
        <div className="badges">
          {f.euro?.is_assumption && <span className="assumption">€ uses assumed tariff {f.euro.tariff_eur_per_kwh}/kWh</span>}
          {f.baseline_excluded && <span className="assumption">baseline-excluded (pre-existing)</span>}
        </div>

        <h3>Root cause</h3>
        <p>{f.root_cause}</p>

        <h3>Recommended action</h3>
        <p>{f.recommended_action}</p>

        <h3>Repair vs replace</h3>
        <p>
          <Chip kind="class">{(f.repair?.verdict || '').replace(/_/g, ' ')}</Chip> {f.repair?.rationale}
        </p>
        <div className="badges"><span className="synthetic">{f.repair?.note}</span></div>

        <div className="actions">
          <button className="btn" disabled={busy} onClick={() => onDispatch(f)}>
            ✉️ Draft &amp; dispatch email
          </button>
          <button className="btn secondary" disabled={busy} onClick={() => onTimeline(f)}>
            🩺 Forensic timeline
          </button>
        </div>
      </div>

      <div className="panel">
        <h2>Stakeholder routing</h2>
        <p style={{ color: 'var(--muted)' }}>{f.routing?.[0]?.reason}</p>
        <ul className="routing">
          {f.routing?.map((r, i) => (
            <li key={i}>
              <span className="who">{r.name}</span>
              <span className="role">{r.role} · {r.company}</span>
              <span className="escalation">{i === 0 ? 'primary' : `escalation ${i}`} · {r.email}{r.email_is_synthetic ? ' (synthetic)' : ''}</span>
            </li>
          ))}
        </ul>
      </div>

      {tl && tl.inverter_id === f.inverter_id && <Timeline tl={tl} />}
    </>
  );
}

function EmailModal({ draft, onClose }) {
  if (!draft) return null;
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(ev) => ev.stopPropagation()}>
        <h2>Dispatch agent · drafted email</h2>
        {draft.sent && (
          <div className="sent-banner">
            ✓ Mock-sent ({draft.send_channel}) · {draft.llm_generated ? 'Gemini-written' : 'template'} ·
            review before any real send
          </div>
        )}
        <div className="email">
          <div className="hdr">To: <b>{draft.to_name}</b> &lt;{draft.to_email}&gt;{draft.to_email_is_synthetic ? ' · synthetic demo address' : ''}</div>
          {draft.cc?.length > 0 && <div className="hdr">Cc: {draft.cc.join(', ')}</div>}
          <div className="hdr">Subject: <b>{draft.subject}</b></div>
          <pre>{draft.body}</pre>
        </div>
        <div className="actions">
          <button className="btn" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}

function FindingsView({ findings }) {
  const [selected, setSelected] = useState(null);
  const [actionableOnly, setActionableOnly] = useState(true);
  const [tl, setTl] = useState(null);
  const [draft, setDraft] = useState(null);
  const [busy, setBusy] = useState(false);

  const shown = useMemo(
    () => (actionableOnly ? findings.filter((f) => f.classification !== 'healthy') : findings),
    [findings, actionableOnly]
  );

  const onTimeline = async (f) => {
    setBusy(true); setTl(null);
    try { setTl(await api.timeline(f.inverter_id)); } catch (e) { setTl({ inverter_id: f.inverter_id, narrative: 'Failed to load timeline: ' + e.message, milestones: [] }); }
    setBusy(false);
  };
  const onDispatch = async (f) => {
    setBusy(true);
    try { setDraft(await api.dispatch(f.finding_id)); } catch (e) { setDraft({ to_name: '—', to_email: '—', subject: 'Error', body: e.message, sent: false }); }
    setBusy(false);
  };

  return (
    <div className="body">
      <div className="col-list">
        <div className="toolbar">
          <span className="count">{shown.length} findings</span>
          <label className="toggle">
            <input type="checkbox" checked={actionableOnly} onChange={(e) => setActionableOnly(e.target.checked)} />
            actionable only
          </label>
        </div>
        <div className="list">
          {shown.map((f) => (
            <FindingRow key={f.finding_id} f={f} selected={selected?.finding_id === f.finding_id} onClick={() => { setSelected(f); setTl(null); }} />
          ))}
        </div>
      </div>
      <div className="col-detail">
        <Detail f={selected} onTimeline={onTimeline} onDispatch={onDispatch} tl={tl} busy={busy} />
      </div>
      <EmailModal draft={draft} onClose={() => setDraft(null)} />
    </div>
  );
}

const SUGGESTIONS = [
  'Which inverter lost the most energy and why?',
  'Is the top issue pre-existing or a new fault?',
  'How much was lost to curtailment vs faults?',
  'Summarise INV 01.05.033',
];

function ChatView() {
  const [messages, setMessages] = useState([
    { role: 'bot', content: 'Ask me about Plant A — inverter losses, faults vs degradation, curtailment, or a specific inverter.' },
  ]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);

  const send = async (text) => {
    const q = (text ?? input).trim();
    if (!q || busy) return;
    const history = messages.filter((m) => m.role !== 'system').map((m) => ({ role: m.role === 'bot' ? 'assistant' : 'user', content: m.content }));
    setMessages((m) => [...m, { role: 'user', content: q }]);
    setInput(''); setBusy(true);
    try {
      const res = await api.chat(q, history);
      setMessages((m) => [...m, { role: 'bot', content: res.answer + (res.llm_generated ? '' : '  ·  (data lookup — no LLM key)') }]);
    } catch (e) {
      setMessages((m) => [...m, { role: 'bot', content: 'Error: ' + e.message }]);
    }
    setBusy(false);
  };

  return (
    <div className="body">
      <div className="chat" style={{ width: '100%' }}>
        <div className="stream">
          {messages.map((m, i) => <div key={i} className={`msg ${m.role}`}>{m.content}</div>)}
          {busy && <div className="msg bot">…thinking</div>}
        </div>
        <div className="suggestions">
          {SUGGESTIONS.map((s) => <span key={s} className="suggestion" onClick={() => send(s)}>{s}</span>)}
        </div>
        <div className="composer">
          <input
            value={input}
            placeholder="Ask the plant analyst…"
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && send()}
          />
          <button className="btn" disabled={busy} onClick={() => send()}>Send</button>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const [tab, setTab] = useState('findings');
  const [plant, setPlant] = useState(null);
  const [health, setHealth] = useState(null);
  const [findings, setFindings] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        setHealth(await api.health());
        setPlant(await api.plant());
        setFindings((await api.findings()).findings);
      } catch (e) {
        setError(`Cannot reach agent API. Start it with:  uvicorn backend.agents.api:app --port 8088  (${e.message})`);
      }
    })();
  }, []);

  return (
    <div className="app">
      <Header plant={plant} health={health} />
      <div className="tabs">
        <div className={`tab ${tab === 'findings' ? 'active' : ''}`} onClick={() => setTab('findings')}>Findings &amp; actions</div>
        <div className={`tab ${tab === 'chat' ? 'active' : ''}`} onClick={() => setTab('chat')}>Plant analyst</div>
      </div>
      {error && <div className="err">{error}</div>}
      {!error && tab === 'findings' && <FindingsView findings={findings} />}
      {!error && tab === 'chat' && <ChatView />}
    </div>
  );
}
