import { useState, useEffect } from 'react';
import { Row, Col, Card, Badge, ProgressBar, ListGroup, Alert } from 'react-bootstrap';
import {
  FaCalendar,
  FaUser,
  FaUsers,
  FaTasks,
  FaCheckCircle,
  FaClock,
  FaExclamationTriangle,
  FaBuilding
} from 'react-icons/fa';
import { toast } from 'react-toastify';
import projectApi from '../../../api/projectApi';
import { formatDate } from '../../../utils/helpers';

/**
 * OverviewTab Component
 * Displays project information, statistics, timeline, and recent activity
 * Requirements: 4.1, 4.5
 */
const OverviewTab = ({ project, onRefresh }) => {
  const [workspaceData, setWorkspaceData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadWorkspaceData();
  }, [project._id]);

  const loadWorkspaceData = async () => {
    try {
      setLoading(true);
      const response = await projectApi.getProjectWorkspace(project._id);
      setWorkspaceData(response.data || response);
    } catch (error) {
      // Set empty data to prevent crashes
      setWorkspaceData({
        project: project,
        statistics: {
          total: 0,
          toDo: 0,
          inProgress: 0,
          review: 0,
          done: 0,
          overdue: 0,
          completionRate: 0
        },
        teamWorkload: []
      });
      
      toast.error('Failed to load project statistics');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      Active: 'success',
      'On Hold': 'warning',
      Completed: 'info',
      Cancelled: 'danger'
    };
    return colors[status] || 'secondary';
  };

  if (loading) {
    return (
      <div className="text-center py-5">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );
  }

  const stats = workspaceData?.statistics || {
    total: 0,
    toDo: 0,
    inProgress: 0,
    review: 0,
    done: 0,
    overdue: 0,
    completionRate: 0
  };

  // Map stats to byStatus format for compatibility
  const byStatus = {
    'To Do': stats.toDo || 0,
    'In Progress': stats.inProgress || 0,
    'Review': stats.review || 0,
    'Done': stats.done || 0
  };

  return (
    <div>
      {/* Project Information Card */}
      <Card className="mb-4 border-0 shadow-sm" style={{ borderRadius: '12px' }}>
        <Card.Body style={{ padding: '1.5rem' }}>
          <Row>
            <Col md={8}>
              <div className="d-flex justify-content-between align-items-center mb-3">
                <h5 className="mb-0" style={{ fontWeight: '600', color: '#2c3e50' }}>
                  📋 Project Information
                </h5>
                <Badge 
                  bg={getStatusColor(project.status)} 
                  style={{ fontSize: '0.85rem', padding: '0.5rem 1rem' }}
                >
                  {project.status}
                </Badge>
              </div>
              
              {/* Description */}
              {project.description && (
                <div className="mb-3">
                  <strong className="d-block mb-1">Description</strong>
                  <p className="text-muted mb-0">{project.description}</p>
                </div>
              )}

              {/* Details Grid */}
              <Row className="g-3">
                <Col md={6}>
                  <div className="d-flex align-items-center mb-2">
                    <FaUser className="me-2 text-muted" />
                    <div>
                      <small className="text-muted d-block">Project Head</small>
                      <strong>{project.projectHead?.name || 'Not assigned'}</strong>
                    </div>
                  </div>
                </Col>
                <Col md={6}>
                  <div className="d-flex align-items-center mb-2">
                    <FaBuilding className="me-2 text-muted" />
                    <div>
                      <small className="text-muted d-block">Department</small>
                      <strong>{project.department?.name || 'Not assigned'}</strong>
                    </div>
                  </div>
                </Col>
                <Col md={6}>
                  <div className="d-flex align-items-center mb-2">
                    <FaUsers className="me-2 text-muted" />
                    <div>
                      <small className="text-muted d-block">Team Size</small>
                      <strong>{project.assignedUsers?.length || 0} members</strong>
                    </div>
                  </div>
                </Col>
                <Col md={6}>
                  <div className="d-flex align-items-center mb-2">
                    <FaUser className="me-2 text-muted" />
                    <div>
                      <small className="text-muted d-block">Created By</small>
                      <strong>{project.createdBy?.name || 'System'}</strong>
                      {project.createdAt && (
                        <small className="d-block text-muted">{formatDate(project.createdAt)}</small>
                      )}
                    </div>
                  </div>
                </Col>
                <Col md={6}>
                  <div className="d-flex align-items-center mb-2">
                    <FaCalendar className="me-2 text-muted" />
                    <div>
                      <small className="text-muted d-block">Start Date</small>
                      <strong>{formatDate(project.startDate)}</strong>
                    </div>
                  </div>
                </Col>
                <Col md={6}>
                  <div className="d-flex align-items-center mb-2">
                    <FaCalendar className="me-2 text-muted" />
                    <div>
                      <small className="text-muted d-block">End Date</small>
                      <strong>{project.endDate ? formatDate(project.endDate) : 'Not set'}</strong>
                    </div>
                  </div>
                </Col>
              </Row>
            </Col>

            <Col md={4}>
              <div 
                className="text-center p-4 rounded-3"
                style={{
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  color: 'white'
                }}
              >
                <div className="mb-3">
                  <h2 className="mb-0" style={{ fontWeight: '700', fontSize: '3rem' }}>
                    {project.progress || 0}%
                  </h2>
                  <small style={{ fontSize: '0.9rem', opacity: 0.9 }}>Overall Progress</small>
                </div>
                
                <ProgressBar
                  now={project.progress || 0}
                  variant="light"
                  style={{ height: '8px', backgroundColor: 'rgba(255,255,255,0.3)' }}
                  className="mb-3"
                />

                <div className="d-flex justify-content-around text-center">
                  <div>
                    <h5 className="mb-0" style={{ fontWeight: '600' }}>{stats.total}</h5>
                    <small style={{ fontSize: '0.75rem', opacity: 0.9 }}>Total Items</small>
                  </div>
                  <div>
                    <h5 className="mb-0" style={{ fontWeight: '600' }}>{stats.done}</h5>
                    <small style={{ fontSize: '0.75rem', opacity: 0.9 }}>Completed</small>
                  </div>
                  <div>
                    <h5 className="mb-0" style={{ fontWeight: '600' }}>{stats.overdue || 0}</h5>
                    <small style={{ fontSize: '0.75rem', opacity: 0.9 }}>Overdue</small>
                  </div>
                </div>

                {project.client && (
                  <div className="mt-3 pt-3" style={{ borderTop: '1px solid rgba(255,255,255,0.2)' }}>
                    <small style={{ fontSize: '0.75rem', opacity: 0.8 }}>CLIENT</small>
                    <div style={{ fontWeight: '600', fontSize: '0.95rem' }}>{project.client.name}</div>
                  </div>
                )}
              </div>
            </Col>
          </Row>
        </Card.Body>
      </Card>

      {/* Enhanced Statistics Cards */}
      <Row className="g-4 mb-4">
        <Col lg={3} md={6}>
          <Card 
            className="h-100 border-0 shadow-sm"
            style={{
              borderRadius: '12px',
              transition: 'transform 0.2s',
              cursor: 'pointer'
            }}
            onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-4px)'}
            onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
          >
            <Card.Body className="text-center p-4">
              <div 
                className="rounded-circle d-inline-flex align-items-center justify-content-center mb-3"
                style={{
                  width: '60px',
                  height: '60px',
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
                }}
              >
                <FaTasks style={{ fontSize: '1.5rem', color: 'white' }} />
              </div>
              <h3 className="mb-1" style={{ fontWeight: '700', color: '#2c3e50' }}>{stats.total}</h3>
              <small className="text-muted" style={{ fontSize: '0.85rem', fontWeight: '500' }}>Total Work Items</small>
            </Card.Body>
          </Card>
        </Col>
        <Col lg={3} md={6}>
          <Card 
            className="h-100 border-0 shadow-sm" 
            style={{
              borderRadius: '12px',
              borderLeft: '4px solid #0d6efd',
              transition: 'transform 0.2s',
              cursor: 'pointer'
            }}
            onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-4px)'}
            onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
          >
            <Card.Body className="text-center p-4">
              <div 
                className="rounded-circle d-inline-flex align-items-center justify-content-center mb-3"
                style={{
                  width: '60px',
                  height: '60px',
                  backgroundColor: '#e7f1ff'
                }}
              >
                <FaClock style={{ fontSize: '1.5rem', color: '#0d6efd' }} />
              </div>
              <h3 className="mb-1 text-primary" style={{ fontWeight: '700' }}>{byStatus['In Progress']}</h3>
              <small className="text-muted" style={{ fontSize: '0.85rem', fontWeight: '500' }}>In Progress</small>
            </Card.Body>
          </Card>
        </Col>
        <Col lg={3} md={6}>
          <Card 
            className="h-100 border-0 shadow-sm" 
            style={{
              borderRadius: '12px',
              borderLeft: '4px solid #198754',
              transition: 'transform 0.2s',
              cursor: 'pointer'
            }}
            onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-4px)'}
            onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
          >
            <Card.Body className="text-center p-4">
              <div 
                className="rounded-circle d-inline-flex align-items-center justify-content-center mb-3"
                style={{
                  width: '60px',
                  height: '60px',
                  backgroundColor: '#d1f4e0'
                }}
              >
                <FaCheckCircle style={{ fontSize: '1.5rem', color: '#198754' }} />
              </div>
              <h3 className="mb-1 text-success" style={{ fontWeight: '700' }}>{byStatus.Done}</h3>
              <small className="text-muted" style={{ fontSize: '0.85rem', fontWeight: '500' }}>Completed</small>
            </Card.Body>
          </Card>
        </Col>
        <Col lg={3} md={6}>
          <Card 
            className="h-100 border-0 shadow-sm" 
            style={{
              borderRadius: '12px',
              borderLeft: '4px solid #dc3545',
              transition: 'transform 0.2s',
              cursor: 'pointer'
            }}
            onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-4px)'}
            onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
          >
            <Card.Body className="text-center p-4">
              <div 
                className="rounded-circle d-inline-flex align-items-center justify-content-center mb-3"
                style={{
                  width: '60px',
                  height: '60px',
                  backgroundColor: '#ffe5e5'
                }}
              >
                <FaExclamationTriangle style={{ fontSize: '1.5rem', color: '#dc3545' }} />
              </div>
              <h3 className="mb-1 text-danger" style={{ fontWeight: '700' }}>{stats.overdue || 0}</h3>
              <small className="text-muted" style={{ fontSize: '0.85rem', fontWeight: '500' }}>Overdue</small>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Alerts */}
      {stats.overdue > 0 && (
        <Alert variant="danger" className="mb-3">
          <FaExclamationTriangle className="me-2" />
          <strong>Attention!</strong> This project has {stats.overdue} overdue work item{stats.overdue > 1 ? 's' : ''}.
        </Alert>
      )}

      <Row>
        {/* Timeline */}
        <Col md={6}>
          <Card className="mb-4 border-0 shadow-sm" style={{ borderRadius: '12px' }}>
            <Card.Header className="bg-white border-0" style={{ padding: '1.25rem' }}>
              <h6 className="mb-0" style={{ fontWeight: '600', color: '#2c3e50' }}>
                📅 Timeline
              </h6>
            </Card.Header>
            <Card.Body>
              <div className="mb-3">
                <div className="d-flex justify-content-between mb-1">
                  <small className="text-muted">Project Duration</small>
                  <small className="fw-bold">
                    {project.startDate && project.endDate
                      ? `${Math.ceil((new Date(project.endDate) - new Date(project.startDate)) / (1000 * 60 * 60 * 24))} days`
                      : 'Not set'}
                  </small>
                </div>
                {project.startDate && project.endDate && (
                  <ProgressBar
                    now={
                      ((new Date() - new Date(project.startDate)) /
                        (new Date(project.endDate) - new Date(project.startDate))) *
                      100
                    }
                    variant="info"
                    style={{ height: '6px' }}
                  />
                )}
              </div>

              <ListGroup variant="flush">
                <ListGroup.Item className="px-0">
                  <div className="d-flex justify-content-between">
                    <span>Start Date</span>
                    <strong>{formatDate(project.startDate)}</strong>
                  </div>
                </ListGroup.Item>
                <ListGroup.Item className="px-0">
                  <div className="d-flex justify-content-between">
                    <span>End Date</span>
                    <strong>{project.endDate ? formatDate(project.endDate) : 'Not set'}</strong>
                  </div>
                </ListGroup.Item>
                <ListGroup.Item className="px-0">
                  <div className="d-flex justify-content-between">
                    <span>Created</span>
                    <strong>{formatDate(project.createdAt)}</strong>
                  </div>
                </ListGroup.Item>
              </ListGroup>
            </Card.Body>
          </Card>
        </Col>

        {/* Project Statistics Summary */}
        <Col md={6}>
          <Card className="mb-4 border-0 shadow-sm" style={{ borderRadius: '12px' }}>
            <Card.Header className="bg-white border-0" style={{ padding: '1.25rem' }}>
              <h6 className="mb-0" style={{ fontWeight: '600', color: '#2c3e50' }}>
                📊 Project Statistics
              </h6>
            </Card.Header>
            <Card.Body>
              <ListGroup variant="flush">
                <ListGroup.Item className="px-0">
                  <div className="d-flex justify-content-between">
                    <span>Total Work Items</span>
                    <strong>{stats.total}</strong>
                  </div>
                </ListGroup.Item>
                <ListGroup.Item className="px-0">
                  <div className="d-flex justify-content-between">
                    <span>Completion Rate</span>
                    <strong>{stats.completionRate}%</strong>
                  </div>
                </ListGroup.Item>
                <ListGroup.Item className="px-0">
                  <div className="d-flex justify-content-between">
                    <span>Tasks</span>
                    <strong>{stats.tasks || 0}</strong>
                  </div>
                </ListGroup.Item>
                <ListGroup.Item className="px-0">
                  <div className="d-flex justify-content-between">
                    <span>Content Items</span>
                    <strong>{stats.content || 0}</strong>
                  </div>
                </ListGroup.Item>
                {stats.averageCompletionTime > 0 && (
                  <ListGroup.Item className="px-0">
                    <div className="d-flex justify-content-between">
                      <span>Avg. Completion Time</span>
                      <strong>{stats.averageCompletionTime} days</strong>
                    </div>
                  </ListGroup.Item>
                )}
              </ListGroup>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Work Items Breakdown */}
      <Card className="border-0 shadow-sm" style={{ borderRadius: '12px' }}>
        <Card.Header className="bg-white border-0" style={{ padding: '1.25rem' }}>
          <h6 className="mb-0" style={{ fontWeight: '600', color: '#2c3e50' }}>
            📈 Work Items by Status
          </h6>
        </Card.Header>
        <Card.Body style={{ padding: '1.5rem' }}>
          <Row className="g-4">
            <Col md={3}>
              <div 
                className="text-center p-4 rounded-3"
                style={{
                  background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
                  border: '2px solid #e9ecef'
                }}
              >
                <h4 className="mb-1" style={{ fontWeight: '700', color: '#6c757d' }}>{byStatus['To Do']}</h4>
                <small style={{ fontWeight: '500', color: '#495057' }}>To Do</small>
              </div>
            </Col>
            <Col md={3}>
              <div 
                className="text-center p-4 rounded-3"
                style={{
                  background: 'linear-gradient(135deg, #e7f1ff 0%, #b3d9ff 100%)',
                  border: '2px solid #0d6efd'
                }}
              >
                <h4 className="mb-1 text-primary" style={{ fontWeight: '700' }}>{byStatus['In Progress']}</h4>
                <small style={{ fontWeight: '500', color: '#0d6efd' }}>In Progress</small>
              </div>
            </Col>
            <Col md={3}>
              <div 
                className="text-center p-4 rounded-3"
                style={{
                  background: 'linear-gradient(135deg, #fff3cd 0%, #ffe69c 100%)',
                  border: '2px solid #ffc107'
                }}
              >
                <h4 className="mb-1 text-warning" style={{ fontWeight: '700' }}>{byStatus.Review}</h4>
                <small style={{ fontWeight: '500', color: '#997404' }}>Review</small>
              </div>
            </Col>
            <Col md={3}>
              <div 
                className="text-center p-4 rounded-3"
                style={{
                  background: 'linear-gradient(135deg, #d1f4e0 0%, #a8e6cf 100%)',
                  border: '2px solid #198754'
                }}
              >
                <h4 className="mb-1 text-success" style={{ fontWeight: '700' }}>{byStatus.Done}</h4>
                <small style={{ fontWeight: '500', color: '#198754' }}>Done</small>
              </div>
            </Col>
          </Row>
        </Card.Body>
      </Card>
    </div>
  );
};

export default OverviewTab;
