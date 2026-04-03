import { useState, useEffect } from 'react';
import { Toast, ToastContainer } from 'react-bootstrap';
import { FaTimes } from 'react-icons/fa';
import './NotificationToast.css';

const NOTIFICATION_ICONS = {
  // Leave
  leave_approval: '✅',
  leave_rejection: '❌',
  leave_request: '📋',
  // Meeting
  meeting_scheduled: '📅',
  meeting_updated: '📅',
  meeting_cancelled: '🚫',
  meeting_reminder_15min: '⏰',
  meeting_reminder_1hour: '📅',
  // Work / Task
  task_assigned: '📋',
  work_assigned: '📋',
  work_reassigned: '🔄',
  work_reassigned_from: '🔄',
  work_reassigned_project: '🔄',
  work_updated: '✏️',
  work_updated_project: '✏️',
  work_status_changed: '🔄',
  work_completed: '✅',
  review_requested: '👀',
  // Expense
  expense_approval: '💰',
  expense_rejection: '❌',
  expense_submitted: '🧾',
  expense_reimbursed: '💸',
  // Invoice
  invoice_generated: '🧾',
  invoice_sent: '📤',
  invoice_paid: '✅',
  invoice_overdue: '⚠️',
  // Client
  client_created: '🤝',
  client_status_changed: '🔄',
  // Project
  project_created: '🚀',
  project_status_changed: '🔄',
  project_deadline_7days: '📅',
  project_deadline_3days: '⏰',
  // WFH
  wfh_request_submitted: '🏠',
  wfh_request_approved: '✅',
  wfh_request_rejected: '❌',
  // Payment / Billing
  payment_processed: '💳',
  payment_due: '💰',
  payment_overdue: '⚠️',
  // Plan
  plan_renewal_reminder: '📅',
  plan_expiring: '⚠️',
  plan_expired: '🚫',
  // Attendance
  attendance_alert: '⏰',
  attendance_auto_clockout: '⚠️',
  // Other
  work_log_reminder: '📝',
  announcement: '📢',
  general: '📬',
};

const NOTIFICATION_COLORS = {
  leave_approval: 'success',
  leave_rejection: 'danger',
  leave_request: 'info',
  meeting_scheduled: 'info',
  meeting_updated: 'info',
  meeting_cancelled: 'danger',
  meeting_reminder_15min: 'warning',
  meeting_reminder_1hour: 'info',
  task_assigned: 'primary',
  work_assigned: 'primary',
  work_reassigned: 'primary',
  work_reassigned_from: 'secondary',
  work_reassigned_project: 'secondary',
  work_updated: 'info',
  work_updated_project: 'info',
  work_status_changed: 'info',
  work_completed: 'success',
  review_requested: 'warning',
  expense_approval: 'success',
  expense_rejection: 'danger',
  expense_submitted: 'info',
  expense_reimbursed: 'success',
  invoice_generated: 'info',
  invoice_sent: 'primary',
  invoice_paid: 'success',
  invoice_overdue: 'danger',
  client_created: 'success',
  client_status_changed: 'warning',
  project_created: 'success',
  project_status_changed: 'info',
  project_deadline_7days: 'warning',
  project_deadline_3days: 'danger',
  wfh_request_submitted: 'info',
  wfh_request_approved: 'success',
  wfh_request_rejected: 'danger',
  payment_processed: 'success',
  payment_due: 'warning',
  payment_overdue: 'danger',
  plan_renewal_reminder: 'warning',
  plan_expiring: 'warning',
  plan_expired: 'danger',
  attendance_alert: 'warning',
  attendance_auto_clockout: 'warning',
  work_log_reminder: 'info',
  announcement: 'warning',
  general: 'secondary',
};

const NotificationToast = ({ notification, onClose, onActionClick }) => {
  const [show, setShow] = useState(true);

  useEffect(() => {
    playNotificationSound();
    const timer = setTimeout(() => {
      setShow(false);
      onClose();
    }, 5000);
    return () => clearTimeout(timer);
  }, [onClose]);

  const playNotificationSound = () => {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      const audioContext = new AudioCtx();
      
      // Get user's saved notification settings
      const sound = localStorage.getItem('notificationSound') || 'bell_chime';
      const volume = parseFloat(localStorage.getItem('notificationVolume') || '0.3');
      
      // Sound configurations
      const NOTIFICATION_SOUNDS = {
        bell_chime: {
          tones: [
            { freq: 523, duration: 0.25, delay: 0 },
            { freq: 659, duration: 0.25, delay: 0.15 }
          ]
        },
        digital_ping: {
          tones: [
            { freq: 800, duration: 0.15, delay: 0 },
            { freq: 1000, duration: 0.15, delay: 0.1 }
          ]
        },
        soft_chime: {
          tones: [
            { freq: 440, duration: 0.4, delay: 0 }
          ]
        },
        ascending_tones: {
          tones: [
            { freq: 440, duration: 0.15, delay: 0 },
            { freq: 523, duration: 0.15, delay: 0.12 },
            { freq: 659, duration: 0.15, delay: 0.24 }
          ]
        },
        melodic_alert: {
          tones: [
            { freq: 659, duration: 0.2, delay: 0 },
            { freq: 523, duration: 0.2, delay: 0.15 },
            { freq: 659, duration: 0.25, delay: 0.3 }
          ]
        },
        bright_ding: {
          tones: [
            { freq: 1046, duration: 0.2, delay: 0 },
            { freq: 784, duration: 0.2, delay: 0.15 }
          ]
        },
        subtle_beep: {
          tones: [
            { freq: 600, duration: 0.1, delay: 0 }
          ]
        }
      };
      
      const soundConfig = NOTIFICATION_SOUNDS[sound] || NOTIFICATION_SOUNDS.bell_chime;
      
      const playTone = (freq, startTime, duration, gainValue) => {
        const osc = audioContext.createOscillator();
        const gain = audioContext.createGain();
        osc.connect(gain);
        gain.connect(audioContext.destination);
        osc.type = 'sine';
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0, startTime);
        gain.gain.linearRampToValueAtTime(gainValue, startTime + 0.05);
        gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
        osc.start(startTime);
        osc.stop(startTime + duration);
      };
      
      const now = audioContext.currentTime;
      soundConfig.tones.forEach(tone => {
        playTone(tone.freq, now + tone.delay, tone.duration, volume);
      });
    } catch (error) {
      // Sound is optional — fail silently
    }
  };

  if (!notification) return null;

  const icon = NOTIFICATION_ICONS[notification.type] || '📬';
  const color = NOTIFICATION_COLORS[notification.type] || 'secondary';

  return (
    <ToastContainer position="top-end" className="p-3 notification-toast-container">
      <Toast
        show={show}
        onClose={() => { setShow(false); onClose(); }}
        className={`notification-toast bg-${color}`}
      >
        <Toast.Header closeButton={false} className="d-flex justify-content-between align-items-center">
          <span className="me-2">{icon}</span>
          <strong className="me-auto">{notification.title}</strong>
          <button
            type="button"
            className="btn-close"
            onClick={() => { setShow(false); onClose(); }}
            aria-label="Close"
          >
            <FaTimes />
          </button>
        </Toast.Header>
        <Toast.Body
          onClick={() => onActionClick && onActionClick(notification)}
          style={{ cursor: 'pointer' }}
        >
          {notification.body}
        </Toast.Body>
      </Toast>
    </ToastContainer>
  );
};

export default NotificationToast;
