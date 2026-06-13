/* SolarTwin — Plant Analyst chatbot. Live AI grounded in the exported twin data. */

function buildGrounding(plant) {
  const y = plant.years[plant.years.length - 1];
  const worst = plant.worst.slice(0, 8).map((w) => `${w.id} (grp ${w.group}, ${w.severity}, health ${Math.round(w.health * 100)}%, €${SOLAR.fmt(w.lossEur)})`).join("; ");
  const anoms = [...plant.anomalies].sort((a, b) => b.lossEur - a.lossEur).slice(0, 14)
    .map((a) => `${a.invId}: ${a.type} [${a.severity}, €${SOLAR.fmt(a.lossEur)}, verdict ${a.verdict}, route→${SOLAR.empById[a.recommendedTo].name}]`).join("; ");
  const routing = SOLAR.employees.map((e) => `${e.name} (${e.role}) — ${e.blurb}`).join("; ");
  const years = plant.years.map((r) => `${r.year}: exp ${r.expected} / act ${r.actual} / curt ${r.curtailment} GWh`).join("; ");
  return `PLANT: ${plant.name} — ${plant.location}. ${plant.kind}. Capacity ${plant.capacity}.
MODEL: ${plant.model}, trained ${plant.trainYears}, R²=${plant.r2}. ${plant.headline}.
FLEET (${plant.count} units): ${SOLAR.sevOrder.map((s) => `${SOLAR.sevLabel[s]} ${plant.fleet[s]}`).join(", ")}.
ENERGY by year (GWh): ${years}.
LATEST ${y.year}: ${y.gap.toFixed(1)} GWh below twin (${((y.gap / y.expected) * 100).toFixed(1)}%). Lifetime modelled loss ≈ ${SOLAR.fmt(plant.totalLossKwh)} kWh / €${SOLAR.fmt(plant.totalLossEur)}.
WORST INVERTERS: ${worst}.
TOP ANOMALIES: ${anoms}.
DISPATCH TEAM & ROUTING: ${routing}.`;
}

const SYS = `You are the SolarTwin Assistant, an O&M intelligence assistant for solar plant operators. You answer ONLY using the exported digital-twin data provided below — never invent inverter IDs, numbers, or people not in the data. Be concise and operational. Use markdown: short bold lead, then bullet points. Reference specific inverter IDs, € losses, and the recommended dispatch recipient by name when relevant. Lead with the action. Do not use emoji.`;

function ChatMessage({ m }) {
  if (m.role === "user") {
    return React.createElement("div", { style: { alignSelf: "flex-end", maxWidth: "86%", background: "var(--surface-dark)", color: "var(--on-dark)", padding: "10px 14px", borderRadius: "16px 16px 4px 16px", fontSize: 13.5, lineHeight: 1.5 } }, m.content);
  }
  return React.createElement("div", { style: { alignSelf: "flex-start", maxWidth: "92%", display: "flex", gap: 9 } },
    React.createElement("span", { style: { width: 26, height: 26, borderRadius: "50%", background: "var(--accent-primary)", display: "grid", placeItems: "center", flex: "0 0 auto", marginTop: 2 } },
      React.createElement(Icon, { name: "sparkles", size: 14, color: "var(--on-accent)" })),
    React.createElement("div", { className: "chat-md", style: { background: "var(--surface-soft)", padding: "11px 14px", borderRadius: "4px 16px 16px 16px", fontSize: 13.5, lineHeight: 1.55, color: "var(--ink-secondary)" },
      dangerouslySetInnerHTML: { __html: mdToHtml(m.content) } }));
}

function ToolIndicator() {
  return React.createElement("div", { style: { alignSelf: "flex-start", display: "flex", alignItems: "center", gap: 9 } },
    React.createElement("span", { style: { width: 26, height: 26, borderRadius: "50%", background: "var(--accent-primary)", display: "grid", placeItems: "center", flex: "0 0 auto" } },
      React.createElement(Icon, { name: "sparkles", size: 14, color: "var(--on-accent)" })),
    React.createElement("div", { style: { display: "inline-flex", alignItems: "center", gap: 9, background: "var(--surface-soft)", padding: "9px 14px", borderRadius: "4px 16px 16px 16px", fontSize: 12.5, color: "var(--ink-muted)", fontWeight: 500 } },
      React.createElement("span", { className: "tool-spin", style: { width: 13, height: 13, border: "2px solid var(--green-200)", borderTopColor: "var(--accent-primary)", borderRadius: "50%", display: "inline-block" } }),
      "Querying model data…"));
}

const CHIPS = ["What needs attention first?", "Explain the performance gap", "Which units should I replace?", "Draft my dispatch priorities"];

