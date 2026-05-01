import { FaTasks, FaUserClock } from 'react-icons/fa';

const TABS = [
  { id: 'todo', label: 'To-Do', Icon: FaTasks },
  { id: 'followup', label: 'Leads', Icon: FaUserClock },
];

export default function BottomNav({ activeTab, onTabChange }) {
  return (
    <nav
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        display: 'flex',
        background: 'rgba(255,255,255,0.85)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderTop: '1px solid rgba(99,102,241,0.15)',
        zIndex: 100,
      }}
    >
      {TABS.map(({ id, label, Icon }) => {
        const isActive = activeTab === id;
        return (
          <button
            key={id}
            onClick={() => onTabChange(id)}
            style={{
              flex: 1,
              padding: '12px 0',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '4px',
              background: 'none',
              border: 'none',
              borderTop: isActive ? '2px solid #6366F1' : '2px solid transparent',
              color: isActive ? '#6366F1' : '#9CA3AF',
              cursor: 'pointer',
              transition: 'color 0.15s',
            }}
          >
            <Icon size={20} />
            <span style={{ fontSize: '0.7rem', fontWeight: isActive ? '600' : '400' }}>
              {label}
            </span>
          </button>
        );
      })}
    </nav>
  );
}
