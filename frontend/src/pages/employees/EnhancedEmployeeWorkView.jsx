import React, { useState, useEffect } from 'react';
import { 
  Container, 
  Row, 
  Col, 
  Card, 
  Button, 
  Nav, 
  Tab, 
  Badge, 
  ProgressBar,
  Spinner,
  Alert
} from 'react-bootstrap';
import { 
  FaArrowLeft, 
  FaUser, 
  FaTasks, 
  FaCalendarAlt, 
  FaProjectDiagram,
  FaClock,
  FaChartLine,
  FaExclamationTriangle,
  FaCheckCircle,
  FaFileExport,
  FaCog
} from 'react-icons/fa';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { useAuth } from '../../context/AuthContext';
import workCalendarApi from '../../api/workCalendarApi';
import workItemApi from '../../api/workItemApi';
import projectApi from '../../api/projectApi';
import EmployeeWorkCalendar from '../../components/calendar/EmployeeWorkCalendar';
import moment from 'moment';
import './EnhancedEmployeeWorkView.css';

/**
 * Enhanced Employee Work View Page
 * Redesigned with overview-first approach, better navigation, and comprehensive work details
 */
const EnhancedEmployeeWorkView = () => {
  const { userId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(true);
  const [employeeData, setEmployeeData] = useState(null);
  const [workSummary, setWorkSummary] = useState(null);
  const [recentWork, setRecentWork] = useState([]);
  const [employeeProjects, setEmployeeProjects] = useState([]);

  const currentEmployeeId = userId || user?.id || user?._id;
  const isOwnProfile = currentEmployeeId === (user?.id || user?._id);

  useEffect(() => {
    if (currentEmployeeId) {
      loadEmployeeWorkData();
    }
  }, [currentEmployeeId]);

  const loadEmployeeWorkData = async () => {
    try {
      setLoading(true);
      
      // Load employee work calendar data for overview
      const calendarResponse = await workCalendarApi.getEmployeeWorkCalendar(currentEmployeeId, {
        startDate: moment().subtract(30, 'days').toISOString(),
        endDate: moment().add(30, 'days').toISOString()
      });

      // Load recent work items
      const workItemsResponse = isOwnProfile 
        ? await workItemApi.getMyWork({ limit: 10 })
        : await workItemApi.getAllWorkItems({ assignedTo: currentEmployeeId, limit: 10 });

      // Load projects where employee is involved
      const projectsResponse = await projectApi.getAllProjects();

      const calendarData = calendarResponse.data?.data || calendarResponse.data;
      const workItemsData = workItemsResponse.data?.data || workItemsResponse.data;
      const projectsData = projectsResponse.data?.data || projectsResponse.data;

      // Filter projects where the employee is involved
      const employeeProjectsFiltered = Array.isArray(projectsData) 
        ? projectsData.filter(project => {
            // Check if employee is assigned to the project or has work items in the project
            const isAssignedToProject = project.assignedUsers?.some(userId => 
              userId === currentEmployeeId || userId._id === currentEmployeeId
            );
            const hasWorkInProject = Array.isArray(workItemsData) && workItemsData.some(workItem => 
              workItem.project?._id === project._id || workItem.project === project._id
            );
            return isAssignedToProject || hasWorkInProject;
          })
        : [];

      setEmployeeData(calendarData.employee);
      setWorkSummary(calendarData.analytics);
      setRecentWork(Array.isArray(workItemsData) ? workItemsData : []);
      setEmployeeProjects(employeeProjectsFiltered);

    } catch (error) {
      console.error('Error loading employee work data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      'To Do': 'secondary',
      'In Progress': 'primary',
      'Review': 'warning',
      'Done': 'success',
      'Blocked': 'danger'
    };
    return colors[status] || 'secondary';
  };

  const getPriorityColor = (priority) => {
    const colors = {
      'low': 'success',
      'medium': 'info',
      'high': 'warning',
      'urgent': 'danger'
    };
    return colors[priority] || 'secondary';
  };

  if (loading) {
    return (
      <Container fluid className="py-4">
        <div className="text-center py-5">
          <Spinner animation="border" role="status">
            <span className="visually-hidden">Loading...</span>
          </Spinner>
          <div className="mt-3">
            <p className="text-muted">Loading employee work details...</p>
          </div>
        </div>
      </Container>
    );
  }

  return (
    <Container fluid className="py-4">
      {/* Header */}
      <Card className="border-0 shadow-sm mb-4" style={{ borderRadius: '15px' }}>
        <Card.Body className="p-4">
          <div className="d-flex align-items-center justify-content-between">
            <div className="d-flex align-items-center">
              <Button
                variant="outline-secondary"
                size="sm"
                onClick={() => navigate('/employees')}
                className="me-3"
                style={{ borderRadius: '10px' }}
              >
                <FaArrowLeft className="me-2" />
                Back to Employees
              </Button>
              <div>
                <h4 className="mb-1 fw-bold text-dark">
                  <FaUser className="me-2 text-primary" />
                  {isOwnProfile ? 'My Work Details' : `${employeeData?.name || 'Employee'}'s Work Details`}
                </h4>
                <p className="mb-0 text-muted">
                  Comprehensive view of work assignments, calendar, and project details
                </p>
              </div>
            </div>
            <div className="d-flex gap-2">
              <Button 
                variant="outline-primary" 
                size="sm"
                onClick={loadEmployeeWorkData}
              >
                Refresh
              </Button>
              {isOwnProfile && (
                <Button 
                  variant="primary" 
                  size="sm"
                  onClick={() => navigate('/my-work')}
                >
                  Go to My Work
                </Button>
              )}
            </div>
          </div>
        </Card.Body>
      </Card>

      {/* Navigation Tabs */}
      <Tab.Container activeKey={activeTab} onSelect={setActiveTab}>
        <Card className="border-0 shadow-sm">
          <Card.Header className="bg-white border-0 pt-3 pb-0">
            <Nav variant="tabs" className="border-0">
              <Nav.Item>
                <Nav.Link eventKey="overview" className="d-flex align-items-center">
                  <FaChartLine className="me-2" />
                  Overview
                </Nav.Link>
              </Nav.Item>
              <Nav.Item>
                <Nav.Link eventKey="assignments" className="d-flex align-items-center">
                  <FaTasks className="me-2" />
                  Work Assignments
                </Nav.Link>
              </Nav.Item>
              <Nav.Item>
                <Nav.Link eventKey="calendar" className="d-flex align-items-center">
                  <FaCalendarAlt className="me-2" />
                  Calendar View
                </Nav.Link>
              </Nav.Item>
              <Nav.Item>
                <Nav.Link eventKey="projects" className="d-flex align-items-center">
                  <FaProjectDiagram className="me-2" />
                  Project Details
                </Nav.Link>
              </Nav.Item>
            </Nav>
          </Card.Header>

          <Card.Body className="p-4">
            <Tab.Content>
              {/* Overview Tab */}
              <Tab.Pane eventKey="overview">
                <Row>
                  {/* Work Summary Cards */}
                  <Col lg={8}>
                    <Row className="g-3 mb-4">
                      <Col md={3}>
                        <Card className="border-0 bg-primary text-white h-100">
                          <Card.Body className="text-center">
                            <FaTasks size={24} className="mb-2" />
                            <h3 className="mb-1">{workSummary?.totalWork || 0}</h3>
                            <small>Total Work</small>
                          </Card.Body>
                        </Card>
                      </Col>
                      <Col md={3}>
                        <Card className="border-0 bg-success text-white h-100">
                          <Card.Body className="text-center">
                            <FaCheckCircle size={24} className="mb-2" />
                            <h3 className="mb-1">{workSummary?.completedWork || 0}</h3>
                            <small>Completed</small>
                          </Card.Body>
                        </Card>
                      </Col>
                      <Col md={3}>
                        <Card className="border-0 bg-info text-white h-100">
                          <Card.Body className="text-center">
                            <FaClock size={24} className="mb-2" />
                            <h3 className="mb-1">{workSummary?.inProgressWork || 0}</h3>
                            <small>In Progress</small>
                          </Card.Body>
                        </Card>
                      </Col>
                      <Col md={3}>
                        <Card className="border-0 bg-danger text-white h-100">
                          <Card.Body className="text-center">
                            <FaExclamationTriangle size={24} className="mb-2" />
                            <h3 className="mb-1">{workSummary?.overdueWork || 0}</h3>
                            <small>Overdue</small>
                          </Card.Body>
                        </Card>
                      </Col>
                    </Row>

                    {/* Work Progress */}
                    <Card className="border-0 shadow-sm mb-4">
                      <Card.Header className="bg-light">
                        <h6 className="mb-0">Work Progress</h6>
                      </Card.Header>
                      <Card.Body>
                        <div className="mb-3">
                          <div className="d-flex justify-content-between mb-1">
                            <span>Overall Completion</span>
                            <span>
                              {workSummary?.totalWork > 0 
                                ? Math.round((workSummary.completedWork / workSummary.totalWork) * 100)
                                : 0
                              }%
                            </span>
                          </div>
                          <ProgressBar 
                            now={workSummary?.totalWork > 0 
                              ? (workSummary.completedWork / workSummary.totalWork) * 100
                              : 0
                            }
                            variant="success"
                          />
                        </div>

                        {/* Priority Breakdown */}
                        <div className="row g-2">
                          <div className="col-6">
                            <div className="d-flex justify-content-between">
                              <small className="text-danger">Urgent:</small>
                              <Badge bg="danger">{workSummary?.workloadByPriority?.urgent || 0}</Badge>
                            </div>
                          </div>
                          <div className="col-6">
                            <div className="d-flex justify-content-between">
                              <small className="text-warning">High:</small>
                              <Badge bg="warning">{workSummary?.workloadByPriority?.high || 0}</Badge>
                            </div>
                          </div>
                          <div className="col-6">
                            <div className="d-flex justify-content-between">
                              <small className="text-info">Medium:</small>
                              <Badge bg="info">{workSummary?.workloadByPriority?.medium || 0}</Badge>
                            </div>
                          </div>
                          <div className="col-6">
                            <div className="d-flex justify-content-between">
                              <small className="text-muted">Low:</small>
                              <Badge bg="light" text="dark">{workSummary?.workloadByPriority?.low || 0}</Badge>
                            </div>
                          </div>
                        </div>
                      </Card.Body>
                    </Card>

                    {/* Recent Work Items */}
                    <Card className="border-0 shadow-sm">
                      <Card.Header className="bg-light d-flex justify-content-between align-items-center">
                        <h6 className="mb-0">Recent Work Items</h6>
                        <Button 
                          variant="outline-primary" 
                          size="sm"
                          onClick={() => setActiveTab('assignments')}
                        >
                          View All
                        </Button>
                      </Card.Header>
                      <Card.Body className="p-0">
                        {recentWork.length > 0 ? (
                          <div className="list-group list-group-flush">
                            {recentWork.slice(0, 5).map(work => (
                              <div key={work._id} className="list-group-item border-0 py-3">
                                <div className="d-flex justify-content-between align-items-start">
                                  <div className="flex-grow-1">
                                    <h6 className="mb-1">{work.title}</h6>
                                    <p className="mb-1 text-muted small">
                                      {work.description?.substring(0, 100)}
                                      {work.description?.length > 100 ? '...' : ''}
                                    </p>
                                    <div className="d-flex gap-2">
                                      <Badge bg={getStatusColor(work.status)}>
                                        {work.status}
                                      </Badge>
                                      <Badge bg={getPriorityColor(work.priority)}>
                                        {work.priority}
                                      </Badge>
                                      {work.project && (
                                        <Badge bg="light" text="dark">
                                          {work.project.name}
                                        </Badge>
                                      )}
                                    </div>
                                  </div>
                                  <div className="text-end">
                                    <small className="text-muted">
                                      Due: {moment(work.dueDate).format('MMM DD')}
                                    </small>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-center py-4">
                            <p className="text-muted mb-0">No recent work items found</p>
                          </div>
                        )}
                      </Card.Body>
                    </Card>
                  </Col>

                  {/* Sidebar */}
                  <Col lg={4}>
                    {/* Employee Info */}
                    <Card className="border-0 shadow-sm mb-4">
                      <Card.Header className="bg-light">
                        <h6 className="mb-0">Employee Information</h6>
                      </Card.Header>
                      <Card.Body>
                        <div className="text-center mb-3">
                          <div className="bg-primary rounded-circle d-inline-flex align-items-center justify-content-center" 
                               style={{ width: '60px', height: '60px' }}>
                            <FaUser className="text-white" size={24} />
                          </div>
                          <h6 className="mt-2 mb-1">{employeeData?.name || 'Employee'}</h6>
                          <small className="text-muted">{employeeData?.email}</small>
                        </div>
                        
                        {employeeData?.department && (
                          <div className="mb-2">
                            <strong>Department:</strong>
                            <div className="text-muted">{employeeData.department.name}</div>
                          </div>
                        )}
                      </Card.Body>
                    </Card>

                    {/* Time Tracking */}
                    {workSummary && (
                      <Card className="border-0 shadow-sm mb-4">
                        <Card.Header className="bg-light">
                          <h6 className="mb-0">Time Tracking</h6>
                        </Card.Header>
                        <Card.Body>
                          <div className="d-flex justify-content-between mb-2">
                            <span>Estimated Hours:</span>
                            <strong>{workSummary.totalEstimatedHours || 0}h</strong>
                          </div>
                          <div className="d-flex justify-content-between mb-2">
                            <span>Actual Hours:</span>
                            <strong>{workSummary.totalActualHours || 0}h</strong>
                          </div>
                          {workSummary.averageEfficiency && (
                            <div className="d-flex justify-content-between">
                              <span>Efficiency:</span>
                              <Badge 
                                bg={workSummary.averageEfficiency >= 90 ? 'success' : 
                                    workSummary.averageEfficiency >= 70 ? 'warning' : 'danger'}
                              >
                                {workSummary.averageEfficiency}%
                              </Badge>
                            </div>
                          )}
                        </Card.Body>
                      </Card>
                    )}

                    {/* Quick Actions */}
                    <Card className="border-0 shadow-sm mb-4">
                      <Card.Header className="bg-light">
                        <h6 className="mb-0">Active Projects</h6>
                      </Card.Header>
                      <Card.Body>
                        {employeeProjects.length > 0 ? (
                          <div className="d-flex flex-column gap-2">
                            {employeeProjects.slice(0, 3).map(project => (
                              <div key={project._id} className="d-flex justify-content-between align-items-center">
                                <div className="flex-grow-1">
                                  <div className="fw-semibold small">{project.name}</div>
                                  <small className="text-muted">{project.client?.name || 'Internal'}</small>
                                </div>
                                <Badge 
                                  bg={project.status === 'completed' ? 'success' : 
                                      project.status === 'in-progress' ? 'primary' : 'secondary'}
                                  className="small"
                                >
                                  {project.status || 'Active'}
                                </Badge>
                              </div>
                            ))}
                            {employeeProjects.length > 3 && (
                              <div className="text-center">
                                <Button 
                                  variant="link" 
                                  size="sm" 
                                  className="p-0"
                                  onClick={() => setActiveTab('projects')}
                                >
                                  View all {employeeProjects.length} projects
                                </Button>
                              </div>
                            )}
                          </div>
                        ) : (
                          <small className="text-muted">No active projects</small>
                        )}
                      </Card.Body>
                    </Card>

                    {/* Quick Actions */}
                    <Card className="border-0 shadow-sm">
                      <Card.Header className="bg-light">
                        <h6 className="mb-0">Quick Actions</h6>
                      </Card.Header>
                      <Card.Body>
                        <div className="d-grid gap-2">
                          <Button 
                            variant="outline-primary" 
                            size="sm"
                            onClick={() => setActiveTab('calendar')}
                          >
                            <FaCalendarAlt className="me-2" />
                            View Calendar
                          </Button>
                          <Button 
                            variant="outline-success" 
                            size="sm"
                            onClick={() => setActiveTab('assignments')}
                          >
                            <FaTasks className="me-2" />
                            View Assignments
                          </Button>
                          <Button 
                            variant="outline-info" 
                            size="sm"
                            onClick={() => setActiveTab('projects')}
                          >
                            <FaProjectDiagram className="me-2" />
                            View Projects ({employeeProjects.length})
                          </Button>
                        </div>
                      </Card.Body>
                    </Card>
                  </Col>
                </Row>
              </Tab.Pane>

              {/* Work Assignments Tab */}
              <Tab.Pane eventKey="assignments">
                <Row>
                  <Col lg={8}>
                    <div className="mb-3">
                      <h5>Work Assignments</h5>
                      <p className="text-muted">Detailed view of all work items and assignments</p>
                    </div>
                    
                    {recentWork.length > 0 ? (
                      <div className="table-responsive">
                        <table className="table table-hover">
                          <thead className="table-light">
                            <tr>
                              <th>Title</th>
                              <th>Project</th>
                              <th>Status</th>
                              <th>Priority</th>
                              <th>Due Date</th>
                              <th>Progress</th>
                            </tr>
                          </thead>
                          <tbody>
                            {recentWork.map(work => (
                              <tr key={work._id}>
                                <td>
                                  <div>
                                    <strong>{work.title}</strong>
                                    <div className="small text-muted">{work.type}</div>
                                  </div>
                                </td>
                                <td>{work.project?.name || 'No Project'}</td>
                                <td>
                                  <Badge bg={getStatusColor(work.status)}>
                                    {work.status}
                                  </Badge>
                                </td>
                                <td>
                                  <Badge bg={getPriorityColor(work.priority)}>
                                    {work.priority}
                                  </Badge>
                                </td>
                                <td>
                                  <div>
                                    {moment(work.dueDate).format('MMM DD, YYYY')}
                                    <div className="small text-muted">
                                      {moment(work.dueDate).fromNow()}
                                    </div>
                                  </div>
                                </td>
                                <td>
                                  <div className="d-flex align-items-center">
                                    <div className="flex-grow-1 me-2">
                                      <ProgressBar 
                                        now={work.status === 'Done' ? 100 : 
                                             work.status === 'In Progress' ? 50 : 
                                             work.status === 'Review' ? 75 : 0}
                                        size="sm"
                                        variant={work.status === 'Done' ? 'success' : 'primary'}
                                      />
                                    </div>
                                    <small className="text-muted">
                                      {work.status === 'Done' ? '100%' : 
                                       work.status === 'In Progress' ? '50%' : 
                                       work.status === 'Review' ? '75%' : '0%'}
                                    </small>
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <Alert variant="info">
                        <FaTasks className="me-2" />
                        No work assignments found for this employee.
                      </Alert>
                    )}
                  </Col>

                  {/* Assignments Sidebar */}
                  <Col lg={4}>
                    {/* Debug Test */}
                    <Card className="border-0 shadow-sm mb-4" style={{ backgroundColor: '#e3f2fd' }}>
                      <Card.Header className="bg-info text-white">
                        <h6 className="mb-0">🔧 Assignments Sidebar Test</h6>
                      </Card.Header>
                      <Card.Body>
                        <p className="mb-0">Assignments sidebar is working!</p>
                        <small className="text-muted">Work items: {recentWork.length}</small>
                      </Card.Body>
                    </Card>

                    {/* Work Statistics */}
                    <Card className="border-0 shadow-sm mb-4">
                      <Card.Header className="bg-light">
                        <h6 className="mb-0">Work Statistics</h6>
                      </Card.Header>
                      <Card.Body>
                        <div className="d-flex justify-content-between mb-2">
                          <span>Total Assignments:</span>
                          <strong>{recentWork.length}</strong>
                        </div>
                        <div className="d-flex justify-content-between mb-2">
                          <span>Completed:</span>
                          <strong className="text-success">
                            {recentWork.filter(w => w.status === 'Done').length}
                          </strong>
                        </div>
                        <div className="d-flex justify-content-between mb-2">
                          <span>In Progress:</span>
                          <strong className="text-primary">
                            {recentWork.filter(w => w.status === 'In Progress').length}
                          </strong>
                        </div>
                        <div className="d-flex justify-content-between">
                          <span>Pending:</span>
                          <strong className="text-warning">
                            {recentWork.filter(w => w.status === 'To Do').length}
                          </strong>
                        </div>
                      </Card.Body>
                    </Card>

                    {/* Priority Breakdown */}
                    <Card className="border-0 shadow-sm mb-4">
                      <Card.Header className="bg-light">
                        <h6 className="mb-0">Priority Breakdown</h6>
                      </Card.Header>
                      <Card.Body>
                        <div className="d-flex justify-content-between mb-2">
                          <span className="text-danger">Urgent:</span>
                          <Badge bg="danger">
                            {recentWork.filter(w => w.priority === 'urgent').length}
                          </Badge>
                        </div>
                        <div className="d-flex justify-content-between mb-2">
                          <span className="text-warning">High:</span>
                          <Badge bg="warning">
                            {recentWork.filter(w => w.priority === 'high').length}
                          </Badge>
                        </div>
                        <div className="d-flex justify-content-between mb-2">
                          <span className="text-info">Medium:</span>
                          <Badge bg="info">
                            {recentWork.filter(w => w.priority === 'medium').length}
                          </Badge>
                        </div>
                        <div className="d-flex justify-content-between">
                          <span className="text-muted">Low:</span>
                          <Badge bg="light" text="dark">
                            {recentWork.filter(w => w.priority === 'low').length}
                          </Badge>
                        </div>
                      </Card.Body>
                    </Card>

                    {/* Upcoming Deadlines */}
                    <Card className="border-0 shadow-sm mb-4">
                      <Card.Header className="bg-light">
                        <h6 className="mb-0">Upcoming Deadlines</h6>
                      </Card.Header>
                      <Card.Body>
                        {recentWork
                          .filter(w => w.status !== 'Done')
                          .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate))
                          .slice(0, 5)
                          .map(work => (
                            <div key={work._id} className="d-flex justify-content-between align-items-center mb-2">
                              <div className="flex-grow-1">
                                <div className="small fw-semibold">{work.title}</div>
                                <small className="text-muted">{work.project?.name || 'No Project'}</small>
                              </div>
                              <div className="text-end">
                                <small className={`fw-bold ${moment(work.dueDate).isBefore(moment()) ? 'text-danger' : 'text-muted'}`}>
                                  {moment(work.dueDate).format('MMM DD')}
                                </small>
                              </div>
                            </div>
                          ))}
                        {recentWork.filter(w => w.status !== 'Done').length === 0 && (
                          <small className="text-muted">No pending deadlines</small>
                        )}
                      </Card.Body>
                    </Card>

                    {/* Quick Filters */}
                    <Card className="border-0 shadow-sm">
                      <Card.Header className="bg-light">
                        <h6 className="mb-0">Quick Filters</h6>
                      </Card.Header>
                      <Card.Body>
                        <div className="d-grid gap-2">
                          <Button variant="outline-danger" size="sm">
                            Overdue ({recentWork.filter(w => moment(w.dueDate).isBefore(moment()) && w.status !== 'Done').length})
                          </Button>
                          <Button variant="outline-warning" size="sm">
                            Due Today ({recentWork.filter(w => moment(w.dueDate).isSame(moment(), 'day') && w.status !== 'Done').length})
                          </Button>
                          <Button variant="outline-info" size="sm">
                            This Week ({recentWork.filter(w => moment(w.dueDate).isSame(moment(), 'week') && w.status !== 'Done').length})
                          </Button>
                        </div>
                      </Card.Body>
                    </Card>
                  </Col>
                </Row>
              </Tab.Pane>

              {/* Calendar Tab */}
              <Tab.Pane eventKey="calendar">
                <Row>
                  <Col lg={8}>
                    <div className="mb-3">
                      <h5>Calendar View</h5>
                      <p className="text-muted">Visual calendar showing all work schedules and deadlines</p>
                    </div>
                    <EmployeeWorkCalendar employeeId={currentEmployeeId} />
                  </Col>

                  {/* Calendar Sidebar */}
                  <Col lg={4}>
                    {/* Debug Test */}
                    <Card className="border-0 shadow-sm mb-4" style={{ backgroundColor: '#fff3e0' }}>
                      <Card.Header className="bg-warning text-dark">
                        <h6 className="mb-0">🔧 Calendar Sidebar Test</h6>
                      </Card.Header>
                      <Card.Body>
                        <p className="mb-0">Calendar sidebar is working!</p>
                        <small className="text-muted">Current tab: Calendar View</small>
                      </Card.Body>
                    </Card>

                    {/* Calendar Legend */}
                    <Card className="border-0 shadow-sm mb-4">
                      <Card.Header className="bg-light">
                        <h6 className="mb-0">Calendar Legend</h6>
                      </Card.Header>
                      <Card.Body>
                        <div className="d-flex align-items-center mb-2">
                          <div className="bg-danger rounded me-2" style={{ width: '12px', height: '12px' }}></div>
                          <small>Overdue Tasks</small>
                        </div>
                        <div className="d-flex align-items-center mb-2">
                          <div className="bg-warning rounded me-2" style={{ width: '12px', height: '12px' }}></div>
                          <small>Due Today</small>
                        </div>
                        <div className="d-flex align-items-center mb-2">
                          <div className="bg-primary rounded me-2" style={{ width: '12px', height: '12px' }}></div>
                          <small>Upcoming Tasks</small>
                        </div>
                        <div className="d-flex align-items-center">
                          <div className="bg-success rounded me-2" style={{ width: '12px', height: '12px' }}></div>
                          <small>Completed Tasks</small>
                        </div>
                      </Card.Body>
                    </Card>

                    {/* Today's Schedule */}
                    <Card className="border-0 shadow-sm mb-4">
                      <Card.Header className="bg-light">
                        <h6 className="mb-0">Today's Schedule</h6>
                      </Card.Header>
                      <Card.Body>
                        {recentWork
                          .filter(w => moment(w.dueDate).isSame(moment(), 'day'))
                          .map(work => (
                            <div key={work._id} className="d-flex justify-content-between align-items-center mb-2">
                              <div className="flex-grow-1">
                                <div className="small fw-semibold">{work.title}</div>
                                <small className="text-muted">{work.project?.name || 'No Project'}</small>
                              </div>
                              <Badge bg={getStatusColor(work.status)} className="small">
                                {work.status}
                              </Badge>
                            </div>
                          ))}
                        {recentWork.filter(w => moment(w.dueDate).isSame(moment(), 'day')).length === 0 && (
                          <small className="text-muted">No tasks scheduled for today</small>
                        )}
                      </Card.Body>
                    </Card>

                    {/* This Week's Overview */}
                    <Card className="border-0 shadow-sm mb-4">
                      <Card.Header className="bg-light">
                        <h6 className="mb-0">This Week's Overview</h6>
                      </Card.Header>
                      <Card.Body>
                        <div className="d-flex justify-content-between mb-2">
                          <span>Total Tasks:</span>
                          <strong>
                            {recentWork.filter(w => moment(w.dueDate).isSame(moment(), 'week')).length}
                          </strong>
                        </div>
                        <div className="d-flex justify-content-between mb-2">
                          <span>Completed:</span>
                          <strong className="text-success">
                            {recentWork.filter(w => moment(w.dueDate).isSame(moment(), 'week') && w.status === 'Done').length}
                          </strong>
                        </div>
                        <div className="d-flex justify-content-between">
                          <span>Remaining:</span>
                          <strong className="text-warning">
                            {recentWork.filter(w => moment(w.dueDate).isSame(moment(), 'week') && w.status !== 'Done').length}
                          </strong>
                        </div>
                      </Card.Body>
                    </Card>

                    {/* Calendar Navigation */}
                    <Card className="border-0 shadow-sm">
                      <Card.Header className="bg-light">
                        <h6 className="mb-0">Quick Navigation</h6>
                      </Card.Header>
                      <Card.Body>
                        <div className="d-grid gap-2">
                          <Button variant="outline-primary" size="sm">
                            <FaCalendarAlt className="me-2" />
                            Go to Today
                          </Button>
                          <Button variant="outline-info" size="sm">
                            View This Month
                          </Button>
                          <Button variant="outline-success" size="sm">
                            Export Calendar
                          </Button>
                        </div>
                      </Card.Body>
                    </Card>
                  </Col>
                </Row>
              </Tab.Pane>

              {/* Projects Tab */}
              <Tab.Pane eventKey="projects">
                <Row>
                  <Col lg={8}>
                    <div className="mb-3">
                      <h5>Project Details</h5>
                      <p className="text-muted">Projects where this employee is involved and their work contributions</p>
                    </div>
                    
                    {employeeProjects.length > 0 ? (
                      <Row className="g-4">
                        {employeeProjects.map(project => {
                          // Calculate employee's work in this project
                          const projectWorkItems = recentWork.filter(work => 
                            work.project?._id === project._id || work.project === project._id
                          );
                          const completedWork = projectWorkItems.filter(work => work.status === 'Done').length;
                          const totalWork = projectWorkItems.length;
                          const progressPercentage = totalWork > 0 ? Math.round((completedWork / totalWork) * 100) : 0;

                          return (
                            <Col lg={12} key={project._id}>
                              <Card className="border-0 shadow-sm h-100 project-card">
                                <Card.Header className="bg-light d-flex justify-content-between align-items-center">
                                  <div>
                                    <h6 className="mb-0">{project.name}</h6>
                                    <small className="text-muted">
                                      {project.client?.name || 'Internal Project'}
                                    </small>
                                  </div>
                                  <Badge 
                                    bg={project.status === 'completed' ? 'success' : 
                                        project.status === 'in-progress' ? 'primary' : 
                                        project.status === 'on-hold' ? 'warning' : 'secondary'}
                                  >
                                    {project.status || 'Active'}
                                  </Badge>
                                </Card.Header>
                                <Card.Body>
                                  {project.description && (
                                    <p className="text-muted small mb-3">
                                      {project.description.length > 100 
                                        ? `${project.description.substring(0, 100)}...`
                                        : project.description
                                      }
                                    </p>
                                  )}

                                  {/* Employee's Work Progress in Project */}
                                  <div className="mb-3">
                                    <div className="d-flex justify-content-between mb-1">
                                      <small className="text-muted">Your Work Progress</small>
                                      <small className="text-muted">{completedWork}/{totalWork} tasks</small>
                                    </div>
                                    <ProgressBar 
                                      now={progressPercentage} 
                                      variant={progressPercentage === 100 ? 'success' : 'primary'}
                                      style={{ height: '6px' }}
                                    />
                                  </div>

                                  {/* Project Details */}
                                  <div className="row g-2 mb-3">
                                    {project.startDate && (
                                      <div className="col-6">
                                        <small className="text-muted d-block">Start Date</small>
                                        <small className="fw-bold">
                                          {moment(project.startDate).format('MMM DD, YYYY')}
                                        </small>
                                      </div>
                                    )}
                                    {project.endDate && (
                                      <div className="col-6">
                                        <small className="text-muted d-block">End Date</small>
                                        <small className="fw-bold">
                                          {moment(project.endDate).format('MMM DD, YYYY')}
                                        </small>
                                      </div>
                                    )}
                                    {project.departments && project.departments.length > 0 && (
                                      <div className="col-12">
                                        <small className="text-muted d-block">Departments</small>
                                        <div className="d-flex gap-1 flex-wrap">
                                          {project.departments.map((dept, index) => (
                                            <Badge key={index} bg="light" text="dark" className="small">
                                              {typeof dept === 'object' ? dept.name : dept}
                                            </Badge>
                                          ))}
                                        </div>
                                      </div>
                                    )}
                                  </div>

                                  {/* Recent Work Items in Project */}
                                  {projectWorkItems.length > 0 && (
                                    <div>
                                      <small className="text-muted fw-bold d-block mb-2">Recent Work Items</small>
                                      <div className="list-group list-group-flush">
                                        {projectWorkItems.slice(0, 3).map(work => (
                                          <div key={work._id} className="list-group-item border-0 px-0 py-2">
                                            <div className="d-flex justify-content-between align-items-center">
                                              <div className="flex-grow-1">
                                                <div className="fw-semibold small">{work.title}</div>
                                                <div className="d-flex gap-1 mt-1">
                                                  <Badge bg={getStatusColor(work.status)} className="small">
                                                    {work.status}
                                                  </Badge>
                                                  <Badge bg={getPriorityColor(work.priority)} className="small">
                                                    {work.priority}
                                                  </Badge>
                                                </div>
                                              </div>
                                              <small className="text-muted">
                                                {moment(work.dueDate).format('MMM DD')}
                                              </small>
                                            </div>
                                          </div>
                                        ))}
                                        {projectWorkItems.length > 3 && (
                                          <div className="text-center py-2">
                                            <small className="text-muted">
                                              +{projectWorkItems.length - 3} more items
                                            </small>
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  )}

                                  {/* Project Actions */}
                                  <div className="d-flex gap-2 mt-3">
                                    <Button 
                                      variant="outline-primary" 
                                      size="sm"
                                      onClick={() => window.open(`/projects/${project._id}`, '_blank')}
                                    >
                                      View Project
                                    </Button>
                                    {projectWorkItems.length > 0 && (
                                      <Button 
                                        variant="outline-success" 
                                        size="sm"
                                        onClick={() => setActiveTab('assignments')}
                                      >
                                        View Work Items
                                      </Button>
                                    )}
                                  </div>
                                </Card.Body>
                              </Card>
                            </Col>
                          );
                        })}
                      </Row>
                    ) : (
                      <div className="text-center py-5">
                        <Card className="border-0 shadow-sm">
                          <Card.Body className="py-5">
                            <FaProjectDiagram className="text-muted mb-3" size={48} />
                            <h5 className="text-muted mb-2">No Projects Assigned</h5>
                            <p className="text-muted mb-4">
                              {isOwnProfile 
                                ? "You are not currently assigned to any projects. Contact your manager to get assigned to projects." 
                                : "This employee is not currently assigned to any projects."
                              }
                            </p>
                            <Button 
                              variant="primary" 
                              onClick={() => window.open('/projects', '_blank')}
                            >
                              <FaProjectDiagram className="me-2" />
                              Browse All Projects
                            </Button>
                          </Card.Body>
                        </Card>
                      </div>
                    )}
                  </Col>

                  {/* Projects Sidebar - Always Visible */}
                  <Col lg={4} className="project-details-sidebar">
                    {/* Employee Project Overview */}
                    <Card className="sidebar-card mb-4">
                      <Card.Header className="bg-primary text-white">
                        <h6 className="mb-0">
                          <FaProjectDiagram className="me-2" />
                          Project Overview
                        </h6>
                      </Card.Header>
                      <Card.Body>
                        <div className="text-center mb-3">
                          <div className="display-4 text-primary fw-bold">{employeeProjects.length}</div>
                          <small className="text-muted">Total Projects</small>
                        </div>
                        
                        {employeeProjects.length > 0 ? (
                          <>
                            <div className="d-flex justify-content-between mb-2">
                              <span className="small">Active:</span>
                              <Badge bg="success">
                                {employeeProjects.filter(p => p.status === 'in-progress' || !p.status).length}
                              </Badge>
                            </div>
                            <div className="d-flex justify-content-between mb-2">
                              <span className="small">Completed:</span>
                              <Badge bg="info">
                                {employeeProjects.filter(p => p.status === 'completed').length}
                              </Badge>
                            </div>
                            <div className="d-flex justify-content-between mb-3">
                              <span className="small">On Hold:</span>
                              <Badge bg="warning">
                                {employeeProjects.filter(p => p.status === 'on-hold').length}
                              </Badge>
                            </div>
                            
                            {/* Progress Overview */}
                            <div className="mt-3">
                              <small className="text-muted d-block mb-2">Completion Rate</small>
                              <ProgressBar 
                                now={Math.round((employeeProjects.filter(p => p.status === 'completed').length / employeeProjects.length) * 100)} 
                                variant="success"
                                style={{ height: '8px' }}
                                className="mb-1"
                              />
                              <small className="text-muted">
                                {Math.round((employeeProjects.filter(p => p.status === 'completed').length / employeeProjects.length) * 100)}% projects completed
                              </small>
                            </div>
                          </>
                        ) : (
                          <div className="text-center py-3">
                            <FaProjectDiagram className="text-muted mb-2" size={24} />
                            <p className="text-muted mb-0 small">No projects assigned yet</p>
                          </div>
                        )}
                      </Card.Body>
                    </Card>

                    {/* Work Summary */}
                    <Card className="sidebar-card mb-4">
                      <Card.Header className="bg-light">
                        <h6 className="mb-0">
                          <FaTasks className="me-2" />
                          Work Summary
                        </h6>
                      </Card.Header>
                      <Card.Body>
                        <div className="d-flex justify-content-between mb-2">
                          <span className="small">Total Work Items:</span>
                          <Badge bg="primary">{recentWork.length}</Badge>
                        </div>
                        <div className="d-flex justify-content-between mb-2">
                          <span className="small">Project Related:</span>
                          <Badge bg="info">{recentWork.filter(work => work.project).length}</Badge>
                        </div>
                        <div className="d-flex justify-content-between mb-3">
                          <span className="small">Completed:</span>
                          <Badge bg="success">{recentWork.filter(work => work.status === 'Done').length}</Badge>
                        </div>
                        
                        {recentWork.length > 0 && (
                          <div>
                            <small className="text-muted d-block mb-2">Completion Rate</small>
                            <ProgressBar 
                              now={Math.round((recentWork.filter(work => work.status === 'Done').length / recentWork.length) * 100)} 
                              variant="primary"
                              style={{ height: '6px' }}
                              className="mb-1"
                            />
                            <small className="text-muted">
                              {Math.round((recentWork.filter(work => work.status === 'Done').length / recentWork.length) * 100)}% work completed
                            </small>
                          </div>
                        )}
                      </Card.Body>
                    </Card>

                    {/* Recent Activity */}
                    <Card className="sidebar-card mb-4">
                      <Card.Header className="bg-light">
                        <h6 className="mb-0">
                          <FaClock className="me-2" />
                          Recent Activity
                        </h6>
                      </Card.Header>
                      <Card.Body>
                        {recentWork.length > 0 ? (
                          <div>
                            {recentWork.slice(0, 4).map(work => (
                              <div key={work._id} className="activity-item mb-2 p-2 border-bottom">
                                <div className="d-flex justify-content-between align-items-start">
                                  <div className="flex-grow-1">
                                    <div className="small fw-semibold">{work.title}</div>
                                    <small className="text-muted">
                                      {work.project?.name || 'No Project'}
                                    </small>
                                  </div>
                                  <div className="text-end ms-2">
                                    <Badge bg={getStatusColor(work.status)} className="small">
                                      {work.status}
                                    </Badge>
                                  </div>
                                </div>
                              </div>
                            ))}
                            {recentWork.length > 4 && (
                              <div className="text-center mt-2">
                                <Button 
                                  variant="link" 
                                  size="sm" 
                                  className="p-0"
                                  onClick={() => setActiveTab('assignments')}
                                >
                                  View all {recentWork.length} items
                                </Button>
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="text-center py-3">
                            <FaClock className="text-muted mb-2" size={24} />
                            <p className="text-muted mb-0 small">No recent activity</p>
                          </div>
                        )}
                      </Card.Body>
                    </Card>

                    {/* Quick Actions */}
                    <Card className="sidebar-card">
                      <Card.Header className="bg-light">
                        <h6 className="mb-0">
                          <FaCog className="me-2" />
                          Quick Actions
                        </h6>
                      </Card.Header>
                      <Card.Body>
                        <div className="d-grid gap-2">
                          <Button 
                            variant="primary" 
                            size="sm"
                            className="sidebar-action-btn"
                            onClick={() => window.open('/projects', '_blank')}
                          >
                            <FaProjectDiagram className="me-2" />
                            Browse Projects
                          </Button>
                          <Button 
                            variant="outline-success" 
                            size="sm"
                            className="sidebar-action-btn"
                            onClick={() => setActiveTab('assignments')}
                          >
                            <FaTasks className="me-2" />
                            View Work Items
                          </Button>
                          <Button 
                            variant="outline-info" 
                            size="sm"
                            className="sidebar-action-btn"
                            onClick={() => setActiveTab('calendar')}
                          >
                            <FaCalendarAlt className="me-2" />
                            View Calendar
                          </Button>
                          <Button 
                            variant="outline-secondary" 
                            size="sm"
                            className="sidebar-action-btn"
                            onClick={() => {
                              const reportData = {
                                employee: employeeData?.name,
                                totalProjects: employeeProjects.length,
                                totalWorkItems: recentWork.length,
                                completedWork: recentWork.filter(w => w.status === 'Done').length,
                                projectDetails: employeeProjects.map(p => ({
                                  name: p.name,
                                  status: p.status,
                                  client: p.client?.name || 'Internal'
                                }))
                              };
                              // console.log('Employee Project Report:', reportData);
                              // toast.info('Project report data logged to console');
                            }}
                          >
                            <FaFileExport className="me-2" />
                            Export Report
                          </Button>
                        </div>
                      </Card.Body>
                    </Card>
                  </Col>
                </Row>
              </Tab.Pane>
            </Tab.Content>
          </Card.Body>
        </Card>
      </Tab.Container>
    </Container>
  );
};

export default EnhancedEmployeeWorkView;