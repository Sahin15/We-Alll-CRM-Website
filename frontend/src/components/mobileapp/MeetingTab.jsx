import { useState, useEffect, useCallback } from 'react';
import { FaCalendarAlt, FaVideo, FaMapMarkerAlt, FaClock, FaCheck, FaTimes, FaPlus, FaSearch, FaUser } from 'react-icons/fa';
import { toast } from 'react-toastify';
import { meetingApi } from '../../api/meetingApi';
import { useAuth } from '../../context/AuthContext';
import api from '../../api/axios';

const STATUS_COLORS = {
  scheduled:  { bg: '#DBEAFE', color: '#1D4ED8' },
  completed:  { bg: '#D1FAE5', color: '#065F46' },
  cancelled:  { bg: '#F3F4F6', color: '#6B7280' },
  ongoing:    { bg: '#FEF3C7', color: '#92400E' },
};

const inputStyle = {
  width: '100%', padding: '10px 12px', border: '1px solid #E5E7EB',
  borderRadius: '8px', fontSize: '14px', outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit',
};

function fmt(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

export default function MeetingTab() {
  const { user } = useAuth();
  const [meetings, setMeetings] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [filter, setFilter] = useState('upcoming');
  const [attendeeSearch, setAttendeeSearch] = useState('');
  const [showAttendeeDropdown, setShowAttendeeDropdown] = useState(false);
  const [form, setForm] = useState({
    title: '', date: '', startTime: '', endTime: '', duration: 30,
    type: 'team', meetingLink: '', location: '', description: '', attendees: [],
  });

  const fetchMeetings = useCallback(async () => {
    setLoading(true);
    try {
      const res = await meetingApi.getAllMeetings();
      const raw = res?.data?.meetings || res?.data || [];
      // Filter: only show meetings where current user is organizer or attendee
      const userId = user?._id || user?.id;
      const myMeetings = Array.isArray(raw) ? raw.filter(m => {
        const isOrganizer = m.organizer?._id === userId || m.organizer === userId || m.createdBy?._id === userId || m.createdBy === userId;
        const isAttendee = m.attendees?.some(a => (a._id || a) === userId);
        return isOrganizer || isAttendee;
      }) : [];
      setMeetings(myMeetings);
    } catch { setMeetings([]); }
    finally { setLoading(false); }
  }, [user]);

  const fetchEmployees = useCallback(async () => {
    try {
      const res = await api.get('/users', { params: { status: 'active', limit: 1000 } });
      setEmployees(res.data || []);
    } catch {}
  }, []);

  useEffect(() => { fetchMeetings(); fetchEmployees(); }, [fetchMeetings, fetchEmployees]);

  const addAttendee = (emp) => {
    if (!form.attendees.includes(emp._id)) {
      setForm(f => ({ ...f, attendees: [...f.attendees, emp._id] }));
    }
    setAttendeeSearch('');
    setShowAttendeeDropdown(false);
  };

  const removeAttendee = (id) => {
    setForm(f => ({ ...f, attendees: f.attendees.filter(a => a !== id) }));
  };

  const getEmployeeName = (id) => {
    const emp = employees.find(e => e._id === id);
    return emp?.name || id;
  };

  const filteredEmployees = employees.filter(e =>
    e._id !== (user?._id || user?.id) &&
    !form.attendees.includes(e._id) &&
    (e.name?.toLowerCase().includes(attendeeSearch.toLowerCase()) || e.email?.toLowerCase().includes(attendeeSearch.toLowerCase()))
  );

  const handleSubmit = async () => {
    if (!form.title.trim() || !form.date || !form.startTime || !form.endTime) {
      toast.error('Please fill title, date, start time and end time'); return;
    }
    if (form.attendees.length === 0) {
      toast.error('Please select at least one attendee'); return;
    }
    setSaving(true);
    try {
      await meetingApi.createMeeting(form);
      toast.success('Meeting scheduled!');
      setShowForm(false);
      setForm({ title: '', date: '', startTime: '', endTime: '', duration: 30, type: 'team', meetingLink: '', location: '', description: '', attendees: [] });
      setAttendeeSearch('');
      await fetchMeetings();
    } catch (e) {
      toast.error(e.response?.data?.message || 'Failed to schedule meeting');
    } finally { setSaving(false); }
  };

  const handleRespond = async (id, response) => {
    try {
      await meetingApi.respondToMeeting(id, response);
      toast.success(`Meeting ${response}`);
      await fetchMeetings();
    } catch (e) {
      toast.error(e.response?.data?.message || 'Failed to respond');
    }
  };

  const now = new Date();
  const upcoming = meetings.filter(m => {
    const d = new Date(m.date || m.scheduledDate);
    return d >= now && m.status !== 'cancelled' && m.status !== 'completed';
  });
  const past = meetings.filter(m => {
    const d = new Date(m.date || m.scheduledDate);
    return d < now || m.status === 'completed' || m.status === 'cancelled';
  });
  const displayed = filter === 'upcoming' ? upcoming : past;

  if (loading) return (
    <div style={{ textAlign: 'center', padding: '60px 0', color: '#6B7280' }}>
      <div style={{ width: '32px', height: '32px', border: '3px solid #E5E7EB', borderTopColor: '#10B981', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto' }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  return (
    <div style={{ padding: '16px', paddingBottom: '80px' }}>
      {!showForm && (
        <button onClick={() => setShowForm(true)} style={{ width: '100%', padding: '14px', borderRadius: '12px', border: 'none', background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)', color: '#fff', fontWeight: '700', fontSize: '0.95rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginBottom: '16px', boxShadow: '0 4px 15px rgba(16,185,129,0.3)' }}>
          <FaPlus size={14} /> Schedule Meeting
        </button>
      )}

      {showForm && (
        <div style={{ background: '#fff', borderRadius: '12px', padding: '16px', boxShadow: '0 1px 4px rgba(0,0,0,0.08)', marginBottom: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <h6 style={{ fontWeight: '700', color: '#111827', margin: 0 }}>Schedule Meeting</h6>
            <button onClick={() => setShowForm(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6B7280' }}><FaTimes /></button>
          </div>

          {/* Title */}
          <div style={{ marginBottom: '10px' }}>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '600', color: '#374151', marginBottom: '4px' }}>Title *</label>
            <input type="text" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="Meeting title" style={inputStyle} />
          </div>

          {/* Date + Start/End time */}
          <div style={{ marginBottom: '10px' }}>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '600', color: '#374151', marginBottom: '4px' }}>Date *</label>
            <input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} style={inputStyle} />
          </div>
          <div style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '600', color: '#374151', marginBottom: '4px' }}>Start Time *</label>
              <input type="time" value={form.startTime} onChange={e => setForm({ ...form, startTime: e.target.value })} style={inputStyle} />
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '600', color: '#374151', marginBottom: '4px' }}>End Time *</label>
              <input type="time" value={form.endTime} onChange={e => setForm({ ...form, endTime: e.target.value })} style={inputStyle} />
            </div>
          </div>

          {/* Type */}
          <div style={{ marginBottom: '10px' }}>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '600', color: '#374151', marginBottom: '4px' }}>Meeting Type</label>
            <select value={form.type} onChange={e => setForm({ ...form, type: e.target.value })} style={{ ...inputStyle, background: '#fff' }}>
              <option value="team">Team</option>
              <option value="one-on-one">1-on-1</option>
              <option value="client">Client</option>
              <option value="training">Training</option>
              <option value="other">Other</option>
            </select>
          </div>

          {/* Meeting link */}
          <div style={{ marginBottom: '10px' }}>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '600', color: '#374151', marginBottom: '4px' }}>Meeting Link</label>
            <input type="url" value={form.meetingLink} onChange={e => setForm({ ...form, meetingLink: e.target.value })} placeholder="https://meet.google.com/..." style={inputStyle} />
          </div>

          {/* Location */}
          <div style={{ marginBottom: '10px' }}>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '600', color: '#374151', marginBottom: '4px' }}>Location</label>
            <input type="text" value={form.location} onChange={e => setForm({ ...form, location: e.target.value })} placeholder="Meeting venue (optional)" style={inputStyle} />
          </div>

          {/* Attendees */}
          <div style={{ marginBottom: '12px' }}>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '600', color: '#374151', marginBottom: '4px' }}>
              Attendees * <span style={{ color: '#9CA3AF', fontWeight: '400' }}>({form.attendees.length} selected)</span>
            </label>

            {/* Selected attendees */}
            {form.attendees.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '8px' }}>
                {form.attendees.map(id => (
                  <div key={id} style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '3px 8px', background: '#ECFDF5', borderRadius: '999px', fontSize: '12px', color: '#065F46', border: '1px solid #10B981' }}>
                    <FaUser size={9} />
                    <span>{getEmployeeName(id)}</span>
                    <button onClick={() => removeAttendee(id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#EF4444', padding: 0, lineHeight: 1 }}>×</button>
                  </div>
                ))}
              </div>
            )}

            {/* Search attendees */}
            <div style={{ position: 'relative' }}>
              <div style={{ position: 'relative' }}>
                <FaSearch size={12} style={{ position: 'absolute', left: '11px', top: '50%', transform: 'translateY(-50%)', color: '#9CA3AF' }} />
                <input
                  type="text"
                  value={attendeeSearch}
                  onChange={e => { setAttendeeSearch(e.target.value); setShowAttendeeDropdown(true); }}
                  onFocus={() => setShowAttendeeDropdown(true)}
                  onBlur={() => setTimeout(() => setShowAttendeeDropdown(false), 200)}
                  placeholder="Search employees to add..."
                  style={{ ...inputStyle, paddingLeft: '32px' }}
                />
              </div>
              {showAttendeeDropdown && filteredEmployees.length > 0 && (
                <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: '#fff', border: '1px solid #E5E7EB', borderRadius: '8px', maxHeight: '180px', overflowY: 'auto', zIndex: 50, boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
                  {filteredEmployees.slice(0, 10).map(emp => (
                    <div key={emp._id} onMouseDown={() => addAttendee(emp)} style={{ padding: '9px 12px', cursor: 'pointer', fontSize: '13px', borderBottom: '1px solid #F3F4F6', display: 'flex', alignItems: 'center', gap: '8px' }}
                      onMouseEnter={e => e.currentTarget.style.background = '#F9FAFB'}
                      onMouseLeave={e => e.currentTarget.style.background = '#fff'}>
                      <FaUser size={11} color="#9CA3AF" />
                      <div>
                        <div style={{ fontWeight: '600', color: '#111827' }}>{emp.name}</div>
                        <div style={{ fontSize: '11px', color: '#9CA3AF' }}>{emp.designation || emp.role}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Description */}
          <div style={{ marginBottom: '14px' }}>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '600', color: '#374151', marginBottom: '4px' }}>Description</label>
            <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Agenda, topics..." rows={2} style={{ ...inputStyle, resize: 'vertical' }} />
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <button onClick={handleSubmit} disabled={saving} style={{ flex: 1, padding: '12px', borderRadius: '8px', border: 'none', background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)', color: '#fff', fontWeight: '700', cursor: 'pointer', opacity: saving ? 0.7 : 1 }}>
              {saving ? 'Scheduling...' : 'Schedule'}
            </button>
            <button onClick={() => setShowForm(false)} style={{ padding: '12px 16px', borderRadius: '8px', border: '1px solid #E5E7EB', background: '#fff', color: '#6B7280', fontWeight: '600', cursor: 'pointer' }}>Cancel</button>
          </div>
        </div>
      )}

      {/* Filter tabs */}
      <div style={{ display: 'flex', gap: '6px', marginBottom: '12px', background: '#F3F4F6', borderRadius: '10px', padding: '4px' }}>
        {[{ key: 'upcoming', label: `Upcoming (${upcoming.length})` }, { key: 'past', label: `Past (${past.length})` }].map(t => (
          <button key={t.key} onClick={() => setFilter(t.key)} style={{ flex: 1, padding: '7px', borderRadius: '7px', border: 'none', background: filter === t.key ? '#fff' : 'transparent', color: filter === t.key ? '#10B981' : '#6B7280', fontSize: '12px', fontWeight: '600', cursor: 'pointer', boxShadow: filter === t.key ? '0 1px 3px rgba(0,0,0,0.1)' : 'none' }}>{t.label}</button>
        ))}
      </div>

      {/* Meeting list */}
      {displayed.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px', color: '#9CA3AF' }}>
          <FaCalendarAlt size={36} style={{ opacity: 0.3, marginBottom: '10px' }} />
          <p>No {filter} meetings</p>
        </div>
      ) : (
        displayed.map(m => {
          const sc = STATUS_COLORS[m.status?.toLowerCase()] || STATUS_COLORS.scheduled;
          const meetingDate = m.date || m.scheduledDate;
          const meetingTime = m.startTime || m.time || m.scheduledTime;
          return (
            <div key={m._id} style={{ background: '#fff', borderRadius: '10px', padding: '12px', marginBottom: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.07)', borderLeft: `4px solid ${sc.color}` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px', marginBottom: '6px' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: '700', fontSize: '0.9rem', color: '#111827', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.title}</div>
                  <div style={{ fontSize: '0.75rem', color: '#6B7280', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <FaClock size={10} />
                    <span>{fmt(meetingDate)}{meetingTime ? ` · ${meetingTime}` : ''}</span>
                  </div>
                  {m.organizer?.name && <div style={{ fontSize: '0.72rem', color: '#9CA3AF', marginTop: '2px' }}>By: {m.organizer.name}</div>}
                  {m.attendees?.length > 0 && <div style={{ fontSize: '0.72rem', color: '#9CA3AF', marginTop: '2px' }}>{m.attendees.length} attendee{m.attendees.length !== 1 ? 's' : ''}</div>}
                </div>
                <span style={{ ...sc, borderRadius: '999px', padding: '2px 8px', fontSize: '10px', fontWeight: '600', flexShrink: 0, textTransform: 'capitalize' }}>{m.status || 'Scheduled'}</span>
              </div>
              {m.meetingLink && <a href={m.meetingLink} target="_blank" rel="noopener noreferrer" style={{ fontSize: '11px', color: '#10B981', display: 'block', marginBottom: '4px' }}>🔗 Join Meeting</a>}
              {m.location && <div style={{ fontSize: '11px', color: '#6B7280', marginBottom: '4px' }}>📍 {m.location}</div>}
              {m.description && <div style={{ fontSize: '11px', color: '#9CA3AF', marginBottom: '4px' }}>{m.description}</div>}
            </div>
          );
        })
      )}
    </div>
  );
}