function Chatbot({ plant }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const streamRef = useRef();

  useEffect(() => {
    setMessages([{ role: "assistant", content: `Hi — I'm your **SolarTwin Assistant** for ${plant.name}. I'm grounded in the live digital-twin export: ${plant.count} units, ${plant.anomalies.length} open anomalies, €${SOLAR.fmt(plant.totalLossEur)} modelled loss.\n\nAsk me what to act on, or tap a suggestion below.` }]);
  }, [plant.key]);
  useEffect(() => { const el = streamRef.current; if (el) el.scrollTop = el.scrollHeight; }, [messages, busy]);

  const send = async (text) => {
    const q = (text ?? input).trim();
    if (!q || busy) return;
    setInput("");
    const next = [...messages, { role: "user", content: q }];
    setMessages(next);
    setBusy(true);
    const history = next.slice(-6).map((m) => `${m.role === "user" ? "User" : "Analyst"}: ${m.content}`).join("\n");
    try {
      let reply;
      if (window.claude && window.claude.complete) {
        reply = await window.claude.complete({ messages: [{ role: "user", content: `${SYS}\n\n=== EXPORTED TWIN DATA ===\n${buildGrounding(plant)}\n=== END DATA ===\n\nConversation so far:\n${history}\n\nAnswer the latest user question as the SolarTwin Assistant.` }] });
      } else {
        reply = "I can't reach the model endpoint in this environment. In production this is wired to the Gemini API key with the same grounded twin data.";
      }
      setMessages((m) => [...m, { role: "assistant", content: (reply || "").trim() || "(no response)" }]);
    } catch (e) {
      setMessages((m) => [...m, { role: "assistant", content: "Something went wrong reaching the model. Please try again." }]);
    } finally { setBusy(false); }
  };

  return React.createElement("div", { style: { display: "flex", flexDirection: "column", height: "100%", background: "var(--surface-card)", borderLeft: "1px solid var(--hairline)" } },
    // header
    React.createElement("div", { style: { padding: "18px 20px 14px", borderBottom: "1px solid var(--hairline)", display: "flex", alignItems: "center", gap: 11 } },
      React.createElement("span", { style: { width: 34, height: 34, borderRadius: 10, background: "var(--accent-primary)", display: "grid", placeItems: "center", flex: "0 0 auto" } },
        React.createElement(Icon, { name: "sparkles", size: 18, color: "var(--on-accent)" })),
      React.createElement("div", { style: { display: "flex", flexDirection: "column", gap: 1 } },
        React.createElement("span", { style: { fontSize: 15.5, fontWeight: 600, color: "var(--ink-primary)" } }, "SolarTwin Assistant"),
        React.createElement("span", { style: { fontSize: 11.5, color: "var(--ink-muted)", display: "inline-flex", alignItems: "center", gap: 5 } },
          React.createElement("span", { style: { width: 6, height: 6, borderRadius: "50%", background: "var(--green-400)" } }), "Grounded in ", plant.name))),
    // stream
    React.createElement("div", { ref: streamRef, style: { flex: 1, overflowY: "auto", padding: "18px 18px 8px", display: "flex", flexDirection: "column", gap: 14 } },
      messages.map((m, i) => React.createElement(ChatMessage, { key: i, m })),
      busy && React.createElement(ToolIndicator, null)),
    // chips
    React.createElement("div", { style: { display: "flex", gap: 7, flexWrap: "wrap", padding: "6px 16px 10px" } },
      CHIPS.map((c) => React.createElement("button", { key: c, onClick: () => send(c), disabled: busy, className: "chip",
        style: { padding: "6px 11px", borderRadius: "var(--radius-pill)", border: "1px solid var(--hairline)", background: "var(--surface-card)", cursor: busy ? "default" : "pointer", fontSize: 12, fontWeight: 500, color: "var(--ink-secondary)", opacity: busy ? 0.5 : 1, transition: "all var(--dur-fast) ease" } }, c))),
    // input
    React.createElement("div", { style: { padding: "12px 16px 16px", borderTop: "1px solid var(--hairline)" } },
      React.createElement("div", { style: { display: "flex", alignItems: "flex-end", gap: 8, background: "var(--surface-soft)", borderRadius: "var(--radius-lg)", padding: "8px 8px 8px 14px" } },
        React.createElement("textarea", { value: input, onChange: (e) => setInput(e.target.value), rows: 1, placeholder: "Ask about losses, anomalies, dispatch…",
          onKeyDown: (e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } },
          style: { flex: 1, border: "none", outline: "none", resize: "none", background: "transparent", fontSize: 13.5, lineHeight: 1.5, fontFamily: "var(--font-body)", color: "var(--ink-primary)", maxHeight: 90, padding: "4px 0" } }),
        React.createElement("button", { onClick: () => send(), disabled: busy || !input.trim(),
          style: { width: 36, height: 36, borderRadius: "var(--radius-md)", border: "none", background: input.trim() && !busy ? "var(--accent-primary)" : "var(--hairline)", color: "var(--on-accent)", cursor: input.trim() && !busy ? "pointer" : "default", display: "grid", placeItems: "center", flex: "0 0 auto", transition: "background var(--dur-fast) ease" } },
          React.createElement(Icon, { name: "send", size: 17, color: input.trim() && !busy ? "var(--on-accent)" : "var(--ink-muted)" })))));
}

window.Chatbot = Chatbot;
