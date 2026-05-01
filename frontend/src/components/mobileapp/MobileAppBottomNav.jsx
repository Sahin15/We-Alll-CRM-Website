import { FaHome, FaTasks, FaClipboardList, FaUmbrellaBeach, FaEllipsisH } from 'react-icons/fa';

const TABS = [
  { id: 'home',    label: 'Home',     Icon: FaHome },
  { id: 'todo',    label: 'To-Do',    Icon: FaTasks },
  { id: 'worklog', label: 'Work Log', Icon: FaClipboardList },
  { id: 'leave',   label: 'Leave',    Icon: FaUmbrellaBeach },
  { id: 'more',    label: 'More',     Icon: FaEllipsisH },
];

export default function MobileAppBottomNav({ activeTab, onTabChange }) {
  return (
    <nav style={{
      position: 'fixed', bottom: 0, left: 0, right: 0,
      display: 'flex',
      background: 'rgba(255,255,255,0.9)',
      backdropFilter: 'blur(20px)',
      WebkitBackdropFilter: 'blur(20px)',
      borderTop: '1px solid rgba(16,185,129,0.15)',
      zIndex: 100,
    }}>
      {TABS.map(({ id, label, Icon }) => {
        const isActive = activeTab === id;
        return (
          <button key={id} onClick={() => onTabChange(id)} style={{
            flex: 1, padding: '10px 0',
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px',
            background: 'none', border: 'none',
            borderTop: isActive ? '2px solid #10B981' : '2px solid transparent',
            color: isActive ? '#10B981' : '#9CA3AF',
            cursor: 'pointer', transition: 'color 0.15s',
          }}>
            <Icon size={18} />
            <span style={{ fontSize: '0.62rem', fontWeight: isActive ? '600' : '400' }}>{label}</span>
          </button>
        );
      })}
    </nav>
  );
}
