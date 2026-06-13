/* SolarTwin — full-screen dispatch popup. Step 1 recipient → Step 2 Gemini email draft. */
const { Button: DSButton, Badge: DSBadge } = window.FlowDesignSystem_96ad7f;

function RecipientCard({ emp, selected, suggested, onClick }) {
  return React.createElement("button", { onClick, className: "recip-card",
    style: { position: "relative", display: "flex", flexDirection: "column", alignItems: "center", gap: 10, width: 168, flex: "0 0 auto",
      padding: "20px 16px 18px", borderRadius: "var(--radius-xl)", cursor: "pointer", textAlign: "center",
      border: "2px solid " + (selected ? "var(--accent-primary)" : "var(--hairline)"),
      background: selected ? "color-mix(in oklab, var(--accent-primary) 6%, white)" : "var(--surface-card)",
      transform: selected ? "scale(1.045)" : "scale(1)", transition: "all var(--dur-mid) var(--ease-out-power3)",
      boxShadow: selected ? "var(--shadow-pop)" : "none" } },
    suggested && React.createElement("span", { style: { position: "absolute", top: -10, left: "50%", transform: "translateX(-50%)", display: "inline-flex", alignItems: "center", gap: 5, padding: "3px 9px", borderRadius: "var(--radius-pill)", background: "var(--accent-secondary)", color: "var(--ink-primary)", fontSize: 10.5, fontWeight: 700, letterSpacing: "0.02em", whiteSpace: "nowrap" } },
      React.createElement(Icon, { name: "sparkles", size: 11 }), "Agent suggested"),
    React.createElement("img", { src: emp.photo, alt: emp.name, style: { width: 76, height: 76, borderRadius: "50%", objectFit: "cover", border: selected ? "2px solid var(--accent-primary)" : "2px solid var(--hairline)" } }),
    React.createElement("div", { style: { display: "flex", flexDirection: "column", gap: 3, minHeight: 50, justifyContent: "flex-start" } },
      React.createElement("span", { style: { fontSize: 14.5, fontWeight: 600, color: "var(--ink-primary)", lineHeight: 1.2 } }, emp.name),
      React.createElement("span", { style: { fontSize: 11.5, color: "var(--ink-muted)", lineHeight: 1.35 } }, emp.role)),
    selected && React.createElement("span", { style: { position: "absolute", bottom: 12, right: 12, width: 20, height: 20, borderRadius: "50%", background: "var(--accent-primary)", display: "grid", placeItems: "center" } },
      React.createElement(Icon, { name: "check", size: 13, color: "var(--on-accent)" })));
}

function DispatchPopup({ plant, anomaly, onClose, onResult }) {
  const [step, setStep] = useState("recipient");
  const [toId, setToId] = useState(anomaly.recommendedTo);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [edited, setEdited] = useState(false);
  const taRef = useRef();

  const goEmail = (id) => {
    const d = SOLAR.draftEmail(anomaly, plant, id);
    setSubject(d.subject); setBody(d.body); setEdited(false);
    setStep("email");
  };
  useEffect(() => { const h = (e) => { if (e.key === "Escape") finish(null); }; window.addEventListener("keydown", h); return () => window.removeEventListener("keydown", h); }, []);
  const finish = (status) => { onResult(status, toId, { subject, body }); };

  const emp = SOLAR.empById[toId];
  return React.createElement("div", { className: "dispatch-scrim", onMouseDown: (e) => { if (e.target === e.currentTarget) finish(null); },
    style: { position: "fixed", inset: 0, zIndex: 1000, background: "rgba(20,20,20,.42)", backdropFilter: "blur(7px)", WebkitBackdropFilter: "blur(7px)", display: "grid", placeItems: "center", padding: "3vh 3vw" } },
    React.createElement("div", { className: "dispatch-card", style: { width: "min(1120px, 94vw)", height: "min(760px, 90vh)", background: "var(--surface-card)", borderRadius: "var(--radius-2xl)", boxShadow: "var(--shadow-overlay)", display: "flex", flexDirection: "column", overflow: "hidden", position: "relative" } },
      React.createElement("button", { onClick: () => finish(null), title: "Close (Esc)",
        style: { position: "absolute", top: 18, right: 18, zIndex: 5, width: 38, height: 38, borderRadius: "50%", border: "1px solid var(--hairline)", background: "var(--surface-card)", cursor: "pointer", display: "grid", placeItems: "center", color: "var(--ink-secondary)" } },
        React.createElement(Icon, { name: "x", size: 19 })),
      // header
      React.createElement("div", { style: { padding: "26px 32px 20px", borderBottom: "1px solid var(--hairline)" } },
        React.createElement("div", { style: { display: "flex", alignItems: "center", gap: 10, marginBottom: 8 } },
          React.createElement("span", { className: "t-caption-uppercase", style: { color: "var(--accent-primary)", whiteSpace: "nowrap" } }, `Step ${step === "recipient" ? "1" : "2"} of 2`),
          React.createElement(StepDots, { step })),
        React.createElement("h2", { style: { fontFamily: "var(--font-display)", fontWeight: 500, fontSize: 28, letterSpacing: "-0.02em", margin: "0 0 12px", color: "var(--ink-primary)" } },
          step === "recipient" ? "Send anomaly report to" : "Review the drafted email"),
        React.createElement(AnomStrip, { anomaly })),
      // body
      step === "recipient"
        ? React.createElement(RecipientStep, { toId, setToId, recommended: anomaly.recommendedTo, onContinue: () => goEmail(toId) })
        : React.createElement(EmailStep, { emp, subject, setSubject, body, setBody, taRef, edited, setEdited, onBack: () => setStep("recipient"), onSend: () => finish("sent"), onDraft: () => finish("draft") })));
}

