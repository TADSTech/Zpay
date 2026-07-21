import { useEffect, useRef, useState } from 'react';

/**
 * Animated WhatsApp-style conversation for the landing hero.
 * Messages reveal one after another (with a typing indicator before each
 * business/AI reply) to demonstrate ZPay's AI sales assistant taking a
 * customer from question → payment → confirmation. The sequence loops.
 */

type Step =
  | { kind: 'in'; text: string }
  | { kind: 'out'; text: string; bank?: { label: string; num: string } }
  | { kind: 'system'; text: string; paid?: boolean };

const SCRIPT: Step[] = [
  { kind: 'in', text: "Hi 👋 I'd like to order 5 cartons of the sparkling water." },
  {
    kind: 'out',
    text: 'Sure! 5 cartons come to ₦42,500. To reserve your order, please transfer to the account below 👇',
    bank: { label: 'Wema Bank · ZPay', num: '9928 374 829' },
  },
  { kind: 'in', text: 'Is delivery included in that price?' },
  { kind: 'out', text: 'Yes — delivery within Lagos is free and takes 24 hours 🚚' },
  { kind: 'system', text: 'Payment of ₦42,500 received', paid: true },
  { kind: 'out', text: 'Payment confirmed ✅ Your order is reserved. Please confirm your delivery address.' },
];

// Delay before each message appears (ms). Incoming customer messages arrive
// quickly; outgoing replies wait a beat while the typing indicator shows.
const TYPING_MS = 1100;
const READ_MS = 900;
const LOOP_PAUSE_MS = 3200;

export default function WhatsAppDemo() {
  const [visible, setVisible] = useState(0);
  const [typing, setTyping] = useState(false);
  const bodyRef = useRef<HTMLDivElement>(null);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (reduce) {
      setVisible(SCRIPT.length);
      return;
    }

    const schedule = (fn: () => void, ms: number) => {
      const id = setTimeout(fn, ms);
      timers.current.push(id);
    };

    const play = (index: number) => {
      if (index >= SCRIPT.length) {
        schedule(() => {
          setVisible(0);
          setTyping(false);
          play(0);
        }, LOOP_PAUSE_MS);
        return;
      }

      const step = SCRIPT[index];
      const isReply = step.kind !== 'in';

      if (isReply) {
        setTyping(true);
        schedule(() => {
          setTyping(false);
          setVisible(index + 1);
          schedule(() => play(index + 1), READ_MS);
        }, TYPING_MS);
      } else {
        setVisible(index + 1);
        schedule(() => play(index + 1), READ_MS);
      }
    };

    schedule(() => play(0), 600);

    return () => {
      timers.current.forEach(clearTimeout);
      timers.current = [];
    };
  }, []);

  // Keep the latest message in view as the conversation grows.
  useEffect(() => {
    const el = bodyRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [visible, typing]);

  return (
    <div className="vl-wa-body" ref={bodyRef} aria-hidden="true">
      {SCRIPT.slice(0, visible).map((step, i) => {
        if (step.kind === 'system') {
          return (
            <div className="vl-msg vl-msg-system" key={i}>
              <span className={step.paid ? 'vl-msg-paid' : undefined}>
                {step.paid && (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                )}
                {step.text}
              </span>
            </div>
          );
        }
        return (
          <div className={`vl-msg ${step.kind === 'in' ? 'vl-msg-in' : 'vl-msg-out'}`} key={i}>
            {step.text}
            {step.kind === 'out' && step.bank && (
              <div className="vl-msg-bank">
                <div className="vl-bank-label">{step.bank.label}</div>
                <div className="vl-bank-num">{step.bank.num}</div>
              </div>
            )}
            <span className="vl-msg-time">
              12:0{i} {step.kind === 'out' ? '✓✓' : ''}
            </span>
          </div>
        );
      })}
      {typing && (
        <div className="vl-typing">
          <span />
          <span />
          <span />
        </div>
      )}
    </div>
  );
}

/**
 * Static WhatsApp-style composer bar. Purely decorative — it sits under the
 * animated conversation to complete the realistic chat screen.
 */
export function WhatsAppComposer() {
  return (
    <div className="vl-wa-composer" aria-hidden="true">
      <div className="vl-wa-input">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
          <circle cx="12" cy="12" r="9" />
          <path strokeLinecap="round" d="M8.5 14.5a4 4 0 007 0M9 9.5h.01M15 9.5h.01" />
        </svg>
        <span>Type a message</span>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path strokeLinecap="round" strokeLinejoin="round" d="M21.44 11.05l-9.19 9.19a5 5 0 01-7.07-7.07l9.19-9.19a3 3 0 014.24 4.24l-9.2 9.19a1 1 0 01-1.41-1.41l8.49-8.49" />
        </svg>
      </div>
      <div className="vl-wa-send">
        <svg viewBox="0 0 24 24" fill="currentColor">
          <path d="M3.4 20.4l17.45-7.48a1 1 0 000-1.84L3.4 3.6a1 1 0 00-1.4.93V9a1 1 0 00.85.99L15 12 2.85 14.01A1 1 0 002 15v4.47a1 1 0 001.4.93z" />
        </svg>
      </div>
    </div>
  );
}
