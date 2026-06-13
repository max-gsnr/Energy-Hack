/* SolarTwin — App shell: top bar, plant sheet-tabs, sidebar, content, chatbot, dispatch overlay. */
const { SidebarItem } = window.FlowDesignSystem_96ad7f;

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "accent": "#034f46",
  "density": "cozy",
  "chatWidth": "default",
  "heatMode": "severity",
  "routingAvatars": true
}/*EDITMODE-END*/;

const NAV = [
  { id: "overview", label: "Overview", icon: "gauge" },
  { id: "inverters", label: "Inverters", icon: "grid" },
  { id: "anomalies", label: "Anomalies", icon: "alert" },
  { id: "emails", label: "Dispatch Emails", icon: "mail" },
];

function TopBar({ plantKey, setPlantKey }) {
  return React.createElement("header", { style: { background: "var(--surface-card)", borderBottom: "1px solid var(--hairline)", flex: "0 0 auto" } },
    React.createElement("div", { style: { height: 62, display: "flex", alignItems: "center", padding: "0 22px", gap: 18 } },
      React.createElement("img", { src: "assets/enerparc-logo.png", alt: "Enerparc", style: { height: 30, width: "auto" } }),
      React.createElement("span", { style: { width: 1, height: 28, background: "var(--hairline)" } }),
      React.createElement("div", { style: { display: "flex", alignItems: "center", gap: 9 } },
        React.createElement("span", { style: { width: 26, height: 26, borderRadius: 7, background: "var(--accent-primary)", display: "grid", placeItems: "center" } },
          React.createElement(Icon, { name: "layers", size: 15, color: "var(--on-accent)" })),
        React.createElement("span", { style: { fontSize: 17, fontWeight: 600, letterSpacing: "-0.01em", color: "var(--ink-primary)" } }, "SolarTwin"),
        React.createElement("span", { style: { fontSize: 12.5, color: "var(--ink-muted)", fontWeight: 500 } }, "O&M Intelligence")),
      React.createElement("div", { style: { marginLeft: "auto", display: "flex", alignItems: "center", gap: 16 } },
        React.createElement("span", { style: { display: "inline-flex", alignItems: "center", gap: 7, fontSize: 12, color: "var(--ink-muted)", fontWeight: 500 } },
          React.createElement("span", { style: { width: 7, height: 7, borderRadius: "50%", background: "var(--green-400)" } }), "Twin synced · 5 min ago"),
        React.createElement("button", { className: "icon-btn", style: iconBtn }, React.createElement(Icon, { name: "bell", size: 19, color: "var(--ink-secondary)" })),
        React.createElement("span", { style: { width: 32, height: 32, borderRadius: "50%", background: "var(--surface-dark)", color: "var(--on-dark)", display: "grid", placeItems: "center", fontSize: 13, fontWeight: 600 } }, "OM"))),
    // Excel-style plant sheet tabs
    React.createElement("div", { style: { display: "flex", alignItems: "flex-end", gap: 3, padding: "0 22px", height: 36, background: "var(--surface-soft)" } },
      React.createElement("span", { style: { fontSize: 11, fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--ink-muted)", paddingBottom: 9, marginRight: 6 } }, "Plant"),
      Object.values(SOLAR.plants).map((p) => {
        const active = p.key === plantKey;
        return React.createElement("button", { key: p.key, onClick: () => setPlantKey(p.key),
          style: { position: "relative", top: 1, padding: "8px 18px 9px", border: "1px solid var(--hairline)", borderBottom: active ? "1px solid var(--surface-card)" : "1px solid var(--hairline)",
            borderTopLeftRadius: 8, borderTopRightRadius: 8, background: active ? "var(--surface-card)" : "color-mix(in oklab, var(--surface-soft) 60%, white)",
            cursor: "pointer", fontSize: 13, fontWeight: active ? 600 : 500, color: active ? "var(--ink-primary)" : "var(--ink-muted)",
            display: "inline-flex", alignItems: "center", gap: 8, transition: "all var(--dur-fast) ease" } },
          React.createElement("span", { style: { width: 8, height: 8, borderRadius: "50%", background: active ? "var(--accent-primary)" : "var(--ink-muted)" } }),
          p.key === "A" ? "Plant A" : "Plant B"); })));
}
const iconBtn = { width: 36, height: 36, borderRadius: "var(--radius-md)", border: "1px solid var(--hairline)", background: "var(--surface-card)", display: "grid", placeItems: "center", cursor: "pointer" };

function Sidebar({ tab, setTab, plant }) {
  const crit = plant.anomalies.filter((a) => a.severity === "critical").length;
  return React.createElement("nav", { style: { width: 240, flex: "0 0 auto", display: "flex", flexDirection: "column", padding: "18px 14px", gap: 4 } },
    React.createElement("span", { className: "t-caption-uppercase", style: { padding: "2px 12px 8px" } }, plant.name),
    NAV.map((n) => React.createElement(SidebarItem, { key: n.id, label: n.label, active: tab === n.id, onClick: () => setTab(n.id),
      icon: React.createElement(Icon, { name: n.icon, size: 19 }) })),
    React.createElement("div", { style: { marginTop: "auto" } },
      React.createElement("button", { onClick: () => setTab("anomalies"), style: { width: "100%", textAlign: "left", border: "1px solid var(--hairline)", background: "var(--surface-card)", borderRadius: "var(--radius-lg)", padding: "14px 15px", cursor: "pointer", display: "flex", flexDirection: "column", gap: 7 } },
        React.createElement("span", { style: { display: "inline-flex", alignItems: "center", gap: 7, fontSize: 12, fontWeight: 600, color: crit ? "var(--sev-critical)" : "var(--green-500)" } },
          React.createElement(Icon, { name: "alert", size: 15, color: crit ? "var(--sev-critical)" : "var(--green-500)" }), crit + " critical"),
        React.createElement("span", { style: { fontSize: 12.5, color: "var(--ink-secondary)", lineHeight: 1.4 } }, plant.anomalies.length + " open anomalies · €" + SOLAR.fmt(plant.totalLossEur) + " modelled loss"))));
}

function App() {
  const { useTweaks, TweaksPanel, TweakSection, TweakColor, TweakRadio, TweakSelect, TweakToggle } = window;
  const [tw, setTweak] = useTweaks(TWEAK_DEFAULTS);
  React.useEffect(() => {
    document.documentElement.style.setProperty("--accent-primary", tw.accent);
    return () => document.documentElement.style.removeProperty("--accent-primary");
  }, [tw.accent]);
  const chatW = { compact: 336, default: 384, wide: 456 }[tw.chatWidth] || 384;
  const mainPad = tw.density === "compact" ? "16px 20px" : "26px 28px";

  const [plantKey, setPlantKey] = useState("A");
  const [tab, setTab] = useState("overview");
  const [selInv, setSelInv] = useState(null);
  const [dispatchAnom, setDispatchAnom] = useState(null);
  const [collapsed, setCollapsed] = useState(false);
  const [emails, setEmails] = useState(() => ({ A: SOLAR.plants.A.emails.map((e) => ({ ...e })), B: SOLAR.plants.B.emails.map((e) => ({ ...e })) }));
  const [dispatched, setDispatched] = useState(() => ({ A: new Set(SOLAR.plants.A.emails.map((e) => e.anomId)), B: new Set(SOLAR.plants.B.emails.map((e) => e.anomId)) }));
  const [toast, setToast] = useState(null);

  const plant = SOLAR.plants[plantKey];
  const switchPlant = (k) => { setPlantKey(k); setSelInv(null); };
  const openInverter = (id) => { setTab("inverters"); setSelInv(id); };

  const onDispatchResult = (status, toId, data) => {
    if (status) {
      const e = SOLAR.empById[toId];
      const finalStatus = status === "draft" ? "pending" : status; // "Save as draft" now lands in Pending
      const mail = { id: `${plantKey}-MAIL-${Date.now()}`, anomId: dispatchAnom.id, invId: dispatchAnom.invId, severity: dispatchAnom.severity, status: finalStatus, ts: "just now", to: e.name, toRole: e.role, toId, cc: "om-dispatch@enerparc.com", subject: data.subject, body: data.body };
      setEmails((prev) => ({ ...prev, [plantKey]: [mail, ...prev[plantKey].filter((m) => m.anomId !== dispatchAnom.id)] }));
      setDispatched((prev) => { const s = new Set(prev[plantKey]); s.add(dispatchAnom.id); return { ...prev, [plantKey]: s }; });
      setToast({ status, name: e.name });
      setTimeout(() => setToast(null), 3200);
    }
    setDispatchAnom(null);
  };
  const onEmailAction = (id, newStatus) => {
    setEmails((prev) => ({ ...prev, [plantKey]: newStatus === null ? prev[plantKey].filter((e) => e.id !== id) : prev[plantKey].map((e) => e.id === id ? { ...e, status: newStatus, ts: "just now" } : e) }));
  };

  const content = tab === "overview" ? React.createElement(Overview, { plant, onOpenInverter: openInverter })
    : tab === "inverters" ? React.createElement(Inverters, { plant, selectedId: selInv, onSelect: setSelInv, onDispatch: setDispatchAnom, defaultMode: tw.heatMode })
    : tab === "anomalies" ? React.createElement(Anomalies, { plant, onDispatch: setDispatchAnom, onOpenInverter: openInverter, dispatchedIds: dispatched[plantKey], showAvatars: tw.routingAvatars })
    : React.createElement(Emails, { emails: emails[plantKey], onAction: onEmailAction });

  return React.createElement("div", { style: { height: "100vh", display: "flex", flexDirection: "column", background: "var(--canvas)", overflow: "hidden" } },
    React.createElement(TopBar, { plantKey, setPlantKey: switchPlant }),
    React.createElement("div", { style: { flex: 1, display: "flex", minHeight: 0, padding: "14px 14px 14px 0" } },
      React.createElement(Sidebar, { tab, setTab, plant }),
      React.createElement("div", { style: { flex: 1, display: "flex", minWidth: 0, background: "var(--surface-card)", borderRadius: "var(--radius-2xl)", border: "1px solid var(--hairline)", overflow: "hidden" } },
        React.createElement("main", { key: tab + plantKey, className: "tab-enter", style: { flex: 1, minWidth: 0, overflowY: "auto", overflowX: "hidden", padding: mainPad } }, content),
        collapsed
          ? React.createElement("button", { onClick: () => setCollapsed(false), title: "Open Plant Analyst",
              style: { width: 50, flex: "0 0 auto", borderLeft: "1px solid var(--hairline)", background: "var(--surface-soft)", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 10, paddingTop: 18, border: "none" } },
              React.createElement("span", { style: { width: 32, height: 32, borderRadius: 9, background: "var(--accent-primary)", display: "grid", placeItems: "center" } }, React.createElement(Icon, { name: "sparkles", size: 17, color: "var(--on-accent)" })),
              React.createElement("span", { style: { writingMode: "vertical-rl", fontSize: 12, fontWeight: 600, color: "var(--ink-secondary)", letterSpacing: "0.04em" } }, "Plant Analyst"))
          : React.createElement("div", { style: { width: chatW, flex: "0 0 auto", position: "relative" } },
              React.createElement("button", { onClick: () => setCollapsed(true), title: "Collapse",
                style: { position: "absolute", top: 18, right: 16, zIndex: 3, width: 28, height: 28, borderRadius: 7, border: "1px solid var(--hairline)", background: "var(--surface-card)", cursor: "pointer", display: "grid", placeItems: "center", color: "var(--ink-muted)" } },
                React.createElement(Icon, { name: "chevronRight", size: 16 })),
              React.createElement(Chatbot, { plant })))),
    dispatchAnom && React.createElement(DispatchPopup, { plant, anomaly: dispatchAnom, onClose: () => setDispatchAnom(null), onResult: onDispatchResult }),
    toast && React.createElement(Toast, { toast }),
    React.createElement(TweaksPanel, { title: "Tweaks" },
      React.createElement(TweakSection, { label: "Appearance" }),
      React.createElement(TweakColor, { label: "Accent", value: tw.accent, options: ["#034f46", "#0f6e62", "#1f3a5f", "#6b3fa0"], onChange: (v) => setTweak("accent", v) }),
      React.createElement(TweakRadio, { label: "Density", value: tw.density, options: ["cozy", "compact"], onChange: (v) => setTweak("density", v) }),
      React.createElement(TweakSection, { label: "Layout" }),
      React.createElement(TweakRadio, { label: "Analyst panel", value: tw.chatWidth, options: ["compact", "default", "wide"], onChange: (v) => setTweak("chatWidth", v) }),
      React.createElement(TweakSection, { label: "Data views" }),
      React.createElement(TweakSelect, { label: "Heatmap colour", value: tw.heatMode, options: ["severity", "health", "loss", "anomalies"], onChange: (v) => setTweak("heatMode", v) }),
      React.createElement(TweakToggle, { label: "Routing avatars", value: tw.routingAvatars, onChange: (v) => setTweak("routingAvatars", v) })));
}

function Toast({ toast }) {
  return React.createElement("div", { className: "toast-enter", style: { position: "fixed", bottom: 24, left: "50%", transform: "translateX(-50%)", zIndex: 1100, display: "flex", alignItems: "center", gap: 11, background: "var(--surface-dark)", color: "var(--on-dark)", padding: "13px 20px", borderRadius: "var(--radius-lg)", boxShadow: "var(--shadow-overlay)", fontSize: 14 } },
    React.createElement("span", { style: { width: 22, height: 22, borderRadius: "50%", background: toast.status === "sent" ? "var(--green-400)" : "var(--ink-muted)", display: "grid", placeItems: "center" } },
      React.createElement(Icon, { name: toast.status === "sent" ? "send" : "fileText", size: 13, color: "var(--on-dark)" })),
    toast.status === "sent" ? `Report sent to ${toast.name}` : `Saved as draft for ${toast.name}`,
    React.createElement("span", { style: { color: "rgba(255,255,255,.5)", fontSize: 12.5 } }, "→ Dispatch Emails"));
}

function mountApp() {
  const el = document.getElementById("app");
  if (el.__solarRoot) return;            // idempotent — never createRoot twice
  // @babel/standalone executes src scripts asynchronously and out of order, so a
  // sibling component may not be registered yet. Wait until all are present.
  const need = ["Overview", "Inverters", "Anomalies", "Emails", "Chatbot", "DispatchPopup", "Icon", "useTweaks", "TweaksPanel"];
  const ready = need.every((k) => typeof window[k] === "function") && window.FlowDesignSystem_96ad7f && typeof window.FlowDesignSystem_96ad7f.SidebarItem === "function";
  if (!ready) { setTimeout(mountApp, 25); return; }
  el.__solarRoot = ReactDOM.createRoot(el);
  el.__solarRoot.render(React.createElement(App));
}
mountApp();
