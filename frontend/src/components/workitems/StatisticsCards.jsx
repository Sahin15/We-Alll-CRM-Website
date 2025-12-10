import { Row, Col, Card, Badge } from 'react-bootstrap';
import {
  FaTasks,
  FaClock,
  FaExclamationTriangle,
  FaCheckCircle,
  FaSpinner
} from 'react-icons/fa';

/**
 * StatisticsCards Component
 * Displays work item statistics in card format
 */
const StatisticsCards = ({ stats, activeFilter, onCardClick }) => {
  const cards = [
    {
      id: 'total',
      title: 'Total Items',
      count: stats.total || 0,
      icon: FaTasks,
      color: '#6c757d',
      borderColor: 'transparent',
      subStats: [
        { label: 'Tasks', count: stats.tasks || 0, bg: 'primary' },
        { label: 'Content', count: stats.content || 0, bg: 'success' }
      ]
    },
    {
      id: 'dueToday',
      title: 'Due Today',
      count: stats.dueToday || 0,
      icon: FaClock,
      color: '#ffc107',
      borderColor: '#ffc107',
      textColor: 'warning'
    },
    {
      id: 'inProgress',
      title: 'In Progress',
      count: stats.inProgress || 0,
      icon: FaSpinner,
      color: '#0d6efd',
      borderColor: '#0d6efd',
      textColor: 'primary'
    },
    {
      id: 'overdue',
      title: 'Overdue',
      count: stats.overdue || 0,
      icon: FaExclamationTriangle,
      color: '#dc3545',
      borderColor: '#dc3545',
      textColor: 'danger'
    },
    {
      id: 'completed',
      title: 'Completed',
      count: stats.completed || 0,
      icon: FaCheckCircle,
      color: '#198754',
      borderColor: '#198754',
      textColor: 'success'
    }
  ];

  return (
    <Row className="g-3 mb-4">
      {cards.map((card) => {
        const Icon = card.icon;
        const isActive = activeFilter === card.id;

        return (
          <Col key={card.id} lg={2} md={4} sm={6} xs={12}>
            <Card
              className={`text-center h-100 border-0 shadow-sm ${
                isActive ? `border-${card.textColor || 'secondary'} border-3` : ''
              }`}
              style={{
                borderLeft: `4px solid ${card.borderColor}`,
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
              onClick={() => onCardClick(card.id === activeFilter ? null : card.id)}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 4px 8px rgba(0,0,0,0.15)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '';
              }}
            >
              <Card.Body className="py-3">
                <div className="mb-2">
                  <Icon style={{ fontSize: '1.8rem', color: card.color }} />
                </div>
                <h3
                  className={`mb-1 fw-bold ${
                    card.textColor ? `text-${card.textColor}` : ''
                  }`}
                >
                  {card.count}
                </h3>
                <small className="text-muted">{card.title}</small>
                {card.subStats && (
                  <div className="mt-2">
                    {card.subStats.map((sub, idx) => (
                      <Badge
                        key={idx}
                        bg={sub.bg}
                        className="me-1"
                        style={{ fontSize: '0.7rem' }}
                      >
                        {sub.count} {sub.label}
                      </Badge>
                    ))}
                  </div>
                )}
              </Card.Body>
            </Card>
          </Col>
        );
      })}
    </Row>
  );
};

export default StatisticsCards;
