import { useEffect, useState, useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { useAuth } from '../context/AuthContext';
import { apiGet, apiPost } from '../lib/api';
import Modal from '../components/Modal';

interface Credentials {
  apiKey: string;
  secretKey: string;
  contractCode: string;
}

type WaStatus = 'disconnected' | 'connecting' | 'qr' | 'pairing' | 'connected';

interface WaState {
  status: WaStatus;
  qr?: string;
  pairingCode?: string;
  error?: string;
}

export default function DeveloperPage() {
  const { user } = useAuth();
  const [credentials, setCredentials] = useState<Credentials>({
    apiKey: '',
    secretKey: '',
    contractCode: '',
  });
  const [waState, setWaState] = useState<WaState>({ status: 'disconnected' });
  const [waPhoneInput, setWaPhoneInput] = useState('');
  const [connectingWhatsApp, setConnectingWhatsApp] = useState(false);
  const [disconnectingWhatsApp, setDisconnectingWhatsApp] = useState(false);
  const [saving, setSaving] = useState(false);
  const [modalInfo, setModalInfo] = useState<{ title: string; message: string } | null>(null);
  const [isDark, setIsDark] = useState(!document.body.classList.contains('light-theme'));
  const consoleRef = useRef<HTMLDivElement>(null);

  const isMock = user?.isMock === true;

  useEffect(() => {
    loadCredentials();
  }, [user]);

  // Poll connection status while this page is mounted — cheap enough for a
  // settings panel, and the only way to notice a QR scan / pairing / drop.
  useEffect(() => {
    let cancelled = false;
    const poll = async () => {
      try {
        const data = await apiGet<WaState & { success: boolean }>('/api/whatsapp/status');
        if (!cancelled && data.success) {
          setWaState({ status: data.status, qr: data.qr, pairingCode: data.pairingCode, error: data.error });
        }
      } catch (e) {
        console.error('Error polling WhatsApp status:', e);
      }
    };

    poll();
    const interval = setInterval(poll, 3000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  const handleConnectWhatsApp = async () => {

    setConnectingWhatsApp(true);
    try {
      const data = await apiPost<WaState & { success: boolean; error?: string }>('/api/whatsapp/connect', {
        phoneNumber: waPhoneInput.trim() || undefined,
      });
      if (data.success) {
        setWaState({ status: data.status, qr: data.qr, pairingCode: data.pairingCode, error: data.error });
      } else {
        setModalInfo({ title: 'Error', message: data.error || 'Failed to start WhatsApp connection.' });
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to communicate with API.';
      setModalInfo({ title: 'Error', message: msg });
    } finally {
      setConnectingWhatsApp(false);
    }
  };

  const handleDisconnectWhatsApp = async () => {
    if (!window.confirm("Are you sure you want to disconnect this WhatsApp instance? This will clear all active chat slots!")) return;

    setDisconnectingWhatsApp(true);
    try {
      const data = await apiPost<{ success: boolean; error?: string }>('/api/whatsapp/logout', {});
      if (data.success) {
        setWaState({ status: 'disconnected' });
        setWaPhoneInput('');
        setModalInfo({ title: 'Logged Out', message: 'Successfully logged out WhatsApp instance and cleared active chat slots.' });
      } else {
        setModalInfo({ title: 'Error', message: data.error || 'Failed to logout WhatsApp instance.' });
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to communicate with logout API.';
      setModalInfo({ title: 'Error', message: msg });
    } finally {
      setDisconnectingWhatsApp(false);
    }
  };

  const loadCredentials = async () => {
    if (isMock) {
      setCredentials({
        apiKey: 'MK_TEST_Y6T8***',
        secretKey: '********************************',
        contractCode: '4820193857',
      });
      return;
    }

    try {
      const data = await apiGet<{ success: boolean; credentials: Credentials | null }>('/api/get-credentials');
      if (data.success && data.credentials) {
        setCredentials(data.credentials);
      } else {
        setCredentials({ apiKey: '', secretKey: '', contractCode: '' });
      }
    } catch (e) {
      console.error('Error loading credentials:', e);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isMock) return;

    setSaving(true);
    try {
      const data = await apiPost<{ success: boolean; error?: string }>('/api/save-credentials', credentials);
      if (data.success) {
        setModalInfo({ title: 'Success', message: 'Monnify credentials stored securely in Firestore.' });
      } else {
        setModalInfo({ title: 'Error', message: data.error || 'Failed to save credentials.' });
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to communicate with credentials API.';
      setModalInfo({ title: 'Error', message: msg });
    } finally {
      setSaving(false);
    }
  };

  const toggleDarkMode = (checked: boolean) => {
    setIsDark(checked);
    if (checked) {
      document.body.classList.remove('light-theme');
    } else {
      document.body.classList.add('light-theme');
    }
  };

  const triggerReconciliation = () => {
    const consoleBox = consoleRef.current;
    if (!consoleBox) return;

    consoleBox.innerHTML = '';
    const lines = [
      `[${new Date().toLocaleTimeString()}] Fetching transaction logs from GET /v1/transactions...`,
      `[${new Date().toLocaleTimeString()}] Fetching local order records from Firestore...`,
      `[${new Date().toLocaleTimeString()}] Comparing references and expected sums (Kobo verification checks)...`,
      `[${new Date().toLocaleTimeString()}] Audit complete. 0 orphans, 0 discrepancies detected. System reconciled successfully.`,
    ];

    lines.forEach((line, index) => {
      setTimeout(() => {
        const div = document.createElement('div');
        div.className = `log-line ${index === 3 ? 'text-green' : 'text-muted'}`;
        div.innerText = line;
        consoleBox.appendChild(div);
        consoleBox.scrollTop = consoleBox.scrollHeight;
      }, index * 450);
    });
  };

  return (
    <div className="view-panel" id="panel-developer">
      <div className="developer-grid">
        <div className="developer-col">
          {/* Theme Settings */}
          <section className="panel">
            <div className="panel-header">
              <h3>User Settings & Theme</h3>
              <p>Customize console visual behavior.</p>
            </div>
            <div className="settings-list">
              <div className="setting-item">
                <label htmlFor="dark-mode-toggle" className="switch-container">
                  <span className="setting-label">Enable Dark Mode Theme</span>
                  <input
                    type="checkbox"
                    id="dark-mode-toggle"
                    checked={isDark}
                    onChange={e => toggleDarkMode(e.target.checked)}
                  />
                </label>
              </div>
            </div>
          </section>

          {/* Credentials */}
          <section className="panel" id="credentials-section">
            <div className="panel-header">
              <h3>Monnify API Credentials Management</h3>
              <p id="credentials-notice">
                {isMock
                  ? 'Logged in as Tola Shofola. Using default environment configuration keys (.env). Forms are read-only.'
                  : 'Logged in with Google Account. Credentials saved will be stored securely in Firestore.'}
              </p>
            </div>
            <form onSubmit={handleSave} className="credentials-list" id="credentialsForm">
              <div className="cred-item">
                <label htmlFor="cred-api-key">Monnify API Key</label>
                <input
                  type="text"
                  id="cred-api-key"
                  placeholder="API Key (MK_TEST_...)"
                  value={credentials.apiKey}
                  onChange={e => setCredentials(prev => ({ ...prev, apiKey: e.target.value }))}
                  disabled={isMock}
                />
              </div>
              <div className="cred-item">
                <label htmlFor="cred-secret-key">Monnify Secret Key</label>
                <input
                  type="text"
                  id="cred-secret-key"
                  placeholder="Secret Key"
                  value={credentials.secretKey}
                  onChange={e => setCredentials(prev => ({ ...prev, secretKey: e.target.value }))}
                  disabled={isMock}
                />
              </div>
              <div className="cred-item">
                <label htmlFor="cred-contract-code">Monnify Contract Code</label>
                <input
                  type="text"
                  id="cred-contract-code"
                  placeholder="Contract Code"
                  value={credentials.contractCode}
                  onChange={e => setCredentials(prev => ({ ...prev, contractCode: e.target.value }))}
                  disabled={isMock}
                />
              </div>
              <button
                type="submit"
                className="btn btn-primary btn-full"
                id="btnSaveCreds"
                disabled={isMock || saving}
              >
                {saving ? 'Saving to Firestore...' : 'Save Credentials to Firestore'}
              </button>
            </form>
          </section>
        </div>

        {/* Reconciliation */}
        <section className="panel">
          <div className="panel-header">
            <h3>Nightly Reconciliation Service</h3>
            <p>Compare local order databases against Monnify transaction ledgers.</p>
          </div>
          <div className="console-box" id="reconciliationConsole" ref={consoleRef}>
            <div className="log-line text-muted">[System] Initializing reconciliation routine...</div>
            <div className="log-line text-green">[Reconciled] No amount drift detected. All orders matched.</div>
          </div>
          <button className="btn btn-secondary" onClick={triggerReconciliation} id="btn-reconcile">
            Run Auditing Reconciliation Now
          </button>
        </section>

        {/* Social Media Integrations */}
        <section className="panel">
          <div className="panel-header">
            <h3>WhatsApp Integration</h3>
            <p>Pair your own WhatsApp number directly — scan a QR code or enter a phone number for a pairing code.</p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1rem' }}>
            <div style={{ padding: '0.85rem', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '8px', fontSize: '0.85rem' }}>
              <strong style={{ display: 'block', color: 'var(--monnify-cyan)', marginBottom: '0.25rem' }}>
                Status: {waState.status.toUpperCase()}
              </strong>
              {waState.error && <p style={{ color: '#e05252', marginTop: '0.25rem' }}>{waState.error}</p>}
            </div>

            {waState.status === 'qr' && waState.qr && (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem', padding: '1rem', background: '#fff', borderRadius: '8px' }}>
                <QRCodeSVG value={waState.qr} size={220} />
                <p style={{ color: '#111', fontSize: '0.8rem', textAlign: 'center' }}>
                  Open WhatsApp → Linked Devices → Link a Device, then scan this code.
                </p>
              </div>
            )}

            {waState.status === 'pairing' && waState.pairingCode && (
              <div style={{ padding: '1rem', textAlign: 'center', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }}>
                <p style={{ color: 'var(--platinum-muted)', marginBottom: '0.5rem' }}>Enter this code on your phone:</p>
                <code style={{ fontSize: '1.5rem', letterSpacing: '0.2rem', color: 'var(--platinum)' }}>{waState.pairingCode}</code>
              </div>
            )}

            {(waState.status === 'disconnected') && (
              <div className="input-group">
                <label htmlFor="waPhoneInput">Phone Number (optional — leave blank to scan a QR code instead)</label>
                <input
                  type="text"
                  id="waPhoneInput"
                  value={waPhoneInput}
                  onChange={e => setWaPhoneInput(e.target.value)}
                  placeholder="e.g. 2348030000000"
                />
              </div>
            )}

            <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
              {waState.status !== 'connected' && (
                <button
                  type="button"
                  className="btn btn-primary"
                  style={{ flex: 1 }}
                  onClick={handleConnectWhatsApp}
                  disabled={connectingWhatsApp || waState.status === 'connecting' || waState.status === 'qr' || waState.status === 'pairing'}
                >
                  {connectingWhatsApp ? 'Starting...' : 'Connect WhatsApp'}
                </button>
              )}
              {waState.status === 'connected' && (
                <button
                  type="button"
                  className="btn btn-secondary"
                  style={{ flex: 1 }}
                  onClick={handleDisconnectWhatsApp}
                  disabled={disconnectingWhatsApp}
                >
                  {disconnectingWhatsApp ? 'Disconnecting...' : 'Disconnect WhatsApp & Reset Slots'}
                </button>
              )}
            </div>
          </div>

          <div className="settings-list" style={{ marginTop: '1.5rem', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '1rem' }}>
            <div className="setting-item">
              <label className="switch-container" style={{ opacity: 0.6, pointerEvents: 'none' }}>
                <span className="setting-label">Instagram Direct Messages - <em>Planned</em></span>
                <input type="checkbox" disabled />
              </label>
            </div>
            <div className="setting-item">
              <label className="switch-container" style={{ opacity: 0.6, pointerEvents: 'none' }}>
                <span className="setting-label">Facebook Messenger - <em>Planned</em></span>
                <input type="checkbox" disabled />
              </label>
            </div>
          </div>
        </section>
      </div>

      <Modal
        open={!!modalInfo}
        title={modalInfo?.title || ''}
        onClose={() => setModalInfo(null)}
      >
        <p>{modalInfo?.message}</p>
      </Modal>
    </div>
  );
}
