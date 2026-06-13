/* SolarTwin — Overview tab. Plant-level ML twin summary. */
const { Widget } = window.FlowDesignSystem_96ad7f;

function Kpi({ label, value, decimals, suffix, sub, tone }) {
  return React.createElement("div", { style: { background: "var(--surface-soft)", borderRadius: "var(--radius-lg)", padding: "20px 22px", display: "flex", flexDirection: "column", gap: 6 } },
    React.createElement("span", { className: "t-caption-uppercase" }, label),
    React.createElement("span", { style: { fontFamily: "var(--font-display)", fontWeight: 500, letterSpacing: "-0.02em", fontSize: 42, lineHeight: 1, color: tone || "var(--ink-primary)" } },
      React.createElement(CountUp, { value, decimals, suffix })),
    sub && React.createElement("span", { style: { fontSize: 12.5, color: "var(--ink-muted)", fontWeight: 500 } }, sub));
}

function MetaPill({ k, v }) {
  return React.createElement("div", { style: { display: "flex", flexDirection: "column", gap: 3, paddingRight: 26, borderRight: "1px solid var(--hairline-dark)" } },
    React.createElement("span", { style: { fontSize: 10.5, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: "rgba(255,255,255,.55)" } }, k),
    React.createElement("span", { style: { fontSize: 15, fontWeight: 600, color: "var(--on-dark)" } }, v));
}

function WorstList({ plant, onOpenInverter }) {
  const tiers = [
    { label: "Tier 1 — immediate", sevs: ["critical"] },
    { label: "Tier 2 — schedule", sevs: ["warning"] },
    { label: "Tier 3 — monitor", sevs: ["watch"] },
  ];
  const anyFlagged = plant.worst.some((w) => ["critical", "warning", "watch"].includes(w.severity));
  if (!anyFlagged) {
    return React.createElement("div", { style: { display: "flex", alignItems: "center", gap: 10, color: "var(--ink-muted)", fontSize: 13.5, padding: "8px 2px" } },
      React.createElement(SevDot, { sev: "healthy" }),
      "No flagged inverters — the whole fleet is tracking its expected degradation envelope.");
  }
  return React.createElement("div", { style: { display: "flex", flexDirection: "column", gap: 18 } },
    tiers.map((tier) => {
      const rows = plant.worst.filter((w) => tier.sevs.includes(w.severity));
      if (!rows.length) return null;
      return React.createElement("div", { key: tier.label },
        React.createElement("div", { className: "t-caption-uppercase", style: { marginBottom: 9 } }, tier.label),
        React.createElement("div", { style: { display: "flex", flexDirection: "column", gap: 4 } },
          rows.map((iv) => React.createElement("button", { key: iv.id, onClick: () => onOpenInverter(iv.id), className: "row-hover",
            style: { display: "grid", gridTemplateColumns: "26px 1fr 120px 92px", alignItems: "center", gap: 12, padding: "10px 12px", border: "none", cursor: "pointer", textAlign: "left", borderRadius: "var(--radius-md)", width: "100%" } },
            React.createElement("span", { style: { fontSize: 13, fontWeight: 700, color: "var(--ink-muted)" } }, "#" + iv.rank),
            React.createElement("span", { style: { display: "flex", alignItems: "center", gap: 9 } },
              React.createElement(SevDot, { sev: iv.severity }),
              React.createElement("span", { style: { fontWeight: 600, fontSize: 14.5, color: "var(--ink-primary)" } }, iv.id),
              React.createElement("span", { style: { fontSize: 12, color: "var(--ink-muted)" } }, "group " + iv.group)),
            React.createElement(HealthBar, { health: iv.health }),
            React.createElement("span", { style: { textAlign: "right", fontWeight: 600, fontSize: 14, color: "var(--ink-primary)" } }, "€" + SOLAR.fmt(iv.lossEur)))))); }));
}

function HealthBar({ health }) {
  const pct = Math.round(health * 100);
  const col = health > 0.82 ? "var(--green-500)" : health > 0.64 ? "var(--green-300)" : health > 0.45 ? "var(--accent-glow)" : "var(--sev-critical)";
  return React.createElement("div", { style: { display: "flex", alignItems: "center", gap: 8 } },
    React.createElement("div", { style: { flex: 1, height: 6, borderRadius: 3, background: "var(--hairline)", overflow: "hidden" } },
      React.createElement("div", { style: { width: pct + "%", height: "100%", background: col, borderRadius: 3 } })),
    React.createElement("span", { style: { fontSize: 11.5, fontWeight: 600, color: "var(--ink-muted)", width: 30, textAlign: "right" } }, pct + "%"));
}

function TwinChart({ plant }) {
  const [view, setView] = useState("month");
  const btnStyle = (active) => ({
    padding: "5px 16px", borderRadius: 6, border: "none", cursor: "pointer",
    fontSize: 12.5, fontWeight: 600, transition: "all 0.15s ease",
    background: active ? "var(--surface-card)" : "transparent",
    color: active ? "var(--ink-primary)" : "var(--ink-secondary)",
    boxShadow: active ? "var(--shadow-pop)" : "none",
  });
  return React.createElement("div", null,
    React.createElement("div", { style: { display: "flex", alignItems: "center", marginBottom: 16 } },
      React.createElement("div", { style: { display: "inline-flex", background: "var(--surface-soft)", borderRadius: "var(--radius-md)", padding: 3, gap: 2 } },
        React.createElement("button", { style: btnStyle(view === "year"),  onClick: () => setView("year")  }, "Year"),
        React.createElement("button", { style: btnStyle(view === "month"), onClick: () => setView("month") }, "Month"))),
    view === "year"
      ? React.createElement(YearBars,  { years: plant.years,   height: 240 })
      : React.createElement(TwinLines, { monthly: plant.monthly, height: 240 }));
}

