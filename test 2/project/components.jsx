/* SolarTwin — shared UI primitives + icon set. Exported to window. */
const { useState, useEffect, useRef } = React;

// ── Icon set (inline SVG, Lucide-style outline, currentColor) ──
const ICON_PATHS = {
  gauge: '<path d="M12 14l4-4"/><path d="M3.34 19a10 10 0 1 1 17.32 0"/>',
  grid: '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>',
  alert: '<path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>',
  mail: '<rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>',
  send: '<path d="M14.536 21.686a.5.5 0 0 0 .937-.024l6.5-19a.496.496 0 0 0-.635-.635l-19 6.5a.5.5 0 0 0-.024.937l7.93 3.18a2 2 0 0 1 1.112 1.11z"/><path d="m21.854 2.147-10.94 10.939"/>',
  x: '<path d="M18 6 6 18"/><path d="m6 6 12 12"/>',
  chevronDown: '<path d="m6 9 6 6 6-6"/>',
  chevronRight: '<path d="m9 18 6-6-6-6"/>',
  search: '<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>',
  sparkles: '<path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .962 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.962 0z"/>',
  arrowRight: '<path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>',
  check: '<path d="M20 6 9 17l-5-5"/>',
  checkCheck: '<path d="M18 6 7 17l-5-5"/><path d="m22 10-7.5 7.5L13 16"/>',
  clock: '<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>',
  bell: '<path d="M10.268 21a2 2 0 0 0 3.464 0"/><path d="M3.262 15.326A1 1 0 0 0 4 17h16a1 1 0 0 0 .74-1.673C19.41 13.956 18 12.499 18 8A6 6 0 0 0 6 8c0 4.499-1.411 5.956-2.738 7.326"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/>',
  battery: '<rect x="2" y="7" width="16" height="10" rx="2"/><line x1="22" y1="11" x2="22" y2="13"/><line x1="6" y1="11" x2="6" y2="13"/><line x1="10" y1="11" x2="10" y2="13"/>',
  zap: '<path d="M4 14a1 1 0 0 1-.78-1.63l9.9-10.2a.5.5 0 0 1 .86.46l-1.92 6.02A1 1 0 0 0 13 10h7a1 1 0 0 1 .78 1.63l-9.9 10.2a.5.5 0 0 1-.86-.46l1.92-6.02A1 1 0 0 0 11 14z"/>',
  trash: '<path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>',
  eye: '<path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0"/><circle cx="12" cy="12" r="3"/>',
  cornerDownRight: '<polyline points="15 10 20 15 15 20"/><path d="M4 4v7a4 4 0 0 0 4 4h12"/>',
  panelLeft: '<rect width="18" height="18" x="3" y="3" rx="2"/><path d="M9 3v18"/>',
  bot: '<path d="M12 8V4H8"/><rect width="16" height="12" x="4" y="8" rx="2"/><path d="M2 14h2M20 14h2M15 13v2M9 13v2"/>',
  user: '<circle cx="12" cy="8" r="5"/><path d="M20 21a8 8 0 0 0-16 0"/>',
  fileText: '<path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5z"/><path d="M14 2v6h6"/><path d="M16 13H8M16 17H8M10 9H8"/>',
  wrench: '<path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>',
  refresh: '<path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M8 16H3v5"/>',
  filter: '<polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/>',
  trendDown: '<path d="M16 17h6v-6"/><path d="m22 17-8.5-8.5-5 5L2 7"/>',
  layers: '<path d="M12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83z"/><path d="m22 12.91-9.17 4.18a2 2 0 0 1-1.66 0L2 12.91"/><path d="m22 17.91-9.17 4.18a2 2 0 0 1-1.66 0L2 17.91"/>',
};
function Icon({ name, size = 20, color = "currentColor", strokeWidth = 1.9, style = {} }) {
  return React.createElement("svg", {
    width: size, height: size, viewBox: "0 0 24 24", fill: "none", stroke: color,
    strokeWidth, strokeLinecap: "round", strokeLinejoin: "round",
    style: { flex: "0 0 auto", display: "block", ...style },
    dangerouslySetInnerHTML: { __html: ICON_PATHS[name] || "" },
  });
}

// ── severity dot + chip ──
function SevDot({ sev, size = 9 }) {
  return React.createElement("span", {
    style: { width: size, height: size, borderRadius: "50%", background: SOLAR.sevColor[sev], flex: "0 0 auto", display: "inline-block",
      boxShadow: sev === "critical" ? "0 0 0 3px color-mix(in oklab, var(--sev-critical) 22%, transparent)" : "none" },
  });
}
function SevChip({ sev }) {
  const dark = sev === "healthy" || sev === "critical";
  return React.createElement("span", {
    style: {
      display: "inline-flex", alignItems: "center", gap: 6, padding: "3px 9px 3px 7px",
      borderRadius: "var(--radius-sm)", fontSize: 11, fontWeight: 600, letterSpacing: "0.02em",
      background: sev === "warning" ? "color-mix(in oklab, var(--accent-glow) 26%, white)"
        : sev === "watch" ? "color-mix(in oklab, var(--green-200) 45%, white)"
        : sev === "critical" ? "color-mix(in oklab, var(--sev-critical) 14%, white)"
        : "color-mix(in oklab, var(--green-500) 12%, white)",
      color: sev === "critical" ? "var(--sev-critical)" : sev === "healthy" ? "var(--green-500)" : "var(--ink-primary)",
    },
  }, React.createElement(SevDot, { sev, size: 7 }), SOLAR.sevLabel[sev]);
}

