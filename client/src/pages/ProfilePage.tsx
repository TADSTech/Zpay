import { useState } from 'react';
import { useAuth } from '../context/AuthContext';

export default function ProfilePage() {
  const { user } = useAuth();
  const [displayName, setDisplayName] = useState(user?.displayName || '');
  const [phone, setPhone] = useState('+234 800 000 0000');
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [smsAlerts, setSmsAlerts] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  return (
    <div className="view-panel" id="panel-profile">
      <div className="panel">
        <div className="panel-header">
          <h3>Profile Settings</h3>
          <p>Manage your merchant account details and preferences.</p>
        </div>

        <form className="profile-form" onSubmit={handleSave}>
          <div className="profile-avatar-section">
            <div className="profile-avatar-large">
              {user?.photoURL ? (
                <img src={user.photoURL} alt="Avatar" />
              ) : (
                <span>{user?.initial || 'U'}</span>
              )}
            </div>
            <div>
              <h4>{user?.displayName || 'Merchant'}</h4>
              <p className="text-muted">{user?.email || ''}</p>
            </div>
          </div>

          <div className="profile-fields">
            <div className="cred-item">
              <label>Display Name</label>
              <input
                type="text"
                value={displayName}
                onChange={e => setDisplayName(e.target.value)}
              />
            </div>

            <div className="cred-item">
              <label>Email Address</label>
              <input type="text" value={user?.email || ''} disabled />
            </div>

            <div className="cred-item">
              <label>Phone Number</label>
              <input
                type="text"
                value={phone}
                onChange={e => setPhone(e.target.value)}
              />
            </div>
          </div>

          <div className="panel-header" style={{ marginTop: '0.5rem' }}>
            <h3>Notifications</h3>
            <p>Choose which alerts you receive.</p>
          </div>

          <div className="settings-list">
            <div className="setting-item">
              <div className="switch-container" onClick={() => setEmailNotifications(v => !v)}>
                <span className="setting-label">Email Notifications</span>
                <div className={`toggle-switch${emailNotifications ? ' active' : ''}`}>
                  <div className="toggle-knob" />
                </div>
              </div>
            </div>
            <div className="setting-item">
              <div className="switch-container" onClick={() => setSmsAlerts(v => !v)}>
                <span className="setting-label">SMS Payment Alerts</span>
                <div className={`toggle-switch${smsAlerts ? ' active' : ''}`}>
                  <div className="toggle-knob" />
                </div>
              </div>
            </div>
          </div>

          <div className="profile-actions">
            <button type="submit" className="btn btn-primary">
              {saved ? 'Saved ✓' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
