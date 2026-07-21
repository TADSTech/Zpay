import { useState } from 'react';
import { useAuth } from '../context/AuthContext';

interface SignInModalProps {
  open: boolean;
  onClose: () => void;
}

export default function SignInModal({ open, onClose }: SignInModalProps) {
  const { loginWithGoogle, loginAsMock } = useAuth();
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  if (!open) return null;

  const handleMockLogin = () => {
    setAuthError(null);
    setIsAuthenticating(true);
    setTimeout(() => {
      loginAsMock();
      setIsAuthenticating(false);
    }, 1500); // 1.5s juicy delay to make it feel real
  };

  const handleGoogleLogin = async () => {
    setAuthError(null);
    setIsAuthenticating(true);
    try {
      await loginWithGoogle();
    } catch (err: any) {
      console.error('Google sign-in failed:', err);
      // Surface the real failure instead of silently mocking it away —
      // a masked auth error is impossible to debug.
      setAuthError(err?.code ? `${err.code}: ${err.message}` : (err?.message || 'Google sign-in failed.'));
    } finally {
      setIsAuthenticating(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 420 }}>
        {isAuthenticating ? (
          <div style={{ padding: '2.5rem 1rem', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.75rem' }}>
            <div className="zp-loader" aria-hidden="true" style={{ ['--zp-dot' as string]: '14px' }}>
              <span /><span /><span />
            </div>
            <div>
              <h4 style={{ margin: 0 }}>Authenticating</h4>
              <p style={{ margin: '0.5rem 0 0', color: 'var(--platinum-muted)', fontSize: '0.9rem' }}>Securely connecting to your account...</p>
            </div>
          </div>
        ) : (
          <>
            <div className="modal-header" style={{ textAlign: 'center' }}>
              <h4>Sign in to ZPay</h4>
              <p style={{ fontSize: '0.85rem', color: 'var(--platinum-muted)', marginTop: '0.4rem' }}>
                Choose an account to continue
              </p>
            </div>
            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', padding: 0 }}>
              {authError && (
                <div style={{ color: 'var(--error)', fontSize: '0.8rem', padding: '0.6rem 0.8rem', border: '1px solid rgba(192,72,60,0.3)', borderRadius: '10px', background: 'rgba(192,72,60,0.06)' }}>
                  {authError}
                </div>
              )}
              <button className="google-account-btn" onClick={handleMockLogin} id="mock-account-btn">
                <div className="avatar" style={{ background: 'var(--gold)', color: '#1a1400' }}>T</div>
                <div className="account-details">
                  <strong>Tola Shofola</strong>
                  <span style={{ color: 'var(--gold-deep)' }}>Demo Presentation Account</span>
                </div>
              </button>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', margin: '0.1rem 0', fontSize: '0.78rem', color: 'var(--platinum-muted)' }}>
                <span style={{ flex: 1, height: '1px', background: 'var(--border-silver)' }} />
                or
                <span style={{ flex: 1, height: '1px', background: 'var(--border-silver)' }} />
              </div>
              <button className="btn btn-primary btn-full" onClick={handleGoogleLogin} id="google-signin-btn">
                <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
                  <path d="M12.24 10.285V13.4h6.887c-.275 1.565-1.88 4.604-6.887 4.604-4.33 0-7.866-3.577-7.866-8s3.536-8 7.866-8c2.46 0 4.105 1.025 5.047 1.926l2.427-2.334C17.955 2.192 15.34 1 12.24 1 6.033 1 1 6.033 1 12.24s5.033 11.24 11.24 11.24c6.478 0 10.793-4.537 10.793-10.985 0-.74-.08-1.305-.18-1.865l-10.613-.35H12.24z" />
                </svg>
                Continue with Google
              </button>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary btn-full" onClick={onClose}>Cancel</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
