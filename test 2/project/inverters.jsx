/* SolarTwin — Inverters tab. Spatial heatmap + forensic detail panel. */

const ATTR_MODES = [
  { id: "severity", label: "Severity" },
  { id: "health", label: "Health" },
  { id: "loss", label: "€ loss" },
  { id: "anomalies", label: "Anomalies" },
];

function tileColor(iv, mode, maxLoss) {
  if (mode === "severity") return SOLAR.sevColor[iv.severity];
  if (mode === "health") {
    const h = iv.health;
    return h > 0.85 ? "var(--green-500)" : h > 0.72 ? "var(--green-400)" : h > 0.6 ? "var(--green-300)" : h > 0.48 ? "var(--green-200)" : "var(--sev-critical)";
  }
  if (mode === "loss") {
    const f = Math.min(1, iv.lossEur / maxLoss);
    if (f < 0.04) return "var(--green-200)";
    if (f < 0.2) return "var(--green-400)";
    if (f < 0.45) return "var(--accent-glow)";
    return "var(--sev-critical)";
  }
  // anomalies
  const n = iv.anomalies.length;
  return n === 0 ? "var(--hairline)" : n === 1 ? "var(--green-300)" : n === 2 ? "var(--accent-glow)" : "var(--sev-critical)";
}

function Heat({ plant, mode, selectedId, onSelect }) {
  const [hovId, setHovId] = useState(null);
  const maxLoss = Math.max(...plant.inverters.map((i) => i.lossEur), 1);
  // Lay tiles on the physical row/column grid the backend already computes. This
  // gives a balanced heatmap for any plant shape (e.g. 9x8 for A, 15x10 for B)
  // instead of one thin row per inverter_group.
  const maxCol = Math.max(...plant.inverters.map((iv) => iv.col || 1), 1);
  const TILE = 26;
  return React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: `repeat(${maxCol}, minmax(${TILE}px, 1fr))`,
      gridAutoRows: `minmax(${TILE}px, 1fr)`,
      gap: 6,
      width: "100%",
      maxWidth: maxCol * (TILE + 12),
    },
  },
    plant.inverters.map((iv) => {
      const sel = iv.id === selectedId, hov = iv.id === hovId;
      const dim = hovId && !hov;
      return React.createElement("button", {
        key: iv.id, onClick: () => onSelect(iv.id),
        onMouseEnter: () => setHovId(iv.id), onMouseLeave: () => setHovId(null),
        title: `${iv.id} · ${SOLAR.sevLabel[iv.severity]} · €${SOLAR.fmt(iv.lossEur)}`,
        style: {
          gridColumn: (iv.col || 1), gridRow: (iv.row || 1),
          aspectRatio: "1 / 1", width: "100%", minWidth: 0,
          borderRadius: "var(--radius-sm)",
          border: sel ? "2px solid var(--ink-primary)" : "2px solid transparent",
          background: tileColor(iv, mode, maxLoss), cursor: "pointer", padding: 0,
          transform: hov ? "scale(1.18)" : "scale(1)", opacity: dim ? 0.45 : 1,
          transition: "transform var(--dur-fast) var(--ease-out-power3), opacity var(--dur-fast) ease, border-color var(--dur-fast) ease",
          boxShadow: sel ? "var(--shadow-pop)" : "none", zIndex: hov || sel ? 2 : 1, position: "relative",
        },
      });
    }));
}

function HeatLegend({ mode }) {
  const sets = {
    severity: SOLAR.sevOrder.map((s) => ({ c: SOLAR.sevColor[s], l: SOLAR.sevLabel[s] })),
    health: [{ c: "var(--green-500)", l: "Healthy" }, { c: "var(--green-300)", l: "Drifting" }, { c: "var(--green-200)", l: "Degraded" }, { c: "var(--sev-critical)", l: "Failing" }],
    loss: [{ c: "var(--green-200)", l: "≈ none" }, { c: "var(--green-400)", l: "Low" }, { c: "var(--accent-glow)", l: "High" }, { c: "var(--sev-critical)", l: "Severe" }],
    anomalies: [{ c: "var(--hairline)", l: "0" }, { c: "var(--green-300)", l: "1" }, { c: "var(--accent-glow)", l: "2" }, { c: "var(--sev-critical)", l: "3+" }],
  };
  return React.createElement("div", { style: { display: "flex", gap: 14, flexWrap: "wrap" } },
    sets[mode].map((it, i) => React.createElement("span", { key: i, style: { display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12, color: "var(--ink-secondary)" } },
      React.createElement("span", { style: { width: 12, height: 12, borderRadius: 3, background: it.c } }), it.l)));
}

