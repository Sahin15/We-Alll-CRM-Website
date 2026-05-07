import { useState, useEffect, useRef, useCallback } from 'react';
import { FaClock, FaPlay, FaCheckCircle, FaSignInAlt, FaSignOutAlt, FaPause } from 'react-icons/fa';
import { toast } from 'react-toastify';
import { attendanceApi } from '../../api/attendanceApi';
import { workLogApi } from '../../api/workLogApi';
import { useAuth } from '../../context/AuthContext';

function pad(n) { return String(n).padStart(2, '0'); }
function formatDuration(seconds) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return `${pad(h)}:${pad(m)}:${pad(s)}`;
}

// ─── Confirmation Modal ───────────────────────────────────────────────────────
function ConfirmModal({ action, attendance, onConfirm, onCancel, loading }) {
  if (!action) return null;
  const config = {
    in:         { title: 'Clock In',    color: '#10B981', btnText: 'Clock In',    body: 'Are you ready to start your workday?',  sub: 'This will record your clock-in time.' },
    out:        { title: 'Clock Out',   color: '#EF4444', btnText: 'Clock Out',   body: 'Are you done for the day?',             sub: 'This will record your clock-out time and calculate your work hours.' },
    startBreak: { title: 'Start Break', color: '#F59E0B', btnText: 'Start Break', body: 'Taking a break?',                       sub: 'This will start tracking your break time.' },
    endBreak:   { title: 'Resume Work', color: '#6366F1', btnText: 'Resume Work', body: 'Ready to resume work?',                 sub: 'This will end your break and resume work time tracking.' },
  };
  const c = config[action];
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }} onClick={onCancel}>
      <div style={{ background: '#fff', borderRadius: '16px', padding: '24px', width: '100%', maxWidth: '360px', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h6 style={{ fontWeight: '700', color: '#111827', margin: 0 }}>{c.title}</h6>
          <button onClick={onCancel} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9CA3AF', fontSize: '1.2rem' }}>×</button>
        </div>
        <div style={{ textAlign: 'center', padding: '8px 0 20px' }}>
          <FaClock size={40} color={c.color} style={{ marginBottom: '12px' }} />
          <h6 style={{ fontWeight: '700', color: '#111827', marginBottom: '8px' }}>{c.body}</h6>
          <p style={{ fontSize: '0.85rem', color: '#6B7280', margin: 0 }}>{c.sub}</p>
          {attendance?.clockIn && action === 'out' && (
            <div style={{ marginTop: '12px', padding: '10px 14px', background: '#EFF6FF', borderRadius: '8px', fontSize: '0.85rem', color: '#1D4ED8' }}>
              <strong>Clock In Time:</strong> {new Date(attendance.clockIn).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false })}
            </div>
          )}
          {attendance?.totalBreakTime > 0 && (action === 'out' || action === 'endBreak') && (
            <div style={{ marginTop: '8px', padding: '10px 14px', background: '#FFFBEB', borderRadius: '8px', fontSize: '0.85rem', color: '#92400E' }}>
              <strong>Total Break Time:</strong> {Math.floor(attendance.totalBreakTime)} minutes
            </div>
          )}
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button onClick={onCancel} style={{ flex: 1, padding: '12px', borderRadius: '8px', border: '1px solid #E5E7EB', background: '#fff', color: '#374151', fontWeight: '600', cursor: 'pointer' }}>Cancel</button>
          <button onClick={onConfirm} disabled={loading} style={{ flex: 1, padding: '12px', borderRadius: '8px', border: 'none', background: c.color, color: '#fff', fontWeight: '700', cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1 }}>
            {loading ? '...' : c.btnText}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Work Log Modal (before clock out) ───────────────────────────────────────
