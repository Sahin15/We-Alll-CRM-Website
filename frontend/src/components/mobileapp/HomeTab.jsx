import { useState, useEffect, useRef, useCallback } from 'react';
import { FaSignInAlt, FaSignOutAlt, FaPause, FaPlay, FaClock, FaBullhorn, FaCalendarAlt, FaCheckCircle } from 'react-icons/fa';
import { toast } from 'react-toastify';
import { useAuth } from '../../context/AuthContext';
import { attendanceApi } from '../../api/attendanceApi';
import { leaveApi } from '../../api/leaveApi';
import { announcementApi } from '../../api/announcementApi';
import { meetingApi } from '../../api/meetingApi';
import { workLogApi } from '../../api/workLogApi';

function pad(n) { return String(n).padStart(2, '0'); }
function formatDuration(s) {
  return `${pad(Math.floor(s/3600))}:${pad(Math.floor((s%3600)/60))}:${pad(s%60)}`;
}

function useLiveClock() {
  const [time, setTime] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  return time;
}

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good Morning';
  if (h < 17) return 'Good Afternoon';
  return 'Good Evening';
}

function getEmoji() {
  const h = new Date().getHours();
  if (h < 12) return '🌅';
  if (h < 17) return '☀️';
  return '🌙';
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

// ─── Work Log Modal ───────────────────────────────────────────────────────────
function WorkLogModal({ show, onSubmitAndClockOut, onSkip, onCancel, isManager }) {
  const [workLog, setWorkLog] = useState('');
  const [loading, setLoading] = useState(false);
  const [savingDraft, setSavingDraft] = useState(false);
  const [error, setError] = useState('');
  const charCount = workLog.trim().length;

  useEffect(() => {
    if (show) {
      setWorkLog(''); setError('');
      workLogApi.getTodayWorkLog().then(d => { if (d?.workLog) setWorkLog(d.workLog); }).catch(() => {});
    }
  }, [show]);

  const handleSubmit = async () => {
    if (charCount < 50) { setError('Work log must be at least 50 characters'); return; }
    setLoading(true);
    try { await workLogApi.submitWorkLog(workLog.trim()); toast.success('Work log submitted!'); onSubmitAndClockOut(); }
    catch (e) { setError(e.response?.data?.message || 'Failed to submit work log'); }
    finally { setLoading(false); }
  };

  const handleSaveDraft = async () => {
    setSavingDraft(true);
    try { await workLogApi.saveDraft(workLog.trim()); toast.success('Draft saved!'); }
    catch { toast.error('Failed to save draft'); }
    finally { setSavingDraft(false); }
  };

  if (!show) return null;
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 300, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }} onClick={onCancel}>
      <div style={{ background: '#fff', borderRadius: '20px 20px 0 0', padding: '24px', width: '100%', maxWidth: '480px', maxHeight: '85vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h6 style={{ fontWeight: '700', color: '#111827', margin: 0 }}>Submit Daily Work Log</h6>
          <button onClick={onCancel} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9CA3AF', fontSize: '1.2rem' }}>×</button>
        </div>
        <div style={{ padding: '12px 14px', background: '#EFF6FF', borderRadius: '8px', marginBottom: '16px', fontSize: '0.85rem', color: '#1D4ED8' }}>
          <strong>Before you clock out...</strong><br />Please describe what you worked on today.
          {isManager && <div style={{ marginTop: '4px', color: '#6B7280', fontSize: '0.8rem' }}>As a manager, you can skip this step if needed.</div>}
        </div>
        {error && <div style={{ padding: '10px 14px', background: '#FEE2E2', borderRadius: '8px', marginBottom: '12px', fontSize: '0.85rem', color: '#991B1B' }}>{error}</div>}
        <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '600', color: '#374151', marginBottom: '6px' }}>What did you work on today? <span style={{ color: '#EF4444' }}>*</span></label>
        <textarea value={workLog} onChange={e => { setWorkLog(e.target.value); setError(''); }} placeholder="Describe your work for today" rows={5} style={{ width: '100%', padding: '10px 12px', border: '1px solid #E5E7EB', borderRadius: '8px', fontSize: '14px', outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit', resize: 'vertical' }} />
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px', marginBottom: '16px', fontSize: '0.75rem' }}>
          <span style={{ color: charCount < 50 ? '#EF4444' : '#10B981' }}>{charCount < 50 ? `${50 - charCount} more characters needed` : '✓ Ready to submit'}</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <button onClick={handleSubmit} disabled={loading || charCount < 50} style={{ padding: '13px', borderRadius: '8px', border: 'none', background: charCount < 50 ? '#E5E7EB' : 'linear-gradient(135deg, #10B981 0%, #059669 100%)', color: charCount < 50 ? '#9CA3AF' : '#fff', fontWeight: '700', cursor: charCount < 50 ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1 }}>
            {loading ? 'Submitting...' : 'Submit & Clock Out'}
          </button>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button onClick={handleSaveDraft} disabled={savingDraft || charCount === 0} style={{ flex: 1, padding: '11px', borderRadius: '8px', border: '1px solid #E5E7EB', background: '#fff', color: '#374151', fontWeight: '600', cursor: 'pointer', fontSize: '0.85rem' }}>
              {savingDraft ? 'Saving...' : 'Save Draft'}
            </button>
            {isManager && <button onClick={onSkip} style={{ flex: 1, padding: '11px', borderRadius: '8px', border: 'none', background: '#FEF3C7', color: '#92400E', fontWeight: '600', cursor: 'pointer', fontSize: '0.85rem' }}>Skip & Clock Out</button>}
            <button onClick={onCancel} style={{ flex: 1, padding: '11px', borderRadius: '8px', border: '1px solid #E5E7EB', background: '#fff', color: '#6B7280', fontWeight: '600', cursor: 'pointer', fontSize: '0.85rem' }}>Cancel</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main HomeTab ─────────────────────────────────────────────────────────────
export default function HomeTab() {
  const { user } = useAuth();
  const isManager = ['manager', 'admin', 'superadmin', 'hr', 'hod'].includes(user?.role);

  const [attendance, setAttendance] = useState(null);
  const [leaveBalance, setLeaveBalance] = useState(null);
  const [announcements, setAnnouncements] = useState([]);
  const [todayMeetings, setTodayMeetings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [confirmAction, setConfirmAction] = useState(null);
  const [showWorkLog, setShowWorkLog] = useState(false);
  const [workSeconds, setWorkSeconds] = useState(0);
  const [breakSeconds, setBreakSeconds] = useState(0);
  const workTimer = useRef(null);
  const breakTimer = useRef(null);

  const fetchData = useCallback(async () => {
    try {
      const [attRes, leaveRes, annRes, meetRes] = await Promise.allSettled([
        attendanceApi.getTodayAttendance(),
        leaveApi.getLeaveBalance(),
        announcementApi.getAllAnnouncements(),
        meetingApi.getAllMeetings(),
      ]);
      if (attRes.status === 'fulfilled') setAttendance(attRes.value.data || attRes.value);
      if (leaveRes.status === 'fulfilled') {
        // Balance is at response.data.balance or response.data directly
        const d = leaveRes.value.data;
        setLeaveBalance(d?.balance || d);
      }
      if (annRes.status === 'fulfilled') {
        const raw = annRes.value.data || [];
        setAnnouncements(Array.isArray(raw) ? raw.slice(0, 2) : []);
      }
      if (meetRes.status === 'fulfilled') {
        const raw = meetRes.value?.data?.meetings || meetRes.value?.data || [];
        const today = new Date().toDateString();
        const userId = user?._id || user?.id;
        // Only show today's meetings where user is organizer or attendee
        setTodayMeetings(Array.isArray(raw) ? raw.filter(m => {
          const mDate = new Date(m.date || m.scheduledDate).toDateString();
          const isOrganizer = m.organizer?._id === userId || m.organizer === userId || m.createdBy?._id === userId || m.createdBy === userId;
          const isAttendee = m.attendees?.some(a => (a._id || a) === userId);
          const isScheduled = m.status !== 'cancelled' && m.status !== 'Cancelled' && m.status !== 'completed' && m.status !== 'Completed';
          return mDate === today && (isOrganizer || isAttendee) && isScheduled;
        }).slice(0, 3) : []);
      }
    } catch {}
    finally { setLoading(false); }
  }, [user]);

  useEffect(() => {
    fetchData();
    // Re-fetch when tab becomes visible again (user switches back)
    const handleVisibility = () => { if (!document.hidden) fetchData(); };
    document.addEventListener('visibilitychange', handleVisibility);
    // Also poll every 30s to keep attendance state fresh
    const poll = setInterval(fetchData, 30000);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      clearInterval(poll);
    };
  }, [fetchData]);

  // Live timers
  useEffect(() => {
    clearInterval(workTimer.current); clearInterval(breakTimer.current);
    if (!attendance?.clockIn) return;
    const clockInTime = new Date(attendance.clockIn).getTime();
    const isOnBreak = attendance.breaks?.some(b => b.startTime && !b.endTime);
    const isClockedOut = !!attendance.clockOut;
    if (!isClockedOut && !isOnBreak) {
      const totalBreakMs = (attendance.breaks || []).reduce((acc, b) => b.startTime && b.endTime ? acc + (new Date(b.endTime) - new Date(b.startTime)) : acc, 0);
      setWorkSeconds(Math.floor((Date.now() - clockInTime - totalBreakMs) / 1000));
      workTimer.current = setInterval(() => setWorkSeconds(s => s + 1), 1000);
    } else if (isClockedOut) {
      const totalBreakMs = (attendance.breaks || []).reduce((acc, b) => b.startTime && b.endTime ? acc + (new Date(b.endTime) - new Date(b.startTime)) : acc, 0);
      setWorkSeconds(Math.floor((new Date(attendance.clockOut) - clockInTime - totalBreakMs) / 1000));
    }
    if (isOnBreak) {
      const cb = attendance.breaks.find(b => b.startTime && !b.endTime);
      setBreakSeconds(Math.floor((Date.now() - new Date(cb.startTime).getTime()) / 1000));
      breakTimer.current = setInterval(() => setBreakSeconds(s => s + 1), 1000);
    }
    return () => { clearInterval(workTimer.current); clearInterval(breakTimer.current); };
  }, [attendance]);

  const isClockedIn = !!attendance?.clockIn;
  const isClockedOut = !!attendance?.clockOut;
  const isOnBreak = attendance?.breaks?.some(b => b.startTime && !b.endTime);

  const handleConfirm = async () => {
    if (confirmAction === 'out') { setConfirmAction(null); setShowWorkLog(true); return; }
    setActionLoading(true);
    try {
      if (confirmAction === 'in') { await attendanceApi.clockIn(); toast.success('Clocked in!'); }
      else if (confirmAction === 'startBreak') { await attendanceApi.startBreak(); toast.success('Break started'); }
      else if (confirmAction === 'endBreak') { await attendanceApi.endBreak(); toast.success('Back to work!'); }
      setConfirmAction(null);
      await fetchData();
    } catch (e) { toast.error(e.response?.data?.message || 'Action failed'); setConfirmAction(null); }
    finally { setActionLoading(false); }
  };

  const handleClockOut = async () => {
    setActionLoading(true);
    try { await attendanceApi.clockOut(); toast.success('Clocked out!'); setShowWorkLog(false); await fetchData(); }
    catch (e) { toast.error(e.response?.data?.message || 'Failed to clock out'); }
    finally { setActionLoading(false); }
  };

  const today = new Date();
  const liveClock = useLiveClock();
  const timeStr = liveClock.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
  const [timePart, ampm] = timeStr.split(' ');
  const dateStr = today.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  return (
    <>
      <div style={{ padding: '16px', paddingBottom: '80px' }}>

        {/* Greeting Banner */}
        <div style={{ background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)', borderRadius: '16px', padding: '20px', marginBottom: '16px', color: '#fff' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontSize: '0.8rem', opacity: 0.85, marginBottom: '4px' }}>{dateStr}</div>
              <h5 style={{ fontWeight: '800', margin: '0 0 4px', fontSize: '1.2rem' }}>
                {getGreeting()}, {user?.name?.split(' ')[0]}! {getEmoji()}
              </h5>
              <div style={{ fontSize: '0.8rem', opacity: 0.85 }}>
                {isClockedOut ? 'Great work today! 🎉' : isClockedIn ? (isOnBreak ? 'Enjoy your break ☕' : 'Keep it up! 💪') : 'Ready to start your day?'}
              </div>
            </div>
            {/* Live digital clock */}
            <div style={{ textAlign: 'right', background: 'rgba(255,255,255,0.15)', borderRadius: '12px', padding: '10px 14px', backdropFilter: 'blur(10px)' }}>
              <div style={{ fontSize: '1.6rem', fontWeight: '800', color: '#fff', fontVariantNumeric: 'tabular-nums', lineHeight: 1, letterSpacing: '-0.5px' }}>{timePart}</div>
              <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.8)', fontWeight: '600', textAlign: 'center', marginTop: '2px' }}>{ampm}</div>
            </div>
          </div>
        </div>

        {/* Clock In/Out Card */}
        <div style={{ background: '#fff', borderRadius: '20px', padding: '24px', marginBottom: '16px', boxShadow: '0 4px 16px rgba(0,0,0,0.1)', border: `2px solid ${isClockedOut ? '#10B981' : isClockedIn ? (isOnBreak ? '#F59E0B' : '#10B981') : '#E5E7EB'}` }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
            <div>
              <div style={{ fontSize: '0.8rem', fontWeight: '600', color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>
                {isClockedOut ? 'Work Complete' : isClockedIn ? (isOnBreak ? 'On Break' : 'Working') : 'Not Clocked In'}
              </div>
              {isClockedIn && (
                <div style={{ fontSize: '2.6rem', fontWeight: '800', color: '#10B981', fontVariantNumeric: 'tabular-nums', lineHeight: 1.1 }}>
                  {formatDuration(workSeconds)}
                </div>
              )}
              {!isClockedIn && !isClockedOut && (
                <div style={{ fontSize: '1rem', color: '#9CA3AF', marginTop: '4px' }}>Tap Clock In to start</div>
              )}
              {attendance?.clockIn && (
                <div style={{ fontSize: '0.8rem', color: '#9CA3AF', marginTop: '4px' }}>
                  In: {new Date(attendance.clockIn).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                  {attendance.clockOut && ` · Out: ${new Date(attendance.clockOut).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}`}
                </div>
              )}
            </div>
            {isOnBreak && (
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '0.75rem', color: '#92400E', marginBottom: '2px' }}>Break</div>
                <div style={{ fontSize: '1.1rem', fontWeight: '700', color: '#D97706', fontVariantNumeric: 'tabular-nums' }}>{formatDuration(breakSeconds)}</div>
              </div>
            )}
          </div>

          {/* Action buttons */}
          <div style={{ display: 'flex', gap: '8px' }}>
            {!isClockedIn && !isClockedOut && (
              <button onClick={() => setConfirmAction('in')} style={{ flex: 1, padding: '16px', borderRadius: '12px', border: 'none', background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)', color: '#fff', fontWeight: '800', fontSize: '1rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', boxShadow: '0 6px 20px rgba(16,185,129,0.4)', letterSpacing: '0.02em' }}>
                <FaSignInAlt size={18} /> Clock In
              </button>
            )}
            {isClockedIn && !isClockedOut && (
              <>
                <button onClick={() => setConfirmAction(isOnBreak ? 'endBreak' : 'startBreak')} style={{ flex: 1, padding: '15px', borderRadius: '12px', border: 'none', background: isOnBreak ? 'linear-gradient(135deg, #6366F1 0%, #4F46E5 100%)' : 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)', color: '#fff', fontWeight: '700', fontSize: '0.95rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                  {isOnBreak ? <><FaPlay size={14} /> Resume Work</> : <><FaPause size={14} /> Start Break</>}
                </button>
                <button onClick={() => setConfirmAction('out')} disabled={isOnBreak} style={{ flex: 1, padding: '15px', borderRadius: '12px', border: 'none', background: isOnBreak ? '#E5E7EB' : 'linear-gradient(135deg, #EF4444 0%, #DC2626 100%)', color: isOnBreak ? '#9CA3AF' : '#fff', fontWeight: '700', fontSize: '0.95rem', cursor: isOnBreak ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                  <FaSignOutAlt size={16} /> Clock Out
                </button>
              </>
            )}
            {isClockedOut && (
              <div style={{ flex: 1, padding: '15px', borderRadius: '12px', background: '#F0FDF4', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', color: '#065F46', fontWeight: '700', fontSize: '1rem' }}>
                <FaCheckCircle size={18} color="#10B981" /> Work day complete!
              </div>
            )}
          </div>
        </div>

        {/* Quick Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '16px' }}>
          {[
            { label: 'Attendance', value: isClockedOut ? 'Present ✓' : isClockedIn ? 'Working' : 'Not In', color: isClockedIn || isClockedOut ? '#10B981' : '#9CA3AF' },
            { label: 'Work Time', value: isClockedIn || isClockedOut ? formatDuration(workSeconds) : '—', color: '#6366F1' },
            { label: 'Leave Balance', value: leaveBalance?.earned?.remaining != null ? `${leaveBalance.earned.remaining} days` : '—', color: '#F59E0B' },
            { label: 'Today\'s Date', value: today.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }), color: '#6B7280' },
          ].map((s, i) => (
            <div key={i} style={{ background: '#fff', borderRadius: '12px', padding: '14px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
              <div style={{ fontSize: '0.72rem', color: '#9CA3AF', fontWeight: '600', textTransform: 'uppercase', marginBottom: '4px' }}>{s.label}</div>
              <div style={{ fontSize: '1rem', fontWeight: '700', color: s.color, fontVariantNumeric: 'tabular-nums' }}>{s.value}</div>
            </div>
          ))}
        </div>

        {/* Today's Meetings — shown before announcements */}
        {todayMeetings.length > 0 && (
          <div style={{ background: '#fff', borderRadius: '12px', padding: '14px', marginBottom: '16px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '10px' }}>
              <FaCalendarAlt size={13} color="#6366F1" />
              <span style={{ fontWeight: '700', fontSize: '0.85rem', color: '#111827' }}>Today's Meetings</span>
            </div>
            {todayMeetings.map(m => (
              <div key={m._id} style={{ padding: '8px 0', borderBottom: '1px solid #F3F4F6' }}>
                <div style={{ fontWeight: '600', fontSize: '0.82rem', color: '#111827' }}>{m.title}</div>
                <div style={{ fontSize: '0.75rem', color: '#6B7280' }}>{m.time || m.scheduledTime} · {m.type}</div>
                {m.meetingLink && <a href={m.meetingLink} target="_blank" rel="noopener noreferrer" style={{ fontSize: '0.72rem', color: '#10B981' }}>🔗 Join</a>}
              </div>
            ))}
          </div>
        )}

        {/* Announcements */}
        {announcements.length > 0 && (
          <div style={{ background: '#fff', borderRadius: '12px', padding: '14px', marginBottom: '16px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '10px' }}>
              <FaBullhorn size={13} color="#F59E0B" />
              <span style={{ fontWeight: '700', fontSize: '0.85rem', color: '#111827' }}>Announcements</span>
            </div>
            {announcements.map(a => (
              <div key={a._id} style={{ padding: '8px 0', borderBottom: '1px solid #F3F4F6' }}>
                <div style={{ fontWeight: '600', fontSize: '0.82rem', color: '#111827', marginBottom: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.title}</div>
                <div style={{ fontSize: '0.75rem', color: '#6B7280', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.content?.substring(0, 60)}...</div>
              </div>
            ))}
          </div>
        )}
      </div>

      <ConfirmModal action={confirmAction} attendance={attendance} onConfirm={handleConfirm} onCancel={() => setConfirmAction(null)} loading={actionLoading} />
      <WorkLogModal show={showWorkLog} isManager={isManager} onSubmitAndClockOut={handleClockOut} onSkip={handleClockOut} onCancel={() => setShowWorkLog(false)} />
    </>
  );
}
