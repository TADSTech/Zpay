import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const primaryNav = [
  {
    to: '/dashboard',
    label: 'Dashboard',
    title: 'Merchant Dashboard',
    icon: (
      <svg className="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
        <rect x="3" y="3" width="7" height="9" rx="1" />
        <rect x="14" y="3" width="7" height="5" rx="1" />
        <rect x="14" y="12" width="7" height="9" rx="1" />
        <rect x="3" y="16" width="7" height="5" rx="1" />
      </svg>
    ),
  },
  {
    to: '/simulator',
    label: 'Chat Simulator',
    title: 'Conversational Checkout Sandbox',
    icon: (
      <svg className="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
      </svg>
    ),
  },
];

const secondaryNav = [
  {
    to: '/products',
    label: 'Products',
    title: 'Product Catalog',
    icon: (
      <svg className="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
        <path d="M20 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 2 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 20 16z" />
        <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
        <line x1="12" y1="22.08" x2="12" y2="12" />
      </svg>
    ),
  },
  {
    to: '/integrations',
    label: 'Integrations',
    title: 'Social Media Integrations',
    icon: (
      <svg className="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
        <circle cx="18" cy="5" r="3" />
        <circle cx="6" cy="12" r="3" />
        <circle cx="18" cy="19" r="3" />
        <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
        <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
      </svg>
    ),
  },
  {
    to: '/developer',
    label: 'Developer',
    title: 'Developer Operations & Logs',
    icon: (
      <svg className="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
        <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
        <line x1="8" y1="21" x2="16" y2="21" />
        <line x1="12" y1="17" x2="12" y2="21" />
      </svg>
    ),
  },
  {
    to: '/profile',
    label: 'Profile',
    title: 'Profile Settings',
    icon: (
      <svg className="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
        <circle cx="12" cy="8" r="4" />
        <path d="M20 21a8 8 0 1 0-16 0" />
      </svg>
    ),
  },
];

export default function Layout() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const allItems = [...primaryNav, ...secondaryNav];
  const currentNav = allItems.find(n => location.pathname.startsWith(n.to));
  const pageTitle = currentNav?.title || 'ZPay Console';

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  return (
    <div className="app-container">
      <aside className="sidebar">
        <div className="sidebar-top">
          <div className="brand" onClick={() => navigate('/')}>
            <span className="brand-mark">Z</span>
            <h1>ZPay</h1>
          </div>

          <div className="nav-section">
            <span className="nav-heading">Main</span>
            <nav className="nav-links">
              {primaryNav.map(item => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) => `nav-btn${isActive ? ' active' : ''}`}
                  id={`nav-${item.to.replace('/', '')}`}
                >
                  {item.icon}
                  {item.label}
                </NavLink>
              ))}
            </nav>
          </div>

          <div className="nav-section">
            <span className="nav-heading">Management</span>
            <nav className="nav-links">
              {secondaryNav.map(item => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) => `nav-btn${isActive ? ' active' : ''}`}
                  id={`nav-${item.to.replace('/', '')}`}
                >
                  {item.icon}
                  {item.label}
                </NavLink>
              ))}
            </nav>
          </div>
        </div>

        <div className="sidebar-bottom">
          <div className="merchant-profile">
            {user?.photoURL ? (
              <img className="avatar-img" src={user.photoURL} alt="Avatar" />
            ) : (
              <div className="avatar">{user?.initial || 'U'}</div>
            )}
            <div className="merchant-info">
              <h3>{user?.displayName || 'Guest'}</h3>
              <p>{user?.email || ''}</p>
            </div>
          </div>
          <button className="nav-btn logout-btn" onClick={handleLogout} id="nav-logout">
            <svg className="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
            Sign Out
          </button>
        </div>
      </aside>

      <main className="main-content">
        <header className="top-bar">
          <div className="top-bar-left">
            <h2>{pageTitle}</h2>
          </div>
          <div className="top-bar-right">
            <div className="status-indicator">
              <span className="pulse-dot" />
            </div>
          </div>
        </header>
        <Outlet />
      </main>
    </div>
  );
}
