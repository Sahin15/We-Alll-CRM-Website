import { useState } from 'react';
import { FaBell, FaCheck, FaTrash, FaCheckDouble, FaTimes, FaSync } from 'react-icons/fa';
import { formatDistanceToNow } from 'date-fns';
import { useNotifications } from '../../context/NotificationContext';

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

export default function NotificationSheet({ onClose }) {
  const { notifications, unreadCount, loading, markAsRead, markAllAsRead, deleteNotification, fetchNotifications } = useNotifications();
  const [showAll, setShowAll] = useState(false);

  const getIcon = (type) => ICON_MAP[type] || '📬';
  const getPriorityColor = (p) => PRIORITY_COLORS[p] || '#9CA3AF';

  // By default show only unread; toggle to show all
  const displayed = showAll ? notifications : notifications.filter(n => !n.isRead);

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 400, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }} onClick={onClose}>
      <div style={{ background: '#fff', borderRadius: '20px 20px 0 0', width: '100%', maxWidth: '480px', height: '80vh', display: 'flex', flexDirection: 'column' }} onClick={e => e.stopPropagation()}>

        {/* Handle */}
        <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 0 0', flexShrink: 0 }}>
          <div style={{ width: '40px', height: '4px', borderRadius: '2px', background: '#E5E7EB' }} />
        </div>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 20px', borderBottom: '1px solid #F3F4F6', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <FaBell size={16} color="#10B981" />
            <h6 style={{ fontWeight: '700', color: '#111827', margin: 0 }}>Notifications</h6>
            {unreadCount > 0 && (
              <span style={{ background: '#EF4444', color: '#fff', borderRadius: '999px', padding: '1px 7px', fontSize: '11px', fontWeight: '700' }}>{unreadCount}</span>
            )}
          </div>
          <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
            <button onClick={fetchNotifications} disabled={loading} title="Refresh" style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9CA3AF', padding: '4px' }}>
              <FaSync size={13} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
            </button>
            {unreadCount > 0 && (
              <button onClick={markAllAsRead} title="Mark all read" style={{ background: '#F0FDF4', border: 'none', borderRadius: '6px', padding: '5px 8px', cursor: 'pointer', color: '#10B981', fontSize: '11px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <FaCheckDouble size={11} /> All read
              </button>
            )}
            <button onClick={onClose} style={{ background: '#F3F4F6', border: 'none', borderRadius: '8px', padding: '6px 8px', cursor: 'pointer', color: '#6B7280' }}>
              <FaTimes size={13} />
            </button>
          </div>
        </div>

        {/* Unread / All toggle */}
        <div style={{ display: 'flex', gap: '6px', padding: '10px 20px', background: '#F9FAFB', flexShrink: 0 }}>
          <button onClick={() => setShowAll(false)} style={{ flex: 1, padding: '6px', borderRadius: '8px', border: '1px solid', borderColor: !showAll ? '#10B981' : '#E5E7EB', background: !showAll ? '#10B981' : '#fff', color: !showAll ? '#fff' : '#6B7280', fontSize: '12px', fontWeight: '600', cursor: 'pointer' }}>
            Unread ({unreadCount})
          </button>
          <button onClick={() => setShowAll(true)} style={{ flex: 1, padding: '6px', borderRadius: '8px', border: '1px solid', borderColor: showAll ? '#10B981' : '#E5E7EB', background: showAll ? '#10B981' : '#fff', color: showAll ? '#fff' : '#6B7280', fontSize: '12px', fontWeight: '600', cursor: 'pointer' }}>
            All ({notifications.length})
          </button>
        </div>

        {/* List */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
          {displayed.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 20px', color: '#9CA3AF' }}>
              <FaBell size={40} style={{ opacity: 0.3, marginBottom: '12px' }} />
              <p style={{ fontWeight: '500' }}>{showAll ? 'No notifications' : 'No unread notifications'}</p>
              {!showAll && notifications.length > 0 && (
                <button onClick={() => setShowAll(true)} style={{ background: 'none', border: 'none', color: '#10B981', cursor: 'pointer', fontSize: '0.85rem', fontWeight: '600' }}>
                  View all ({notifications.length})
                </button>
              )}
            </div>
          ) : (
            displayed.map(n => (
              <div key={n._id} style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', padding: '14px 20px', borderBottom: '1px solid #F9FAFB', background: n.isRead ? '#fff' : '#F0FDF4' }}>
                <div style={{ fontSize: '1.3rem', flexShrink: 0, lineHeight: 1, marginTop: '2px' }}>{getIcon(n.type)}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px', marginBottom: '3px' }}>
                    <div style={{ fontWeight: n.isRead ? '500' : '700', fontSize: '0.88rem', color: '#111827', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>{n.title}</div>
                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: getPriorityColor(n.priority), flexShrink: 0, marginTop: '4px' }} />
                  </div>
                  <p style={{ fontSize: '0.78rem', color: '#6B7280', margin: '0 0 6px', lineHeight: '1.4' }}>{n.body}</p>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.7rem', color: '#9CA3AF' }}>
                      {formatDistanceToNow(new Date(n.createdAt), { addSuffix: true })}
                    </span>
                    <div style={{ display: 'flex', gap: '4px' }}>
                      {!n.isRead && (
                        <button onClick={() => markAsRead(n._id)} title="Mark as read" style={{ background: '#F0FDF4', border: 'none', borderRadius: '5px', padding: '3px 7px', cursor: 'pointer', color: '#10B981' }}>
                          <FaCheck size={10} />
                        </button>
                      )}
                      <button onClick={() => deleteNotification(n._id)} title="Delete permanently" style={{ background: '#FEF2F2', border: 'none', borderRadius: '5px', padding: '3px 7px', cursor: 'pointer', color: '#EF4444' }}>
                        <FaTrash size={10} />
                      </button>
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
