import { useMemo } from 'react';

const STATUS_BADGE_COLORS = {
  new:       { background: '#DBEAFE', color: '#1D4ED8' },
  contacted: { background: '#D1FAE5', color: '#065F46' },
  qualified: { background: '#E0E7FF', color: '#3730A3' },
  lost:      { background: '#FEE2E2', color: '#991B1B' },
  won:       { background: '#D1FAE5', color: '#064E3B' },
};

function toDateOnly(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function formatFollowUpDate(dateStr) {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  const today = toDateOnly(new Date());
  const target = toDateOnly(d);
  const diff = (target - today) / (1000 * 60 * 60 * 24);
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Tomorrow';
  if (diff === -1) return 'Yesterday';
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  return `${day}/${month}/${d.getFullYear()}`;
}

function getCardStyle(lead, followUpDate) {
  const today = toDateOnly(new Date());
  if (lead.status === 'contacted') {
    return { borderLeft: '4px solid #10B981', background: '#fff', opacity: 0.7 };
  }
  if (followUpDate) {
    const target = toDateOnly(new Date(followUpDate));
    if (target < today) return { borderLeft: '4px solid #EF4444', background: '#FEF2F2', opacity: 1 };
    if (target.getTime() === today.getTime()) return { borderLeft: '4px solid #6366F1', background: '#EEF2FF', opacity: 1 };
  }
  return { borderLeft: '4px solid #D1D5DB', background: '#fff', opacity: 1 };
}

export default function LeadCard({ lead, onMarkContacted }) {
  const followUpDate = lead.followUpDate || lead.nextFollowUp || lead.followUp?.date || null;
  const formattedDate = useMemo(() => formatFollowUpDate(followUpDate), [followUpDate]);
  const cardStyle = useMemo(() => getCardStyle(lead, followUpDate), [lead, followUpDate]);
  const badgeColors = STATUS_BADGE_COLORS[lead.status] || { background: '#F3F4F6', color: '#374151' };

  return (
    <div style={{ ...cardStyle, borderRadius: '10px', padding: '14px 16px', marginBottom: '10px', boxShadow: '0 1px 3px rgba(0,0,0,0.07)', transition: 'opacity 0.2s' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
        <span style={{ fontWeight: '700', fontSize: '15px', color: '#111827', flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {lead.name}
        </span>
        <span style={{ ...badgeColors, borderRadius: '999px', padding: '2px 10px', fontSize: '11px', fontWeight: '600', whiteSpace: 'nowrap', flexShrink: 0 }}>
          {lead.status}
        </span>
      </div>
      {lead.company && <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#6B7280' }}>{lead.company}</p>}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '10px', gap: '8px' }}>
        {formattedDate
          ? <span style={{ fontSize: '12px', color: '#6B7280' }}>Follow-up: <strong>{formattedDate}</strong></span>
          : <span style={{ fontSize: '12px', color: '#9CA3AF' }}>No follow-up date</span>
        }
        {lead.status !== 'contacted' && (
          <button
            onClick={() => onMarkContacted && onMarkContacted(lead._id)}
            style={{ padding: '5px 12px', fontSize: '12px', fontWeight: '600', color: '#6366F1', background: 'transparent', border: '1.5px solid #6366F1', borderRadius: '6px', cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0 }}
          >
            Mark as Contacted
          </button>
        )}
      </div>
    </div>
  );
}
