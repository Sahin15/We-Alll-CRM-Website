import { useState, useEffect } from 'react';
import { Card, Badge, Button, Spinner } from 'react-bootstrap';
import { FaBullhorn, FaEye } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';

const QuickAnnouncements = ({ onAnnouncementClick }) => {
  const navigate = useNavigate();
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnnouncements();
  }, []);

  const fetchAnnouncements = async () => {
    try {
      setLoading(true);
      const response = await api.get('/announcements');
      setAnnouncements(response.data || []);
    } catch (error) {
      setAnnouncements([]);
    } finally {
      setLoading(false);
    }
  };

  const handleClick = (announcement) => {
    if (onAnnouncementClick) {
      onAnnouncementClick(announcement);
    } else {
      navigate('/employee/announcements');
    }
  };

  const TYPE_CONFIG = {
    urgent:    { bg: '#FEE2E2', color: '#DC2626', label: 'Urgent' },
    important: { bg: '#FEF3C7', color: '#D97706', label: 'Important' },
    general:   { bg: '#DBEAFE', color: '#2563EB', label: 'General' },
    event:     { bg: '#D1FAE5', color: '#059669', label: 'Event' },
  };

  const formatDate = (date) => {
    const d = new Date(date);
    return `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()}`;
  };

  const displayAnnouncements = Array.isArray(announcements) ? announcements : [];

  return (
    <Card className="dashboard-card border-0 shadow-sm h-100">
      <Card.Body className="p-3">
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
          <h5 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <FaBullhorn className="text-warning" />
            Announcements
          </h5>
          <Button
            size="sm"
            variant="outline-primary"
            style={{ whiteSpace: 'nowrap', fontSize: '0.78rem' }}
            onClick={() => navigate('/employee/announcements')}
          >
            <FaEye className="me-1" />View All
          </Button>
        </div>

        {/* Content */}
        {loading ? (
          <div className="text-center py-5">
            <Spinner animation="border" size="sm" />
          </div>
        ) : displayAnnouncements.length === 0 ? (
          <div className="text-center py-4 text-muted">
            <FaBullhorn style={{ fontSize: '2rem', opacity: 0.3 }} />
            <p className="mt-2 mb-0 small">No announcements</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '400px', overflowY: 'auto' }}>
            {displayAnnouncements.slice(0, 5).map((a) => {
              const tc = TYPE_CONFIG[a.type] || { bg: '#F3F4F6', color: '#6B7280', label: 'Notice' };
              return (
                <div
                  key={a._id || a.id}
                  onClick={() => handleClick(a)}
                  style={{
                    background: a.isPinned ? '#FFFBEB' : '#FAFAFA',
                    border: `1px solid ${a.isPinned ? '#FDE68A' : '#E5E7EB'}`,
                    borderRadius: '10px',
                    padding: '10px 12px',
                    cursor: 'pointer',
                    transition: 'box-shadow 0.2s',
                  }}
                  onMouseEnter={e => e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.08)'}
                  onMouseLeave={e => e.currentTarget.style.boxShadow = 'none'}
                >
                  {/* Top row: badge + date */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '5px' }}>
                    <span style={{
                      fontSize: '0.68rem', fontWeight: 700, padding: '2px 8px',
                      borderRadius: '999px', background: tc.bg, color: tc.color,
                      textTransform: 'capitalize', flexShrink: 0,
                    }}>
                      {tc.label}
                    </span>
                    <span style={{ fontSize: '0.7rem', color: '#9CA3AF', flexShrink: 0 }}>
                      {formatDate(a.createdAt)}
                    </span>
                  </div>

                  {/* Title */}
                  <div style={{
                    fontSize: '0.88rem', fontWeight: 600, color: '#111827',
                    lineHeight: '1.4', marginBottom: '4px',
                    wordBreak: 'break-word',
                  }}>
                    {a.isPinned && <span style={{ marginRight: '4px' }}>📌</span>}
                    {a.title}
                  </div>

                  {/* Preview */}
                  <p style={{
                    fontSize: '0.78rem', color: '#6B7280', margin: 0,
                    lineHeight: '1.4', wordBreak: 'break-word',
                  }}>
                    {a.content?.substring(0, 80)}{a.content?.length > 80 ? '...' : ''}
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </Card.Body>
    </Card>
  );
};

export default QuickAnnouncements;