const TL_COLOR = { install: "var(--green-500)", event: "var(--ink-muted)", degrade: "var(--accent-glow)", repair: "var(--green-300)", anomaly: "var(--sev-critical)" };
function Timeline({ items }) {
  return React.createElement("div", { style: { position: "relative", paddingLeft: 4 } },
    items.map((m, i) => React.createElement("div", { key: i, style: { display: "grid", gridTemplateColumns: "44px 16px 1fr", gap: 10, paddingBottom: i === items.length - 1 ? 0 : 16, position: "relative" } },
      React.createElement("span", { style: { fontSize: 12, fontWeight: 700, color: "var(--ink-muted)", textAlign: "right", paddingTop: 1 } }, m.year),
      React.createElement("span", { style: { position: "relative", display: "flex", justifyContent: "center" } },
        React.createElement("span", { style: { width: 11, height: 11, borderRadius: "50%", background: TL_COLOR[m.type], marginTop: 3, zIndex: 1, boxShadow: "0 0 0 3px var(--surface-card)" } }),
        i < items.length - 1 && React.createElement("span", { style: { position: "absolute", top: 14, bottom: -16, width: 2, background: "var(--hairline)" } })),
      React.createElement("div", { style: { display: "flex", flexDirection: "column", gap: 2 } },
        React.createElement("span", { style: { fontSize: 13.5, fontWeight: 600, color: "var(--ink-primary)" } }, m.label),
        React.createElement("span", { style: { fontSize: 12.5, color: "var(--ink-muted)", lineHeight: 1.45 } }, m.detail)))));
}

function DetailStat({ k, v, tone }) {
  return React.createElement("div", { style: { display: "flex", flexDirection: "column", gap: 3 } },
    React.createElement("span", { className: "t-caption-uppercase" }, k),
    React.createElement("span", { style: { fontSize: 19, fontWeight: 600, letterSpacing: "-0.01em", color: tone || "var(--ink-primary)" } }, v));
}