function StepDots({ step }) {
  return React.createElement("div", { style: { display: "flex", gap: 6, alignItems: "center" } },
    ["recipient", "email"].map((s) => React.createElement("span", { key: s, style: { width: step === s ? 22 : 8, height: 8, borderRadius: 4, background: (s === "recipient" || step === "email") ? "var(--accent-primary)" : "var(--hairline)", transition: "all var(--dur-mid) ease" } })));
}

function AnomStrip({ anomaly }) {
  return React.createElement("div", { style: { display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap", fontSize: 13 } },
    React.createElement(SevChip, { sev: anomaly.severity }),
    React.createElement("span", { style: { fontWeight: 600, color: "var(--ink-primary)", whiteSpace: "nowrap" } }, anomaly.invId),
    React.createElement("span", { style: { color: "var(--ink-secondary)" } }, anomaly.type),
    React.createElement("span", { style: { width: 4, height: 4, borderRadius: "50%", background: "var(--ink-muted)" } }),
    React.createElement("span", { style: { color: "var(--ink-muted)" } }, "€" + SOLAR.fmt(anomaly.lossEur) + " modelled loss"),
    React.createElement(VerdictTag, { verdict: anomaly.verdict }));
}

function RecipientStep({ toId, setToId, recommended, onContinue }) {
  return React.createElement("div", { className: "step-enter", style: { display: "flex", flexDirection: "column", flex: 1, minHeight: 0 } },
    React.createElement("div", { style: { flex: 1, overflowY: "auto", padding: "30px 32px" } },
      React.createElement("p", { style: { fontSize: 13.5, color: "var(--ink-muted)", margin: "0 0 22px" } }, "The agent routed this issue type to the highlighted specialist. Pick a different recipient if you prefer."),
      React.createElement("div", { style: { display: "flex", gap: 16, flexWrap: "wrap" } },
        SOLAR.employees.map((emp) => React.createElement(RecipientCard, { key: emp.id, emp, selected: emp.id === toId, suggested: emp.id === recommended, onClick: () => setToId(emp.id) })))),
    React.createElement("div", { style: { padding: "18px 32px", borderTop: "1px solid var(--hairline)", display: "flex", justifyContent: "flex-end", alignItems: "center", gap: 14 } },
      React.createElement("span", { style: { marginRight: "auto", fontSize: 13, color: "var(--ink-muted)" } }, "Sending to ", React.createElement("strong", { style: { color: "var(--ink-primary)" } }, SOLAR.empById[toId].name)),
      React.createElement(DSButton, { variant: "accent", iconRight: React.createElement(Icon, { name: "arrowRight", size: 17, color: "var(--on-accent)" }), onClick: onContinue }, "Draft email")));
}

function EmailStep({ emp, subject, setSubject, body, setBody, taRef, edited, setEdited, onBack, onSend, onDraft }) {
  useEffect(() => { const ta = taRef.current; if (ta) { ta.style.height = "auto"; ta.style.height = ta.scrollHeight + "px"; } }, [body]);
  return React.createElement("div", { className: "step-enter", style: { display: "flex", flexDirection: "column", flex: 1, minHeight: 0 } },
    React.createElement("div", { style: { flex: 1, display: "grid", gridTemplateColumns: "300px 1fr", minHeight: 0 } },
      // left: enlarged person
      React.createElement("div", { style: { background: "var(--surface-soft)", padding: "30px 28px", display: "flex", flexDirection: "column", gap: 16, borderRight: "1px solid var(--hairline)" } },
        React.createElement("button", { onClick: onBack, style: { alignSelf: "flex-start", display: "inline-flex", alignItems: "center", gap: 6, border: "none", background: "transparent", cursor: "pointer", fontSize: 13, fontWeight: 600, color: "var(--ink-secondary)", padding: 0 } },
          React.createElement(Icon, { name: "chevronRight", size: 16, style: { transform: "rotate(180deg)" } }), "Change recipient"),
        React.createElement("img", { className: "recip-hero", src: emp.photo, alt: emp.name, style: { width: "100%", aspectRatio: "1", objectFit: "cover", borderRadius: "var(--radius-xl)" } }),
        React.createElement("div", { style: { display: "flex", flexDirection: "column", gap: 5 } },
          React.createElement("span", { style: { fontSize: 19, fontWeight: 600, color: "var(--ink-primary)", letterSpacing: "-0.01em" } }, emp.name),
          React.createElement("span", { style: { fontSize: 13, color: "var(--ink-secondary)" } }, emp.role)),
        React.createElement("p", { style: { fontSize: 12.5, color: "var(--ink-muted)", lineHeight: 1.5, margin: 0 } }, emp.blurb)),
      // right: email
      React.createElement("div", { style: { display: "flex", flexDirection: "column", minHeight: 0 } },
        React.createElement("div", { style: { padding: "22px 28px 16px", borderBottom: "1px solid var(--hairline)", display: "flex", flexDirection: "column", gap: 11 } },
          React.createElement(HeaderField, { label: "To", value: `${emp.name.toLowerCase().replace(/[^a-z]+/g, ".").replace(/^\.|\.$/g, "")}@enerparc.com` }),
          React.createElement(HeaderField, { label: "Cc", value: "om-dispatch@enerparc.com" }),
          React.createElement("div", { style: { display: "flex", alignItems: "center", gap: 12 } },
            React.createElement("span", { style: { width: 34, fontSize: 11, fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--ink-muted)" } }, "Subj"),
            React.createElement("input", { value: subject, onChange: (e) => { setSubject(e.target.value); setEdited(true); },
              style: { flex: 1, border: "none", outline: "none", background: "transparent", fontSize: 14.5, fontWeight: 600, color: "var(--ink-primary)", fontFamily: "var(--font-body)" } }))),
        React.createElement("div", { style: { flex: 1, overflowY: "auto", padding: "18px 28px" } },
          React.createElement("div", { style: { display: "inline-flex", alignItems: "center", gap: 6, padding: "4px 10px", borderRadius: "var(--radius-pill)", background: "color-mix(in oklab, var(--accent-secondary) 55%, white)", color: "var(--ink-primary)", fontSize: 11, fontWeight: 700, marginBottom: 14 } },
            React.createElement(Icon, { name: "sparkles", size: 12 }), "Gemini-drafted", edited && React.createElement("span", { style: { color: "var(--ink-muted)", fontWeight: 500 } }, "· edited")),
          React.createElement("textarea", { ref: taRef, value: body, onChange: (e) => { setBody(e.target.value); setEdited(true); },
            style: { width: "100%", border: "none", outline: "none", resize: "none", background: "transparent", fontSize: 14, lineHeight: 1.65, color: "var(--ink-secondary)", fontFamily: "var(--font-body)", overflow: "hidden" } })),
        React.createElement("div", { style: { padding: "16px 28px", borderTop: "1px solid var(--hairline)", display: "flex", justifyContent: "flex-end", gap: 12 } },
          React.createElement(DSButton, { variant: "secondary", iconLeft: React.createElement(Icon, { name: "fileText", size: 16 }), onClick: onDraft }, "Save as draft"),
          React.createElement(DSButton, { variant: "accent", iconLeft: React.createElement(Icon, { name: "send", size: 16, color: "var(--on-accent)" }), onClick: onSend }, "Send")))));
}

function HeaderField({ label, value }) {
  return React.createElement("div", { style: { display: "flex", alignItems: "center", gap: 12 } },
    React.createElement("span", { style: { width: 34, fontSize: 11, fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--ink-muted)" } }, label),
    React.createElement("span", { style: { fontSize: 13.5, color: "var(--ink-secondary)" } }, value));
}

window.DispatchPopup = DispatchPopup;
