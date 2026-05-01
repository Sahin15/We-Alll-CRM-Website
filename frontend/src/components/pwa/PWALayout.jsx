import { useState, lazy, Suspense, useEffect, useRef } from 'react';
import AppHeader from './AppHeader';
import BottomNav from './BottomNav';
import UpdatePrompt from './UpdatePrompt';
import { useNotifications } from '../../context/NotificationContext';
import { playNotificationSound } from '../../utils/notificationSound';

const TodoTab = lazy(() => import('./TodoTab'));
const FollowUpTab = lazy(() => import('./FollowUpTab'));

export default function PWALayout() {
  const [activeTab, setActiveTab] = useState('todo');
  const { unreadCount } = useNotifications();
  const prevUnreadRef = useRef(unreadCount);

  // Play sound when new notifications arrive
  useEffect(() => {
    if (unreadCount > prevUnreadRef.current) {
      playNotificationSound();
    }
    prevUnreadRef.current = unreadCount;
  }, [unreadCount]);

  return (
    <div
      style={{
        height: '100dvh',
        // fallback for browsers that don't support dvh
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        background: '#F9FAFB',
      }}
    >
      <AppHeader />

      {/* Scrollable content area */}
      <main
        style={{
          flex: 1,
          overflowY: 'auto',
          paddingTop: '56px',  // AppHeader height
          paddingBottom: '80px', // BottomNav clearance
        }}
      >
        <Suspense
          fallback={
            <div
              style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                height: '200px',
                color: '#9CA3AF',
                fontSize: '0.9rem',
              }}
            >
              Loading…
            </div>
          }
        >
          {activeTab === 'todo' ? <TodoTab /> : <FollowUpTab />}
        </Suspense>
      </main>

      <BottomNav activeTab={activeTab} onTabChange={setActiveTab} />
      <UpdatePrompt />
    </div>
  );
}
