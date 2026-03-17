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
  FaBuilding,
  FaChartLine,
  FaFire,
  FaClipboardList
} from 'react-icons/fa';
import { toast } from 'react-toastify';
import projectApi from '../../../api/projectApi';
import { formatDate } from '../../../utils/helpers';

/**
 * OverviewTab Component - Modern & Professional
 * Displays comprehensive project information, statistics, and insights
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

  const getStatusBgColor = (status) => {
    const colors = {
      Active: '#d1f4e0',
      'On Hold': '#fff3cd',
      Completed: '#cfe2ff',
      Cancelled: '#ffe5e5'
    };
    return colors[status] || '#f8f9fa';
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

  const byStatus = {
    'To Do': stats.toDo || 0,
    'In Progress': stats.inProgress || 0,
    'Review': stats.review || 0,
    'Done': stats.done || 0
  };

  const progressPercentage = project.slotConfiguration?.enableSlotSystem && project.progressTracking?.calculationMethod === 'slot-based' 
    ? (project.progressTracking?.progressPercentage || 0)
    : (project.progress || 0);

  const totalSlots = project.slotConfiguration?.enableSlotSystem 
    ? (project.progressTracking?.totalSlots || project.slotConfiguration?.totalSlots || 0)
    : stats.total;

  const completedItems = project.slotConfiguration?.enableSlotSystem 
    ? (project.progressTracking?.completedSlots || 0)
    : stats.done;

  return (
    <div style={{ background: '#f8f9fa', minHeight: '100vh', padding: '1.5rem 0' }}>
      {/* Hero Section - Project Overview */}
      <Card className="mb-4 border-0 shadow-sm" style={{ borderRadius: '16px', overflow: 'hidden' }}>
        <div 
          style={{
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            padding: '2rem',
            color: 'white'
          }}
        >
          <Row className="align-items-center">
            <Col md={8}>
              <div className="mb-3">
                <h2 style={{ fontWeight: '700', marginBottom: '0.5rem' }}>
                  {project.name}
                </h2>
                {project.description && (
                  <p style={{ fontSize: '0.95rem', opacity: 0.95, marginBottom: 0 }}>
                    {project.description}
                  </p>
                )}
              </div>
              <div className="d-flex gap-3 flex-wrap">
                <Badge 
                  bg="light" 
                  text="dark"
                  style={{ padding: '0.5rem 1rem', fontSize: '0.85rem', fontWeight: '600' }}
                >
                  {project.status}
                </Badge>
                {project.client && (
                  <Badge 
                    bg="light" 
                    text="dark"
                    style={{ padding: '0.5rem 1rem', fontSize: '0.85rem', fontWeight: '600' }}
                  >
                    📋 {project.client.name}
                  </Badge>
                )}
                {project.slotConfiguration?.enableSlotSystem && (
                  <Badge 
                    bg="light" 
                    text="dark"
                    style={{ padding: '0.5rem 1rem', fontSize: '0.85rem', fontWeight: '600' }}
                  >
                    🎯 Slot-Based
                  </Badge>
                )}
              </div>
            </Col>
            <Col md={4} className="text-center">
              <div style={{ fontSize: '3.5rem', fontWeight: '700', marginBottom: '0.5rem' }}>
                {progressPercentage}%
              </div>
              <ProgressBar
                now={progressPercentage}
                variant="light"
                style={{ height: '8px', backgroundColor: 'rgba(255,255,255,0.3)' }}
                className="mb-3"
              />
              <small style={{ opacity: 0.9 }}>
                {project.slotConfiguration?.enableSlotSystem ? 'Slot Progress' : 'Overall Progress'}
              </small>
            </Col>
          </Row>
        </div>
      </Card>

      {/* Key Metrics - 4 Column Grid */}
      <Row className="g-3 mb-4">
        {/* Total Items */}
        <Col lg={3} md={6}>
          <Card className="h-100 border-0 shadow-sm" style={{ borderRadius: '12px', transition: 'all 0.3s' }}>
            <Card.Body className="p-4">
              <div className="d-flex justify-content-between align-items-start">
                <div>
                  <small className="text-muted d-block mb-2" style={{ fontWeight: '500' }}>
                    Total Items
                  </small>
                  <h3 style={{ fontWeight: '700', color: '#2c3e50', marginBottom: 0 }}>
                    {totalSlots}
                  </h3>
                </div>
                <div 
                  className="rounded-circle d-flex align-items-center justify-content-center"
                  style={{
                    width: '50px',
                    height: '50px',
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    color: 'white'
                  }}
                >
                  <FaTasks style={{ fontSize: '1.25rem' }} />
                </div>
              </div>
            </Card.Body>
          </Card>
        </Col>

        {/* In Progress */}
        <Col lg={3} md={6}>
          <Card className="h-100 border-0 shadow-sm" style={{ borderRadius: '12px', transition: 'all 0.3s' }}>
            <Card.Body className="p-4">
              <div className="d-flex justify-content-between align-items-start">
                <div>
                  <small className="text-muted d-block mb-2" style={{ fontWeight: '500' }}>
                    In Progress
                  </small>
                  <h3 style={{ fontWeight: '700', color: '#0d6efd', marginBottom: 0 }}>
                    {byStatus['In Progress']}
                  </h3>
                </div>
                <div 
                  className="rounded-circle d-flex align-items-center justify-content-center"
                  style={{
                    width: '50px',
                    height: '50px',
                    background: '#e7f1ff',
                    color: '#0d6efd'
                  }}
                >
                  <FaClock style={{ fontSize: '1.25rem' }} />
                </div>
              </div>
            </Card.Body>
          </Card>
        </Col>

        {/* Completed */}
        <Col lg={3} md={6}>
          <Card className="h-100 border-0 shadow-sm" style={{ borderRadius: '12px', transition: 'all 0.3s' }}>
            <Card.Body className="p-4">
              <div className="d-flex justify-content-between align-items-start">
                <div>
                  <small className="text-muted d-block mb-2" style={{ fontWeight: '500' }}>
                    Completed
                  </small>
                  <h3 style={{ fontWeight: '700', color: '#198754', marginBottom: 0 }}>
                    {completedItems}/{totalSlots}
                  </h3>
                  <small className="text-muted" style={{ fontSize: '0.8rem' }}>
                    {progressPercentage}% done
                  </small>
                </div>
                <div 
                  className="rounded-circle d-flex align-items-center justify-content-center"
                  style={{
                    width: '50px',
                    height: '50px',
                    background: '#d1f4e0',
                    color: '#198754'
                  }}
                >
                  <FaCheckCircle style={{ fontSize: '1.25rem' }} />
                </div>
              </div>
            </Card.Body>
          </Card>
        </Col>

        {/* Overdue */}
        <Col lg={3} md={6}>
          <Card className="h-100 border-0 shadow-sm" style={{ borderRadius: '12px', transition: 'all 0.3s' }}>
            <Card.Body className="p-4">
              <div className="d-flex justify-content-between align-items-start">
                <div>
                  <small className="text-muted d-block mb-2" style={{ fontWeight: '500' }}>
                    Overdue
                  </small>
                  <h3 style={{ fontWeight: '700', color: '#dc3545', marginBottom: 0 }}>
                    {stats.overdue || 0}
                  </h3>
                </div>
                <div 
                  className="rounded-circle d-flex align-items-center justify-content-center"
                  style={{
                    width: '50px',
                    height: '50px',
                    background: '#ffe5e5',
                    color: '#dc3545'
                  }}
                >
                  <FaFire style={{ fontSize: '1.25rem' }} />
                </div>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Alert for Overdue Items */}
      {stats.overdue > 0 && (
        <Alert variant="danger" className="mb-4 border-0" style={{ borderRadius: '12px' }}>
          <div className="d-flex align-items-center">
            <FaExclamationTriangle className="me-3" style={{ fontSize: '1.25rem' }} />
            <div>
              <strong>Attention Required!</strong>
              <p className="mb-0 mt-1">
                This project has {stats.overdue} overdue item{stats.overdue > 1 ? 's' : ''} that need immediate attention.
              </p>
            </div>
          </div>
        </Alert>
      )}

      {/* Main Content Grid */}
      <Row className="g-4 mb-4">
        {/* Project Information */}
        <Col lg={6}>
          <Card className="h-100 border-0 shadow-sm" style={{ borderRadius: '12px' }}>
            <Card.Header className="bg-white border-0 p-4" style={{ borderBottom: '1px solid #e9ecef' }}>
              <h6 style={{ fontWeight: '700', color: '#2c3e50', marginBottom: 0 }}>
                📋 Project Information
              </h6>
            </Card.Header>
            <Card.Body className="p-4">
              <div className="mb-4">
                <small className="text-muted d-block mb-2" style={{ fontWeight: '500' }}>Project Head</small>
                <div className="d-flex align-items-center">
                  <div 
                    className="rounded-circle d-flex align-items-center justify-content-center me-3"
                    style={{
                      width: '40px',
                      height: '40px',
                      background: '#e7f1ff',
                      color: '#0d6efd',
                      fontWeight: '600'
                    }}
                  >
                    {project.projectHead?.name?.charAt(0).toUpperCase()}
                  </div>
                  <strong>{project.projectHead?.name || 'Not assigned'}</strong>
                </div>
              </div>

              <div className="mb-4">
                <small className="text-muted d-block mb-2" style={{ fontWeight: '500' }}>Services</small>
                <div className="d-flex align-items-center">
                  <FaBuilding className="me-2 text-muted" />
                  <strong>
                    {project.departments && project.departments.length > 0
                      ? project.departments.map(d => (typeof d === 'object' ? d.name : d)).join(', ')
                      : project.department?.name || 'Not assigned'}
                  </strong>
                </div>
              </div>

              <div className="mb-4">
                <small className="text-muted d-block mb-2" style={{ fontWeight: '500' }}>Team Size</small>
                <div className="d-flex align-items-center">
                  <FaUsers className="me-2 text-muted" />
                  <strong>{project.assignedUsers?.length || 0} members</strong>
                </div>
              </div>

              <div>
                <small className="text-muted d-block mb-2" style={{ fontWeight: '500' }}>Created By</small>
                <div className="d-flex align-items-center justify-content-between">
                  <div className="d-flex align-items-center">
                    <FaUser className="me-2 text-muted" />
                    <strong>{project.createdBy?.name || 'System'}</strong>
                  </div>
                  {project.createdAt && (
                    <small className="text-muted">{formatDate(project.createdAt)}</small>
                  )}
                </div>
              </div>
            </Card.Body>
          </Card>
        </Col>

        {/* Timeline & Dates */}
        <Col lg={6}>
          <Card className="h-100 border-0 shadow-sm" style={{ borderRadius: '12px' }}>
            <Card.Header className="bg-white border-0 p-4" style={{ borderBottom: '1px solid #e9ecef' }}>
              <h6 style={{ fontWeight: '700', color: '#2c3e50', marginBottom: 0 }}>
                📅 Timeline
              </h6>
            </Card.Header>
            <Card.Body className="p-4">
              <div className="mb-4">
                <div className="d-flex justify-content-between mb-2">
                  <small className="text-muted" style={{ fontWeight: '500' }}>Project Duration</small>
                  <small className="fw-bold">
                    {project.startDate && project.endDate
                      ? `${Math.ceil((new Date(project.endDate) - new Date(project.startDate)) / (1000 * 60 * 60 * 24))} days`
                      : 'Not set'}
                  </small>
                </div>
                {project.startDate && project.endDate && (
                  <ProgressBar
                    now={Math.min(
                      ((new Date() - new Date(project.startDate)) /
                        (new Date(project.endDate) - new Date(project.startDate))) *
                      100,
                      100
                    )}
                    variant="info"
                    style={{ height: '6px' }}
                  />
                )}
              </div>

              <ListGroup variant="flush">
                <ListGroup.Item className="px-0 py-3 border-0">
                  <div className="d-flex justify-content-between">
                    <span className="text-muted">Start Date</span>
                    <strong>{formatDate(project.startDate)}</strong>
                  </div>
                </ListGroup.Item>
                <ListGroup.Item className="px-0 py-3 border-0">
                  <div className="d-flex justify-content-between">
                    <span className="text-muted">End Date</span>
                    <strong>{project.endDate ? formatDate(project.endDate) : 'Not set'}</strong>
                  </div>
                </ListGroup.Item>
                <ListGroup.Item className="px-0 py-3 border-0">
                  <div className="d-flex justify-content-between">
                    <span className="text-muted">Created</span>
                    <strong>{formatDate(project.createdAt)}</strong>
                  </div>
                </ListGroup.Item>
              </ListGroup>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Work Items Status Breakdown */}
      <Card className="border-0 shadow-sm mb-4" style={{ borderRadius: '12px' }}>
        <Card.Header className="bg-white border-0 p-4" style={{ borderBottom: '1px solid #e9ecef' }}>
          <h6 style={{ fontWeight: '700', color: '#2c3e50', marginBottom: 0 }}>
            📊 Work Items by Status
          </h6>
        </Card.Header>
        <Card.Body className="p-4">
          <Row className="g-3">
            {[
              { label: 'To Do', value: byStatus['To Do'], icon: FaClipboardList, color: '#6c757d', bg: '#f8f9fa' },
              { label: 'In Progress', value: byStatus['In Progress'], icon: FaClock, color: '#0d6efd', bg: '#e7f1ff' },
              { label: 'Review', value: byStatus.Review, icon: FaChartLine, color: '#ffc107', bg: '#fff3cd' },
              { label: 'Done', value: byStatus.Done, icon: FaCheckCircle, color: '#198754', bg: '#d1f4e0' }
            ].map((status, idx) => {
              const Icon = status.icon;
              return (
                <Col md={3} key={idx}>
                  <div 
                    className="p-4 rounded-3 text-center"
                    style={{
                      background: status.bg,
                      border: `2px solid ${status.color}`,
                      transition: 'all 0.3s'
                    }}
                  >
                    <Icon style={{ fontSize: '1.5rem', color: status.color, marginBottom: '0.5rem' }} />
                    <h4 style={{ fontWeight: '700', color: status.color, marginBottom: '0.25rem' }}>
                      {status.value}
                    </h4>
                    <small style={{ fontWeight: '600', color: status.color }}>
                      {status.label}
                    </small>
                  </div>
                </Col>
              );
            })}
          </Row>
        </Card.Body>
      </Card>

      {/* Slot System Info (if enabled) */}
      {project.slotConfiguration?.enableSlotSystem && (
        <Card className="border-0 shadow-sm" style={{ borderRadius: '12px' }}>
          <Card.Header className="bg-white border-0 p-4" style={{ borderBottom: '1px solid #e9ecef' }}>
            <h6 style={{ fontWeight: '700', color: '#2c3e50', marginBottom: 0 }}>
              🎯 Slot System Status
            </h6>
          </Card.Header>
          <Card.Body className="p-4">
            <Row className="g-4 mb-4">
              <Col md={4}>
                <div className="text-center">
                  <div style={{ fontSize: '2.5rem', fontWeight: '700', color: '#667eea', marginBottom: '0.5rem' }}>
                    {project.progressTracking?.totalSlots || project.slotConfiguration?.totalSlots || 0}
                  </div>
                  <small className="text-muted" style={{ fontWeight: '500' }}>Total Slots</small>
                </div>
              </Col>
              <Col md={4}>
                <div className="text-center">
                  <div style={{ fontSize: '2.5rem', fontWeight: '700', color: '#198754', marginBottom: '0.5rem' }}>
                    {project.progressTracking?.completedSlots || 0}
                  </div>
                  <small className="text-muted" style={{ fontWeight: '500' }}>Completed Slots</small>
                </div>
              </Col>
              <Col md={4}>
                <div className="text-center">
                  <div style={{ fontSize: '2.5rem', fontWeight: '700', color: '#0d6efd', marginBottom: '0.5rem' }}>
                    {(project.progressTracking?.totalSlots || project.slotConfiguration?.totalSlots || 0) - (project.progressTracking?.completedSlots || 0)}
                  </div>
                  <small className="text-muted" style={{ fontWeight: '500' }}>Remaining Slots</small>
                </div>
              </Col>
            </Row>
            
            <Alert variant="info" className="mb-0 border-0" style={{ borderRadius: '8px' }}>
              <small>
                <strong>💡 How to mark slots as completed:</strong> Go to the <strong>Work</strong> tab, expand a slot, and mark the assigned work items as "Done". 
                When all work items in a slot are completed, the slot will be automatically marked as completed and the progress will update.
              </small>
            </Alert>
          </Card.Body>
        </Card>
      )}
    </div>
  );
};

export default OverviewTab;
