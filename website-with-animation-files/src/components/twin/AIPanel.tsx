import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { useEffect, useRef, useState } from "react";

const SUGGESTED = [
  "Which inverter is worst, and why?",
  "Is the top issue pre-existing or new?",
  "How much energy was lost excluding curtailment?",
  "Why did the gap grow after 2021?",
];

export function AIPanel({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [input, setInput] = useState("");
  const transport = useRef(new DefaultChatTransport({ api: "/api/chat" })).current;
  const { messages, sendMessage, status, error } = useChat({ transport });
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [messages, status]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const busy = status === "submitted" || status === "streaming";

  const send = async (text: string) => {
    const t = text.trim();
    if (!t || busy) return;
    setInput("");
    await sendMessage({ text: t });
  };

  return (
    <>
      {open && <div className="fixed inset-0 bg-foreground/20 z-50 transition-opacity" onClick={onClose} />}
      <aside
        aria-hidden={!open}
        className={`fixed right-0 top-0 h-screen w-full sm:w-[420px] bg-surface border-l border-hairline z-50 flex flex-col transition-transform duration-150 ease-out ${open ? "translate-x-0" : "translate-x-full"}`}
      >
        <div className="hairline-b px-5 h-14 flex items-center justify-between">
          <div>
            <div className="eyebrow">AI Analyst</div>
            <div className="text-sm font-medium mt-0.5">Grounded in Plant A data</div>
          </div>
          <button onClick={onClose} className="text-[12px] mono uppercase tracking-[0.12em] text-muted-foreground hover:text-foreground">Close</button>
        </div>

        <div ref={listRef} className="flex-1 overflow-y-auto px-5 py-5 space-y-4">
          {messages.length === 0 && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground leading-relaxed">
                Ask about performance loss, curtailment, specific inverters, or anomalies. Every numeric answer is grounded in the loaded data; if it's not known, I'll say so.
              </p>
              <div className="space-y-1.5">
                {SUGGESTED.map(s => (
                  <button key={s} onClick={() => send(s)} className="block w-full text-left text-[13px] px-3 py-2 rounded-md border border-hairline hover:bg-secondary transition-colors">
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}
          {messages.map((m: UIMessage) => {
            const text = m.parts.map(p => (p.type === "text" ? p.text : "")).join("");
            const isUser = m.role === "user";
            return (
              <div key={m.id} className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[88%] text-[13.5px] leading-relaxed px-3.5 py-2.5 rounded-lg ${isUser ? "bg-foreground text-background" : "bg-secondary text-foreground"}`}>
                  <div className="whitespace-pre-wrap">{text}</div>
                </div>
              </div>
            );
          })}
          {busy && (
            <div className="flex gap-1.5 items-center text-[12px] text-muted-foreground">
              <span className="w-1.5 h-1.5 bg-muted-foreground rounded-full animate-pulse" />
              thinking…
            </div>
          )}
          {error && (
            <div className="text-[12px] text-[color:var(--st-critical)] border border-[color:var(--st-critical)]/30 rounded-md p-2.5">
              {error.message}
            </div>
          )}
        </div>

        <form
          onSubmit={(e) => { e.preventDefault(); send(input); }}
          className="hairline-t p-4 flex gap-2"
        >
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder="Ask about Plant A…"
            className="flex-1 bg-background border border-hairline rounded-md px-3 py-2 text-[13.5px] focus:outline-none focus:border-foreground transition-colors"
          />
          <button type="submit" disabled={busy || !input.trim()} className="px-3.5 py-2 text-[12px] mono uppercase tracking-[0.12em] bg-foreground text-background rounded-md disabled:opacity-30 transition-opacity">
            Ask
          </button>
        </form>
      </aside>
    </>
  );
}
