import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const STORAGE_KEY = 'zpay_onboarding_dismissed';

export default function OnboardingModal() {
  const [open, setOpen] = useState(false);
  const [dontShow, setDontShow] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const dismissed = localStorage.getItem(STORAGE_KEY);
    if (!dismissed) {
      const timer = setTimeout(() => setOpen(true), 400);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleDismiss = () => {
    if (dontShow) {
      localStorage.setItem(STORAGE_KEY, 'true');
    }
    setOpen(false);
  };

  const handleGoToSimulator = () => {
    if (dontShow) {
      localStorage.setItem(STORAGE_KEY, 'true');
    }
    setOpen(false);
    navigate('/simulator');
  };

  if (!open) return null;

  return (
    <div className="onboarding-overlay" onClick={handleDismiss}>
      <div className="onboarding-modal" onClick={e => e.stopPropagation()}>
        <div className="onboarding-header">
          <div className="onboarding-brand">
            <span className="onboarding-brand-mark">Z</span>
          </div>
          <h2>Welcome to ZPay</h2>
          <p className="onboarding-tagline">
            Zero-UI conversational payments for African merchants.
          </p>
        </div>

        <div className="onboarding-body">
          <div className="onboarding-section">
            <h3>What ZPay does</h3>
            <p>
              ZPay connects your WhatsApp (or any messaging platform) directly to Monnify payments. When a customer messages you, ZPay's AI responds instantly, answers product questions, sends payment instructions, verifies bank transfers automatically, and confirms the order — all before you even read the chat.
            </p>
          </div>

          <div className="onboarding-steps">
            <h3>How it works</h3>
            <div className="onboarding-steps-grid">
              <div className="onboarding-step">
                <span className="onboarding-step-num">1</span>
                <div className="onboarding-step-body">
                  <strong>Customer sends a message</strong>
                  <span>On WhatsApp, Instagram, or any chat channel</span>
                </div>
              </div>
              <div className="onboarding-arrow">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--gold)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="5" y1="12" x2="19" y2="12" />
                  <polyline points="12 5 19 12 12 19" />
                </svg>
              </div>
              <div className="onboarding-step">
                <span className="onboarding-step-num">2</span>
                <div className="onboarding-step-body">
                  <strong>AI handles the sale</strong>
                  <span>Answers questions, sends a virtual account or payment link</span>
                </div>
              </div>
              <div className="onboarding-arrow">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--gold)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="5" y1="12" x2="19" y2="12" />
                  <polyline points="12 5 19 12 12 19" />
                </svg>
              </div>
              <div className="onboarding-step">
                <span className="onboarding-step-num">3</span>
                <div className="onboarding-step-body">
                  <strong>Payment confirmed</strong>
                  <span>Bank transfer verified automatically — you just fulfil</span>
                </div>
              </div>
            </div>
          </div>

          <div className="onboarding-highlight">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p>
              No app store. No checkout page. No customer effort. The entire transaction happens inside the chat.
            </p>
          </div>
        </div>

        <div className="onboarding-footer">
          <button className="btn btn-primary btn-lg onboarding-cta" onClick={handleGoToSimulator}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
            Try the Chat Simulator
          </button>
          <button className="btn btn-secondary" onClick={handleDismiss}>
            Explore Dashboard
          </button>
          <label className="onboarding-remember">
            <input
              type="checkbox"
              checked={dontShow}
              onChange={e => setDontShow(e.target.checked)}
            />
            <span>Don't show this again</span>
          </label>
        </div>
      </div>
    </div>
  );
}
