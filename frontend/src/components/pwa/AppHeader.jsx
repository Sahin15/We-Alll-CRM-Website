import { useState, useEffect, useRef } from 'react';
import { FaBell, FaTimes, FaCheck, FaTrash, FaCheckDouble, FaSync } from 'react-icons/fa';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'react-toastify';
import OfflineIndicator from './OfflineIndicator';
import { useAuth } from '../../context/AuthContext';
import { resolveProfilePictureUrl } from '../../utils/profilePictureUrl';
import { useNotifications } from '../../context/NotificationContext';
import { leadApi } from '../../api/leadApi';
import { meetingApi } from '../../api/meetingApi';
import { playNotificationSound } from '../../utils/notificationSound';

// ─── Notification Sheet ───────────────────────────────────────────────────────
const ICON_MAP = {
  work_assigned: '📋', work_reassigned: '🔄', work_updated: '✏️',
  work_status_changed: '🔄', work_completed: '✅', review_requested: '👀',
  task_assigned: '📋', work_item_assigned: '📋', work_item_due_soon: '⏰',
  work_item_overdue: '🚨', work_item_completed: '✅', work_item_commented: '💬',
  leave_approval: '✅', leave_rejection: '❌', leave_request: '📋',
  meeting_scheduled: '📅', meeting_updated: '📅', meeting_cancelled: '🚫',
  meeting_reminder_15min: '⏰', meeting_reminder_1hour: '📅',
  expense_approval: '💰', expense_rejection: '❌', expense_submitted: '🧾',
  expense_reimbursed: '💸', attendance_alert: '⏰', attendance_auto_clockout: '⚠️',
  announcement: '📢', general: '📬', work_log_reminder: '📝',
  project_created: '🚀', project_status_changed: '🔄',
};
const PRIORITY_COLORS = { high: '#EF4444', urgent: '#EF4444', normal: '#3B82F6', medium: '#3B82F6', low: '#9CA3AF' };

