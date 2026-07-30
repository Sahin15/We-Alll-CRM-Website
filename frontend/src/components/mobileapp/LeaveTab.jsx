import { useState, useEffect, useCallback, useRef } from 'react';
import { FaUmbrellaBeach, FaPlus, FaTimes, FaUpload, FaFileAlt, FaChevronDown } from 'react-icons/fa';
import { toast } from 'react-toastify';
import { leaveApi } from '../../api/leaveApi';
import { useAuth } from '../../context/AuthContext';
import { getAllowedLeaveTypes, isFullTimeEmployee } from '../../utils/leaveEligibility';
import { getLeaveRequestDays } from '../../utils/leaveDays';

const ALL_LEAVE_TYPES = [
  { value: 'medical', label: 'Medical Leave' },
  { value: 'casual', label: 'Casual Leave' },
  { value: 'half_day', label: 'Half Day Leave' },
  { value: 'unpaid', label: 'Unpaid Leave' },
];

function LeaveTypeSelect({ value, onChange, leaveTypes }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const selected = leaveTypes.find(t => t.value === value);

  useEffect(() => {
    const handleClick = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  return (
    <div ref={ref} style={{ position: 'relative', width: '100%' }}>
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        style={{
          width: '100%', padding: '10px 12px', border: '1px solid #E5E7EB',
          borderRadius: '8px', fontSize: '14px', background: '#fff',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          cursor: 'pointer', textAlign: 'left', boxSizing: 'border-box',
        }}
      >
        <span>{selected?.label}</span>
        <FaChevronDown size={12} color="#9CA3AF" style={{ transform: open ? 'rotate(180deg)' : 'none', transition: '0.2s' }} />
      </button>
      {open && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, right: 0,
          background: '#fff', border: '1px solid #E5E7EB', borderRadius: '8px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.12)', zIndex: 50,
          marginTop: '4px', overflow: 'hidden',
        }}>
          {leaveTypes.map(t => (
            <button
              key={t.value}
              type="button"
              onClick={() => { onChange(t.value); setOpen(false); }}
              style={{
                width: '100%', padding: '11px 14px', background: t.value === value ? '#F0FDF4' : '#fff',
                border: 'none', borderBottom: '1px solid #F3F4F6', cursor: 'pointer',
                textAlign: 'left', fontSize: '14px', color: t.value === value ? '#10B981' : '#374151',
                fontWeight: t.value === value ? '600' : '400',
              }}
            >
              {t.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

const STATUS_COLORS = {
  pending:  { bg: '#FEF3C7', color: '#92400E' },
  approved: { bg: '#D1FAE5', color: '#065F46' },
  rejected: { bg: '#FEE2E2', color: '#991B1B' },
  cancelled:{ bg: '#F3F4F6', color: '#6B7280' },
};

const inputStyle = {
  width: '100%', padding: '10px 12px', border: '1px solid #E5E7EB',
  borderRadius: '8px', fontSize: '14px', outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit',
};

function fmt(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

export default function LeaveTab() {
  const { user } = useAuth();
  const allowedTypes = getAllowedLeaveTypes(user);
  const leaveTypes = ALL_LEAVE_TYPES.filter(t => allowedTypes.includes(t.value));
  const defaultLeaveType = isFullTimeEmployee(user) ? 'casual' : 'unpaid';

  const [leaves, setLeaves] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ leaveType: defaultLeaveType, startDate: '', endDate: '', reason: '' });
  const [document, setDocument] = useState(null);

  const fetchLeaves = useCallback(async () => {
    setLoading(true);
    try {
      const res = await leaveApi.getMyLeaves();
      setLeaves(res.data || res || []);
    } catch { setLeaves([]); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchLeaves(); }, [fetchLeaves]);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'];
    if (!validTypes.includes(file.type)) { toast.error('Please upload JPG, PNG or PDF'); return; }
    if (file.size > 10 * 1024 * 1024) { toast.error('File must be less than 10MB'); return; }
    setDocument(file);
  };

  const handleSubmit = async () => {
    if (!form.startDate || !form.endDate || !form.reason.trim()) {
      toast.error('Please fill all fields'); return;
    }
    if (new Date(form.endDate) < new Date(form.startDate)) {
      toast.error('End date must be after start date'); return;
    }
    if (form.leaveType === 'half_day' && form.startDate !== form.endDate) {
      toast.error('Half-day leave must be for a single date'); return;
    }
    setSaving(true);
    try {
      const formDataToSend = new FormData();
      formDataToSend.append('leaveType', form.leaveType);
      formDataToSend.append('startDate', form.startDate);
      formDataToSend.append('endDate', form.endDate);
      formDataToSend.append('reason', form.reason);
      if (document) formDataToSend.append('attachments', document);

      await leaveApi.createLeaveRequest(formDataToSend);
      toast.success('Leave request submitted!');
      setShowForm(false);
      setForm({ leaveType: defaultLeaveType, startDate: '', endDate: '', reason: '' });
      setDocument(null);
      await fetchLeaves();
    } catch (e) {
      toast.error(e.response?.data?.message || 'Failed to submit leave request');
    } finally { setSaving(false); }
  };

  const handleCancel = async (id) => {
    try {
      await leaveApi.cancelLeave(id);
      toast.success('Leave cancelled');
      await fetchLeaves();
    } catch (e) {
      toast.error(e.response?.data?.message || 'Failed to cancel leave');
    }
  };

  if (loading) return (
    <div style={{ textAlign: 'center', padding: '60px 0', color: '#6B7280' }}>
      <div style={{ width: '32px', height: '32px', border: '3px solid #E5E7EB', borderTopColor: '#10B981', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto' }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  return (
    <div style={{ padding: '16px', paddingBottom: '80px' }}>
      {/* Apply button */}
      {!showForm && (
        <button onClick={() => setShowForm(true)} style={{
          width: '100%', padding: '14px', borderRadius: '12px', border: 'none',
          background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
          color: '#fff', fontWeight: '700', fontSize: '0.95rem', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
          marginBottom: '16px', boxShadow: '0 4px 15px rgba(16,185,129,0.3)',
        }}>
          <FaPlus size={14} /> Apply for Leave
        </button>
      )}

      {/* Apply form */}
      {showForm && (
        <div style={{ background: '#fff', borderRadius: '12px', padding: '16px', boxShadow: '0 1px 4px rgba(0,0,0,0.08)', marginBottom: '16px', overflow: 'hidden' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <h6 style={{ fontWeight: '700', color: '#111827', margin: 0 }}>Apply for Leave</h6>
            <button onClick={() => { setShowForm(false); setDocument(null); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6B7280' }}><FaTimes /></button>
          </div>

          <div style={{ marginBottom: '12px' }}>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '600', color: '#374151', marginBottom: '4px' }}>Leave Type</label>
            <LeaveTypeSelect
              value={form.leaveType}
              onChange={(val) => setForm((prev) => ({
                ...prev,
                leaveType: val,
                endDate: val === 'half_day' ? prev.startDate || prev.endDate : prev.endDate,
              }))}
              leaveTypes={leaveTypes}
            />
          </div>

          <div style={{ display: 'flex', gap: '10px', marginBottom: '12px' }}>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '600', color: '#374151', marginBottom: '4px' }}>
                {form.leaveType === 'half_day' ? 'Date *' : 'From *'}
              </label>
              <input
                type="date"
                value={form.startDate}
                onChange={(e) => {
                  const value = e.target.value;
                  setForm((prev) => ({
                    ...prev,
                    startDate: value,
                    endDate: prev.leaveType === 'half_day' ? value : prev.endDate,
                  }));
                }}
                style={inputStyle}
              />
            </div>
            {form.leaveType !== 'half_day' && (
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '600', color: '#374151', marginBottom: '4px' }}>To *</label>
              <input type="date" value={form.endDate} onChange={e => setForm({ ...form, endDate: e.target.value })} style={inputStyle} />
            </div>
            )}
          </div>

          <div style={{ marginBottom: '12px' }}>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '600', color: '#374151', marginBottom: '4px' }}>Reason *</label>
            <textarea value={form.reason} onChange={e => setForm({ ...form, reason: e.target.value })} placeholder="Reason for leave..." rows={3} style={{ ...inputStyle, resize: 'vertical' }} />
          </div>

          {/* Document upload */}
          <div style={{ marginBottom: '14px' }}>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '600', color: '#374151', marginBottom: '4px' }}>
              Supporting Document <span style={{ color: '#9CA3AF', fontWeight: '400' }}>(optional)</span>
            </label>
            {!document ? (
              <label style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                padding: '12px', border: '2px dashed #E5E7EB', borderRadius: '8px',
                cursor: 'pointer', color: '#6B7280', fontSize: '0.85rem',
              }}>
                <FaUpload size={14} />
                <span>Upload document (JPG, PNG, PDF, max 10MB)</span>
                <input type="file" accept=".jpg,.jpeg,.png,.pdf" onChange={handleFileChange} style={{ display: 'none' }} />
              </label>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', background: '#F0FDF4', borderRadius: '8px', border: '1px solid #10B981' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', color: '#065F46' }}>
                  <FaFileAlt size={14} />
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '200px' }}>{document.name}</span>
                </div>
                <button onClick={() => setDocument(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#EF4444' }}><FaTimes size={12} /></button>
              </div>
            )}
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <button onClick={handleSubmit} disabled={saving} style={{
              flex: 1, padding: '12px', borderRadius: '8px', border: 'none',
              background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
              color: '#fff', fontWeight: '700', cursor: 'pointer', opacity: saving ? 0.7 : 1,
            }}>{saving ? 'Submitting...' : 'Submit Request'}</button>
            <button onClick={() => { setShowForm(false); setDocument(null); }} style={{ padding: '12px 16px', borderRadius: '8px', border: '1px solid #E5E7EB', background: '#fff', color: '#6B7280', fontWeight: '600', cursor: 'pointer' }}>Cancel</button>
          </div>
        </div>
      )}

      {/* Leave list */}
      <h6 style={{ fontWeight: '700', color: '#111827', marginBottom: '10px' }}>My Leaves</h6>
      {leaves.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px', color: '#9CA3AF' }}>
          <FaUmbrellaBeach size={36} style={{ opacity: 0.3, marginBottom: '10px' }} />
          <p>No leave requests yet</p>
        </div>
      ) : (
        leaves.map(leave => {
          const sc = STATUS_COLORS[leave.status] || STATUS_COLORS.pending;
          return (
            <div key={leave._id} style={{ background: '#fff', borderRadius: '10px', padding: '12px', marginBottom: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.07)', borderLeft: `4px solid ${sc.color}` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: '600', fontSize: '0.9rem', color: '#111827', textTransform: 'capitalize', marginBottom: '3px' }}>
                    {leave.leaveType?.replace('_', ' ')} Leave
                  </div>
                  <div style={{ fontSize: '0.8rem', color: '#6B7280' }}>{fmt(leave.startDate)} → {fmt(leave.endDate)}</div>
                  {leave.reason && <div style={{ fontSize: '0.75rem', color: '#9CA3AF', marginTop: '3px' }}>{leave.reason}</div>}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '6px' }}>
                  <span style={{ ...sc, borderRadius: '999px', padding: '2px 8px', fontSize: '10px', fontWeight: '600', textTransform: 'capitalize' }}>{leave.status}</span>
                  {leave.status === 'pending' && (
                    <button onClick={() => handleCancel(leave._id)} style={{ padding: '2px 8px', fontSize: '10px', fontWeight: '600', color: '#991B1B', background: '#FEE2E2', border: 'none', borderRadius: '5px', cursor: 'pointer' }}>Cancel</button>
                  )}
                </div>
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}
