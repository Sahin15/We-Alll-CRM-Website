import { useRegisterSW } from 'virtual:pwa-register/react';

export default function UpdatePrompt() {
  const {
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW();

  if (!needRefresh) return null;

  return (
    <div
      style={{
        position: 'fixed',
        bottom: '72px', // above bottom nav
        left: '50%',
        transform: 'translateX(-50%)',
        backgroundColor: '#6366F1',
        color: '#ffffff',
        borderRadius: '12px',
        padding: '12px 20px',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        boxShadow: '0 4px 20px rgba(99,102,241,0.4)',
        zIndex: 200,
        fontSize: '0.9rem',
        whiteSpace: 'nowrap',
      }}
    >
      <span>New version available</span>
      <button
        onClick={() => updateServiceWorker(true)}
        style={{
          backgroundColor: '#ffffff',
          color: '#6366F1',
          border: 'none',
          borderRadius: '8px',
          padding: '6px 14px',
          fontWeight: '600',
          fontSize: '0.85rem',
          cursor: 'pointer',
        }}
      >
        Reload
      </button>
    </div>
  );
}
