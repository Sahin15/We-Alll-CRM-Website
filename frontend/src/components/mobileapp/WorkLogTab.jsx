import { useState, useEffect, useCallback } from 'react';
import { FaClipboardList, FaCheckCircle, FaEdit } from 'react-icons/fa';
import { toast } from 'react-toastify';
import { workLogApi } from '../../api/workLogApi';

const inputStyle = {
  width: '100%', padding: '10px 12px', border: '1px solid #E5E7EB',
  borderRadius: '8px', fontSize: '14px', outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit',
};

export default function WorkLogTab() {
  const [todayLog, setTodayLog] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingDraft, setSavingDraft] = useState(false);
  const [editing, setEditing] = useState(false);
  const [workLog, setWorkLog] = useState('');
  const [lastSaved, setLastSaved] = useState(null);

  const charCount = workLog.trim().length;

  const fetchToday = useCallback(async () => {
    setLoading(true);
    try {
      const data = await workLogApi.getTodayWorkLog();
      setTodayLog(data);
      if (data?.workLog) setWorkLog(data.workLog);
    } catch { setTodayLog(null); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchToday(); }, [fetchToday]);

  const handleSubmit = async () => {
    if (charCount < 50) { toast.error('Work log must be at least 50 characters'); return; }
    setSaving(true);
    try {
      await workLogApi.submitWorkLog(workLog.trim());
      toast.success('Work log submitted!');
      setEditing(false);
      setLastSaved(null);
      await fetchToday();
    } catch (e) {
      toast.error(e.response?.data?.message || 'Failed to submit work log');
    } finally { setSaving(false); }
  };

  const handleSaveDraft = async () => {
    if (!workLog.trim()) { toast.error('Nothing to save'); return; }
    setSavingDraft(true);
    try {
      await workLogApi.saveDraft(workLog.trim());
      toast.success('Draft saved!');
      setLastSaved(new Date());
    } catch (e) {
      toast.error(e.response?.data?.message || 'Failed to save draft');
    } finally { setSavingDraft(false); }
  };

  if (loading) return (
    <div style={{ textAlign: 'center', padding: '60px 0', color: '#6B7280' }}>
      <div style={{ width: '32px', height: '32px', border: '3px solid #E5E7EB', borderTopColor: '#10B981', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto' }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  const isSubmitted = todayLog?.status === 'submitted' || todayLog?.status === 'reviewed';

  return (
    <div style={{ padding: '16px', paddingBottom: '80px' }}>
      <div style={{ marginBottom: '16px' }}>
        <h6 style={{ fontWeight: '700', color: '#111827', marginBottom: '4px' }}>Today's Work Log</h6>
        <p style={{ fontSize: '0.8rem', color: '#6B7280', margin: 0 }}>
          {new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}
        </p>
      </div>

      {isSubmitted && !editing ? (
        <div style={{ background: '#F0FDF4', borderRadius: '12px', padding: '16px', border: '1px solid #10B981', marginBottom: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <FaCheckCircle color="#10B981" size={16} />
              <span style={{ fontWeight: '600', color: '#065F46', fontSize: '0.9rem' }}>Submitted</span>
            </div>
            <button onClick={() => setEditing(true)} style={{ background: 'none', border: 'none', color: '#10B981', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.8rem', fontWeight: '600' }}>
              <FaEdit size={12} /> Edit
            </button>
          </div>
          <p style={{ fontSize: '0.9rem', color: '#374151', margin: 0, lineHeight: '1.6', whiteSpace: 'pre-wrap' }}>{todayLog.workLog}</p>
        </div>
      ) : (
        <div style={{ background: '#fff', borderRadius: '12px', padding: '16px', boxShadow: '0 1px 4px rgba(0,0,0,0.08)', marginBottom: '16px' }}>
          <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '600', color: '#374151', marginBottom: '8px' }}>
            What did you work on today? <span style={{ color: '#EF4444' }}>*</span>
          </label>
          <textarea
            value={workLog}
            onChange={e => setWorkLog(e.target.value)}
            placeholder="Describe your work for today"
            rows={7}
            style={{ ...inputStyle, resize: 'vertical' }}
          />
          {/* Character count */}
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '6px', marginBottom: '14px', fontSize: '0.75rem' }}>
            <span style={{ color: charCount < 50 ? '#EF4444' : charCount < 100 ? '#F59E0B' : '#10B981' }}>
              {charCount < 50 ? `${50 - charCount} more characters needed` : charCount < 100 ? 'Good, keep going...' : 'Great detail!'}
            </span>
            {charCount >= 50 && <span style={{ color: '#10B981' }}>✓ Ready to submit</span>}
          </div>

          {/* Last saved indicator */}
          {lastSaved && (
            <p style={{ fontSize: '0.72rem', color: '#9CA3AF', margin: '0 0 10px' }}>
              Last saved: {lastSaved.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
            </p>
          )}

          {/* Action buttons */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <button onClick={handleSubmit} disabled={saving || charCount < 50} style={{
              padding: '12px', borderRadius: '8px', border: 'none',
              background: charCount < 50 ? '#E5E7EB' : 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
              color: charCount < 50 ? '#9CA3AF' : '#fff', fontWeight: '700', fontSize: '0.9rem',
              cursor: charCount < 50 ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1,
            }}>
              {saving ? 'Submitting...' : isSubmitted ? 'Update Log' : 'Submit Work Log'}
            </button>

            <div style={{ display: 'flex', gap: '8px' }}>
              <button onClick={handleSaveDraft} disabled={savingDraft || charCount === 0} style={{
                flex: 1, padding: '10px', borderRadius: '8px', border: '1px solid #E5E7EB',
                background: '#fff', color: '#374151', fontWeight: '600', fontSize: '0.85rem',
                cursor: charCount === 0 ? 'not-allowed' : 'pointer', opacity: savingDraft ? 0.7 : 1,
              }}>
                {savingDraft ? 'Saving...' : 'Save Draft'}
              </button>
              {editing && (
                <button onClick={() => { setEditing(false); setWorkLog(todayLog?.workLog || ''); }} style={{
                  flex: 1, padding: '10px', borderRadius: '8px', border: '1px solid #E5E7EB',
                  background: '#fff', color: '#6B7280', fontWeight: '600', fontSize: '0.85rem', cursor: 'pointer',
                }}>Cancel</button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Status info */}
      {todayLog && (
        <div style={{ fontSize: '0.75rem', color: '#9CA3AF', textAlign: 'center' }}>
          Status: <span style={{ fontWeight: '600', color: todayLog.status === 'submitted' ? '#10B981' : todayLog.status === 'draft' ? '#F59E0B' : '#6B7280', textTransform: 'capitalize' }}>{todayLog.status}</span>
          {todayLog.submittedAt && ` · Submitted at ${new Date(todayLog.submittedAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}`}
        </div>
      )}
    </div>
  );
}