function Overview({ plant, onOpenInverter }) {
  const last = plant.years[plant.years.length - 1];
  const lossPct = ((last.gap / last.expected) * 100);
  const totGwh = (plant.totalLossKwh / 1e6);
  const anomPct = last.expected > 0 ? ((last.anomalyLoss / last.expected) * 100) : 0;
  return React.createElement("div", { style: { display: "flex", flexDirection: "column", gap: 18 } },
    // model metadata banner (dark surface)
    React.createElement("div", { style: { background: "var(--surface-dark)", borderRadius: "var(--radius-xl)", padding: "22px 26px", display: "flex", alignItems: "center", gap: 26, flexWrap: "wrap" } },
      React.createElement("div", { style: { display: "flex", flexDirection: "column", gap: 4, marginRight: 8 } },
        React.createElement("span", { style: { display: "inline-flex", alignItems: "center", gap: 8, fontSize: 12, fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--accent-success)" } },
          React.createElement(Icon, { name: "layers", size: 15, color: "var(--accent-success)" }), "Digital twin online"),
        React.createElement("span", { style: { fontSize: 19, fontWeight: 600, color: "var(--on-dark)", letterSpacing: "-0.01em" } }, plant.headline)),
      React.createElement(MetaPill, { k: "Model", v: plant.model }),
      React.createElement(MetaPill, { k: "Training", v: plant.trainYears }),
      React.createElement(MetaPill, { k: "Fit R²", v: plant.r2.toFixed(3) }),
      React.createElement("div", { style: { display: "flex", flexDirection: "column", gap: 3 } },
        React.createElement("span", { style: { fontSize: 10.5, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: "rgba(255,255,255,.55)" } }, "Capacity"),
        React.createElement("span", { style: { fontSize: 15, fontWeight: 600, color: "var(--on-dark)" } }, plant.capacity))),
    // KPI row
    React.createElement("div", { style: { display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 14 } },
      React.createElement(Kpi, { label: `Twin-expected ${last.year}`, value: last.expected, decimals: 1, suffix: " GWh", sub: "what a healthy fleet should yield" }),
      React.createElement(Kpi, { label: `Actual ${last.year}`, value: last.actual, decimals: 1, suffix: " GWh", sub: `${last.curtailment.toFixed(1)} GWh of it curtailed` }),
      React.createElement(Kpi, { label: "Total performance gap", value: last.gap, decimals: 1, suffix: " GWh", tone: "var(--accent-glow)", sub: `${lossPct.toFixed(1)}% of twin · ${last.anomalyLoss.toFixed(1)} GWh anomaly-attributed` }),
      React.createElement(Kpi, { label: "Modelled €-loss (life)", value: plant.totalLossEur, sub: `${totGwh.toFixed(2)} GWh attributed to anomalies`, suffix: "", decimals: 0 })),
    // hero chart — full width, Year/Month toggle
    React.createElement(Widget, { title: "Expected vs twin", meta: `GWH PER YEAR | ${plant.refYear}`, tone: "soft" },
      React.createElement(TwinChart, { plant })),
    // fleet + worst
    React.createElement("div", { style: { display: "grid", gridTemplateColumns: "320px 1fr", gap: 14 } },
      React.createElement(Widget, { title: "Fleet status", meta: `${plant.count} UNITS`, tone: "soft" },
        React.createElement(FleetDonut, { fleet: plant.fleet, total: plant.count })),
      React.createElement(Widget, { title: "Worst performers", meta: "BY MODELLED € LOSS", tone: "soft" },
        React.createElement(WorstList, { plant, onOpenInverter }))),
    // year breakdown cards
    React.createElement(Widget, { title: "Year by year", meta: "TWIN VS ACTUAL", tone: "soft" },
      React.createElement("div", { style: { display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 10 } },
        plant.years.map((yr) => {
          const pct = ((yr.gap / yr.expected) * 100);
          return React.createElement("div", { key: yr.year, style: { background: "var(--surface-card)", borderRadius: "var(--radius-md)", padding: "13px 13px 14px", display: "flex", flexDirection: "column", gap: 5 } },
            React.createElement("span", { style: { fontSize: 13, fontWeight: 700, color: "var(--ink-primary)" } }, yr.year),
            React.createElement("span", { style: { fontSize: 22, fontWeight: 600, letterSpacing: "-0.02em", color: "var(--ink-primary)" } }, yr.actual.toFixed(1)),
            React.createElement("span", { style: { fontSize: 11, color: "var(--ink-muted)", fontWeight: 500 } }, "of " + yr.expected.toFixed(1) + " GWh"),
            React.createElement("span", { style: { display: "inline-flex", alignItems: "center", gap: 4, fontSize: 11.5, fontWeight: 600, color: pct > 5 ? "var(--accent-glow)" : "var(--green-500)" } },
              React.createElement(Icon, { name: "trendDown", size: 13, color: pct > 5 ? "var(--accent-glow)" : "var(--green-500)" }), "−" + pct.toFixed(1) + "%")); }))));
}

window.Overview = Overview;