// status chip for emails
const STATUS_META = {
  draft:   { label: "Draft",   color: "var(--ink-muted)",      bg: "var(--surface-soft)" },
  pending: { label: "Pending", color: "#9a6a12",               bg: "color-mix(in oklab, var(--accent-glow) 22%, white)" },
  sent:    { label: "Sent",    color: "var(--green-500)",      bg: "color-mix(in oklab, var(--green-200) 40%, white)" },
  seen:    { label: "Seen",    color: "#6b3fa0",               bg: "color-mix(in oklab, var(--accent-secondary) 55%, white)" },
};
function StatusChip({ status }) {
  const m = STATUS_META[status];
  return React.createElement("span", {
    style: { display: "inline-flex", alignItems: "center", gap: 5, padding: "3px 9px", borderRadius: "var(--radius-sm)",
      fontSize: 11, fontWeight: 600, background: m.bg, color: m.color, whiteSpace: "nowrap" },
  }, m.label);
}

// ── envelope dispatch button (the centerpiece trigger) ──
function EnvelopeButton({ onClick, recommendedTo }) {
  const [hov, setHov] = useState(false);
  const e = SOLAR.empById[recommendedTo];
  return React.createElement("button", {
    onClick, onMouseEnter: () => setHov(true), onMouseLeave: () => setHov(false),
    title: e ? `Dispatch — suggested: ${e.name}` : "Dispatch report",
    style: {
      display: "inline-flex", alignItems: "center", gap: 7, padding: "7px 11px 7px 9px",
      border: "1px solid " + (hov ? "var(--accent-primary)" : "var(--hairline)"),
      background: hov ? "var(--accent-primary)" : "var(--surface-card)",
      color: hov ? "var(--on-accent)" : "var(--ink-secondary)",
      borderRadius: "var(--radius-md)", cursor: "pointer", fontSize: 12.5, fontWeight: 600,
      transition: "all var(--dur-fast) ease", whiteSpace: "nowrap",
    },
  }, React.createElement(Icon, { name: "mail", size: 16 }), "Dispatch");
}

// ── animated count-up number ──
function CountUp({ value, decimals = 0, suffix = "", dur = 1100 }) {
  const [v, setV] = useState(0);
  const ref = useRef();
  useEffect(() => {
    let raf; const start = performance.now();
    const tick = (t) => {
      const p = Math.min(1, (t - start) / dur);
      const e = 1 - Math.pow(1 - p, 3);
      setV(value * e);
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    const fb = setTimeout(() => setV(value), dur + 140); // guarantee final value even if rAF is throttled (hidden tab)
    return () => { cancelAnimationFrame(raf); clearTimeout(fb); };
  }, [value]);
  const out = decimals > 0 ? v.toFixed(decimals) : Math.round(v).toLocaleString("en-US");
  return React.createElement("span", { ref }, out + suffix);
}

// ── minimal markdown → HTML (bold, italic, lists, headings, code, br) ──
function mdToHtml(src) {
  const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const lines = (src || "").split("\n");
  let html = "", inUl = false, inOl = false;
  const closeLists = () => { if (inUl) { html += "</ul>"; inUl = false; } if (inOl) { html += "</ol>"; inOl = false; } };
  const inline = (t) => esc(t)
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/(?<!\*)\*([^*]+)\*(?!\*)/g, "<em>$1</em>");
  for (let ln of lines) {
    if (/^\s*#{1,3}\s+/.test(ln)) { closeLists(); const lvl = ln.match(/^\s*(#{1,3})/)[1].length; html += `<h${lvl + 3} class="md-h">${inline(ln.replace(/^\s*#{1,3}\s+/, ""))}</h${lvl + 3}>`; continue; }
    if (/^\s*[-•*]\s+/.test(ln)) { if (!inUl) { closeLists(); html += "<ul class='md-ul'>"; inUl = true; } html += `<li>${inline(ln.replace(/^\s*[-•*]\s+/, ""))}</li>`; continue; }
    if (/^\s*\d+\.\s+/.test(ln)) { if (!inOl) { closeLists(); html += "<ol class='md-ol'>"; inOl = true; } html += `<li>${inline(ln.replace(/^\s*\d+\.\s+/, ""))}</li>`; continue; }
    if (/^\s*$/.test(ln)) { closeLists(); continue; }
    closeLists(); html += `<p class="md-p">${inline(ln)}</p>`;
  }
  closeLists();
  return html;
}

Object.assign(window, { Icon, SevDot, SevChip, StatusChip, EnvelopeButton, CountUp, mdToHtml, STATUS_META, useState, useEffect, useRef });
