import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Container, Row, Col, Card, Table, Badge, Button, Spinner, Tabs, Tab } from 'react-bootstrap';
import { FaArrowLeft, FaBriefcase, FaTasks, FaProjectDiagram, FaClock, FaCheckCircle } from 'react-icons/fa';
import { toast } from 'react-toastify';
import api from '../../services/api';

const EmployeeWorkDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [employee, setEmployee] = useState(null);
  const [workItems, setWorkItems] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('workItems');

  useEffect(() => {
    fetchEmployeeData();
  }, [id]);

  const fetchEmployeeData = async () => {
    try {
      setLoading(true);
      
      // Fetch employee details
      const empResponse = await api.get(`/users/${id}`);
      setEmployee(empResponse.data);

      // Fetch projects where employee is a team member
      const projectsResponse = await api.get('/projects');
      const employeeProjects = projectsResponse.data.filter(project => 
        project.teamMembers?.some(member => member._id === id || member === id) ||
        project.projectHead?._id === id || project.projectHead === id
      );
      setProjects(employeeProjects);

      // Fetch work items from all employee's projects
      const allWorkItems = [];
      for (const project of employeeProjects) {
        try {
          const workResponse = await api.get(`/work-items/project/${project._id}`);
          if (workResponse.data?.data) {
            // Filter only work items assigned to this employee
            const employeeWorkItems = workResponse.data.data.filter(
              item => item.assignedTo?._id === id || item.assignedTo === id
            );
            allWorkItems.push(...employeeWorkItems);
          }
        } catch (err) {
          console.log(`No work items for project ${project._id}`);
        }
      }
      setWorkItems(allWorkItems);

    } catch (error) {
      console.error('Error fetching employee work data:', error);
      toast.error('Failed to load employee work details');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    const variants = {
      'To Do': 'secondary',
      'In Progress': 'primary',
      'In Review': 'warning',
      'Done': 'success',
      'Blocked': 'danger'
    };
    return <Badge bg={variants[status] || 'secondary'}>{status}</Badge>;
  };

  const getPriorityBadge = (priority) => {
    const variants = {
      low: 'success',
      medium: 'warning',
      high: 'danger',
      urgent: 'danger'
    };
    return <Badge bg={variants[priority] || 'secondary'} className="text-capitalize">{priority}</Badge>;
  };

  const formatDate = (date) => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const calculateWorkStats = () => {
    const total = workItems.length;
    const completed = workItems.filter(item => item.status === 'Done').length;
    const inProgress = workItems.filter(item => item.status === 'In Progress').length;
    const pending = workItems.filter(item => item.status === 'To Do').length;
    const overdue = workItems.filter(item => {
      if (!item.dueDate || item.status === 'Done') return false;
      return new Date(item.dueDate) < new Date();
    }).length;

    return { total, completed, inProgress, pending, overdue };
  };

  if (loading) {
    return (
      <Container fluid className="py-4">
        <div className="text-center py-5">
          <Spinner animation="border" variant="primary" />
          <p className="mt-3 text-muted">Loading work details...</p>
        </div>
      </Container>
    );
  }

  if (!employee) {
    return (
      <Container fluid className="py-4">
        <div className="text-center py-5">
          <p className="text-muted">Employee not found</p>
          <Button variant="primary" onClick={() => navigate('/employees')}>
            Back to Employees
          </Button>
        </div>
      </Container>
    );
  }

  const stats = calculateWorkStats();

  return (
    <Container fluid className="py-4">
      {/* Header */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <Button
            variant="link"
            className="text-decoration-none p-0 mb-2"
            onClick={() => navigate('/employees')}
          >
            <FaArrowLeft className="me-2" />
            Back to Employees
          </Button>
          <h2 className="mb-1">
            <FaBriefcase className="me-2 text-primary" />
            Working Details: {employee.name}
          </h2>
          <p className="text-muted mb-0">
            {employee.designation || employee.position || 'Employee'} • {employee.department?.name || 'N/A'}
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <Row className="g-3 mb-4">
        <Col md={3}>
          <Card className="border-0 shadow-sm h-100">
            <Card.Body>
              <div className="d-flex justify-content-between align-items-center">
                <div>
                  <p className="text-muted mb-1">Total Work Items</p>
                  <h3 className="mb-0">{stats.total}</h3>
                </div>
                <div className="bg-primary bg-opacity-10 p-3 rounded">
                  <FaTasks className="text-primary fs-4" />
                </div>
              </div>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3}>
          <Card className="border-0 shadow-sm h-100">
            <Card.Body>
              <div className="d-flex justify-content-between align-items-center">
                <div>
                  <p className="text-muted mb-1">Completed</p>
                  <h3 className="mb-0 text-success">{stats.completed}</h3>
                </div>
                <div className="bg-success bg-opacity-10 p-3 rounded">
                  <FaCheckCircle className="text-success fs-4" />
                </div>
              </div>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3}>
          <Card className="border-0 shadow-sm h-100">
            <Card.Body>
              <div className="d-flex justify-content-between align-items-center">
                <div>
                  <p className="text-muted mb-1">In Progress</p>
                  <h3 className="mb-0 text-primary">{stats.inProgress}</h3>
                </div>
                <div className="bg-info bg-opacity-10 p-3 rounded">
                  <FaClock className="text-primary fs-4" />
                </div>
              </div>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3}>
          <Card className="border-0 shadow-sm h-100">
            <Card.Body>
              <div className="d-flex justify-content-between align-items-center">
                <div>
                  <p className="text-muted mb-1">Overdue</p>
                  <h3 className="mb-0 text-danger">{stats.overdue}</h3>
                </div>
                <div className="bg-danger bg-opacity-10 p-3 rounded">
                  <FaClock className="text-danger fs-4" />
                </div>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Tabs */}
      <Card className="border-0 shadow-sm">
        <Card.Body>
          <Tabs activeKey={activeTab} onSelect={(k) => setActiveTab(k)} className="mb-3">
            <Tab eventKey="workItems" title={`Work Items (${workItems.length})`}>
              <div className="table-responsive">
                <Table hover>
                  <thead className="bg-light">
                    <tr>
                      <th>Title</th>
                      <th>Project</th>
                      <th>Type</th>
                      <th>Priority</th>
                      <th>Status</th>
                      <th>Due Date</th>
                      <th>Progress</th>
                    </tr>
                  </thead>
                  <tbody>
                    {workItems.length > 0 ? (
                      workItems.map((item) => (
                        <tr key={item._id}>
                          <td>
                            <div className="fw-semibold">{item.title}</div>
                            {item.description && (
                              <small className="text-muted d-block text-truncate" style={{ maxWidth: '300px' }}>
                                {item.description}
                              </small>
                            )}
                          </td>
                          <td>{item.project?.name || 'N/A'}</td>
                          <td>
                            <Badge bg="info" className="text-capitalize">
                              {item.type || 'Task'}
                            </Badge>
                          </td>
                          <td>{getPriorityBadge(item.priority)}</td>
                          <td>{getStatusBadge(item.status)}</td>
                          <td>
                            {item.dueDate ? (
                              <span className={new Date(item.dueDate) < new Date() && item.status !== 'Done' ? 'text-danger' : ''}>
                                {formatDate(item.dueDate)}
                              </span>
                            ) : (
                              'N/A'
                            )}
                          </td>
                          <td>
                            <div className="d-flex align-items-center gap-2">
                              <div className="progress flex-grow-1" style={{ height: '8px' }}>
                                <div
                                  className="progress-bar"
                                  role="progressbar"
                                  style={{ width: `${item.progress || 0}%` }}
                                  aria-valuenow={item.progress || 0}
                                  aria-valuemin="0"
                                  aria-valuemax="100"
                                />
                              </div>
                              <small className="text-muted">{item.progress || 0}%</small>
                            </div>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="7" className="text-center py-4">
                          <p className="text-muted mb-0">No work items assigned</p>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </Table>
              </div>
            </Tab>

            <Tab eventKey="projects" title={`Projects (${projects.length})`}>
              <div className="table-responsive">
                <Table hover>
                  <thead className="bg-light">
                    <tr>
                      <th>Project Name</th>
                      <th>Client</th>
                      <th>Role</th>
                      <th>Status</th>
                      <th>Start Date</th>
                      <th>End Date</th>
                      <th>Progress</th>
                    </tr>
                  </thead>
                  <tbody>
                    {projects.length > 0 ? (
                      projects.map((project) => {
                        const isProjectHead = project.projectHead?._id === id || project.projectHead === id;
                        return (
                          <tr key={project._id}>
                            <td>
                              <div className="fw-semibold">{project.name}</div>
                              {project.description && (
                                <small className="text-muted d-block text-truncate" style={{ maxWidth: '300px' }}>
                                  {project.description}
                                </small>
                              )}
                            </td>
                            <td>{project.client?.name || 'N/A'}</td>
                            <td>
                              <Badge bg={isProjectHead ? 'primary' : 'secondary'}>
                                {isProjectHead ? 'Project Head' : 'Team Member'}
                              </Badge>
                            </td>
                            <td>
                              <Badge bg={project.status === 'completed' ? 'success' : project.status === 'in-progress' ? 'primary' : 'secondary'}>
                                {project.status}
                              </Badge>
                            </td>
                            <td>{formatDate(project.startDate)}</td>
                            <td>{formatDate(project.endDate)}</td>
                            <td>
                              <div className="d-flex align-items-center gap-2">
                                <div className="progress flex-grow-1" style={{ height: '8px' }}>
                                  <div
                                    className="progress-bar"
                                    role="progressbar"
                                    style={{ width: `${project.progress || 0}%` }}
                                    aria-valuenow={project.progress || 0}
                                    aria-valuemin="0"
                                    aria-valuemax="100"
                                  />
                                </div>
                                <small className="text-muted">{project.progress || 0}%</small>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan="7" className="text-center py-4">
                          <p className="text-muted mb-0">No projects assigned</p>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </Table>
              </div>
            </Tab>
          </Tabs>
        </Card.Body>
      </Card>
    </Container>
  );
};

export default EmployeeWorkDetails;