function InverterDetail({ iv, plantKey, onClose, onDispatch }) {
  const placeholder = !iv.timeline || iv.timeline.length === 0;
  const [tlItems, setTlItems]     = useState(iv.timeline || []);
  const [narrative, setNarrative] = useState(iv.narrative || "");
  const [loading, setLoading]     = useState(false);

  useEffect(() => {
    setTlItems(iv.timeline || []);
    setNarrative(iv.narrative || "");
    if (placeholder && iv.id) {
      setLoading(true);
      SOLAR.fetchTimeline(iv.id, plantKey || "A").then(items => {
        if (items && items.length) setTlItems(items);
        setLoading(false);
      });
    }
  }, [iv.id]);

  return React.createElement("div", { key: iv.id, className: "detail-enter", style: { display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" } },
    React.createElement("div", { style: { display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, marginBottom: 16 } },
      React.createElement("div", { style: { display: "flex", flexDirection: "column", gap: 7 } },
        React.createElement("div", { style: { display: "flex", alignItems: "center", gap: 11 } },
          React.createElement("h2", { style: { fontFamily: "var(--font-display)", fontWeight: 500, fontSize: 30, letterSpacing: "-0.02em", margin: 0, color: "var(--ink-primary)" } }, iv.id),
          React.createElement(SevChip, { sev: iv.severity })),
        React.createElement("span", { style: { fontSize: 13, color: "var(--ink-muted)" } }, `Group ${iv.group} · ${iv.peakKw} kW · commissioned ${iv.commissioned}`)),
      React.createElement("button", { onClick: onClose, className: "icon-btn", title: "Close", style: { border: "1px solid var(--hairline)", background: "var(--surface-card)", borderRadius: "var(--radius-md)", width: 34, height: 34, display: "grid", placeItems: "center", cursor: "pointer", color: "var(--ink-secondary)" } },
        React.createElement(Icon, { name: "x", size: 18 }))),
    React.createElement("div", { style: { flex: 1, overflowY: "auto", paddingRight: 4, display: "flex", flexDirection: "column", gap: 20 } },
      React.createElement("div", { style: { display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16, padding: "16px 0", borderTop: "1px solid var(--hairline)", borderBottom: "1px solid var(--hairline)" } },
        React.createElement(DetailStat, { k: "Health factor", v: Math.round(iv.health * 100) + "%", tone: iv.health > 0.64 ? "var(--green-500)" : "var(--accent-glow)" }),
        React.createElement(DetailStat, { k: "Lifetime loss", v: SOLAR.fmt(iv.lossKwh) + " kWh" }),
        React.createElement(DetailStat, { k: "€ attributed", v: "€" + SOLAR.fmt(iv.lossEur), tone: iv.lossEur > 30000 ? "var(--sev-critical)" : undefined })),
      React.createElement("div", null,
        React.createElement("div", { className: "t-caption-uppercase", style: { marginBottom: 8, display: "flex", alignItems: "center", gap: 7 } },
          React.createElement(Icon, { name: "sparkles", size: 13, color: "var(--accent-primary)" }), "Forensic life-story · agent reconstructed",
          loading && React.createElement("span", { style: { marginLeft: "auto", fontSize: 11, color: "var(--ink-muted)", fontStyle: "italic" } }, "loading…")),
        React.createElement("p", { style: { fontSize: 14, lineHeight: 1.6, color: "var(--ink-secondary)", margin: "0 0 18px", textWrap: "pretty" } }, narrative),
        React.createElement(Timeline, { items: tlItems })),
      React.createElement("div", null,
        React.createElement("div", { className: "t-caption-uppercase", style: { marginBottom: 10 } }, `Anomaly events · ${iv.anomalies.length}`),
        iv.anomalies.length === 0
          ? React.createElement("div", { style: { fontSize: 13.5, color: "var(--ink-muted)", padding: "14px 0" } }, "No anomalies on record — tracking its twin cleanly.")
          : React.createElement("div", { style: { display: "flex", flexDirection: "column", gap: 10 } },
            iv.anomalies.map((a) => React.createElement(AnomalyCard, { key: a.id, a, onDispatch }))))));
}

function AnomalyCard({ a, onDispatch }) {
  const v = SOLAR.empById[a.recommendedTo];
  return React.createElement("div", { style: { background: "var(--surface-card)", border: "1px solid var(--hairline)", borderRadius: "var(--radius-lg)", padding: 16 } },
    React.createElement("div", { style: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, marginBottom: 8 } },
      React.createElement("div", { style: { display: "flex", alignItems: "center", gap: 9 } },
        React.createElement(SevChip, { sev: a.severity }),
        React.createElement("span", { style: { fontSize: 15, fontWeight: 600, color: "var(--ink-primary)" } }, a.type)),
      React.createElement("span", { style: { fontSize: 12, color: "var(--ink-muted)" } }, a.detected)),
    React.createElement("p", { style: { fontSize: 13, lineHeight: 1.55, color: "var(--ink-secondary)", margin: "0 0 8px", textWrap: "pretty" } }, a.root),
    React.createElement("div", { style: { display: "flex", alignItems: "center", gap: 8, fontSize: 12.5, color: "var(--ink-secondary)", marginBottom: 12 } },
      React.createElement(Icon, { name: "wrench", size: 14, color: "var(--accent-primary)" }),
      React.createElement("span", { style: { fontWeight: 500 } }, a.action),
      React.createElement(VerdictTag, { verdict: a.verdict })),
    React.createElement("div", { style: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, paddingTop: 11, borderTop: "1px solid var(--hairline)" } },
      React.createElement("div", { style: { display: "flex", alignItems: "center", gap: 16, fontSize: 12.5 } },
        React.createElement("span", { style: { color: "var(--ink-muted)" } }, "Loss ", React.createElement("strong", { style: { color: "var(--ink-primary)" } }, SOLAR.fmt(a.lossKwh) + " kWh")),
        React.createElement("span", { style: { color: "var(--ink-muted)" } }, "≈ ", React.createElement("strong", { style: { color: "var(--ink-primary)" } }, "€" + SOLAR.fmt(a.lossEur)))),
      React.createElement(EnvelopeButton, { recommendedTo: a.recommendedTo, onClick: () => onDispatch(a) })));
}

