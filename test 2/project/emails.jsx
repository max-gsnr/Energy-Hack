/* SolarTwin — Dispatch Emails tab. Linear-style status board + reading pane. */

const { Button: DSButton } = window.FlowDesignSystem_96ad7f;
const STATUS_ORDER = ["pending", "sent", "seen"];

function StatusBar({ emails, filter, setFilter }) {
  const counts = Object.fromEntries(STATUS_ORDER.map((s) => [s, emails.filter((e) => e.status === s).length]));
  const item = (id, label, count) => {
    const active = filter === id;
    return React.createElement("button", { key: id, onClick: () => setFilter(active && id !== "all" ? "all" : id),
      style: { display: "inline-flex", alignItems: "center", gap: 8, padding: "8px 14px", border: "1px solid " + (active ? "var(--ink-primary)" : "var(--hairline)"), cursor: "pointer",
        borderRadius: "var(--radius-pill)", background: active ? "var(--surface-card)" : "transparent", boxShadow: active ? "var(--shadow-pop)" : "none",
        fontSize: 13, fontWeight: active ? 600 : 500, color: active ? "var(--ink-primary)" : "var(--ink-secondary)", whiteSpace: "nowrap", transition: "all var(--dur-fast) ease" } },
      id === "all" ? React.createElement(Icon, { name: "layers", size: 14, color: "var(--ink-secondary)" }) : React.createElement("span", { style: { width: 8, height: 8, borderRadius: "50%", background: STATUS_META[id].color } }),
      label,
      React.createElement("span", { style: { fontSize: 11.5, fontWeight: 600, color: active ? "var(--ink-primary)" : "var(--ink-muted)", background: active ? "var(--surface-soft)" : "color-mix(in oklab, var(--ink-muted) 12%, transparent)", borderRadius: "var(--radius-sm)", padding: "1px 6px", minWidth: 18, textAlign: "center" } }, count));
  };
  return React.createElement("div", { style: { display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", paddingBottom: 2 } },
    item("all", "All emails", emails.length),
    React.createElement("span", { style: { width: 1, height: 20, background: "var(--hairline)", margin: "0 2px" } }),
    STATUS_ORDER.map((s) => item(s, STATUS_META[s].label, counts[s])));
}

function EmailRow({ email, active, onClick }) {
  return React.createElement("button", { onClick, className: "email-row",
    style: { display: "grid", gridTemplateColumns: "14px 1fr auto", gap: 13, alignItems: "center", width: "100%", textAlign: "left",
      padding: "13px 15px", border: "none", borderRadius: "var(--radius-md)", cursor: "pointer",
      boxShadow: active ? "var(--shadow-pop)" : "none", transition: "all var(--dur-fast) ease" } },
    React.createElement(SevDot, { sev: email.severity }),
    React.createElement("div", { style: { display: "flex", flexDirection: "column", gap: 4, minWidth: 0 } },
      React.createElement("div", { style: { display: "flex", alignItems: "baseline", gap: 9, minWidth: 0 } },
        React.createElement("span", { style: { fontSize: 13, fontWeight: 700, color: "var(--ink-primary)", flex: "0 0 auto", whiteSpace: "nowrap" } }, email.invId),
        React.createElement("span", { style: { fontSize: 13.5, color: "var(--ink-secondary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" } }, email.subject.replace(/^\[[^\]]+\]\s*/, ""))),
      React.createElement("div", { style: { display: "flex", alignItems: "center", gap: 8, minWidth: 0 } },
        React.createElement("span", { style: { fontSize: 12, color: "var(--ink-muted)", whiteSpace: "nowrap" } }, email.to),
        React.createElement("span", { style: { width: 3, height: 3, borderRadius: "50%", background: "var(--ink-muted)", flex: "0 0 auto" } }),
        React.createElement("span", { style: { fontSize: 11.5, color: "var(--ink-muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" } }, email.toRole))),
    React.createElement("div", { style: { display: "flex", alignItems: "center", gap: 11, flex: "0 0 auto" } },
      React.createElement(StatusChip, { status: email.status }),
      React.createElement("span", { style: { fontSize: 11.5, color: "var(--ink-muted)", width: 56, textAlign: "right" } }, email.ts)));
}

function EmailReader({ email, onClose, onAction }) {
  const e = SOLAR.empById[email.toId];
  const actions = {
    draft:   [{ l: "Approve & send", v: "sent", primary: true, icon: "send" }, { l: "Delete draft", v: null, icon: "trash" }],
    pending: [{ l: "Approve & send", v: "sent", primary: true, icon: "send" }, { l: "Delete", v: null, icon: "trash" }],
    sent:    [],
    seen:    [],
  }[email.status];
  return React.createElement("div", { key: email.id, className: "reader-enter",
    style: { position: "absolute", inset: 0, background: "var(--surface-card)", borderRadius: "var(--radius-lg)", border: "1px solid var(--hairline)", boxShadow: "var(--shadow-overlay)", display: "flex", flexDirection: "column", overflow: "hidden", zIndex: 6 } },
    React.createElement("div", { style: { padding: "18px 24px", borderBottom: "1px solid var(--hairline)", display: "flex", alignItems: "center", gap: 12 } },
      React.createElement("button", { onClick: onClose, title: "Back", style: { border: "1px solid var(--hairline)", background: "var(--surface-card)", borderRadius: "var(--radius-md)", width: 32, height: 32, display: "grid", placeItems: "center", cursor: "pointer", color: "var(--ink-secondary)" } },
        React.createElement(Icon, { name: "x", size: 17 })),
      React.createElement(SevDot, { sev: email.severity }),
      React.createElement("span", { style: { fontSize: 14, fontWeight: 700, color: "var(--ink-primary)", whiteSpace: "nowrap" } }, email.invId),
      React.createElement(StatusChip, { status: email.status }),
      React.createElement("span", { style: { marginLeft: "auto", fontSize: 12, color: "var(--ink-muted)" } }, email.ts)),
    React.createElement("div", { style: { flex: 1, overflowY: "auto", padding: "22px 26px" } },
      React.createElement("div", { style: { display: "flex", alignItems: "center", gap: 12, marginBottom: 18, paddingBottom: 16, borderBottom: "1px solid var(--hairline)" } },
        React.createElement("img", { src: e.photo, alt: e.name, style: { width: 44, height: 44, borderRadius: "50%", objectFit: "cover" } }),
        React.createElement("div", { style: { display: "flex", flexDirection: "column", gap: 2 } },
          React.createElement("span", { style: { fontSize: 14.5, fontWeight: 600, color: "var(--ink-primary)" } }, e.name),
          React.createElement("span", { style: { fontSize: 12.5, color: "var(--ink-muted)" } }, e.role))),
      React.createElement("div", { style: { display: "flex", flexDirection: "column", gap: 6, marginBottom: 16, fontSize: 13 } },
        React.createElement(MetaLine, { k: "To", v: `${e.name.toLowerCase().replace(/[^a-z]+/g, ".").replace(/^\.|\.$/g, "")}@enerparc.com` }),
        React.createElement(MetaLine, { k: "Cc", v: email.cc }),
        React.createElement(MetaLine, { k: "Subject", v: email.subject, bold: true })),
      React.createElement("div", { style: { display: "inline-flex", alignItems: "center", gap: 6, padding: "4px 10px", borderRadius: "var(--radius-pill)", background: "color-mix(in oklab, var(--accent-secondary) 55%, white)", color: "var(--ink-primary)", fontSize: 11, fontWeight: 700, marginBottom: 14 } },
        React.createElement(Icon, { name: "sparkles", size: 12 }), "Gemini-drafted"),
      React.createElement("pre", { style: { whiteSpace: "pre-wrap", fontFamily: "var(--font-body)", fontSize: 14, lineHeight: 1.65, color: "var(--ink-secondary)", margin: 0 } }, email.body)),
    actions.length > 0 && React.createElement("div", { style: { padding: "15px 26px", borderTop: "1px solid var(--hairline)", display: "flex", justifyContent: "flex-end", gap: 11 } },
      actions.map((a, i) => React.createElement(DSButton, { key: i, variant: a.primary ? "accent" : "secondary",
        iconLeft: React.createElement(Icon, { name: a.icon, size: 15, color: a.primary ? "var(--on-accent)" : "currentColor" }),
        onClick: () => { onAction(email.id, a.v); if (a.v === null || a.v === "seen") onClose(); } }, a.l))));
}

function MetaLine({ k, v, bold }) {
  return React.createElement("div", { style: { display: "flex", gap: 12 } },
    React.createElement("span", { style: { width: 56, fontSize: 11, fontWeight: 600, letterSpacing: "0.05em", textTransform: "uppercase", color: "var(--ink-muted)", flex: "0 0 auto" } }, k),
    React.createElement("span", { style: { fontSize: 13.5, fontWeight: bold ? 600 : 400, color: bold ? "var(--ink-primary)" : "var(--ink-secondary)" } }, v));
}

function Emails({ emails, onAction }) {
  const [filter, setFilter] = useState("all");
  const [openId, setOpenId] = useState(null);
  const list = (filter === "all" ? emails : emails.filter((e) => e.status === filter));
  const open = emails.find((e) => e.id === openId);
  // keep selection valid
  useEffect(() => { if (openId && !emails.find((e) => e.id === openId)) setOpenId(null); }, [emails, openId]);
  return React.createElement("div", { style: { display: "flex", flexDirection: "column", gap: 16, height: "100%" } },
    React.createElement("div", null,
      React.createElement("h2", { style: { fontFamily: "var(--font-display)", fontWeight: 500, fontSize: 26, letterSpacing: "-0.02em", margin: "0 0 3px", color: "var(--ink-primary)" } }, "Dispatch emails"),
      React.createElement("span", { style: { fontSize: 13.5, color: "var(--ink-muted)" } }, "Every report the agent has drafted, sent or had acknowledged")),
    React.createElement(StatusBar, { emails, filter, setFilter: (f) => { setFilter(f); setOpenId(null); } }),
    React.createElement("div", { style: { flex: 1, minHeight: 0, position: "relative" } },
      React.createElement("div", { style: { background: "var(--surface-soft)", borderRadius: "var(--radius-lg)", padding: 10, overflowY: "auto", minHeight: 0, height: "100%" } },
        list.length === 0
          ? React.createElement("div", { style: { padding: "40px 16px", color: "var(--ink-muted)", fontSize: 14, textAlign: "center" } }, "Nothing here yet.")
          : React.createElement("div", { style: { display: "flex", flexDirection: "column", gap: 3 } },
            list.map((em) => React.createElement(EmailRow, { key: em.id, email: em, active: em.id === openId, onClick: () => setOpenId(em.id) }))),
        open && React.createElement(EmailReader, { email: open, onClose: () => setOpenId(null), onAction }))));
}

window.Emails = Emails;
