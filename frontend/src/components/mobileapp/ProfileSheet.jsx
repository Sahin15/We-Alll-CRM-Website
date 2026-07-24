import { useState } from 'react';
import { FaEnvelope, FaPhone, FaBriefcase, FaBuilding, FaIdCard, FaCamera, FaTimes, FaEdit, FaSave } from 'react-icons/fa';
import { toast } from 'react-toastify';
import { useAuth } from '../../context/AuthContext';
import { resolveProfilePictureUrl } from '../../utils/profilePictureUrl';
import api from '../../api/axios';
import MobileFilePicker from './MobileFilePicker';

export default function ProfileSheet({ onClose }) {
  const { user, refreshUser } = useAuth();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [showPhotoPicker, setShowPhotoPicker] = useState(false);
  const [form, setForm] = useState({
    name: user?.name || '',
    phone: user?.phone || '',
    personalEmail: user?.personalEmail || '',
  });

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.put('/users/profile', form);
      toast.success('Profile updated!');
      if (refreshUser) await refreshUser();
      setEditing(false);
    } catch (e) {
      toast.error(e.response?.data?.message || 'Failed to update profile');
    } finally { setSaving(false); }
  };

  const handlePhotoSelect = async (file) => {
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      toast.error('Please upload a JPG, PNG, or WebP image');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error('Image must be less than 10MB');
      return;
    }

    setUploadingPhoto(true);
    try {
      const formData = new FormData();
      formData.append('image', file);
      await api.post('/upload/profile-picture', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      toast.success('Profile photo updated!');
      setShowPhotoPicker(false);
      if (refreshUser) await refreshUser();
    } catch (e) {
      toast.error(e.response?.data?.message || 'Failed to upload profile photo');
    } finally {
      setUploadingPhoto(false);
    }
  };

  const inputStyle = {
    width: '100%', padding: '10px 12px', border: '1px solid #E5E7EB',
    borderRadius: '8px', fontSize: '14px', outline: 'none',
    boxSizing: 'border-box', fontFamily: 'inherit', background: '#fff',
  };

  const infoRow = (icon, label, value) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 0', borderBottom: '1px solid #F3F4F6' }}>
      <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: '#F0FDF4', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        {icon}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: '0.72rem', color: '#9CA3AF', fontWeight: '500', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</div>
        <div style={{ fontSize: '0.9rem', color: '#111827', fontWeight: '500', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{value || '—'}</div>
      </div>
    </div>
  );

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 400, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }} onClick={onClose}>
      <div style={{ background: '#fff', borderRadius: '20px 20px 0 0', width: '100%', maxWidth: '480px', maxHeight: '90vh', overflowY: 'auto', paddingBottom: '24px' }} onClick={e => e.stopPropagation()}>

        {/* Handle bar */}
        <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 0 0' }}>
          <div style={{ width: '40px', height: '4px', borderRadius: '2px', background: '#E5E7EB' }} />
        </div>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 20px 0' }}>
          <h6 style={{ fontWeight: '700', color: '#111827', margin: 0, fontSize: '1rem' }}>My Profile</h6>
          <div style={{ display: 'flex', gap: '8px' }}>
            {!editing ? (
              <button onClick={() => setEditing(true)} style={{ background: '#F0FDF4', border: 'none', borderRadius: '8px', padding: '7px 12px', cursor: 'pointer', color: '#10B981', fontWeight: '600', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '5px' }}>
                <FaEdit size={12} /> Edit
              </button>
            ) : (
              <button onClick={handleSave} disabled={saving} style={{ background: '#10B981', border: 'none', borderRadius: '8px', padding: '7px 12px', cursor: 'pointer', color: '#fff', fontWeight: '600', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '5px', opacity: saving ? 0.7 : 1 }}>
                <FaSave size={12} /> {saving ? 'Saving...' : 'Save'}
              </button>
            )}
            <button onClick={onClose} style={{ background: '#F3F4F6', border: 'none', borderRadius: '8px', padding: '7px 10px', cursor: 'pointer', color: '#6B7280' }}>
              <FaTimes size={14} />
            </button>
          </div>
        </div>

        {/* Avatar section */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '20px 20px 16px' }}>
          <div style={{ position: 'relative', marginBottom: '12px' }}>
            {user?.profilePicture ? (
              <img loading="lazy" src={resolveProfilePictureUrl(user.profilePicture)} alt={user.name} style={{ width: '80px', height: '80px', borderRadius: '50%', objectFit: 'cover', border: '3px solid #10B981' }} />
            ) : (
              <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '800', fontSize: '1.8rem', color: '#fff', border: '3px solid #10B981' }}>
                {user?.name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
              </div>
            )}
            <button
              type="button"
              onClick={() => setShowPhotoPicker(v => !v)}
              disabled={uploadingPhoto}
              aria-label="Change profile photo"
              style={{
                position: 'absolute', right: '-4px', bottom: '-4px',
                width: '32px', height: '32px', borderRadius: '50%',
                border: '2px solid #fff', background: '#10B981', color: '#fff',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: uploadingPhoto ? 'not-allowed' : 'pointer',
                boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                opacity: uploadingPhoto ? 0.7 : 1,
              }}
            >
              <FaCamera size={14} />
            </button>
          </div>
          {showPhotoPicker && (
            <div style={{ width: '100%', marginBottom: '12px' }}>
              <MobileFilePicker
                photoOnly
                label={uploadingPhoto ? 'Uploading photo...' : 'Take photo or choose from gallery'}
                hint="JPG, PNG, or WebP · max 10MB"
                disabled={uploadingPhoto}
                onFileSelect={handlePhotoSelect}
              />
            </div>
          )}
          <div style={{ fontWeight: '700', fontSize: '1.1rem', color: '#111827' }}>{user?.name}</div>
          <div style={{ fontSize: '0.8rem', color: '#6B7280', textTransform: 'capitalize', marginTop: '2px' }}>{user?.role} {user?.department?.name ? `· ${user.department.name}` : ''}</div>
          {user?.employeeId && <div style={{ fontSize: '0.75rem', color: '#9CA3AF', marginTop: '2px' }}>ID: {user.employeeId}</div>}
        </div>

        {/* Info / Edit section */}
        <div style={{ padding: '0 20px' }}>
          {editing ? (
            <div>
              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '600', color: '#374151', marginBottom: '4px', textTransform: 'uppercase' }}>Full Name</label>
                <input type="text" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} style={inputStyle} />
              </div>
              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '600', color: '#374151', marginBottom: '4px', textTransform: 'uppercase' }}>Phone Number</label>
                <input type="tel" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} placeholder="+91 9876543210" style={inputStyle} />
              </div>
              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '600', color: '#374151', marginBottom: '4px', textTransform: 'uppercase' }}>Personal Email</label>
                <input type="email" value={form.personalEmail} onChange={e => setForm({ ...form, personalEmail: e.target.value })} placeholder="personal@email.com" style={inputStyle} />
              </div>
              <div style={{ padding: '10px 12px', background: '#F9FAFB', borderRadius: '8px', marginBottom: '8px' }}>
                <div style={{ fontSize: '0.75rem', color: '#9CA3AF' }}>Work email cannot be changed</div>
                <div style={{ fontSize: '0.85rem', color: '#374151', fontWeight: '500' }}>{user?.email}</div>
              </div>
              <button onClick={() => { setEditing(false); setForm({ name: user?.name || '', phone: user?.phone || '', personalEmail: user?.personalEmail || '' }); }} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #E5E7EB', background: '#fff', color: '#6B7280', fontWeight: '600', cursor: 'pointer', marginTop: '4px' }}>
                Cancel
              </button>
            </div>
          ) : (
            <div>
              {infoRow(<FaEnvelope size={15} color="#10B981" />, 'Work Email', user?.email)}
              {infoRow(<FaPhone size={15} color="#10B981" />, 'Phone', user?.phone)}
              {infoRow(<FaEnvelope size={15} color="#6B7280" />, 'Personal Email', user?.personalEmail)}
              {infoRow(<FaBriefcase size={15} color="#10B981" />, 'Designation', user?.designation)}
              {infoRow(<FaBuilding size={15} color="#10B981" />, 'Department', user?.department?.name)}
              {infoRow(<FaIdCard size={15} color="#10B981" />, 'Employee ID', user?.employeeId)}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