function VerdictTag({ verdict }) {
  const c = verdict === "Replace" ? "var(--sev-critical)" : verdict === "Repair" ? "var(--green-500)" : "var(--ink-muted)";
  return React.createElement("span", { style: { marginLeft: "auto", fontSize: 11, fontWeight: 700, letterSpacing: "0.04em", textTransform: "uppercase", color: c, whiteSpace: "nowrap" } }, verdict);
}

function Inverters({ plant, selectedId, onSelect, onDispatch, defaultMode }) {
  const [mode, setMode] = useState(defaultMode || "severity");
  useEffect(() => { if (defaultMode) setMode(defaultMode); }, [defaultMode]);
  const iv = plant.inverters.find((x) => x.id === selectedId);
  return React.createElement("div", { style: { display: "grid", gridTemplateColumns: iv ? "minmax(440px, 520px) 1fr" : "1fr", gap: 18, height: "100%", alignItems: "start" } },
    React.createElement("div", { style: { display: "flex", flexDirection: "column", gap: 16 } },
      React.createElement("div", { style: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" } },
        React.createElement("div", null,
          React.createElement("h2", { style: { fontFamily: "var(--font-display)", fontWeight: 500, fontSize: 26, letterSpacing: "-0.02em", margin: 0, color: "var(--ink-primary)" } }, "Inverter map"),
          React.createElement("span", { style: { fontSize: 13, color: "var(--ink-muted)" } }, `${plant.count} units · physical layout · colour by`)),
        React.createElement("div", { style: { display: "inline-flex", background: "var(--surface-soft)", borderRadius: "var(--radius-md)", padding: 3, gap: 2 } },
          ATTR_MODES.map((m) => React.createElement("button", { key: m.id, onClick: () => setMode(m.id),
            style: { padding: "6px 12px", borderRadius: 6, border: "none", cursor: "pointer", fontSize: 12.5, fontWeight: 600,
              background: mode === m.id ? "var(--surface-card)" : "transparent", color: mode === m.id ? "var(--ink-primary)" : "var(--ink-secondary)",
              boxShadow: mode === m.id ? "var(--shadow-pop)" : "none", transition: "all var(--dur-fast) ease" } }, m.label)))),
      React.createElement("div", { style: { background: "var(--surface-soft)", borderRadius: "var(--radius-lg)", padding: 22, display: "flex", flexDirection: "column", gap: 18 } },
        React.createElement(Heat, { plant, mode, selectedId, onSelect }),
        React.createElement("div", { style: { borderTop: "1px solid var(--hairline)", paddingTop: 14 } }, React.createElement(HeatLegend, { mode }))),
      !iv && React.createElement("div", { style: { display: "flex", alignItems: "center", gap: 10, color: "var(--ink-muted)", fontSize: 13.5, padding: "4px 2px" } },
        React.createElement(Icon, { name: "arrowRight", size: 16 }), "Select any tile to open its 10-year forensic timeline.")),
    iv && React.createElement("div", { style: { background: "var(--surface-soft)", borderRadius: "var(--radius-lg)", padding: 24, height: "100%", maxHeight: "calc(100vh - 210px)", position: "sticky", top: 0 } },
      React.createElement(InverterDetail, { iv, plantKey: plant.key, onClose: () => onSelect(null), onDispatch })));
}

Object.assign(window, { Inverters, VerdictTag });
