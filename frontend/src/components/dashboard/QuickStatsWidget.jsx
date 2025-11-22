import { Card } from 'react-bootstrap';
import { FaArrowUp, FaArrowDown, FaMinus } from 'react-icons/fa';

const QuickStatsWidget = ({ 
  title, 
  value, 
  subtitle, 
  trend, 
  trendValue, 
  icon, 
  color = 'primary',
  onClick 
}) => {
  const getTrendIcon = () => {
    if (trend === 'up') return <FaArrowUp className="ms-1" />;
    if (trend === 'down') return <FaArrowDown className="ms-1" />;
    return <FaMinus className="ms-1" />;
  };

  const getTrendColor = () => {
    if (trend === 'up') return 'success';
    if (trend === 'down') return 'danger';
    return 'secondary';
  };

  return (
    <Card 
      className={`border-0 shadow-sm h-100 quick-stats-widget ${onClick ? 'cursor-pointer dashboard-card' : ''}`}
      onClick={onClick}
    >
      <Card.Body className="p-3">
        <div className="d-flex justify-content-between align-items-start mb-2">
          <div className="flex-grow-1">
            <small className="text-muted text-uppercase d-block mb-1" style={{ fontSize: '0.7rem', fontWeight: '600' }}>
              {title}
            </small>
            <h4 className="mb-0 fw-bold">{value}</h4>
          </div>
          <div className={`bg-${color} bg-opacity-10 p-2 rounded`}>
            <div className={`text-${color}`} style={{ fontSize: '1.2rem' }}>
              {icon}
            </div>
          </div>
        </div>
        
        {subtitle && (
          <small className="text-muted d-block mb-1">{subtitle}</small>
        )}
        
        {trendValue && (
          <div className="d-flex align-items-center mt-2">
            <span className={`badge bg-${getTrendColor()} bg-opacity-10 text-${getTrendColor()} d-flex align-items-center`}>
              {getTrendIcon()}
              <span className="ms-1">{trendValue}</span>
            </span>
            <small className="text-muted ms-2">vs last week</small>
          </div>
        )}
      </Card.Body>
    </Card>
  );
};

export default QuickStatsWidget;
