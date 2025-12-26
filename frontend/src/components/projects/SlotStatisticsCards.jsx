import { useState, useEffect } from 'react';
import { Card, Row, Col, Badge, ProgressBar, Button, Spinner } from 'react-bootstrap';
import { 
  FaChartLine, 
  FaClock, 
  FaUsers, 
  FaCheckCircle, 
  FaExclamationTriangle,
  FaSync,
  FaArrowUp,
  FaArrowDown
} from 'react-icons/fa';

/**
 * SlotStatisticsCards Component
 * 
 * Displays real-time slot statistics and KPIs with automatic updates
 * Requirements: 2.1, 2.2, 2.3, 2.4, 2.5
 */
const SlotStatisticsCards = ({ 
  project, 
  slots = [], 
  realTimeUpdates = true,
  refreshInterval = 30000, // 30 seconds
  onRefresh = null 
}) => {
  const [statistics, setStatistics] = useState({
    totalSlots: 0,
    completedSlots: 0,
    assignedSlots: 0,
    availableSlots: 0,
    blockedSlots: 0,
    overdue: 0,
    completionRate: 0,
    averageCompletionTime: 0,
    productivity: 0,
    trend: 'stable'
  });

  const [loading, setLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(new Date());

  useEffect(() => {
    calculateStatistics();
  }, [project, slots]);

  useEffect(() => {
    if (realTimeUpdates && refreshInterval > 0) {
      const interval = setInterval(() => {
        handleRefresh();
      }, refreshInterval);

      return () => clearInterval(interval);
    }
  }, [realTimeUpdates, refreshInterval]);

  const calculateStatistics = () => {
    if (!slots || slots.length === 0) {
      setStatistics({
        totalSlots: project?.slotConfiguration?.totalSlots || 0,
        completedSlots: 0,
        assignedSlots: 0,
        availableSlots: 0,
        blockedSlots: 0,
        overdue: 0,
        completionRate: 0,
        averageCompletionTime: 0,
        productivity: 0,
        trend: 'stable'
      });
      return;
    }

    const now = new Date();
    const totalSlots = project?.slotConfiguration?.totalSlots || slots.length;
    
    // Basic counts
    const completedSlots = slots.filter(slot => 
      slot.assignmentStatus === 'completed' || slot.completionStatus?.isCompleted
    ).length;
    
    const assignedSlots = slots.filter(slot => 
      slot.assignmentStatus === 'assigned' || slot.assignmentStatus === 'in-progress'
    ).length;
    
    const availableSlots = slots.filter(slot => 
      slot.assignmentStatus === 'available'
    ).length;
    
    const blockedSlots = slots.filter(slot => 
      slot.assignmentStatus === 'blocked'
    ).length;

    // Overdue calculation
    const overdue = slots.filter(slot => {
      if (!slot.dueDate || slot.assignmentStatus === 'completed') return false;
      return new Date(slot.dueDate) < now;
    }).length;

    // Completion rate
    const completionRate = totalSlots > 0 ? Math.round((completedSlots / totalSlots) * 100) : 0;

    // Average completion time (in days)
    const completedSlotsWithDates = slots.filter(slot => 
      slot.completionStatus?.isCompleted && 
      slot.completionStatus?.completedAt &&
      slot.createdAt
    );

    const averageCompletionTime = completedSlotsWithDates.length > 0 
      ? Math.round(
          completedSlotsWithDates.reduce((acc, slot) => {
            const created = new Date(slot.createdAt);
            const completed = new Date(slot.completionStatus.completedAt);
            const days = Math.ceil((completed - created) / (1000 * 60 * 60 * 24));
            return acc + days;
          }, 0) / completedSlotsWithDates.length
        )
      : 0;

    // Productivity score (completed vs assigned ratio)
    const productivity = assignedSlots > 0 
      ? Math.round((completedSlots / (completedSlots + assignedSlots)) * 100)
      : completedSlots > 0 ? 100 : 0;

    // Trend calculation (simplified - could be enhanced with historical data)
    const trend = completionRate >= 75 ? 'up' : completionRate <= 25 ? 'down' : 'stable';

    setStatistics({
      totalSlots,
      completedSlots,
      assignedSlots,
      availableSlots,
      blockedSlots,
      overdue,
      completionRate,
      averageCompletionTime,
      productivity,
      trend
    });

    setLastUpdated(new Date());
  };

  const handleRefresh = async () => {
    if (onRefresh) {
      setLoading(true);
      try {
        await onRefresh();
      } catch (error) {
        console.error('Error refreshing statistics:', error);
      } finally {
        setLoading(false);
      }
    } else {
      calculateStatistics();
    }
  };

  const getTrendIcon = (trend) => {
    switch (trend) {
      case 'up':
        return <FaArrowUp className="text-success" />;
      case 'down':
        return <FaArrowDown className="text-danger" />;
      default:
        return <FaChartLine className="text-muted" />;
    }
  };

  const getProgressVariant = (percentage) => {
    if (percentage >= 90) return 'success';
    if (percentage >= 75) return 'info';
    if (percentage >= 50) return 'warning';
    return 'danger';
  };

  const formatLastUpdated = () => {
    const now = new Date();
    const diff = Math.floor((now - lastUpdated) / 1000);
    
    if (diff < 60) return `${diff}s ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    return lastUpdated.toLocaleTimeString();
  };

  return (
    <div className="slot-statistics-cards">
      {/* Header with Refresh */}
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h5 className="mb-0">
          <FaChartLine className="me-2" />
          Slot Statistics
        </h5>
        <div className="d-flex align-items-center">
          <small className="text-muted me-3">
            Updated: {formatLastUpdated()}
          </small>
          <Button 
            variant="outline-secondary" 
            size="sm"
            onClick={handleRefresh}
            disabled={loading}
          >
            {loading ? (
              <Spinner size="sm" />
            ) : (
              <FaSync />
            )}
          </Button>
        </div>
      </div>

      <Row className="g-3">
        {/* Overview Card */}
        <Col lg={6}>
          <Card className="h-100">
            <Card.Header className="d-flex justify-content-between align-items-center">
              <h6 className="mb-0">Overview</h6>
              {getTrendIcon(statistics.trend)}
            </Card.Header>
            <Card.Body>
              <Row className="g-3">
                <Col xs={6}>
                  <div className="text-center">
                    <div className="h3 mb-1 text-primary">{statistics.totalSlots}</div>
                    <div className="small text-muted">Total Slots</div>
                  </div>
                </Col>
                <Col xs={6}>
                  <div className="text-center">
                    <div className="h3 mb-1 text-success">{statistics.completedSlots}</div>
                    <div className="small text-muted">Completed</div>
                  </div>
                </Col>
                <Col xs={6}>
                  <div className="text-center">
                    <div className="h3 mb-1 text-warning">{statistics.assignedSlots}</div>
                    <div className="small text-muted">In Progress</div>
                  </div>
                </Col>
                <Col xs={6}>
                  <div className="text-center">
                    <div className="h3 mb-1 text-secondary">{statistics.availableSlots}</div>
                    <div className="small text-muted">Available</div>
                  </div>
                </Col>
              </Row>

              <div className="mt-3">
                <div className="d-flex justify-content-between align-items-center mb-2">
                  <small className="text-muted">Completion Progress</small>
                  <small className="fw-bold">{statistics.completionRate}%</small>
                </div>
                <ProgressBar 
                  now={statistics.completionRate} 
                  variant={getProgressVariant(statistics.completionRate)}
                  style={{ height: '8px' }}
                />
              </div>
            </Card.Body>
          </Card>
        </Col>

        {/* Performance Metrics */}
        <Col lg={6}>
          <Card className="h-100">
            <Card.Header>
              <h6 className="mb-0">Performance Metrics</h6>
            </Card.Header>
            <Card.Body>
              <Row className="g-3">
                <Col xs={6}>
                  <div className="d-flex align-items-center">
                    <FaClock className="text-info me-2" />
                    <div>
                      <div className="fw-semibold">{statistics.averageCompletionTime}</div>
                      <div className="small text-muted">Avg. Days</div>
                    </div>
                  </div>
                </Col>
                <Col xs={6}>
                  <div className="d-flex align-items-center">
                    <FaUsers className="text-primary me-2" />
                    <div>
                      <div className="fw-semibold">{statistics.productivity}%</div>
                      <div className="small text-muted">Productivity</div>
                    </div>
                  </div>
                </Col>
                <Col xs={6}>
                  <div className="d-flex align-items-center">
                    <FaExclamationTriangle className="text-danger me-2" />
                    <div>
                      <div className="fw-semibold">{statistics.overdue}</div>
                      <div className="small text-muted">Overdue</div>
                    </div>
                  </div>
                </Col>
                <Col xs={6}>
                  <div className="d-flex align-items-center">
                    <FaCheckCircle className="text-success me-2" />
                    <div>
                      <div className="fw-semibold">{statistics.blockedSlots}</div>
                      <div className="small text-muted">Blocked</div>
                    </div>
                  </div>
                </Col>
              </Row>

              {/* Performance Indicators */}
              <div className="mt-3">
                <div className="d-flex justify-content-between align-items-center mb-2">
                  <small className="text-muted">Team Productivity</small>
                  <Badge bg={statistics.productivity >= 75 ? 'success' : statistics.productivity >= 50 ? 'warning' : 'danger'}>
                    {statistics.productivity >= 75 ? 'Excellent' : statistics.productivity >= 50 ? 'Good' : 'Needs Attention'}
                  </Badge>
                </div>
                <ProgressBar 
                  now={statistics.productivity} 
                  variant={statistics.productivity >= 75 ? 'success' : statistics.productivity >= 50 ? 'warning' : 'danger'}
                  style={{ height: '6px' }}
                />
              </div>
            </Card.Body>
          </Card>
        </Col>

        {/* Status Breakdown */}
        <Col lg={12}>
          <Card>
            <Card.Header>
              <h6 className="mb-0">Status Breakdown</h6>
            </Card.Header>
            <Card.Body>
              <Row className="g-3">
                <Col md={2}>
                  <div className="text-center p-3 border rounded">
                    <div className="h4 mb-1 text-success">{statistics.completedSlots}</div>
                    <div className="small text-muted">Completed</div>
                    <div className="small">
                      {statistics.totalSlots > 0 ? Math.round((statistics.completedSlots / statistics.totalSlots) * 100) : 0}%
                    </div>
                  </div>
                </Col>
                <Col md={2}>
                  <div className="text-center p-3 border rounded">
                    <div className="h4 mb-1 text-warning">{statistics.assignedSlots}</div>
                    <div className="small text-muted">In Progress</div>
                    <div className="small">
                      {statistics.totalSlots > 0 ? Math.round((statistics.assignedSlots / statistics.totalSlots) * 100) : 0}%
                    </div>
                  </div>
                </Col>
                <Col md={2}>
                  <div className="text-center p-3 border rounded">
                    <div className="h4 mb-1 text-secondary">{statistics.availableSlots}</div>
                    <div className="small text-muted">Available</div>
                    <div className="small">
                      {statistics.totalSlots > 0 ? Math.round((statistics.availableSlots / statistics.totalSlots) * 100) : 0}%
                    </div>
                  </div>
                </Col>
                <Col md={2}>
                  <div className="text-center p-3 border rounded">
                    <div className="h4 mb-1 text-danger">{statistics.blockedSlots}</div>
                    <div className="small text-muted">Blocked</div>
                    <div className="small">
                      {statistics.totalSlots > 0 ? Math.round((statistics.blockedSlots / statistics.totalSlots) * 100) : 0}%
                    </div>
                  </div>
                </Col>
                <Col md={2}>
                  <div className="text-center p-3 border rounded">
                    <div className="h4 mb-1 text-danger">{statistics.overdue}</div>
                    <div className="small text-muted">Overdue</div>
                    <div className="small">
                      {statistics.totalSlots > 0 ? Math.round((statistics.overdue / statistics.totalSlots) * 100) : 0}%
                    </div>
                  </div>
                </Col>
                <Col md={2}>
                  <div className="text-center p-3 border rounded">
                    <div className="h4 mb-1 text-info">{statistics.totalSlots - statistics.completedSlots - statistics.assignedSlots - statistics.availableSlots - statistics.blockedSlots}</div>
                    <div className="small text-muted">Other</div>
                    <div className="small">
                      {statistics.totalSlots > 0 ? Math.round(((statistics.totalSlots - statistics.completedSlots - statistics.assignedSlots - statistics.availableSlots - statistics.blockedSlots) / statistics.totalSlots) * 100) : 0}%
                    </div>
                  </div>
                </Col>
              </Row>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default SlotStatisticsCards;