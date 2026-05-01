import { useState, lazy, Suspense } from 'react';
import { FaReceipt, FaCalendarAlt } from 'react-icons/fa';

const ExpensesTab = lazy(() => import('./ExpensesTab'));
const MeetingTab  = lazy(() => import('./MeetingTab'));

const SUB_TABS = [
  { key: 'expenses', label: 'Expenses', Icon: FaReceipt },
  { key: 'meetings', label: 'Meetings', Icon: FaCalendarAlt },
];

export default function MoreTab() {
  const [sub, setSub] = useState('expenses');

  return (
    <div style={{ minHeight: '100%' }}>
      {/* Sub-tab bar */}
      <div style={{ display: 'flex', gap: '6px', padding: '12px 16px 0', background: '#F9FAFB' }}>
        {SUB_TABS.map(({ key, label, Icon }) => (
          <button key={key} onClick={() => setSub(key)} style={{
            flex: 1, padding: '9px 4px', borderRadius: '8px', border: '1px solid',
            borderColor: sub === key ? '#10B981' : '#E5E7EB',
            background: sub === key ? '#10B981' : '#fff',
            color: sub === key ? '#fff' : '#6B7280',
            fontSize: '12px', fontWeight: '600', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
          }}>
            <Icon size={13} /> {label}
          </button>
        ))}
      </div>

      <Suspense fallback={
        <div style={{ textAlign: 'center', padding: '60px 0', color: '#6B7280' }}>
          <div style={{ width: '28px', height: '28px', border: '3px solid #E5E7EB', borderTopColor: '#10B981', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto' }} />
          <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        </div>
      }>
        {sub === 'expenses' && <ExpensesTab />}
        {sub === 'meetings' && <MeetingTab />}
      </Suspense>
    </div>
  );
}
