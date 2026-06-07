import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../api';

function Navbar({ currentTheme, onToggleTheme }) {
  const { user, token, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const notifRef = useRef(null);

  const handleLogout = () => { logout(); navigate('/login'); };
  const isActive = (path) => location.pathname === path;

  const fetchNotifications = async () => {
    if (!token) return;
    try {
      const res = await api.getNotifications(token);
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.notifications || []);
        setUnreadCount(data.unread_count || 0);
      }
    } catch {}
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, [token]);

  useEffect(() => {
    const handler = (e) => { if (notifRef.current && !notifRef.current.contains(e.target)) setNotifOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleOpenNotif = async () => {
    setNotifOpen(!notifOpen);
    if (!notifOpen && unreadCount > 0) {
      await api.markNotificationsRead(token);
      setUnreadCount(0);
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    }
  };

  const handleClearNotif = async () => {
    await api.clearNotifications(token);
    setNotifications([]);
    setUnreadCount(0);
    setNotifOpen(false);
  };

  const notifIcon = (type) => {
    const icons = { borrow: '📖', return: '↩️', overdue: '⚠️', available: '✅', fine: '💸', system: '🔔' };
    return icons[type] || '🔔';
  };

  const timeAgo = (dateStr) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  };

  return (
    <nav className="navbar">
      <Link to="/" className="navbar-brand">
        <span className="brand-icon">📚</span>
        <span className="brand-text">LibraryMS</span>
      </Link>

      <div className="navbar-theme-control" style={{ marginLeft: token ? '0' : 'auto', marginRight: token ? '0' : '0' }}>
        <button onClick={onToggleTheme} className="btn-theme-toggle"
          title={currentTheme === 'light' ? 'Switch to Dark Mode' : 'Switch to Light Mode'}>
          {currentTheme === 'light' ? '🌙' : '☀️'}
        </button>
      </div>

      {token && (
        <>
          <div className={`navbar-links ${menuOpen ? 'open' : ''}`}>
            <Link to="/" className={`nav-link ${isActive('/') ? 'active' : ''}`} onClick={() => setMenuOpen(false)}>Dashboard</Link>
            <Link to="/books" className={`nav-link ${isActive('/books') ? 'active' : ''}`} onClick={() => setMenuOpen(false)}>All Books</Link>
            <Link to="/my-books" className={`nav-link ${isActive('/my-books') ? 'active' : ''}`} onClick={() => setMenuOpen(false)}>My Borrowed</Link>
            <Link to="/add-book" className={`nav-link btn-add ${isActive('/add-book') ? 'active' : ''}`} onClick={() => setMenuOpen(false)}>+ Add Book</Link>
          </div>

          <div className="navbar-right">
            {/* Notification Bell */}
            <div className="notif-wrapper" ref={notifRef}>
              <button className="notif-bell" onClick={handleOpenNotif}>
                🔔
                {unreadCount > 0 && <span className="notif-badge">{unreadCount > 9 ? '9+' : unreadCount}</span>}
              </button>
              {notifOpen && (
                <div className="notif-dropdown">
                  <div className="notif-header">
                    <span>Notifications</span>
                    {notifications.length > 0 && (
                      <button className="notif-clear-btn" onClick={handleClearNotif}>Clear all</button>
                    )}
                  </div>
                  <div className="notif-list">
                    {notifications.length === 0 ? (
                      <div className="notif-empty">No notifications yet</div>
                    ) : notifications.map(n => (
                      <div key={n.id} className={`notif-item ${!n.is_read ? 'unread' : ''}`}>
                        <span className="notif-type-icon">{notifIcon(n.type)}</span>
                        <div className="notif-body">
                          <strong>{n.title}</strong>
                          <p>{n.message}</p>
                          <span className="notif-time">{timeAgo(n.created_at)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="navbar-user">
              <Link to="/profile" className="user-avatar-link">
                <span className="user-avatar-placeholder">{user?.username?.[0]?.toUpperCase()}</span>
              </Link>
              <span className="user-greeting">Hi, <strong>{user?.username}</strong></span>
              <button className="btn-logout" onClick={handleLogout}>Logout</button>
            </div>
          </div>

          <button className="hamburger" onClick={() => setMenuOpen(!menuOpen)}>
            <span></span><span></span><span></span>
          </button>
        </>
      )}
    </nav>
  );
}

export default Navbar;
