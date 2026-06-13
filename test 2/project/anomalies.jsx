/* SolarTwin — Anomalies tab. Every flagged anomaly across the plant; dispatch lives here. */

function AnomSummary({ anoms }) {
  const totalEur = anoms.reduce((s, a) => s + a.lossEur, 0);
  const byVerdict = { Replace: 0, Repair: 0, Monitor: 0 };
  anoms.forEach((a) => { byVerdict[a.verdict]++; });
  const crit = anoms.filter((a) => a.severity === "critical").length;
  const cells = [
    { k: "Open anomalies", v: anoms.length, sub: crit + " critical" },
    { k: "€ at risk", v: "€" + SOLAR.fmt(totalEur), sub: "modelled, lifetime" },
    { k: "Replace verdicts", v: byVerdict.Replace, sub: "capex review" },
    { k: "Repair / monitor", v: byVerdict.Repair + " / " + byVerdict.Monitor, sub: "field + watch" },
  ];
  return React.createElement("div", { style: { display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 14 } },
    cells.map((c, i) => React.createElement("div", { key: i, style: { background: "var(--surface-soft)", borderRadius: "var(--radius-lg)", padding: "16px 18px", display: "flex", flexDirection: "column", gap: 5 } },
      React.createElement("span", { className: "t-caption-uppercase" }, c.k),
      React.createElement("span", { style: { fontSize: 28, fontWeight: 600, letterSpacing: "-0.02em", color: "var(--ink-primary)" } }, c.v),
      React.createElement("span", { style: { fontSize: 12, color: "var(--ink-muted)", fontWeight: 500 } }, c.sub))));
}

const SEV_FILTERS = [{ id: "all", l: "All" }, { id: "critical", l: "Critical" }, { id: "warning", l: "Warning" }, { id: "watch", l: "Watch" }];

function AnomalyRow({ a, onDispatch, onOpenInverter, dispatched, showAvatars }) {
  const [hov, setHov] = useState(false);
  const v = SOLAR.empById[a.recommendedTo];
  return React.createElement("div", { onMouseEnter: () => setHov(true), onMouseLeave: () => setHov(false),
    style: { display: "grid", gridTemplateColumns: "16px 96px 1fr 130px 150px 120px", alignItems: "center", gap: 14, padding: "13px 16px", borderRadius: "var(--radius-md)", background: hov ? "var(--surface-soft)" : "transparent", transition: "background var(--dur-fast) ease" } },
    React.createElement(SevDot, { sev: a.severity }),
    React.createElement("button", { onClick: () => onOpenInverter(a.invId), title: "Open inverter",
      style: { textAlign: "left", border: "none", background: "transparent", cursor: "pointer", fontWeight: 600, fontSize: 14, color: "var(--ink-primary)", padding: 0 } }, a.invId),
    React.createElement("div", { style: { display: "flex", flexDirection: "column", gap: 2, minWidth: 0 } },
      React.createElement("span", { style: { fontSize: 14, fontWeight: 600, color: "var(--ink-primary)" } }, a.type),
      React.createElement("span", { style: { fontSize: 12.5, color: "var(--ink-muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" } }, a.root)),
    React.createElement("div", { style: { display: "flex", flexDirection: "column", gap: 2 } },
      React.createElement("span", { style: { fontSize: 14, fontWeight: 600, color: "var(--ink-primary)" } }, "€" + SOLAR.fmt(a.lossEur)),
      React.createElement("span", { style: { fontSize: 11.5, color: "var(--ink-muted)" } }, SOLAR.fmt(a.lossKwh) + " kWh")),
    React.createElement("div", { style: { display: "flex", alignItems: "center", gap: 8, minWidth: 0 } },
      showAvatars !== false && React.createElement("img", { src: v.photo, alt: v.name, style: { width: 28, height: 28, borderRadius: "50%", objectFit: "cover", flex: "0 0 auto" } }),
      React.createElement("div", { style: { display: "flex", flexDirection: "column", gap: 1, minWidth: 0 } },
        React.createElement("span", { style: { fontSize: 12.5, fontWeight: 600, color: "var(--ink-primary)", whiteSpace: "nowrap" } }, v.name.split(" ")[0] + " " + v.name.split(" ").slice(-1)),
        React.createElement("span", { style: { fontSize: 10.5, color: "var(--ink-muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" } }, "suggested"))),
    React.createElement("div", { style: { display: "flex", justifyContent: "flex-end" } },
      dispatched
        ? React.createElement("span", { style: { display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12.5, fontWeight: 600, color: "var(--green-500)" } },
          React.createElement(Icon, { name: "check", size: 16, color: "var(--green-500)" }), "Dispatched")
        : React.createElement(EnvelopeButton, { recommendedTo: a.recommendedTo, onClick: () => onDispatch(a) })));
}

