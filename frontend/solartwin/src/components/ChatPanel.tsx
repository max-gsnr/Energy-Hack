'use client';
import React, { useEffect, useRef, useState, KeyboardEvent } from 'react';
import { gsap } from 'gsap';
import { api } from '@/lib/api';
import type { ChatMessage, HealthData } from '@/lib/api';

const SUGGESTIONS = [
  'Which inverter has the worst loss?',
  'Explain the top critical finding.',
  'What is the curtailment situation?',
  'How much revenue is at risk?',
];

interface Props { health: HealthData | null; }

export default function ChatPanel({ health }: Props) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  // Panel slide-in
  useEffect(() => {
    if (!panelRef.current) return;
    gsap.fromTo(panelRef.current,
      { opacity: 0, x: 40 },
      { opacity: 1, x: 0, duration: 0.5, ease: 'power3.out', delay: 0.4 }
    );
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, busy]);

  const animateLastBubble = () => {
    const bubbles = panelRef.current?.querySelectorAll('.msg-bubble');
    const last = bubbles?.[bubbles.length - 1];
    if (!last) return;
    gsap.fromTo(last,
      { opacity: 0, y: 12, scale: 0.94 },
      { opacity: 1, y: 0, scale: 1, duration: 0.35, ease: 'power2.out' }
    );
  };

  const send = async (text: string) => {
    if (!text.trim() || busy) return;
    const userMsg: ChatMessage = { role: 'user', content: text };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setBusy(true);
    setTimeout(animateLastBubble, 10);
    try {
      const r = await api.chat(text, messages);
      const botMsg: ChatMessage = { role: 'assistant', content: r.response };
      setMessages(prev => [...prev, botMsg]);
      setTimeout(animateLastBubble, 10);
    } catch {
      const errMsg: ChatMessage = { role: 'assistant', content: '⚠️ Agent unreachable. Start the backend with `./start.sh`.' };
      setMessages(prev => [...prev, errMsg]);
    } finally {
      setBusy(false);
    }
  };

  const handleKey = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(input); }
  };

  return (
    <div ref={panelRef} className="flex flex-col h-full" style={{ background: 'var(--bg1)' }}>
      {/* Header */}
      <div className="px-4 py-3 border-b flex items-center gap-2" style={{ borderColor: 'var(--border)' }}>
        <span className="text-sm font-semibold" style={{ color: 'var(--text)' }}>🤖 Plant Analyst</span>
        <span className={`w-1.5 h-1.5 rounded-full ml-auto`}
          style={{ background: health?.llm ? 'var(--normal)' : 'var(--critical)' }} />
        <span className="text-[10px]" style={{ color: 'var(--muted)' }}>{health?.llm ? 'online' : 'offline'}</span>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {messages.length === 0 && (
          <div className="text-center py-8">
            <div className="text-3xl mb-3">🌞</div>
            <p className="text-xs" style={{ color: 'var(--muted)' }}>Ask anything about the solar plant, its anomalies, or financial impact.</p>
            <div className="mt-4 flex flex-col gap-2">
              {SUGGESTIONS.map(s => (
                <button
                  key={s}
                  className="text-left px-3 py-2 rounded-lg text-xs transition-colors border hover:bg-white/5"
                  style={{ borderColor: 'var(--border)', color: 'var(--muted)' }}
                  onClick={() => send(s)}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}
        {messages.map((m, i) => (
          <div key={i} className={`msg-bubble flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div
              className={`max-w-[85%] px-3 py-2 text-xs leading-relaxed ${m.role === 'user' ? 'bubble-user' : 'bubble-bot'}`}
              style={{ color: 'var(--text)', whiteSpace: 'pre-wrap' }}
            >
              {m.content}
            </div>
          </div>
        ))}
        {busy && (
          <div className="msg-bubble flex justify-start">
            <div className="bubble-bot px-4 py-2.5 text-xs" style={{ color: 'var(--muted)' }}>
              <span className="inline-flex gap-1">
                <span className="animate-bounce" style={{ animationDelay: '0ms' }}>·</span>
                <span className="animate-bounce" style={{ animationDelay: '120ms' }}>·</span>
                <span className="animate-bounce" style={{ animationDelay: '240ms' }}>·</span>
              </span>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="px-4 pb-4 pt-2 border-t" style={{ borderColor: 'var(--border)' }}>
        <div className="flex items-end gap-2">
          <textarea
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKey}
            placeholder="Ask the plant analyst…"
            rows={2}
            className="flex-1 resize-none rounded-xl px-3 py-2 text-xs outline-none transition-colors border focus:border-[var(--brand)]"
            style={{
              background: 'var(--bg2)',
              borderColor: 'var(--border)',
              color: 'var(--text)',
            }}
          />
          <button
            className="w-9 h-9 rounded-xl flex items-center justify-center transition-all"
            style={{
              background: input.trim() && !busy ? 'var(--brand)' : 'var(--bg3)',
              color: input.trim() && !busy ? '#000' : 'var(--muted)',
              cursor: input.trim() && !busy ? 'pointer' : 'not-allowed',
            }}
            disabled={!input.trim() || busy}
            onClick={() => send(input)}
          >↑</button>
        </div>
      </div>
    </div>
  );
}
