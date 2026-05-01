import { useState, useEffect, useCallback } from 'react';
import { FaUserTie, FaSearch, FaCalendarAlt, FaExclamationTriangle, FaClock, FaCheck, FaVideo, FaMapMarkerAlt, FaPhoneAlt, FaEnvelopeOpen, FaBell } from 'react-icons/fa';
import { toast } from 'react-toastify';
import { leadApi } from '../../api/leadApi';
import { LEADS_ROLES } from '../../utils/pwaUtils';
import { useAuth } from '../../context/AuthContext';

// ─── helpers ────────────────────────────────────────────────────────────────
const STATUS_COLORS = {
  new:         { bg: '#DBEAFE', color: '#1D4ED8' },
  contacted:   { bg: '#D1FAE5', color: '#065F46' },
  qualified:   { bg: '#E0E7FF', color: '#3730A3' },
  proposal:    { bg: '#FEF3C7', color: '#92400E' },
  negotiation: { bg: '#FCE7F3', color: '#9D174D' },
  won:         { bg: '#D1FAE5', color: '#064E3B' },
  lost:        { bg: '#FEE2E2', color: '#991B1B' },
};

const MEETING_STATUS_COLORS = {
  Scheduled:  { bg: '#DBEAFE', color: '#1D4ED8' },
  Completed:  { bg: '#D1FAE5', color: '#065F46' },
  Cancelled:  { bg: '#F3F4F6', color: '#6B7280' },
  Missed:     { bg: '#FEE2E2', color: '#991B1B' },
};

function fmt(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  return `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()}`;
}

