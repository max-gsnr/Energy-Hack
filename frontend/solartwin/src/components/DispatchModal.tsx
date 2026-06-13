'use client';
import React, { useEffect, useRef, useState } from 'react';
import { gsap } from 'gsap';
import { api } from '@/lib/api';
import type { Finding, EmailDraft, Recipient } from '@/lib/api';

type Step = 'recipients' | 'draft' | 'sending' | 'done';

interface Props {
  finding: Finding;
  onClose: () => void;
  onSent: (draft: EmailDraft) => void;
}

const AVATAR_COLORS = ['#f5a623', '#ff4757', '#2ed573', '#ffa502', '#7bed9f', '#70a1ff', '#ff6b81'];
function initials(name: string) {
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
}

export default function DispatchModal({ finding, onClose, onSent }: Props) {
  const [step, setStep] = useState<Step>('recipients');
  const [draft, setDraft] = useState<EmailDraft | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const backdropRef = useRef<HTMLDivElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);
  const confettiRef = useRef<HTMLDivElement>(null);

  const recipients: Recipient[] = finding.routing ?? [];

  // Open animation
  useEffect(() => {
    if (!backdropRef.current || !modalRef.current) return;
    gsap.fromTo(backdropRef.current, { opacity: 0 }, { opacity: 1, duration: 0.3 });
    gsap.fromTo(modalRef.current,
      { opacity: 0, scale: 0.88, y: 40 },
      { opacity: 1, scale: 1, y: 0, duration: 0.45, ease: 'back.out(1.4)' }
    );
    // Pre-select all
    setSelected(new Set(recipients.map(r => r.email)));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Animate contact cards in
  const cardsRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (step !== 'recipients' || !cardsRef.current) return;
    const cards = cardsRef.current.querySelectorAll('.contact-card');
    gsap.fromTo(cards,
      { opacity: 0, y: 20, scale: 0.9 },
      { opacity: 1, y: 0, scale: 1, duration: 0.4, stagger: 0.07, ease: 'back.out(1.3)' }
    );
  }, [step]);

  // Animate draft in
  const draftRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (step !== 'draft' || !draftRef.current) return;
    gsap.fromTo(draftRef.current,
      { opacity: 0, x: 40 },
      { opacity: 1, x: 0, duration: 0.4, ease: 'power3.out' }
    );
  }, [step]);

  const fetchDraft = async () => {
    setLoading(true);
    setError(null);
    try {
      const d = await api.dispatch(finding.finding_id);
      // Filter to selected recipients
      const filteredDraft = {
        ...d,
        recipients: d.recipients.filter(r => selected.has(r.email)),
      };
      setDraft(filteredDraft);
      setStep('draft');
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  };

  const handleSend = async () => {
    if (!draft) return;
    setStep('sending');
    await new Promise(r => setTimeout(r, 900)); // simulated send
    setStep('done');
    // Confetti burst
    launchConfetti();
    setTimeout(() => onSent(draft), 1800);
  };

  const launchConfetti = () => {
    if (!confettiRef.current) return;
    const colors = ['#f5a623', '#ff4757', '#2ed573', '#ffa502', '#70a1ff'];
    for (let i = 0; i < 40; i++) {
      const el = document.createElement('div');
      el.style.cssText = `
        position:absolute; width:8px; height:8px; border-radius:2px;
        background:${colors[i % colors.length]};
        top:50%; left:50%; pointer-events:none;
      `;
      confettiRef.current.appendChild(el);
      gsap.to(el, {
        x: (Math.random() - 0.5) * 400,
        y: (Math.random() - 0.5) * 400,
        rotation: Math.random() * 720,
        opacity: 0,
        duration: 1.2 + Math.random() * 0.6,
        ease: 'power2.out',
        onComplete: () => el.remove(),
      });
    }
  };

  const close = () => {
    gsap.to(modalRef.current, { opacity: 0, scale: 0.92, y: 20, duration: 0.25, onComplete: onClose });
  };

  return (
    <div
      ref={backdropRef}
      className="fixed inset-0 z-50 flex items-center justify-center modal-backdrop"
      onClick={e => { if (e.target === backdropRef.current) close(); }}
    >
      <div
        ref={modalRef}
        className="glass w-full max-w-2xl mx-4 overflow-hidden relative"
        style={{ maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}
      >
        {/* Confetti container */}
        <div ref={confettiRef} className="absolute inset-0 pointer-events-none overflow-hidden" />

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: 'var(--border)' }}>
          <div>
            <h2 className="text-base font-semibold" style={{ color: 'var(--text)' }}>
              📨 Dispatch finding — {finding.inverter_id.replace(/^INV\s+/, '')}
            </h2>
            <p className="text-xs mt-0.5" style={{ color: 'var(--muted)' }}>
              {step === 'recipients' ? 'Step 1: Select recipients' :
               step === 'draft'      ? 'Step 2: Review & send' :
               step === 'sending'    ? 'Sending…' : '✅ Email sent!'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="chip chip-warning">{finding.severity}</span>
            <button
              className="w-7 h-7 rounded-full flex items-center justify-center text-sm hover:bg-white/10 transition-colors"
              style={{ color: 'var(--muted)' }}
              onClick={close}
            >✕</button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {/* Step 1 – recipients */}
          {step === 'recipients' && (
            <div ref={cardsRef}>
              <p className="text-xs mb-4" style={{ color: 'var(--muted)' }}>
                Based on the finding classification <strong style={{ color: 'var(--text)' }}>{finding.classification.replace(/_/g, ' ')}</strong>, the routing engine suggests the following contacts. Toggle to include/exclude.
              </p>
              <div className="grid grid-cols-2 gap-3 mb-6">
                {recipients.map((r, i) => {
                  const isOn = selected.has(r.email);
                  return (
                    <div
                      key={r.email}
                      className={`contact-card glass p-4 cursor-pointer transition-all rounded-xl ${isOn ? 'ring-2' : 'opacity-60'}`}
                      style={isOn ? { boxShadow: '0 0 0 2px var(--brand)' } : {}}
                      onClick={() => setSelected(prev => {
                        const n = new Set(prev);
                        if (n.has(r.email)) n.delete(r.email); else n.add(r.email);
                        return n;
                      })}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0"
                          style={{ background: AVATAR_COLORS[i % AVATAR_COLORS.length] + '33', color: AVATAR_COLORS[i % AVATAR_COLORS.length] }}
                        >
                          {initials(r.name)}
                        </div>
                        <div className="min-w-0">
                          <div className="text-xs font-semibold truncate" style={{ color: 'var(--text)' }}>{r.name}</div>
                          <div className="text-[10px] truncate" style={{ color: 'var(--muted)' }}>{r.role}</div>
                          <div className="text-[10px] truncate" style={{ color: 'var(--muted)' }}>{r.email}</div>
                        </div>
                        <div className="ml-auto">
                          <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center`}
                            style={{ borderColor: isOn ? 'var(--brand)' : 'var(--border)', background: isOn ? 'var(--brand)' : 'transparent' }}>
                            {isOn && <span className="text-[8px] text-black font-bold">✓</span>}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {error && <p className="text-xs text-red-400 mb-3">{error}</p>}

              <button
                className="w-full py-2.5 rounded-xl text-sm font-semibold transition-all"
                style={{ background: selected.size ? 'var(--brand)' : '#2a3050', color: selected.size ? '#000' : 'var(--muted)', cursor: selected.size ? 'pointer' : 'not-allowed' }}
                disabled={!selected.size || loading}
                onClick={fetchDraft}
              >
                {loading ? '⚙ Generating draft…' : `Generate email draft for ${selected.size} recipient${selected.size !== 1 ? 's' : ''} →`}
              </button>
            </div>
          )}

          {/* Step 2 – draft */}
          {step === 'draft' && draft && (
            <div ref={draftRef}>
              <div className="glass p-4 mb-4 rounded-xl">
                <div className="grid grid-cols-2 gap-3 text-xs mb-3">
                  <div>
                    <span style={{ color: 'var(--muted)' }}>To: </span>
                    {draft.recipients.map(r => (
                      <span key={r.email} className="mr-2 font-medium" style={{ color: 'var(--text)' }}>{r.name}</span>
                    ))}
                  </div>
                  <div><span style={{ color: 'var(--muted)' }}>From: </span><span style={{ color: 'var(--text)' }}>SolarTwin Agent · Enerparc</span></div>
                </div>
                <div className="text-sm font-semibold mb-3" style={{ color: 'var(--brand)' }}>Subject: {draft.subject}</div>
                <div className="border-t pt-3" style={{ borderColor: 'var(--border)' }}>
                  <pre className="text-xs leading-relaxed whitespace-pre-wrap font-sans" style={{ color: 'var(--text)' }}>{draft.body}</pre>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  className="px-4 py-2.5 rounded-xl text-xs font-medium border transition-colors"
                  style={{ borderColor: 'var(--border)', color: 'var(--muted)' }}
                  onClick={() => setStep('recipients')}
                >← Back</button>
                <button
                  className="flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all"
                  style={{ background: 'var(--brand)', color: '#000' }}
                  onClick={handleSend}
                >Send dispatch ✉</button>
              </div>
            </div>
          )}

          {/* Step: sending / done */}
          {(step === 'sending' || step === 'done') && (
            <div className="flex flex-col items-center justify-center py-12 gap-4">
              {step === 'sending' ? (
                <>
                  <div className="animate-spin text-4xl">☀️</div>
                  <p className="text-sm" style={{ color: 'var(--muted)' }}>Dispatching email…</p>
                </>
              ) : (
                <>
                  <div className="text-5xl">✅</div>
                  <p className="text-base font-semibold" style={{ color: 'var(--normal)' }}>Dispatch sent!</p>
                  <p className="text-xs" style={{ color: 'var(--muted)' }}>Closing…</p>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