function Anomalies({ plant, onDispatch, onOpenInverter, dispatchedIds, showAvatars }) {
  const [sev, setSev] = useState("all");
  const [q, setQ] = useState("");
  const [sort, setSort] = useState("loss");
  let rows = plant.anomalies.filter((a) => (sev === "all" || a.severity === sev));
  if (q.trim()) { const t = q.toLowerCase(); rows = rows.filter((a) => (a.invId + " " + a.type + " " + a.group).toLowerCase().includes(t)); }
  rows = [...rows].sort((a, b) => sort === "loss" ? b.lossEur - a.lossEur : (a.severity === b.severity ? b.lossEur - a.lossEur : SOLAR.sevOrder.indexOf(a.severity) - SOLAR.sevOrder.indexOf(b.severity)));
  return React.createElement("div", { style: { display: "flex", flexDirection: "column", gap: 18 } },
    React.createElement("div", null,
      React.createElement("h2", { style: { fontFamily: "var(--font-display)", fontWeight: 500, fontSize: 26, letterSpacing: "-0.02em", margin: "0 0 3px", color: "var(--ink-primary)" } }, "Anomalies"),
      React.createElement("span", { style: { fontSize: 13.5, color: "var(--ink-muted)" } }, "Agent-ranked findings across the fleet · click the envelope to dispatch a report")),
    React.createElement(AnomSummary, { anoms: plant.anomalies }),
    // controls
    React.createElement("div", { style: { display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" } },
      React.createElement("div", { style: { display: "inline-flex", background: "var(--surface-soft)", borderRadius: "var(--radius-md)", padding: 3, gap: 2 } },
        SEV_FILTERS.map((f) => React.createElement("button", { key: f.id, onClick: () => setSev(f.id),
          style: { padding: "7px 13px", borderRadius: 6, border: "none", cursor: "pointer", fontSize: 12.5, fontWeight: 600, display: "inline-flex", alignItems: "center", gap: 6,
            background: sev === f.id ? "var(--surface-card)" : "transparent", color: sev === f.id ? "var(--ink-primary)" : "var(--ink-secondary)", boxShadow: sev === f.id ? "var(--shadow-pop)" : "none", transition: "all var(--dur-fast) ease" } },
          f.id !== "all" && React.createElement(SevDot, { sev: f.id, size: 7 }), f.l))),
      React.createElement("div", { style: { display: "inline-flex", alignItems: "center", gap: 8, background: "var(--surface-soft)", borderRadius: "var(--radius-md)", padding: "0 12px", height: 38, flex: "1 1 200px", maxWidth: 320 } },
        React.createElement(Icon, { name: "search", size: 16, color: "var(--ink-muted)" }),
        React.createElement("input", { value: q, onChange: (e) => setQ(e.target.value), placeholder: "Search inverter or type…",
          style: { border: "none", background: "transparent", outline: "none", fontSize: 13.5, fontFamily: "var(--font-body)", color: "var(--ink-primary)", width: "100%" } })),
      React.createElement("button", { onClick: () => setSort(sort === "loss" ? "severity" : "loss"),
        style: { marginLeft: "auto", display: "inline-flex", alignItems: "center", gap: 7, padding: "8px 14px", borderRadius: "var(--radius-md)", border: "1px solid var(--hairline)", background: "var(--surface-card)", cursor: "pointer", fontSize: 12.5, fontWeight: 600, color: "var(--ink-secondary)" } },
        React.createElement(Icon, { name: "filter", size: 15 }), "Sort: " + (sort === "loss" ? "€ loss" : "severity"))),
    // header + rows
    React.createElement("div", { style: { background: "var(--surface-soft)", borderRadius: "var(--radius-lg)", padding: "8px 8px 10px" } },
      React.createElement("div", { style: { display: "grid", gridTemplateColumns: "16px 96px 1fr 130px 150px 120px", gap: 14, padding: "6px 16px 10px", borderBottom: "1px solid var(--hairline)" } },
        ["", "Inverter", "Anomaly", "Loss", "Routed to", ""].map((h, i) => React.createElement("span", { key: i, className: "t-caption-uppercase", style: { textAlign: i === 5 ? "right" : "left" } }, h))),
      React.createElement("div", { style: { display: "flex", flexDirection: "column", gap: 2, marginTop: 4 } },
        rows.length === 0
          ? React.createElement("div", { style: { padding: "30px 16px", color: "var(--ink-muted)", fontSize: 14 } }, "No anomalies match this filter.")
          : rows.map((a) => React.createElement(AnomalyRow, { key: a.id, a, onDispatch, onOpenInverter, dispatched: dispatchedIds.has(a.id), showAvatars })))));
}

window.Anomalies = Anomalies;
