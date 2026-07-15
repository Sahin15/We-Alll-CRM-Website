import { useState, lazy, Suspense, useEffect, useRef } from 'react';
import MobileAppHeader from './MobileAppHeader';
import MobileAppBottomNav from './MobileAppBottomNav';
import { meetingApi } from '../../api/meetingApi';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';
import { toast } from 'react-toastify';
import { playNotificationSound } from '../../utils/notificationSound';
import { BRAND_LOGO_MINI } from '../../constants/branding';

const HomeTab    = lazy(() => import('./HomeTab'));
const TodoTab    = lazy(() => import('./TodoTab'));
const WorkLogTab = lazy(() => import('./WorkLogTab'));
const LeaveTab   = lazy(() => import('./LeaveTab'));
const MoreTab    = lazy(() => import('./MoreTab'));

const Loader = () => (
  <div style={{ textAlign: 'center', padding: '60px 0', color: '#6B7280' }}>
    <div style={{ width: '32px', height: '32px', border: '3px solid #E5E7EB', borderTopColor: '#10B981', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto' }} />
    <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
  </div>
);

export default function MobileAppLayout() {
  const [activeTab, setActiveTab] = useState('home');
  const { user } = useAuth();
  const { unreadCount } = useNotifications();
  const remindedRef = useRef(new Set());
  const prevUnreadRef = useRef(unreadCount);

  // Play sound when new notifications arrive
  useEffect(() => {
    if (unreadCount > prevUnreadRef.current) {
      playNotificationSound();
    }
    prevUnreadRef.current = unreadCount;
  }, [unreadCount]); // track already-reminded meeting IDs

  // 5-minute meeting reminder
  useEffect(() => {
    const checkMeetings = async () => {
      try {
        const res = await meetingApi.getAllMeetings();
        const raw = res?.data?.meetings || res?.data || [];
        const userId = user?._id || user?.id;
        const now = new Date();

        raw.forEach(m => {
          if (m.status === 'cancelled' || m.status === 'completed') return;

          // Only meetings where user is organizer or attendee
          const isOrganizer = m.organizer?._id === userId || m.organizer === userId;
          const isAttendee = m.attendees?.some(a => (a._id || a) === userId);
          if (!isOrganizer && !isAttendee) return;

          const meetingDate = new Date(m.date || m.scheduledDate);
          const timeStr = m.startTime || m.time || m.scheduledTime;
          if (timeStr) {
            const [h, min] = timeStr.split(':');
            meetingDate.setHours(parseInt(h), parseInt(min), 0, 0);
          }

          const diffMs = meetingDate - now;
          const diffMin = diffMs / 60000;

          // Fire reminder if meeting is 4-6 minutes away and not already reminded
          if (diffMin >= 4 && diffMin <= 6 && !remindedRef.current.has(m._id)) {
            remindedRef.current.add(m._id);
            playNotificationSound();
            toast.info(
              `📅 Meeting in 5 minutes: "${m.title}"${m.meetingLink ? ' — ' + m.meetingLink : ''}`,
              { autoClose: 10000, position: 'top-center' }
            );
            // Browser notification if permission granted
            if (Notification.permission === 'granted') {
              new Notification('Meeting in 5 minutes', {
                body: m.title,
                icon: BRAND_LOGO_MINI,
              });
            }
          }
        });
      } catch {}
    };

    // Request browser notification permission
    if (Notification.permission === 'default') {
      Notification.requestPermission();
    }

    checkMeetings();
    const interval = setInterval(checkMeetings, 60000); // check every minute
    return () => clearInterval(interval);
  }, [user]);

  return (
    <div style={{ height: '100dvh', minHeight: '100vh', display: 'flex', flexDirection: 'column', background: '#F9FAFB' }}>
      <MobileAppHeader />
      <main style={{ flex: 1, overflowY: 'auto', paddingTop: '56px', paddingBottom: '72px' }}>
        <Suspense fallback={<Loader />}>
          {activeTab === 'home'    && <HomeTab />}
          {activeTab === 'todo'    && <TodoTab />}
          {activeTab === 'worklog' && <WorkLogTab />}
          {activeTab === 'leave'   && <LeaveTab />}
          {activeTab === 'more'    && <MoreTab />}
        </Suspense>
      </main>
      <MobileAppBottomNav activeTab={activeTab} onTabChange={setActiveTab} />
    </div>
  );
}