function NotificationSheet({ onClose }) {
  const { notifications, unreadCount, loading, markAsRead, markAllAsRead, deleteNotification, fetchNotifications } = useNotifications();
  const [showAll, setShowAll] = useState(false);
  const displayed = showAll ? notifications : notifications.filter(n => !n.isRead);

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 400, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }} onClick={onClose}>
      <div style={{ background: '#fff', borderRadius: '20px 20px 0 0', width: '100%', maxWidth: '480px', height: '80vh', display: 'flex', flexDirection: 'column' }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 0 0', flexShrink: 0 }}>
          <div style={{ width: '40px', height: '4px', borderRadius: '2px', background: '#E5E7EB' }} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 20px', borderBottom: '1px solid #F3F4F6', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <FaBell size={16} color="#6366F1" />
            <h6 style={{ fontWeight: '700', color: '#111827', margin: 0 }}>Notifications</h6>
            {unreadCount > 0 && <span style={{ background: '#EF4444', color: '#fff', borderRadius: '999px', padding: '1px 7px', fontSize: '11px', fontWeight: '700' }}>{unreadCount}</span>}
          </div>
          <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
            <button onClick={fetchNotifications} disabled={loading} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9CA3AF', padding: '4px' }}>
              <FaSync size={13} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
            </button>
            {unreadCount > 0 && (
              <button onClick={markAllAsRead} style={{ background: '#EEF2FF', border: 'none', borderRadius: '6px', padding: '5px 8px', cursor: 'pointer', color: '#6366F1', fontSize: '11px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <FaCheckDouble size={11} /> All read
              </button>
            )}
            <button onClick={onClose} style={{ background: '#F3F4F6', border: 'none', borderRadius: '8px', padding: '6px 8px', cursor: 'pointer', color: '#6B7280' }}>
              <FaTimes size={13} />
            </button>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '6px', padding: '10px 20px', background: '#F9FAFB', flexShrink: 0 }}>
          <button onClick={() => setShowAll(false)} style={{ flex: 1, padding: '6px', borderRadius: '8px', border: '1px solid', borderColor: !showAll ? '#6366F1' : '#E5E7EB', background: !showAll ? '#6366F1' : '#fff', color: !showAll ? '#fff' : '#6B7280', fontSize: '12px', fontWeight: '600', cursor: 'pointer' }}>
            Unread ({unreadCount})
          </button>
          <button onClick={() => setShowAll(true)} style={{ flex: 1, padding: '6px', borderRadius: '8px', border: '1px solid', borderColor: showAll ? '#6366F1' : '#E5E7EB', background: showAll ? '#6366F1' : '#fff', color: showAll ? '#fff' : '#6B7280', fontSize: '12px', fontWeight: '600', cursor: 'pointer' }}>
            All ({notifications.length})
          </button>
        </div>
        <div style={{ flex: 1, overflowY: 'auto' }}>
          <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
          {displayed.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 20px', color: '#9CA3AF' }}>
              <FaBell size={40} style={{ opacity: 0.3, marginBottom: '12px' }} />
              <p style={{ fontWeight: '500' }}>{showAll ? 'No notifications' : 'No unread notifications'}</p>
              {!showAll && notifications.length > 0 && (
                <button onClick={() => setShowAll(true)} style={{ background: 'none', border: 'none', color: '#6366F1', cursor: 'pointer', fontSize: '0.85rem', fontWeight: '600' }}>View all ({notifications.length})</button>
              )}
            </div>
          ) : (
            displayed.map(n => (
              <div key={n._id} style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', padding: '14px 20px', borderBottom: '1px solid #F9FAFB', background: n.isRead ? '#fff' : '#EEF2FF' }}>
                <div style={{ fontSize: '1.3rem', flexShrink: 0, lineHeight: 1, marginTop: '2px' }}>{ICON_MAP[n.type] || '📬'}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px', marginBottom: '3px' }}>
                    <div style={{ fontWeight: n.isRead ? '500' : '700', fontSize: '0.88rem', color: '#111827', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>{n.title}</div>
                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: PRIORITY_COLORS[n.priority] || '#9CA3AF', flexShrink: 0, marginTop: '4px' }} />
                  </div>
                  <p style={{ fontSize: '0.78rem', color: '#6B7280', margin: '0 0 6px', lineHeight: '1.4' }}>{n.body}</p>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.7rem', color: '#9CA3AF' }}>{formatDistanceToNow(new Date(n.createdAt), { addSuffix: true })}</span>
                    <div style={{ display: 'flex', gap: '4px' }}>
                      {!n.isRead && <button onClick={() => markAsRead(n._id)} style={{ background: '#EEF2FF', border: 'none', borderRadius: '5px', padding: '3px 7px', cursor: 'pointer', color: '#6366F1' }}><FaCheck size={10} /></button>}
                      <button onClick={() => deleteNotification(n._id)} style={{ background: '#FEF2F2', border: 'none', borderRadius: '5px', padding: '3px 7px', cursor: 'pointer', color: '#EF4444' }}><FaTrash size={10} /></button>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Main AppHeader ───────────────────────────────────────────────────────────
export default function AppHeader() {
  const { user } = useAuth();
  const { unreadCount } = useNotifications();
  const [showNotifications, setShowNotifications] = useState(false);
  const remindedRef = useRef(new Set());
  const prevUnreadRef = useRef(unreadCount);

  // Play sound when new notifications arrive
  useEffect(() => {
    if (unreadCount > prevUnreadRef.current) {
      playNotificationSound();
    }
    prevUnreadRef.current = unreadCount;
  }, [unreadCount]);

  // 5-minute meeting reminder for lead meetings
  useEffect(() => {
    const checkReminders = async () => {
      try {
        const userId = user?._id || user?.id;

        // Check lead follow-ups due today
        const fuRes = await leadApi.getFollowUpDashboard();
        const fuData = fuRes?.data || {};
        const todayFollowUps = fuData.today || [];
        if (todayFollowUps.length > 0 && !remindedRef.current.has('followup-today')) {
          remindedRef.current.add('followup-today');
          toast.info(`📋 You have ${todayFollowUps.length} follow-up${todayFollowUps.length > 1 ? 's' : ''} scheduled for today!`, { autoClose: 8000 });
        }

        // Check lead meetings 5 minutes before
        const meetRes = await leadApi.getAllMeetings();
        const meetings = meetRes?.data?.meetings || meetRes?.data || [];
        const now = new Date();
        meetings.forEach(m => {
          if (m.status !== 'Scheduled') return;
          const isAttendee = m.attendees?.some(a => (a._id || a) === userId);
          const isOrganizer = m.organizer?._id === userId || m.organizer === userId;
          if (!isAttendee && !isOrganizer) return;

          const mDate = new Date(m.scheduledDate);
          if (m.scheduledTime) { const [h, min] = m.scheduledTime.split(':'); mDate.setHours(+h, +min, 0, 0); }
          const diffMin = (mDate - now) / 60000;
          if (diffMin >= 4 && diffMin <= 6 && !remindedRef.current.has(m._id)) {
            remindedRef.current.add(m._id);
            playNotificationSound();
            toast.info(`📅 Meeting in 5 minutes: "${m.title}"${m.meetingLink ? ' — ' + m.meetingLink : ''}`, { autoClose: 10000 });
            if (Notification.permission === 'granted') {
              new Notification('Meeting in 5 minutes', { body: m.title, icon: '/Wealll_mini.png' });
            }
          }
        });
      } catch {}
    };

    if (Notification.permission === 'default') Notification.requestPermission();
    checkReminders();
    const interval = setInterval(checkReminders, 60000);
    return () => clearInterval(interval);
  }, [user]);

  return (
    <>
      <div style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100 }}>
        <div style={{ height: '56px', background: 'linear-gradient(135deg, #6366F1 0%, #8B5CF6 100%)', display: 'flex', alignItems: 'center', padding: '0 16px', gap: '10px' }}>
          <img loading="lazy" src="/Wealll_mini.png" alt="We Alll logo" style={{ width: '32px', height: '32px', objectFit: 'contain' }} />
          <span style={{ color: '#ffffff', fontWeight: '700', fontSize: '1.1rem', letterSpacing: '0.01em', flex: 1 }}>WeAlll Office</span>

          {/* Notification Bell */}
          <button onClick={() => setShowNotifications(true)} style={{ background: 'none', border: 'none', cursor: 'pointer', position: 'relative', padding: '6px' }}>
            <FaBell size={20} color="#fff" />
            {unreadCount > 0 && (
              <span style={{ position: 'absolute', top: '2px', right: '2px', background: '#EF4444', color: '#fff', borderRadius: '999px', fontSize: '9px', fontWeight: '700', minWidth: '16px', height: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 3px' }}>
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </button>

          {user && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {user.profilePicture ? (
                <img loading="lazy" src={resolveProfilePictureUrl(user.profilePicture)} alt={user.name} style={{ width: '34px', height: '34px', borderRadius: '50%', objectFit: 'cover', border: '2px solid rgba(255,255,255,0.6)', flexShrink: 0 }} />
              ) : (
                <div style={{ width: '34px', height: '34px', borderRadius: '50%', background: 'rgba(255,255,255,0.25)', border: '2px solid rgba(255,255,255,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '700', fontSize: '0.85rem', color: '#fff', flexShrink: 0 }}>
                  {user.name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || 'U'}
                </div>
              )}
              <div style={{ textAlign: 'right' }}>
                <div style={{ color: '#fff', fontSize: '0.8rem', fontWeight: '600', lineHeight: 1.2 }}>{user.name?.split(' ')[0]}</div>
                <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.65rem', textTransform: 'capitalize' }}>{user.role}</div>
              </div>
            </div>
          )}
        </div>
        <OfflineIndicator />
      </div>

      {showNotifications && <NotificationSheet onClose={() => setShowNotifications(false)} />}
    </>
  );
}

