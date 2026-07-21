import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { apiGet } from '../lib/api';
import { useAuth } from '../context/AuthContext';

interface Integration {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  color: string;
}

const platforms: Integration[] = [
  {
    id: 'whatsapp',
    name: 'WhatsApp',
    description: 'Receive order notifications and send payment links via WhatsApp.',
    color: '#25D366',
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor">
        <path d="M12.032 21.965c-1.917 0-3.78-.496-5.382-1.395l-4.65 1.53 1.58-4.513A9.857 9.857 0 0 1 2.168 12c0-5.45 4.453-9.897 9.928-9.898 2.65 0 5.143 1.033 7.02 2.91a9.913 9.913 0 0 1 2.91 7.02c0 5.45-4.453 9.897-9.928 9.897h-.066Zm0-18.343c-4.596 0-8.378 3.736-8.422 8.332 0 1.83.598 3.612 1.71 5.05l-1.09 3.118 3.226-1.064a8.3 8.3 0 0 0 4.577 1.39c4.596 0 8.378-3.736 8.422-8.332 0-2.24-.872-4.345-2.456-5.93a8.378 8.378 0 0 0-5.967-2.464Zm4.85 11.193c.285.14.482.23.546.358.074.15.074.795-.16 1.558-.234.763-1.372 1.467-1.89 1.527-.488.057-.545.083-1.476-.318-2.006-.834-3.357-2.828-3.457-2.957-.1-.13-.823-1.095-.823-2.088 0-.993.52-1.48.71-1.683.19-.202.414-.253.552-.253.138 0 .276.002.397.028.128.025.3-.05.47.377.17.428.577 1.48.627 1.587.05.108.084.234.017.378-.066.145-.1.234-.2.36-.1.129-.188.222-.301.354-.134.144-.27.293-.118.563.154.27.688 1.135 1.476 1.838 1.014.905 1.87 1.185 2.135 1.322.266.137.423.114.578-.078.155-.192.66-.77.84-1.035.18-.265.36-.221.585-.132.224.088 1.423.702 1.667.83.244.128.406.19.468.296.062.108.038.589-.185 1.159-.224.57-1.432 1.162-1.432 1.162Z"/>
      </svg>
    ),
  },
  {
    id: 'instagram',
    name: 'Instagram',
    description: 'Tag products in posts and stories, auto-generate checkout links from comments.',
    color: '#E4405F',
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z"/>
      </svg>
    ),
  },
  {
    id: 'facebook',
    name: 'Facebook Messenger',
    description: 'Automate order confirmations and customer support through Messenger bot.',
    color: '#1877F2',
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2C6.477 2 2 6.477 2 12c0 2.991 1.308 5.682 3.387 7.5l-.63 2.25 2.475-1.238A9.82 9.82 0 0 0 12 22c5.523 0 10-4.477 10-10S17.523 2 12 2zm4.5 13.5l-2.25-1.125L12 15.75l-2.25-1.125L7.5 15.75l2.25-4.5 3.75 1.125 3-1.125-2.25 4.5z"/>
      </svg>
    ),
  },
  {
    id: 'telegram',
    name: 'Telegram',
    description: 'Send real-time payment receipts and inventory alerts via Telegram bot.',
    color: '#26A5E4',
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor">
        <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
      </svg>
    ),
  },
  {
    id: 'twitter',
    name: 'X / Twitter',
    description: 'Auto-tweet order confirmations and engage customers via DM notifications.',
    color: '#1DA1F2',
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor">
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
      </svg>
    ),
  },
];

type WhatsAppStatus = 'disconnected' | 'connected';

export default function IntegrationsPage() {
  const { user } = useAuth();
  const [whatsappStatus, setWhatsappStatus] = useState<WhatsAppStatus>('disconnected');
  const [showWhatsAppModal, setShowWhatsAppModal] = useState(false);

  useEffect(() => {
    if (!user) return;
    
    // Check if the merchant's WhatsApp session is paired on load
    const checkStatus = async () => {
      try {
        const data = await apiGet<{ success: boolean; status?: string }>('/api/whatsapp/status');
        setWhatsappStatus(data.success && data.status === 'connected' ? 'connected' : 'disconnected');
      } catch {
        setWhatsappStatus('disconnected');
      }
    };
    checkStatus();
  }, [user]);

  return (
    <div className="view-panel" id="panel-integrations">
      <div className="panel">
        <div className="panel-header">
          <h3>Social Media Integrations</h3>
          <p>Connect your social channels to automate orders, payments, and customer engagement.</p>
        </div>

        <div className="integrations-grid">
          {platforms.map(platform => {
            const isWA = platform.id === 'whatsapp';
            const waConnected = isWA && whatsappStatus === 'connected';

            return (
              <div
                key={platform.id}
                className={`integration-card${waConnected ? ' connected' : ''}`}
              >
                <div className="integration-icon" style={{ color: platform.color }}>
                  {platform.icon}
                </div>
                <div className="integration-info">
                  <div className="integration-header">
                    <h4>{platform.name}</h4>
                    {isWA ? (
                      <button
                        className={waConnected ? "btn-disconnect-sm" : "btn-connect-sm"}
                        onClick={() => setShowWhatsAppModal(true)}
                      >
                        {waConnected ? 'Manage' : 'Configure'}
                      </button>
                    ) : (
                      <span className="coming-soon-badge">Coming Soon</span>
                    )}
                  </div>
                  <p className="integration-desc">{platform.description}</p>
                  <span className={`integration-badge${waConnected ? ' connected' : ''}`}>
                    {waConnected ? 'Connected' : 'Disconnected'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {showWhatsAppModal && (
        <div className="modal-overlay" onClick={() => setShowWhatsAppModal(false)}>
          <div className="modal-content wa-modal" style={{ maxWidth: '450px' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h4>WhatsApp Integration</h4>
              <p>Configure WhatsApp connectivity</p>
            </div>
            <div style={{ padding: '1rem 0', textAlign: 'center' }}>
              <p style={{ marginBottom: '1.5rem', color: 'var(--platinum)' }}>
                {whatsappStatus === 'connected'
                  ? 'Your WhatsApp session is paired and active. You can manage or disconnect it from the Developer & API settings.'
                  : 'To link your WhatsApp account, scan a QR code or request a pairing code from the Developer Settings.'}
              </p>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <Link 
                  to="/developer" 
                  className="btn btn-primary"
                  onClick={() => setShowWhatsAppModal(false)}
                >
                  Go to Developer & API Settings
                </Link>
                <button className="btn btn-secondary" onClick={() => setShowWhatsAppModal(false)}>
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
