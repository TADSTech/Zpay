import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import SignInModal from '../components/SignInModal';
import WhatsAppDemo, { WhatsAppComposer } from '../components/WhatsAppDemo';
import TiltCard from '../components/TiltCard';
import './landing.css';

export default function LandingPage() {
  const [showSignIn, setShowSignIn] = useState(false);
  const [redirectPath, setRedirectPath] = useState('/dashboard');
  const [scrolled, setScrolled] = useState(false);
  const { user } = useAuth();
  const navigate = useNavigate();
  const rootRef = useRef<HTMLDivElement>(null);

  const handleLaunch = () => {
    if (user) {
      navigate('/dashboard');
    } else {
      setRedirectPath('/dashboard');
      setShowSignIn(true);
    }
  };

  useEffect(() => {
    if (user && showSignIn) {
      setShowSignIn(false);
      navigate(redirectPath);
    }
  }, [user, showSignIn, navigate, redirectPath]);

  const handleSignInClose = () => {
    setShowSignIn(false);
  };

  // If already authenticated, the sign-in modal close handler redirects
  // But also redirect on user state change
  const handleTryDemo = () => {
    if (user) {
      navigate('/simulator');
    } else {
      setRedirectPath('/simulator');
      setShowSignIn(true);
    }
  };

  // Sticky header gets a hairline border once the user scrolls off the top.
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const onScroll = () => setScrolled(root.scrollTop > 8);
    root.addEventListener('scroll', onScroll, { passive: true });
    return () => root.removeEventListener('scroll', onScroll);
  }, []);

  // Scroll-reveal for sections as they enter the viewport.
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const els = Array.from(root.querySelectorAll('.vl-reveal'));
    if (!('IntersectionObserver' in window)) {
      els.forEach(el => el.classList.add('vl-in'));
      return;
    }
    const io = new IntersectionObserver(
      entries => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            entry.target.classList.add('vl-in');
            io.unobserve(entry.target);
          }
        });
      },
      { root, threshold: 0.15 }
    );
    els.forEach(el => io.observe(el));
    return () => io.disconnect();
  }, []);

  return (
    <>
      <div className="vpay-landing" id="view-landing" ref={rootRef}>
        {/* ---------------- Header ---------------- */}
        <header className="vl-header" data-scrolled={scrolled}>
          <div className="vl-container vl-header-inner">
            <div className="vl-brand">
              <span className="vl-brand-mark">Z</span>
              ZPay
            </div>
            <nav className="vl-nav">
              <div className="vl-nav-links">
                <a href="#how">How it works</a>
                <a href="#features">Features</a>
                <a href="#problem">Why ZPay</a>
              </div>
              <div className="vl-header-actions">
                <button className="vl-btn vl-btn-primary vl-btn-sm" onClick={handleLaunch} id="launch-console-btn">
                  Launch Console
                </button>
              </div>
            </nav>
          </div>
        </header>

        <main>
          {/* ---------------- Hero ---------------- */}
          <section className="vl-hero">
            <div className="vl-container vl-hero-grid">
              <div className="vl-hero-copy">
                <h1>
                  Your Customers Don't Wait.
                  <br />
                  <span className="vl-accent">Neither Should Your Business.</span>
                </h1>
                <p className="vl-hero-sub">
                  Every minute you don't reply is a chance for a customer to change their mind. ZPay's AI Sales Assistant responds instantly, answers questions, guides customers through payment, and confirms orders, even when you're offline.
                </p>
                <div className="vl-hero-actions">
                  <button className="vl-btn vl-btn-primary" onClick={handleLaunch} id="goto-dashboard-btn">
                    Start Selling 24/7
                  </button>
                  <button className="vl-btn vl-btn-ghost" onClick={handleTryDemo} id="try-demo-btn">
                    See It In Action
                  </button>
                </div>
                <div className="vl-trust">
                  <div className="vl-trust-item">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Instant replies, 24/7
                  </div>
                  <div className="vl-trust-item">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                    Bank-verified payments
                  </div>
                </div>
              </div>

              <div className="vl-hero-visual">
                <div className="vl-float-card vl-fc-1">
                  <span className="vl-fc-icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </span>
                  <span className="vl-fc-text">
                    <strong>Payment confirmed</strong>
                    <span>₦42,500 · just now</span>
                  </span>
                </div>

                <div className="vl-phone-float">
                  <div className="vl-phone">
                    <span className="vl-phone-speaker" />
                    <span className="vl-phone-cam" />
                    <div className="vl-phone-screen">
                      <div className="vl-statusbar">
                        <span className="vl-sb-time">9:41</span>
                        <span className="vl-sb-icons">
                          <svg viewBox="0 0 20 14" fill="currentColor" aria-hidden="true">
                            <rect x="0" y="9" width="3" height="5" rx="1" />
                            <rect x="5" y="6" width="3" height="8" rx="1" />
                            <rect x="10" y="3" width="3" height="11" rx="1" />
                            <rect x="15" y="0" width="3" height="14" rx="1" />
                          </svg>
                          <svg viewBox="0 0 24 14" fill="currentColor" aria-hidden="true">
                            <rect x="0" y="1" width="21" height="12" rx="3" fill="none" stroke="currentColor" strokeWidth="1.4" />
                            <rect x="2" y="3" width="15" height="8" rx="1.5" />
                            <rect x="22" y="4.5" width="2" height="5" rx="1" />
                          </svg>
                        </span>
                      </div>
                      <div className="vl-wa-header">
                        <svg className="vl-wa-back" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                        </svg>
                        <div className="vl-wa-avatar">C</div>
                        <div className="vl-wa-peer">
                          <strong>Chidi (Customer)</strong>
                          <span>online</span>
                        </div>
                        <div className="vl-wa-actions">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.55-2.28A1 1 0 0121 8.62v6.76a1 1 0 01-1.45.9L15 14M4 6h9a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V8a2 2 0 012-2z" />
                          </svg>
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h2.28a1 1 0 01.95.68l1.2 3.58a1 1 0 01-.5 1.2L7.5 9.6a12 12 0 006.9 6.9l1.14-1.63a1 1 0 011.2-.5l3.58 1.2a1 1 0 01.68.95V19a2 2 0 01-2 2A16 16 0 013 5z" />
                          </svg>
                        </div>
                      </div>
                      <WhatsAppDemo />
                      <WhatsAppComposer />
                    </div>
                  </div>
                </div>

                <div className="vl-float-card vl-fc-2">
                  <span className="vl-fc-icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  </span>
                  <span className="vl-fc-text">
                    <strong>Order ready</strong>
                    <span>Auto-confirmed by AI</span>
                  </span>
                </div>
              </div>
            </div>
          </section>

          {/* ---------------- Problem / story ---------------- */}
          <section className="vl-section vl-bg-gray" id="problem">
            <div className="vl-container">
              <div className="vl-section-head vl-reveal">
                <span className="vl-eyebrow">The Problem</span>
                <h2>Meet Tola. She's Losing Customers Before She Even Gets the Chance to Reply.</h2>
              </div>
              <div className="vl-problem-grid vl-reveal">
                <ol className="vl-steps">
                  <li className="vl-step">
                    <span className="vl-step-num">1</span>
                    <p><strong>The Interest.</strong> Tola posts a new pair of sneakers on Instagram. Minutes later, Chidi messages, "Is size 43 available?" He's ready to buy.</p>
                  </li>
                  <li className="vl-step">
                    <span className="vl-step-num">2</span>
                    <p><strong>The Delay.</strong> Unfortunately, Tola is busy and doesn't see the message. The customer is left waiting with no response.</p>
                  </li>
                  <li className="vl-step">
                    <span className="vl-step-num">3</span>
                    <p><strong>The Change of Mind.</strong> After waiting for a while, Chidi loses interest and buys from another seller who replied first.</p>
                  </li>
                  <li className="vl-step">
                    <span className="vl-step-num">4</span>
                    <p><strong>The Missed Sale.</strong> When Tola finally replies, it's too late. The customer has already moved on.</p>
                  </li>
                  <li className="vl-step">
                    <span className="vl-step-num">5</span>
                    <p><strong>The Reality.</strong> This happens every day. Businesses don't lose sales because of bad products—they lose them because they can't reply when customers are ready to buy.</p>
                  </li>
                </ol>
                <div className="vl-stat-cards">
                  <div className="vl-stat-card">
                    <div className="vl-stat-num">30%</div>
                    <span className="vl-stat-label">of potential customers abandon purchases after waiting too long for a response.</span>
                  </div>
                  <div className="vl-stat-card">
                    <div className="vl-stat-num">Hours Every Week</div>
                    <span className="vl-stat-label">spent replying to repetitive questions, confirming payments, and following up on orders instead of growing the business.</span>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* ---------------- Solution band ---------------- */}
          <section className="vl-section vl-bg-ivory" id="how">
            <div className="vl-container">
              <div className="vl-reveal">
              <TiltCard className="vl-solution vl-tilt" maxTilt={3}>
                <div className="vl-solution-copy">
                  <span className="vl-eyebrow">The Fix</span>
                  <h2>Your AI Sales Assistant Never Takes a Break.</h2>
                  <p>
                    The moment a customer sends a message, ZPay replies instantly on your behalf. It answers questions, confirms product availability, shares payment instructions, verifies payment automatically, collects post-payment details and only notifies you when the order is ready to fulfil.
                  </p>
                  <p>Your business keeps selling, even when you can't answer your phone.</p>
                </div>
                <div className="vl-solution-visual">
                  <div className="vl-flow">
                    <div className="vl-flow-node">
                      <span className="vl-flow-ic">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                        </svg>
                      </span>
                      <span>Customer sends a message</span>
                    </div>
                    <div className="vl-flow-arrow" />
                    <div className="vl-flow-node">
                      <span className="vl-flow-ic">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                      </span>
                      <span>AI answers &amp; sends payment details</span>
                    </div>
                    <div className="vl-flow-arrow" />
                    <div className="vl-flow-node">
                      <span className="vl-flow-ic">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </span>
                      <span>Payment verified automatically</span>
                    </div>
                    <div className="vl-flow-arrow" />
                    <div className="vl-flow-node">
                      <span className="vl-flow-ic">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                        </svg>
                      </span>
                      <span>You're notified: order ready to fulfil</span>
                    </div>
                  </div>
                </div>
              </TiltCard>
              </div>
            </div>
          </section>

          {/* ---------------- Features ---------------- */}
          <section className="vl-section vl-bg-white" id="features">
            <div className="vl-container">
              <div className="vl-section-head vl-reveal">
                <span className="vl-eyebrow">Why Businesses Choose ZPay</span>
                <h2>Everything you need to turn conversations into sales</h2>
              </div>
              <div className="vl-features vl-reveal">
                <TiltCard className="vl-feature vl-tilt vl-feature-sky">
                  <h3>Sell While You're Busy</h3>
                  <p>Whether you're driving, sleeping, in church, attending another customer, or spending time with your family, every customer still receives an instant, professional response.</p>
                </TiltCard>
                <TiltCard className="vl-feature vl-tilt vl-feature-ivory">
                  <h3>Guide Customers From Interest to Payment</h3>
                  <p>The AI doesn't just answer messages.</p>
                  <p>It moves customers through the entire buying journey—from their first question to a completed payment—without waiting for you.</p>
                </TiltCard>
                <TiltCard className="vl-feature vl-tilt vl-feature-gold">
                  <h3>Know Exactly When a Sale Is Ready</h3>
                  <p>No more checking bank alerts.</p>
                  <p>No more matching screenshots.</p>
                  <p>The moment payment is received, the order is confirmed automatically and you receive a notification that it's ready for fulfilment.</p>
                </TiltCard>
              </div>
            </div>
          </section>

          {/* ---------------- Final CTA ---------------- */}
          <section className="vl-section vl-bg-gold">
            <div className="vl-container">
              <div className="vl-cta vl-reveal">
                <div className="vl-cta-inner">
                  <h2>Stop Losing Customers While You're Away.</h2>
                  <p>Let your AI Sales Assistant reply, collect payment, and confirm orders — around the clock.</p>
                  <div className="vl-cta-actions">
                    <button className="vl-btn vl-btn-primary" onClick={handleLaunch}>
                      Start Selling 24/7
                    </button>
                    <button className="vl-btn vl-btn-ghost" onClick={handleTryDemo}>
                      See It In Action
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* ---------------- Footer ---------------- */}
          <footer className="vl-footer">
            <div className="vl-container vl-footer-inner">
              <div className="vl-brand">
                <span className="vl-brand-mark">Z</span>
                ZPay
              </div>
              <p className="vl-footer-copy">© 2026 ZPay. Conversational payments for modern businesses.</p>
            </div>
          </footer>
        </main>
      </div>

      <SignInModal open={showSignIn} onClose={handleSignInClose} />
    </>
  );
}
