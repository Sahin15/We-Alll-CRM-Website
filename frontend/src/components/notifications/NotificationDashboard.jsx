import { useState, useEffect } from 'react';
import { Card, Row, Col, Badge, Spinner, Alert } from 'react-bootstrap';
import { 
  FaBell, 
  FaEye, 
  FaUsers, 
  FaChartLine,
  FaExclamationTriangle,
  FaCheckCircle,
  FaClock,
  FaTrash
} from 'react-icons/fa';
import { Line, Doughnut, Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  BarElement,
} from 'chart.js';
import api from '../../services/api';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  BarElement
);

const NotificationDashboard = () => {
  const [stats, setStats] = useState({
    total: 0,
    unread: 0,
    byType: {},
    byPriority: {},
    recentActivity: []
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      setLoading(true);
      const response = await api.get('/notifications');
      const notifications = response.data.notifications || [];
      
      // Calculate statistics
      const total = notifications.length;
      const unread = notifications.filter(n => !n.isRead).length;
      
      // Group by type
      const byType = notifications.reduce((acc, notif) => {
        acc[notif.type] = (acc[notif.type] || 0) + 1;
        return acc;
      }, {});
      
      // Group by priority
      const byPriority = notifications.reduce((acc, notif) => {
        acc[notif.priority] = (acc[notif.priority] || 0) + 1;
        return acc;
      }, {});
      
      // Recent activity (last 7 days)
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      const recentActivity = notifications
        .filter(n => new Date(n.createdAt) >= sevenDaysAgo)
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        .slice(0, 10);
      
      setStats({
        total,
        unread,
        byType,
        byPriority,
        recentActivity
      });
    } catch (err) {
      setError('Failed to fetch notification statistics');
    } finally {
      setLoading(false);
    }
  };

  const getTypeColor = (type) => {
    const colors = {
      'work_item_assigned': '#3B82F6',
      'work_item_due_soon': '#F59E0B',
      'work_item_overdue': '#EF4444',
      'client_won': '#10B981',
      'new_project': '#8B5CF6',
      'payment_received': '#10B981',
      'leave_approved': '#10B981',
      'leave_rejected': '#EF4444',
      'general': '#6B7280',
      'system': '#374151'
    };
    return colors[type] || '#6B7280';
  };

  const getPriorityColor = (priority) => {
    const colors = {
      'low': '#6B7280',
      'medium': '#3B82F6',
      'high': '#F59E0B',
      'urgent': '#EF4444'
    };
    return colors[priority] || '#6B7280';
  };

  // Chart data
  const typeChartData = {
    labels: Object.keys(stats.byType).map(type => type.replace('_', ' ')),
    datasets: [
      {
        data: Object.values(stats.byType),
        backgroundColor: Object.keys(stats.byType).map(type => getTypeColor(type)),
        borderWidth: 2,
        borderColor: '#ffffff'
      }
    ]
  };

  const priorityChartData = {
    labels: Object.keys(stats.byPriority),
    datasets: [
      {
        label: 'Notifications by Priority',
        data: Object.values(stats.byPriority),
        backgroundColor: Object.keys(stats.byPriority).map(priority => getPriorityColor(priority)),
        borderRadius: 8,
        borderSkipped: false,
      }
    ]
  };

  // Activity chart (last 7 days)
  const activityData = (() => {
    const days = [];
    const counts = [];
    
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dayStr = date.toLocaleDateString('en-US', { weekday: 'short' });
      days.push(dayStr);
      
      const dayCount = stats.recentActivity.filter(notif => {
        const notifDate = new Date(notif.createdAt);
        return notifDate.toDateString() === date.toDateString();
      }).length;
      
      counts.push(dayCount);
    }
    
    return {
      labels: days,
      datasets: [
        {
          label: 'Notifications',
          data: counts,
          borderColor: '#4F46E5',
          backgroundColor: 'rgba(79, 70, 229, 0.1)',
          tension: 0.4,
          fill: true,
          pointBackgroundColor: '#4F46E5',
          pointBorderColor: '#ffffff',
          pointBorderWidth: 2,
          pointRadius: 6,
        }
      ]
    };
  })();

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom',
        labels: {
          padding: 20,
          usePointStyle: true,
        }
      }
    }
  };

  if (loading) {
    return (
      <Card>
        <Card.Body className="text-center py-5">
          <Spinner animation="border" />
          <p className="mt-3 mb-0">Loading notification dashboard...</p>
        </Card.Body>
      </Card>
    );
  }

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2 className="mb-1">
            <FaChartLine className="me-2 text-primary" />
            Notification Dashboard
          </h2>
          <p className="text-muted mb-0">Analytics and insights for notification system</p>
        </div>
      </div>

      {error && <Alert variant="danger">{error}</Alert>}

      {/* Stats Cards */}
      <Row className="g-4 mb-4">
        <Col md={3}>
          <Card className="h-100 border-0 shadow-sm">
            <Card.Body className="text-center">
              <div 
                className="rounded-circle mx-auto mb-3 d-flex align-items-center justify-content-center"
                style={{ 
                  width: '60px', 
                  height: '60px', 
                  background: 'linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%)',
                  color: 'white'
                }}
              >
                <FaBell size={24} />
              </div>
              <h3 className="mb-1">{stats.total}</h3>
              <p className="text-muted mb-0">Total Notifications</p>
            </Card.Body>
          </Card>
        </Col>
        
        <Col md={3}>
          <Card className="h-100 border-0 shadow-sm">
            <Card.Body className="text-center">
              <div 
                className="rounded-circle mx-auto mb-3 d-flex align-items-center justify-content-center"
                style={{ 
                  width: '60px', 
                  height: '60px', 
                  background: 'linear-gradient(135deg, #EF4444 0%, #DC2626 100%)',
                  color: 'white'
                }}
              >
                <FaExclamationTriangle size={24} />
              </div>
              <h3 className="mb-1">{stats.unread}</h3>
              <p className="text-muted mb-0">Unread</p>
            </Card.Body>
          </Card>
        </Col>
        
        <Col md={3}>
          <Card className="h-100 border-0 shadow-sm">
            <Card.Body className="text-center">
              <div 
                className="rounded-circle mx-auto mb-3 d-flex align-items-center justify-content-center"
                style={{ 
                  width: '60px', 
                  height: '60px', 
                  background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
                  color: 'white'
                }}
              >
                <FaCheckCircle size={24} />
              </div>
              <h3 className="mb-1">{stats.total - stats.unread}</h3>
              <p className="text-muted mb-0">Read</p>
            </Card.Body>
          </Card>
        </Col>
        
        <Col md={3}>
          <Card className="h-100 border-0 shadow-sm">
            <Card.Body className="text-center">
              <div 
                className="rounded-circle mx-auto mb-3 d-flex align-items-center justify-content-center"
                style={{ 
                  width: '60px', 
                  height: '60px', 
                  background: 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)',
                  color: 'white'
                }}
              >
                <FaClock size={24} />
              </div>
              <h3 className="mb-1">{stats.recentActivity.length}</h3>
              <p className="text-muted mb-0">This Week</p>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Charts */}
      <Row className="g-4 mb-4">
        <Col md={8}>
          <Card className="h-100">
            <Card.Header>
              <h5 className="mb-0">Activity Trend (Last 7 Days)</h5>
            </Card.Header>
            <Card.Body>
              <div style={{ height: '300px' }}>
                <Line data={activityData} options={chartOptions} />
              </div>
            </Card.Body>
          </Card>
        </Col>
        
        <Col md={4}>
          <Card className="h-100">
            <Card.Header>
              <h5 className="mb-0">By Priority</h5>
            </Card.Header>
            <Card.Body>
              <div style={{ height: '300px' }}>
                <Bar data={priorityChartData} options={chartOptions} />
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      <Row className="g-4">
        <Col md={6}>
          <Card className="h-100">
            <Card.Header>
              <h5 className="mb-0">By Type</h5>
            </Card.Header>
            <Card.Body>
              <div style={{ height: '300px' }}>
                <Doughnut data={typeChartData} options={chartOptions} />
              </div>
            </Card.Body>
          </Card>
        </Col>
        
        <Col md={6}>
          <Card className="h-100">
            <Card.Header>
              <h5 className="mb-0">Recent Activity</h5>
            </Card.Header>
            <Card.Body style={{ maxHeight: '350px', overflowY: 'auto' }}>
              {stats.recentActivity.length === 0 ? (
                <div className="text-center text-muted py-4">
                  <FaBell size={32} className="mb-2 opacity-50" />
                  <p className="mb-0">No recent activity</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {stats.recentActivity.map((notification, index) => (
                    <div key={notification._id} className="d-flex align-items-start p-3 bg-light rounded">
                      <div 
                        className="rounded-circle me-3 d-flex align-items-center justify-content-center"
                        style={{ 
                          width: '40px', 
                          height: '40px', 
                          backgroundColor: getTypeColor(notification.type) + '20',
                          color: getTypeColor(notification.type)
                        }}
                      >
                        <FaBell size={16} />
                      </div>
                      <div className="flex-grow-1">
                        <div className="d-flex justify-content-between align-items-start mb-1">
                          <h6 className="mb-0 fw-semibold">{notification.title}</h6>
                          <Badge bg={getPriorityColor(notification.priority).replace('#', '')} className="ms-2">
                            {notification.priority}
                          </Badge>
                        </div>
                        <p className="text-muted small mb-1">
                          {notification.message?.substring(0, 80)}...
                        </p>
                        <small className="text-muted">
                          {new Date(notification.createdAt).toLocaleString()}
                        </small>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>

      <style>{`
        .space-y-3 > * + * {
          margin-top: 0.75rem;
        }
      `}</style>
    </div>
  );
};

export default NotificationDashboard;