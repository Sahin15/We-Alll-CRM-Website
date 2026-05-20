import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaUser, FaSignOutAlt, FaCog, FaBell } from 'react-icons/fa';
import { useAuth } from '../../context/AuthContext';
import { resolveProfilePictureUrl } from '../../utils/profilePictureUrl';
import { useNotifications } from '../../context/NotificationContext';
import ProfileSheet from './ProfileSheet';
import SettingsSheet from './SettingsSheet';
import NotificationSheet from './NotificationSheet';

export default function MobileAppHeader() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [showDropdown, setShowDropdown] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const { unreadCount } = useNotifications();
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <>
      <div style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100 }}>
        <div style={{
          height: '56px',
          background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 16px',
        }}>
          {/* Left: Logo + name */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <img loading="lazy" src="/Wealll_mini.png" alt="WeAlll" style={{ width: '32px', height: '32px', objectFit: 'contain' }} />
            <span style={{ color: '#fff', fontWeight: '700', fontSize: '1.1rem' }}>WeAlll Office</span>
          </div>

          {/* Right: Bell + Avatar + name */}
          {user && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {/* Notification Bell */}
              <button onClick={() => setShowNotifications(true)} style={{ background: 'none', border: 'none', cursor: 'pointer', position: 'relative', padding: '6px' }}>
                <FaBell size={20} color="#fff" />
                {unreadCount > 0 && (
                  <span style={{ position: 'absolute', top: '2px', right: '2px', background: '#EF4444', color: '#fff', borderRadius: '999px', fontSize: '9px', fontWeight: '700', minWidth: '16px', height: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 3px' }}>
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                )}
              </button>

              {/* User dropdown */}
              <div ref={dropdownRef} style={{ position: 'relative' }}>
              <button onClick={() => setShowDropdown(v => !v)} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', padding: '4px' }}>
                {user.profilePicture ? (
                  <img loading="lazy" src={resolveProfilePictureUrl(user.profilePicture)} alt={user.name} style={{ width: '34px', height: '34px', borderRadius: '50%', objectFit: 'cover', border: '2px solid rgba(255,255,255,0.6)' }} />
                ) : (
                  <div style={{ width: '34px', height: '34px', borderRadius: '50%', background: 'rgba(255,255,255,0.25)', border: '2px solid rgba(255,255,255,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '700', fontSize: '0.85rem', color: '#fff' }}>
                    {user.name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || 'U'}
                  </div>
                )}
                <div style={{ textAlign: 'right' }}>
                  <div style={{ color: '#fff', fontSize: '0.8rem', fontWeight: '600', lineHeight: 1.2 }}>{user.name?.split(' ')[0]}</div>
                  <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.65rem', textTransform: 'capitalize' }}>{user.role}</div>
                </div>
              </button>

              {/* Dropdown */}
              {showDropdown && (
                <div style={{ position: 'absolute', top: '44px', right: 0, background: '#fff', borderRadius: '12px', boxShadow: '0 8px 30px rgba(0,0,0,0.15)', minWidth: '190px', overflow: 'hidden', zIndex: 200, border: '1px solid rgba(0,0,0,0.06)' }}>
                  {/* User info */}
                  <div style={{ padding: '12px 16px', borderBottom: '1px solid #F3F4F6', background: '#F9FAFB' }}>
                    <div style={{ fontWeight: '700', fontSize: '0.85rem', color: '#111827' }}>{user.name}</div>
                    <div style={{ fontSize: '0.72rem', color: '#6B7280', textTransform: 'capitalize' }}>{user.role}</div>
                  </div>

                  {/* My Profile */}
                  <button onClick={() => { setShowDropdown(false); setShowProfile(true); }} style={{ width: '100%', padding: '12px 16px', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.85rem', color: '#374151', fontWeight: '500', textAlign: 'left', borderBottom: '1px solid #F3F4F6' }}
                    onMouseEnter={e => e.currentTarget.style.background = '#F9FAFB'}
                    onMouseLeave={e => e.currentTarget.style.background = 'none'}>
                    <FaUser size={14} color="#10B981" /> My Profile
                  </button>

                  {/* Settings */}
                  <button onClick={() => { setShowDropdown(false); setShowSettings(true); }} style={{ width: '100%', padding: '12px 16px', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.85rem', color: '#374151', fontWeight: '500', textAlign: 'left', borderBottom: '1px solid #F3F4F6' }}
                    onMouseEnter={e => e.currentTarget.style.background = '#F9FAFB'}
                    onMouseLeave={e => e.currentTarget.style.background = 'none'}>
                    <FaCog size={14} color="#6B7280" /> Settings
                  </button>

                  {/* Logout */}
                  <button onClick={() => { setShowDropdown(false); setShowLogoutConfirm(true); }} style={{ width: '100%', padding: '12px 16px', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.85rem', color: '#EF4444', fontWeight: '600', textAlign: 'left' }}
                    onMouseEnter={e => e.currentTarget.style.background = '#FEF2F2'}
                    onMouseLeave={e => e.currentTarget.style.background = 'none'}>
                    <FaSignOutAlt size={14} color="#EF4444" /> Logout
                  </button>
                </div>
              )}
            </div>
            </div>
          )}
        </div>
      </div>

      {/* Profile Sheet */}
      {showProfile && <ProfileSheet onClose={() => setShowProfile(false)} />}

      {/* Settings Sheet */}
      {showSettings && <SettingsSheet onClose={() => setShowSettings(false)} />}

      {/* Notifications Sheet */}
      {showNotifications && <NotificationSheet onClose={() => setShowNotifications(false)} />}

      {/* Logout Confirmation */}
      {showLogoutConfirm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 400, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }} onClick={() => setShowLogoutConfirm(false)}>
          <div style={{ background: '#fff', borderRadius: '16px', padding: '24px', width: '100%', maxWidth: '320px', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }} onClick={e => e.stopPropagation()}>
            <div style={{ textAlign: 'center', marginBottom: '20px' }}>
              <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: '#FEE2E2', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
                <FaSignOutAlt size={22} color="#EF4444" />
              </div>
              <h6 style={{ fontWeight: '700', color: '#111827', marginBottom: '6px' }}>Logout</h6>
              <p style={{ fontSize: '0.85rem', color: '#6B7280', margin: 0 }}>Are you sure you want to logout from WeAlll Office?</p>
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={() => setShowLogoutConfirm(false)} style={{ flex: 1, padding: '12px', borderRadius: '10px', border: '1px solid #E5E7EB', background: '#fff', color: '#374151', fontWeight: '600', cursor: 'pointer' }}>Cancel</button>
              <button onClick={handleLogout} style={{ flex: 1, padding: '12px', borderRadius: '10px', border: 'none', background: '#EF4444', color: '#fff', fontWeight: '700', cursor: 'pointer' }}>Logout</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