function WorkLogModal({ show, onSubmitAndClockOut, onSkip, onCancel, isManager }) {
  const [workLog, setWorkLog] = useState('');
  const [loading, setLoading] = useState(false);
  const [savingDraft, setSavingDraft] = useState(false);
  const [error, setError] = useState('');
  const charCount = workLog.trim().length;

  useEffect(() => {
    if (show) {
      setWorkLog(''); setError('');
      workLogApi.getTodayWorkLog().then(data => {
        if (data?.workLog) setWorkLog(data.workLog);
      }).catch(() => {});
    }
  }, [show]);

  const handleSubmit = async () => {
    if (charCount < 50) { setError('Work log must be at least 50 characters'); return; }
    setLoading(true);
    try {
      await workLogApi.submitWorkLog(workLog.trim());
      toast.success('Work log submitted!');
      onSubmitAndClockOut();
    } catch (e) {
      setError(e.response?.data?.message || 'Failed to submit work log');
    } finally { setLoading(false); }
  };

  const handleSaveDraft = async () => {
    setSavingDraft(true);
    try {
      await workLogApi.saveDraft(workLog.trim());
      toast.success('Draft saved!');
    } catch (e) {
      toast.error('Failed to save draft');
    } finally { setSavingDraft(false); }
  };

  if (!show) return null;

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 300, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }} onClick={onCancel}>
      <div style={{ background: '#fff', borderRadius: '20px 20px 0 0', padding: '24px', width: '100%', maxWidth: '480px', maxHeight: '85vh', overflowY: 'auto', boxShadow: '0 -10px 40px rgba(0,0,0,0.2)' }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h6 style={{ fontWeight: '700', color: '#111827', margin: 0 }}>Submit Daily Work Log</h6>
          <button onClick={onCancel} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9CA3AF', fontSize: '1.2rem' }}>×</button>
        </div>

        <div style={{ padding: '12px 14px', background: '#EFF6FF', borderRadius: '8px', marginBottom: '16px', fontSize: '0.85rem', color: '#1D4ED8' }}>
          <strong>Before you clock out...</strong><br />
          Please describe what you worked on today. This helps track progress and productivity.
          {isManager && <div style={{ marginTop: '4px', color: '#6B7280', fontSize: '0.8rem' }}>As a manager, you can skip this step if needed.</div>}
        </div>

        {error && <div style={{ padding: '10px 14px', background: '#FEE2E2', borderRadius: '8px', marginBottom: '12px', fontSize: '0.85rem', color: '#991B1B' }}>{error}</div>}

        <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '600', color: '#374151', marginBottom: '6px' }}>
          What did you work on today? <span style={{ color: '#EF4444' }}>*</span>
        </label>
        <textarea
          value={workLog}
          onChange={e => { setWorkLog(e.target.value); setError(''); }}
          placeholder="Describe your work activities, tasks completed, meetings attended, issues resolved, etc. (Minimum 50 characters)"
          rows={6}
          style={{ width: '100%', padding: '10px 12px', border: '1px solid #E5E7EB', borderRadius: '8px', fontSize: '14px', outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit', resize: 'vertical' }}
        />
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px', marginBottom: '16px', fontSize: '0.75rem' }}>
          <span style={{ color: charCount < 50 ? '#EF4444' : charCount < 100 ? '#F59E0B' : '#10B981' }}>
            {charCount < 50 ? `${50 - charCount} more characters needed` : charCount < 100 ? 'Good, keep going...' : 'Great detail!'}
          </span>
          {charCount >= 50 && <span style={{ color: '#10B981' }}>✓ Ready to submit</span>}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <button onClick={handleSubmit} disabled={loading || charCount < 50} style={{
            padding: '13px', borderRadius: '8px', border: 'none',
            background: charCount < 50 ? '#E5E7EB' : 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
            color: charCount < 50 ? '#9CA3AF' : '#fff', fontWeight: '700', cursor: charCount < 50 ? 'not-allowed' : 'pointer',
            opacity: loading ? 0.7 : 1,
          }}>{loading ? 'Submitting...' : 'Submit & Clock Out'}</button>

          <div style={{ display: 'flex', gap: '8px' }}>
            <button onClick={handleSaveDraft} disabled={savingDraft || charCount === 0} style={{ flex: 1, padding: '11px', borderRadius: '8px', border: '1px solid #E5E7EB', background: '#fff', color: '#374151', fontWeight: '600', cursor: 'pointer', fontSize: '0.85rem', opacity: savingDraft ? 0.7 : 1 }}>
              {savingDraft ? 'Saving...' : 'Save Draft'}
            </button>
            {isManager && (
              <button onClick={onSkip} style={{ flex: 1, padding: '11px', borderRadius: '8px', border: 'none', background: '#FEF3C7', color: '#92400E', fontWeight: '600', cursor: 'pointer', fontSize: '0.85rem' }}>
                Skip & Clock Out
              </button>
            )}
            <button onClick={onCancel} style={{ flex: 1, padding: '11px', borderRadius: '8px', border: '1px solid #E5E7EB', background: '#fff', color: '#6B7280', fontWeight: '600', cursor: 'pointer', fontSize: '0.85rem' }}>
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Break History Component ──────────────────────────────────────────────────
function BreakHistory({ breaks, breakSeconds, totalBreakTime }) {
  const completedBreaks = breaks.filter(b => b.startTime && b.endTime);
  const totalBreakSecs = completedBreaks.length > 0
    ? completedBreaks.reduce((acc, b) =>
        acc + Math.floor((new Date(b.endTime) - new Date(b.startTime)) / 1000), 0)
    : Math.round((totalBreakTime || 0) * 60); // fallback: use backend-computed minutes
  const ongoingBreak = breaks.find(b => b.startTime && !b.endTime);
  const displayTotalSecs = ongoingBreak ? totalBreakSecs + breakSeconds : totalBreakSecs;
  const breakCount = breaks.length;

  return (
    <div style={{ marginTop: '20px' }}>
      {/* Summary row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
        <p style={{ fontSize: '0.8rem', fontWeight: '600', color: '#6B7280', margin: 0, textTransform: 'uppercase' }}>
          Break History
        </p>
        <div style={{ display: 'flex', gap: '8px' }}>
          {/* Break count badge */}
          <div style={{
            background: '#FEF3C7', borderRadius: '20px', padding: '3px 10px',
            fontSize: '0.75rem', fontWeight: '700', color: '#92400E',
            display: 'flex', alignItems: 'center', gap: '4px',
          }}>
            <FaPause size={9} />
            {breakCount} {breakCount === 1 ? 'break' : 'breaks'}
          </div>
          {/* Total break time badge */}
          <div style={{
            background: '#FEE2E2', borderRadius: '20px', padding: '3px 10px',
            fontSize: '0.75rem', fontWeight: '700', color: '#991B1B',
            display: 'flex', alignItems: 'center', gap: '4px',
          }}>
            <FaClock size={9} />
            {formatDuration(displayTotalSecs)}
          </div>
        </div>
      </div>

      {/* Individual break rows */}
      {breaks.map((b, i) => {
        const durSecs = b.startTime && b.endTime
          ? Math.floor((new Date(b.endTime) - new Date(b.startTime)) / 1000)
          : null;
        return (
          <div key={i} style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            padding: '8px 12px', background: '#F9FAFB', borderRadius: '8px',
            marginBottom: '6px', fontSize: '0.8rem', color: '#6B7280',
            border: !b.endTime ? '1px dashed #F59E0B' : '1px solid transparent',
          }}>
            <span style={{ fontWeight: '600', color: '#374151' }}>Break {i + 1}</span>
            <span>
              {b.startTime ? new Date(b.startTime).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : '—'}
              {b.endTime
                ? ` → ${new Date(b.endTime).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}`
                : ' → ongoing'}
            </span>
            {durSecs !== null && (
              <span style={{ fontWeight: '700', color: '#D97706', minWidth: '48px', textAlign: 'right' }}>
                {formatDuration(durSecs)}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Main ClockTab ────────────────────────────────────────────────────────────
export default function ClockTab() {
  const { user } = useAuth();
  const isManager = ['manager', 'admin', 'superadmin', 'hr', 'hod'].includes(user?.role);
  const [attendance, setAttendance] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [confirmAction, setConfirmAction] = useState(null);
  const [showWorkLog, setShowWorkLog] = useState(false);
  const [workSeconds, setWorkSeconds] = useState(0);
  const [breakSeconds, setBreakSeconds] = useState(0);
  const workTimer = useRef(null);
  const breakTimer = useRef(null);

  const fetchToday = useCallback(async () => {
    try {
      const res = await attendanceApi.getTodayAttendance();
      const data = res.data ?? null;
      console.log('[ClockTab] attendance data:', JSON.stringify(data));
      setAttendance(data);
    } catch (e) {
      console.error('[ClockTab] fetch error:', e);
      setAttendance(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchToday(); }, [fetchToday]);

  // Live timers
  useEffect(() => {
    clearInterval(workTimer.current);
    clearInterval(breakTimer.current);
    if (!attendance?.clockIn) return;

    const clockInTime = new Date(attendance.clockIn).getTime();
    const isOnBreak = attendance.breaks?.some(b => b.startTime && !b.endTime);
    const isClockedOut = !!attendance.clockOut;

    if (!isClockedOut && !isOnBreak) {
      const totalBreakMs = (attendance.breaks || []).reduce((acc, b) => {
        if (b.startTime && b.endTime) return acc + (new Date(b.endTime) - new Date(b.startTime));
        return acc;
      }, 0);
      const elapsed = Math.floor((Date.now() - clockInTime - totalBreakMs) / 1000);
      setWorkSeconds(elapsed);
      workTimer.current = setInterval(() => setWorkSeconds(s => s + 1), 1000);
    } else if (isClockedOut) {
      const totalBreakMs = (attendance.breaks || []).reduce((acc, b) => {
        if (b.startTime && b.endTime) return acc + (new Date(b.endTime) - new Date(b.startTime));
        return acc;
      }, 0);
      setWorkSeconds(Math.floor((new Date(attendance.clockOut) - clockInTime - totalBreakMs) / 1000));
    }

    if (isOnBreak) {
      const currentBreak = attendance.breaks.find(b => b.startTime && !b.endTime);
      const breakElapsed = Math.floor((Date.now() - new Date(currentBreak.startTime).getTime()) / 1000);
      setBreakSeconds(breakElapsed);
      breakTimer.current = setInterval(() => setBreakSeconds(s => s + 1), 1000);
    }

    return () => { clearInterval(workTimer.current); clearInterval(breakTimer.current); };
  }, [attendance]);

  const isClockedIn = !!attendance?.clockIn;
  const isClockedOut = !!attendance?.clockOut;
  const isOnBreak = attendance?.breaks?.some(b => b.startTime && !b.endTime);

  const handleConfirm = async () => {
    // For clock out — show work log modal first (unless manager skipping)
    if (confirmAction === 'out') {
      setConfirmAction(null);
      setShowWorkLog(true);
      return;
    }
    setActionLoading(true);
    try {
      if (confirmAction === 'in') {
        await attendanceApi.clockIn();
        toast.success('Clocked in successfully!');
      } else if (confirmAction === 'startBreak') {
        await attendanceApi.startBreak();
        toast.success('Break started');
      } else if (confirmAction === 'endBreak') {
        await attendanceApi.endBreak();
        toast.success('Break ended, back to work!');
      }
      setConfirmAction(null);
      await fetchToday();
    } catch (e) {
      toast.error(e.response?.data?.message || 'Action failed. Please try again.');
      setConfirmAction(null);
    } finally {
      setActionLoading(false);
    }
  };

  const handleClockOut = async () => {
    setActionLoading(true);
    try {
      await attendanceApi.clockOut();
      toast.success('Clocked out successfully!');
      setShowWorkLog(false);
      await fetchToday();
    } catch (e) {
      // If backend still requires work log, show it again
      if (e.response?.data?.workLogRequired) {
        toast.error('Please submit your work log first');
      } else {
        toast.error(e.response?.data?.message || 'Failed to clock out');
      }
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) return (
    <div style={{ textAlign: 'center', padding: '60px 0', color: '#6B7280' }}>
      <div style={{ width: '32px', height: '32px', border: '3px solid #E5E7EB', borderTopColor: '#10B981', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto' }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  return (
    <>
      <div style={{ padding: '16px', paddingBottom: '80px' }}>
        {/* Status card */}
        <div style={{
          background: isClockedOut ? '#F0FDF4' : isClockedIn ? (isOnBreak ? '#FEF3C7' : '#ECFDF5') : '#F9FAFB',
          borderRadius: '16px', padding: '24px', textAlign: 'center', marginBottom: '20px',
          border: `2px solid ${isClockedOut ? '#10B981' : isClockedIn ? (isOnBreak ? '#F59E0B' : '#10B981') : '#E5E7EB'}`,
        }}>
          <div style={{ fontSize: '0.8rem', fontWeight: '600', color: '#6B7280', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            {isClockedOut ? 'Work Complete' : isClockedIn ? (isOnBreak ? 'On Break' : 'Working') : 'Not Clocked In'}
          </div>

          {isClockedIn && (
            <div style={{ marginBottom: '8px' }}>
              <div style={{ fontSize: '0.72rem', color: '#6B7280', marginBottom: '4px' }}>Work Time</div>
              <div style={{ fontSize: '2.8rem', fontWeight: '800', color: '#10B981', fontVariantNumeric: 'tabular-nums', letterSpacing: '-1px' }}>
                {formatDuration(workSeconds)}
              </div>
            </div>
          )}

          {isOnBreak && (
            <div style={{ marginTop: '8px', padding: '8px 16px', background: '#FEF3C7', borderRadius: '8px', display: 'inline-block' }}>
              <div style={{ fontSize: '0.7rem', color: '#92400E', marginBottom: '2px' }}>Break Time</div>
              <div style={{ fontSize: '1.4rem', fontWeight: '700', color: '#D97706', fontVariantNumeric: 'tabular-nums' }}>
                {formatDuration(breakSeconds)}
              </div>
            </div>
          )}

          {attendance?.clockIn && (
            <div style={{ marginTop: '12px', fontSize: '0.75rem', color: '#6B7280' }}>
              In: {new Date(attendance.clockIn).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
              {attendance.clockOut && ` · Out: ${new Date(attendance.clockOut).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}`}
              {attendance.totalBreakTime > 0 && (
                <span style={{ marginLeft: '6px', color: '#D97706', fontWeight: '600' }}>
                  · Breaks: {(attendance.breaks || []).filter(b => b.startTime && b.endTime).length} ({Math.round(attendance.totalBreakTime)}m)
                </span>
              )}
            </div>
          )}
        </div>

        {/* Action buttons */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {!isClockedIn && !isClockedOut && (
            <button onClick={() => setConfirmAction('in')} style={{
              padding: '16px', borderRadius: '12px', border: 'none',
              background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
              color: '#fff', fontSize: '1rem', fontWeight: '700', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
              boxShadow: '0 4px 15px rgba(16,185,129,0.4)',
            }}>
              <FaSignInAlt size={16} /> Clock In
            </button>
          )}

          {isClockedIn && !isClockedOut && (
            <>
              <button onClick={() => setConfirmAction(isOnBreak ? 'endBreak' : 'startBreak')} style={{
                padding: '14px', borderRadius: '12px', border: 'none',
                background: isOnBreak ? 'linear-gradient(135deg, #6366F1 0%, #4F46E5 100%)' : 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)',
                color: '#fff', fontSize: '0.95rem', fontWeight: '700', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
              }}>
                {isOnBreak ? <><FaPlay size={14} /> Resume Work</> : <><FaPause size={14} /> Start Break</>}
              </button>

              <button onClick={() => setConfirmAction('out')} disabled={isOnBreak} style={{
                padding: '14px', borderRadius: '12px', border: 'none',
                background: isOnBreak ? '#E5E7EB' : 'linear-gradient(135deg, #EF4444 0%, #DC2626 100%)',
                color: isOnBreak ? '#9CA3AF' : '#fff', fontSize: '0.95rem', fontWeight: '700',
                cursor: isOnBreak ? 'not-allowed' : 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
              }}>
                <FaSignOutAlt size={14} /> Clock Out
              </button>
              {isOnBreak && <p style={{ textAlign: 'center', fontSize: '0.75rem', color: '#9CA3AF', margin: 0 }}>End break before clocking out</p>}
            </>
          )}

          {isClockedOut && (
            <div style={{ textAlign: 'center', padding: '16px', background: '#F0FDF4', borderRadius: '12px', border: '1px solid #10B981' }}>
              <FaCheckCircle size={32} color="#10B981" style={{ marginBottom: '8px' }} />
              <p style={{ fontWeight: '700', color: '#065F46', margin: 0 }}>Work day complete!</p>
              <p style={{ fontSize: '0.8rem', color: '#6B7280', margin: '4px 0 0' }}>Total: {formatDuration(workSeconds)}</p>
            </div>
          )}
        </div>

        {/* Break history */}
        {(attendance?.totalBreakTime > 0 || attendance?.breaks?.length > 0) && (
          <BreakHistory
            breaks={attendance.breaks || []}
            breakSeconds={breakSeconds}
            totalBreakTime={attendance.totalBreakTime || 0}
          />
        )}
      </div>

      {/* Confirmation Modal */}
      <ConfirmModal
        action={confirmAction}
        attendance={attendance}
        onConfirm={handleConfirm}
        onCancel={() => setConfirmAction(null)}
        loading={actionLoading}
      />

      {/* Work Log Modal — shown before clock out */}
      <WorkLogModal
        show={showWorkLog}
        isManager={isManager}
        onSubmitAndClockOut={handleClockOut}
        onSkip={handleClockOut}
        onCancel={() => setShowWorkLog(false)}
      />
    </>
  );
}