function Spinner() {
  return (
    <div style={{ textAlign: 'center', padding: '40px 0', color: '#6B7280' }}>
      <div style={{ width: '32px', height: '32px', border: '3px solid #E5E7EB', borderTopColor: '#6366F1', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 12px' }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}

function ErrorBlock({ msg, onRetry }) {
  return (
    <div style={{ textAlign: 'center', padding: '40px 16px' }}>
      <p style={{ color: '#EF4444', marginBottom: '12px' }}>{msg}</p>
      <button onClick={onRetry} style={{ background: '#6366F1', color: '#fff', border: 'none', borderRadius: '8px', padding: '10px 20px', cursor: 'pointer', fontWeight: '600' }}>Retry</button>
    </div>
  );
}

// ─── Lead List sub-tab ───────────────────────────────────────────────────────
const STATUS_OPTIONS = ['all','new','contacted','qualified','proposal','negotiation','won','lost'];

function LeadList() {
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [statusFilter, setStatusFilter] = useState('all');
  const [search, setSearch] = useState('');

  const fetch = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const res = await leadApi.getAllLeads();
      const raw = res?.data?.leads || res?.data?.data || res?.data || [];
      setLeads(Array.isArray(raw) ? raw : []);
    } catch { setError('Failed to load leads.'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  const handleStatus = async (id, status) => {
    const prev = leads;
    setLeads(c => c.map(l => l._id === id ? { ...l, status } : l));
    try { await leadApi.updateLeadStatus(id, status); toast.success(`Marked as ${status}`); }
    catch { setLeads(prev); toast.error('Failed to update.'); }
  };

  const filtered = leads.filter(l => {
    const ms = statusFilter === 'all' || l.status === statusFilter;
    const mq = !search || l.name?.toLowerCase().includes(search.toLowerCase()) || l.company?.toLowerCase().includes(search.toLowerCase());
    return ms && mq;
  });

  return (
    <div>
      {/* Search */}
      <div style={{ position: 'relative', marginBottom: '10px' }}>
        <FaSearch size={12} style={{ position: 'absolute', left: '11px', top: '50%', transform: 'translateY(-50%)', color: '#9CA3AF' }} />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search leads..." style={{ width: '100%', padding: '8px 12px 8px 32px', border: '1px solid #E5E7EB', borderRadius: '8px', fontSize: '13px', outline: 'none', boxSizing: 'border-box' }} />
      </div>
      {/* Status filter */}
      <div style={{ display: 'flex', gap: '5px', overflowX: 'auto', paddingBottom: '4px', marginBottom: '12px' }}>
        {STATUS_OPTIONS.map(s => (
          <button key={s} onClick={() => setStatusFilter(s)} style={{ padding: '4px 11px', borderRadius: '999px', border: '1px solid', borderColor: statusFilter === s ? '#6366F1' : '#E5E7EB', background: statusFilter === s ? '#6366F1' : '#fff', color: statusFilter === s ? '#fff' : '#6B7280', fontSize: '11px', fontWeight: '500', cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0 }}>
            {s === 'all' ? 'All' : s.charAt(0).toUpperCase() + s.slice(1)}
          </button>
        ))}
      </div>
      {loading && <Spinner />}
      {!loading && error && <ErrorBlock msg={error} onRetry={fetch} />}
      {!loading && !error && (
        filtered.length === 0
          ? <div style={{ textAlign: 'center', padding: '40px', color: '#9CA3AF' }}><FaUserTie size={36} style={{ opacity: 0.3, marginBottom: '10px' }} /><p>No leads found</p></div>
          : filtered.map(lead => {
            const sc = STATUS_COLORS[lead.status] || { bg: '#F3F4F6', color: '#374151' };
            const followUpDate = lead.followUpDate || lead.nextFollowUp || null;
            return (
              <div key={lead._id} style={{ background: '#fff', borderRadius: '10px', padding: '12px', marginBottom: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.07)', borderLeft: `4px solid ${sc.color}` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px', marginBottom: '4px' }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: '700', fontSize: '14px', color: '#111827', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{lead.name}</div>
                    {lead.company && <div style={{ fontSize: '11px', color: '#6B7280' }}>{lead.company}</div>}
                  </div>
                  <span style={{ ...sc, borderRadius: '999px', padding: '2px 8px', fontSize: '10px', fontWeight: '600', flexShrink: 0 }}>{lead.status}</span>
                </div>
                {(lead.phone || lead.email) && <div style={{ fontSize: '11px', color: '#6B7280', marginBottom: '4px' }}>{lead.phone && <span style={{ marginRight: '8px' }}>📞 {lead.phone}</span>}{lead.email && <span>✉️ {lead.email}</span>}</div>}
                {followUpDate && <div style={{ fontSize: '11px', color: '#6366F1', marginBottom: '6px' }}>📅 Follow-up: {fmt(followUpDate)}</div>}
                <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
                  {lead.status !== 'contacted' && <button onClick={() => handleStatus(lead._id, 'contacted')} style={{ padding: '3px 8px', fontSize: '10px', fontWeight: '600', color: '#065F46', background: '#D1FAE5', border: 'none', borderRadius: '5px', cursor: 'pointer' }}>✓ Contacted</button>}
                  {!['qualified','won','lost'].includes(lead.status) && <button onClick={() => handleStatus(lead._id, 'qualified')} style={{ padding: '3px 8px', fontSize: '10px', fontWeight: '600', color: '#3730A3', background: '#E0E7FF', border: 'none', borderRadius: '5px', cursor: 'pointer' }}>★ Qualified</button>}
                  {!['won','lost'].includes(lead.status) && <button onClick={() => handleStatus(lead._id, 'won')} style={{ padding: '3px 8px', fontSize: '10px', fontWeight: '600', color: '#064E3B', background: '#D1FAE5', border: 'none', borderRadius: '5px', cursor: 'pointer' }}>🏆 Won</button>}
                </div>
              </div>
            );
          })
      )}
    </div>
  );
}

// ─── Follow-Up Dashboard sub-tab ─────────────────────────────────────────────
function FollowUpDashboard() {
  const [data, setData] = useState({ overdue: [], today: [], upcoming: [], summary: { overdueCount: 0, todayCount: 0, upcomingCount: 0, totalPending: 0 } });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [section, setSection] = useState('overdue');

  const fetch = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const res = await leadApi.getFollowUpDashboard();
      setData(res.data || data);
    } catch { setError('Failed to load follow-ups.'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  const handleComplete = async (leadId, followUpId) => {
    try { await leadApi.completeFollowUp(leadId, followUpId); toast.success('Follow-up completed'); fetch(); }
    catch { toast.error('Failed to complete follow-up.'); }
  };

  const getIcon = (type) => {
    if (type === 'Call') return <FaPhoneAlt size={11} />;
    if (type === 'Email') return <FaEnvelopeOpen size={11} />;
    if (type === 'Meeting') return <FaCalendarAlt size={11} />;
    return <FaBell size={11} />;
  };

  const SECTIONS = [
    { key: 'overdue', label: 'Overdue', count: data.summary.overdueCount, color: '#EF4444' },
    { key: 'today',   label: 'Today',   count: data.summary.todayCount,   color: '#F59E0B' },
    { key: 'upcoming',label: 'Upcoming',count: data.summary.upcomingCount, color: '#6366F1' },
  ];

  const items = data[section] || [];

  return (
    <div>
      {/* Section tabs */}
      <div style={{ display: 'flex', gap: '6px', marginBottom: '12px' }}>
        {SECTIONS.map(s => (
          <button key={s.key} onClick={() => setSection(s.key)} style={{ flex: 1, padding: '7px 4px', borderRadius: '8px', border: '1px solid', borderColor: section === s.key ? s.color : '#E5E7EB', background: section === s.key ? s.color : '#fff', color: section === s.key ? '#fff' : '#6B7280', fontSize: '11px', fontWeight: '600', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
            <span>{s.label}</span>
            <span style={{ fontSize: '14px', fontWeight: '700' }}>{s.count}</span>
          </button>
        ))}
      </div>
      {loading && <Spinner />}
      {!loading && error && <ErrorBlock msg={error} onRetry={fetch} />}
      {!loading && !error && (
        items.length === 0
          ? <div style={{ textAlign: 'center', padding: '40px', color: '#9CA3AF' }}><FaCheck size={32} style={{ opacity: 0.3, marginBottom: '10px', color: '#10B981' }} /><p>All clear!</p></div>
          : items.map(fu => (
            <div key={fu._id} style={{ background: '#fff', borderRadius: '10px', padding: '12px', marginBottom: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.07)', borderLeft: `4px solid ${section === 'overdue' ? '#EF4444' : section === 'today' ? '#F59E0B' : '#6366F1'}` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: '700', fontSize: '14px', color: '#111827', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{fu.leadName}</div>
                  {fu.leadCompany && <div style={{ fontSize: '11px', color: '#6B7280' }}>{fu.leadCompany}</div>}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginTop: '4px', fontSize: '11px', color: '#6B7280' }}>
                    {getIcon(fu.followUpType)}
                    <span>{fu.followUpType}</span>
                    <span>·</span>
                    <FaClock size={10} />
                    <span>{fmt(fu.scheduledDate)}</span>
                  </div>
                  {fu.notes && <div style={{ fontSize: '11px', color: '#9CA3AF', marginTop: '3px', fontStyle: 'italic' }}>"{fu.notes}"</div>}
                  {(fu.leadPhone || fu.leadEmail) && <div style={{ fontSize: '11px', color: '#6B7280', marginTop: '3px' }}>{fu.leadPhone && <span style={{ marginRight: '8px' }}>📞 {fu.leadPhone}</span>}{fu.leadEmail && <span>✉️ {fu.leadEmail}</span>}</div>}
                </div>
                <button onClick={() => handleComplete(fu.leadId, fu._id)} style={{ padding: '5px 10px', fontSize: '11px', fontWeight: '600', color: '#065F46', background: '#D1FAE5', border: 'none', borderRadius: '6px', cursor: 'pointer', flexShrink: 0 }}>✓ Done</button>
              </div>
            </div>
          ))
      )}
    </div>
  );
}

// ─── Lead Meetings sub-tab ───────────────────────────────────────────────────
function LeadMeetings() {
  const { user } = useAuth();
  const isManager = ['admin', 'superadmin', 'manager', 'hod'].includes(user?.role);
  const [meetings, setMeetings] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [myOnly, setMyOnly] = useState(!isManager);
  const [section, setSection] = useState('upcoming');

  const fetch = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const res = myOnly ? await leadApi.getMyMeetings() : await leadApi.getAllMeetings();
      const raw = res?.data?.meetings || res?.data || [];
      setMeetings(Array.isArray(raw) ? raw : []);
    } catch { setError('Failed to load meetings.'); }
    finally { setLoading(false); }
  }, [myOnly]);

  useEffect(() => { fetch(); }, [fetch]);

  const handleComplete = async (leadId, meetingId) => {
    try { await leadApi.completeMeeting(leadId, meetingId); toast.success('Meeting completed'); fetch(); }
    catch { toast.error('Failed to complete meeting.'); }
  };

  const handleCancel = async (leadId, meetingId) => {
    try { await leadApi.cancelMeeting(leadId, meetingId); toast.success('Meeting cancelled'); fetch(); }
    catch { toast.error('Failed to cancel meeting.'); }
  };

  const now = new Date();
  const upcoming = meetings.filter(m => {
    const d = new Date(m.scheduledDate);
    if (m.scheduledTime) { const [h,min] = m.scheduledTime.split(':'); d.setHours(+h, +min); }
    return d >= now && m.status === 'Scheduled';
  });
  const past = meetings.filter(m => {
    const d = new Date(m.scheduledDate);
    if (m.scheduledTime) { const [h,min] = m.scheduledTime.split(':'); d.setHours(+h, +min); }
    return d < now || m.status !== 'Scheduled';
  });

  const items = section === 'upcoming' ? upcoming : past;

  return (
    <div>
      {/* Mine / All toggle */}
      {isManager && (
        <div style={{ display: 'flex', gap: '6px', marginBottom: '10px' }}>
          <button onClick={() => setMyOnly(false)} style={{ flex: 1, padding: '6px', borderRadius: '8px', border: '1px solid', borderColor: !myOnly ? '#6366F1' : '#E5E7EB', background: !myOnly ? '#6366F1' : '#fff', color: !myOnly ? '#fff' : '#6B7280', fontSize: '12px', fontWeight: '600', cursor: 'pointer' }}>All</button>
          <button onClick={() => setMyOnly(true)} style={{ flex: 1, padding: '6px', borderRadius: '8px', border: '1px solid', borderColor: myOnly ? '#6366F1' : '#E5E7EB', background: myOnly ? '#6366F1' : '#fff', color: myOnly ? '#fff' : '#6B7280', fontSize: '12px', fontWeight: '600', cursor: 'pointer' }}>Mine</button>
        </div>
      )}
      {/* Upcoming / Past toggle */}
      <div style={{ display: 'flex', gap: '6px', marginBottom: '12px' }}>
        {[{key:'upcoming',label:`Upcoming (${upcoming.length})`},{key:'past',label:`Past (${past.length})`}].map(s => (
          <button key={s.key} onClick={() => setSection(s.key)} style={{ flex: 1, padding: '6px', borderRadius: '8px', border: '1px solid', borderColor: section === s.key ? '#6366F1' : '#E5E7EB', background: section === s.key ? '#6366F1' : '#fff', color: section === s.key ? '#fff' : '#6B7280', fontSize: '12px', fontWeight: '600', cursor: 'pointer' }}>{s.label}</button>
        ))}
      </div>
      {loading && <Spinner />}
      {!loading && error && <ErrorBlock msg={error} onRetry={fetch} />}
      {!loading && !error && (
        items.length === 0
          ? <div style={{ textAlign: 'center', padding: '40px', color: '#9CA3AF' }}><FaCalendarAlt size={32} style={{ opacity: 0.3, marginBottom: '10px' }} /><p>No meetings</p></div>
          : items.map(m => {
            const sc = MEETING_STATUS_COLORS[m.status] || { bg: '#F3F4F6', color: '#374151' };
            return (
              <div key={m._id} style={{ background: '#fff', borderRadius: '10px', padding: '12px', marginBottom: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.07)', borderLeft: `4px solid ${sc.color}` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px', marginBottom: '4px' }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: '700', fontSize: '14px', color: '#111827', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.title}</div>
                    <div style={{ fontSize: '11px', color: '#6B7280' }}>{m.leadName}{m.leadCompany ? ` · ${m.leadCompany}` : ''}</div>
                    <div style={{ fontSize: '11px', color: '#6B7280', marginTop: '3px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                      <FaClock size={10} /><span>{fmt(m.scheduledDate)}{m.scheduledTime ? ` ${m.scheduledTime}` : ''}</span>
                      <span>·</span>
                      {m.meetingType === 'Online' ? <FaVideo size={10} /> : <FaMapMarkerAlt size={10} />}
                      <span>{m.meetingType}</span>
                      {m.duration && <span>· {m.duration}min</span>}
                    </div>
                  </div>
                  <span style={{ ...sc, borderRadius: '999px', padding: '2px 8px', fontSize: '10px', fontWeight: '600', flexShrink: 0 }}>{m.status}</span>
                </div>
                {m.meetingLink && <a href={m.meetingLink} target="_blank" rel="noopener noreferrer" style={{ fontSize: '11px', color: '#6366F1', display: 'block', marginBottom: '6px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>🔗 Join Meeting</a>}
                {m.location && <div style={{ fontSize: '11px', color: '#6B7280', marginBottom: '6px' }}>📍 {m.location}</div>}
                {m.status === 'Scheduled' && (
                  <div style={{ display: 'flex', gap: '5px' }}>
                    <button onClick={() => handleComplete(m.leadId, m._id)} style={{ padding: '3px 8px', fontSize: '10px', fontWeight: '600', color: '#065F46', background: '#D1FAE5', border: 'none', borderRadius: '5px', cursor: 'pointer' }}>✓ Complete</button>
                    <button onClick={() => handleCancel(m.leadId, m._id)} style={{ padding: '3px 8px', fontSize: '10px', fontWeight: '600', color: '#991B1B', background: '#FEE2E2', border: 'none', borderRadius: '5px', cursor: 'pointer' }}>✕ Cancel</button>
                  </div>
                )}
              </div>
            );
          })
      )}
    </div>
  );
}

// ─── Main FollowUpTab ────────────────────────────────────────────────────────
const SUB_TABS = [
  { key: 'leads',    label: 'Leads',      Icon: FaUserTie },
  { key: 'followup', label: 'Follow-Ups', Icon: FaExclamationTriangle },
  { key: 'meetings', label: 'Meetings',   Icon: FaCalendarAlt },
];

export default function FollowUpTab() {
  const { user } = useAuth();
  const [sub, setSub] = useState('followup');
  const hasAccess = user?.role && LEADS_ROLES.includes(user.role);

  if (!hasAccess) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px 24px', textAlign: 'center', color: '#6B7280' }}>
        <FaUserTie size={48} style={{ marginBottom: '16px', opacity: 0.35 }} />
        <p style={{ fontSize: '16px', fontWeight: '600', color: '#374151', marginBottom: '8px' }}>Leads Not Available</p>
        <p style={{ fontSize: '14px', lineHeight: '1.5' }}>This section is not available for your role.</p>
      </div>
    );
  }

  return (
    <div style={{ padding: '16px', paddingBottom: '80px', minHeight: '100%' }}>
      {/* Sub-tab bar */}
      <div style={{ display: 'flex', gap: '6px', marginBottom: '16px', background: '#F3F4F6', borderRadius: '10px', padding: '4px' }}>
        {SUB_TABS.map(({ key, label, Icon }) => (
          <button key={key} onClick={() => setSub(key)} style={{ flex: 1, padding: '7px 4px', borderRadius: '7px', border: 'none', background: sub === key ? '#fff' : 'transparent', color: sub === key ? '#6366F1' : '#6B7280', fontSize: '11px', fontWeight: '600', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px', boxShadow: sub === key ? '0 1px 3px rgba(0,0,0,0.1)' : 'none', transition: 'all 0.15s' }}>
            <Icon size={14} />
            {label}
          </button>
        ))}
      </div>

      {sub === 'leads'    && <LeadList />}
      {sub === 'followup' && <FollowUpDashboard />}
      {sub === 'meetings' && <LeadMeetings />}
    </div>
  );
}
