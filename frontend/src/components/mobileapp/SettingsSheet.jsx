import { useState } from 'react';
import { FaTimes, FaKey, FaEye, FaEyeSlash, FaBell, FaMoon, FaSun, FaShieldAlt } from 'react-icons/fa';
import { toast } from 'react-toastify';
import { useAuth } from '../../context/AuthContext';
import api from '../../api/axios';
import { APP_VERSION } from '../../constants/branding';

export default function SettingsSheet({ onClose }) {
  const { user } = useAuth();
  const [section, setSection] = useState('main'); // 'main' | 'password'
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [pwForm, setPwForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });

  const handleChangePassword = async () => {
    if (!pwForm.currentPassword || !pwForm.newPassword || !pwForm.confirmPassword) {
      toast.error('Please fill all fields'); return;
    }
    if (pwForm.newPassword !== pwForm.confirmPassword) {
      toast.error('Passwords do not match'); return;
    }
    if (pwForm.newPassword.length < 6) {
      toast.error('Password must be at least 6 characters'); return;
    }
    setSaving(true);
    try {
      await api.put('/users/change-password', { currentPassword: pwForm.currentPassword, newPassword: pwForm.newPassword });
      toast.success('Password changed successfully!');
      setPwForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setSection('main');
    } catch (e) {
      toast.error(e.response?.data?.message || 'Failed to change password');
    } finally { setSaving(false); }
  };

  const inputStyle = {
    width: '100%', padding: '10px 12px', border: '1px solid #E5E7EB',
    borderRadius: '8px', fontSize: '14px', outline: 'none',
    boxSizing: 'border-box', fontFamily: 'inherit', background: '#fff',
  };

  const PasswordInput = ({ value, onChange, placeholder, show, onToggle }) => (
    <div style={{ position: 'relative' }}>
      <input type={show ? 'text' : 'password'} value={value} onChange={onChange} placeholder={placeholder} style={{ ...inputStyle, paddingRight: '40px' }} />
      <button onClick={onToggle} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#9CA3AF' }}>
        {show ? <FaEyeSlash size={14} /> : <FaEye size={14} />}
      </button>
    </div>
  );

  const settingRow = (icon, label, sublabel, onClick) => (
    <button onClick={onClick} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '14px', padding: '14px 20px', background: 'none', border: 'none', cursor: 'pointer', borderBottom: '1px solid #F3F4F6', textAlign: 'left' }}
      onMouseEnter={e => e.currentTarget.style.background = '#F9FAFB'}
      onMouseLeave={e => e.currentTarget.style.background = 'none'}>
      <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: '#F0FDF4', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        {icon}
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: '0.9rem', fontWeight: '600', color: '#111827' }}>{label}</div>
        {sublabel && <div style={{ fontSize: '0.75rem', color: '#9CA3AF', marginTop: '1px' }}>{sublabel}</div>}
      </div>
      <span style={{ color: '#D1D5DB', fontSize: '1rem' }}>›</span>
    </button>
  );

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 400, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }} onClick={onClose}>
      <div style={{ background: '#fff', borderRadius: '20px 20px 0 0', width: '100%', maxWidth: '480px', maxHeight: '85vh', overflowY: 'auto', paddingBottom: '24px' }} onClick={e => e.stopPropagation()}>

        {/* Handle bar */}
        <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 0 0' }}>
          <div style={{ width: '40px', height: '4px', borderRadius: '2px', background: '#E5E7EB' }} />
        </div>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 20px 16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {section !== 'main' && (
              <button onClick={() => setSection('main')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#10B981', fontSize: '1.2rem', padding: '0 4px 0 0' }}>‹</button>
            )}
            <h6 style={{ fontWeight: '700', color: '#111827', margin: 0, fontSize: '1rem' }}>
              {section === 'main' ? 'Settings' : 'Change Password'}
            </h6>
          </div>
          <button onClick={onClose} style={{ background: '#F3F4F6', border: 'none', borderRadius: '8px', padding: '7px 10px', cursor: 'pointer', color: '#6B7280' }}>
            <FaTimes size={14} />
          </button>
        </div>

        {section === 'main' && (
          <div>
            {/* Account section */}
            <div style={{ padding: '0 20px 8px' }}>
              <div style={{ fontSize: '0.72rem', fontWeight: '700', color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '4px' }}>Account</div>
            </div>
            {settingRow(<FaKey size={16} color="#10B981" />, 'Change Password', 'Update your account password', () => setSection('password'))}
            {settingRow(<FaShieldAlt size={16} color="#10B981" />, 'Security', 'Manage your account security', () => toast.info('Coming soon'))}

            {/* App section */}
            <div style={{ padding: '16px 20px 8px' }}>
              <div style={{ fontSize: '0.72rem', fontWeight: '700', color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '4px' }}>App</div>
            </div>
            {settingRow(<FaBell size={16} color="#10B981" />, 'Notifications', 'Manage notification preferences', () => toast.info('Coming soon'))}

            {/* App info */}
            <div style={{ padding: '20px 20px 0', textAlign: 'center' }}>
              <div style={{ fontSize: '0.75rem', color: '#9CA3AF' }}>WeAlll Office App</div>
              <div style={{ fontSize: '0.7rem', color: '#D1D5DB', marginTop: '2px' }}>v{APP_VERSION}</div>
            </div>
          </div>
        )}

        {section === 'password' && (
          <div style={{ padding: '0 20px' }}>
            <div style={{ marginBottom: '14px' }}>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '600', color: '#374151', marginBottom: '6px', textTransform: 'uppercase' }}>Current Password</label>
              <PasswordInput value={pwForm.currentPassword} onChange={e => setPwForm({ ...pwForm, currentPassword: e.target.value })} placeholder="Enter current password" show={showCurrent} onToggle={() => setShowCurrent(v => !v)} />
            </div>
            <div style={{ marginBottom: '14px' }}>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '600', color: '#374151', marginBottom: '6px', textTransform: 'uppercase' }}>New Password</label>
              <PasswordInput value={pwForm.newPassword} onChange={e => setPwForm({ ...pwForm, newPassword: e.target.value })} placeholder="Enter new password (min 6 chars)" show={showNew} onToggle={() => setShowNew(v => !v)} />
            </div>
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '600', color: '#374151', marginBottom: '6px', textTransform: 'uppercase' }}>Confirm New Password</label>
              <PasswordInput value={pwForm.confirmPassword} onChange={e => setPwForm({ ...pwForm, confirmPassword: e.target.value })} placeholder="Confirm new password" show={showConfirm} onToggle={() => setShowConfirm(v => !v)} />
            </div>
            {pwForm.newPassword && pwForm.confirmPassword && pwForm.newPassword !== pwForm.confirmPassword && (
              <div style={{ padding: '10px 12px', background: '#FEE2E2', borderRadius: '8px', marginBottom: '14px', fontSize: '0.82rem', color: '#991B1B' }}>
                Passwords do not match
              </div>
            )}
            <button onClick={handleChangePassword} disabled={saving} style={{ width: '100%', padding: '13px', borderRadius: '10px', border: 'none', background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)', color: '#fff', fontWeight: '700', cursor: 'pointer', opacity: saving ? 0.7 : 1, fontSize: '0.95rem' }}>
              {saving ? 'Changing...' : 'Change Password'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
