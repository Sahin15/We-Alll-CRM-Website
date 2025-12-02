import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Button, Table, Badge, Modal, Form } from 'react-bootstrap';
import { FaUsers, FaProjectDiagram, FaCheckCircle, FaClock, FaUserTie, FaPlus } from 'react-icons/fa';
import { useAuth } from '../../context/AuthContext';
import { departmentApi } from '../../api/departmentApi';
import { projectApi } from '../../api/projectApi';
import toast from '../../utils/toast';

const HoDDashboard = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [projects, setProjects] = useState([]);
  const [members, setMembers] = useState([]);
  const [department, setDepartment] = useState(null);
  
  // Modal states
  const [showAssignHoPModal, setShowAssignHoPModal] = useState(false);
  const [selectedProject, setSelectedProject] = useState(null);
  const [selectedUserId, setSelectedUserId] = useState('');

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      
      // Get user's department
      if (!user.headOfDepartment) {
        toast.error('You are not assigned as Head of any Department');
        return;
      }

      const departmentId = user.headOfDepartment;

      // Load all data in parallel
      const [statsRes, projectsRes, membersRes, deptRes] = await Promise.all([
        departmentApi.getDepartmentStats(departmentId),
        departmentApi.getDepartmentProjects(departmentId),
        departmentApi.getDepartmentMembers(departmentId),
        departmentApi.getDepartmentById(departmentId),
      ]);

      setStats(statsRes.data);
      setProjects(projectsRes.data.projects || []);
      setMembers(membersRes.data.members || []);
      setDepartment(deptRes);
    } catch (error) {
      console.error('Error loading dashboard:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const handleAssignHoP = async () => {
    if (!selectedUserId) {
      toast.error('Please select a user');
      return;
    }

    try {
      await projectApi.assignHoP(selectedProject._id, selectedUserId);
      toast.success('Head of Project assigned successfully!');
      setShowAssignHoPModal(false);
      setSelectedProject(null);
      setSelectedUserId('');
      loadDashboardData();
    } catch (error) {
      console.error('Error assigning HoP:', error);
      toast.error(error.response?.data?.message || 'Failed to assign Head of Project');
    }
  };

  const openAssignHoPModal = (project) => {
    setSelectedProject(project);
    setShowAssignHoPModal(true);
  };

  if (loading) {
    return (
      <Container fluid className="py-4">
        <div className="text-center">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
        </div>
      </Container>
    );
  }

  if (!department) {
    return (
      <Container fluid className="py-4">
        <Card>
          <Card.Body className="text-center py-5">
            <h4>No Department Assigned</h4>
            <p className="text-muted">You are not assigned as Head of any Department.</p>
          </Card.Body>
        </Card>
      </Container>
    );
  }

  return (
    <Container fluid className="py-4">
      {/* Header */}
      <Row className="mb-4">
        <Col>
          <h2 className="mb-1">
            <FaUserTie className="me-2 text-primary" />
            {department.name} Department
          </h2>
          <p className="text-muted mb-0">Head of Department Dashboard</p>
        </Col>
      </Row>

      {/* Stats Cards */}
      <Row className="g-4 mb-4">
        <Col md={3}>
          <Card className="stat-card">
            <Card.Body className="text-center">
              <FaUsers className="text-primary mb-2" size={32} />
              <h3 className="mb-1">{stats?.totalMembers || 0}</h3>
              <p className="text-muted mb-0">Team Members</p>
              <small className="text-success">{stats?.activeMembers || 0} Active</small>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3}>
          <Card className="stat-card">
            <Card.Body className="text-center">
              <FaProjectDiagram className="text-info mb-2" size={32} />
              <h3 className="mb-1">{stats?.totalProjects || 0}</h3>
              <p className="text-muted mb-0">Total Projects</p>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3}>
          <Card className="stat-card">
            <Card.Body className="text-center">
              <FaClock className="text-warning mb-2" size={32} />
              <h3 className="mb-1">{stats?.activeProjects || 0}</h3>
              <p className="text-muted mb-0">Active Projects</p>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3}>
          <Card className="stat-card">
            <Card.Body className="text-center">
              <FaCheckCircle className="text-success mb-2" size={32} />
              <h3 className="mb-1">{stats?.completedProjects || 0}</h3>
              <p className="text-muted mb-0">Completed</p>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Projects Section */}
      <Row className="mb-4">
        <Col>
          <Card>
            <Card.Header className="d-flex justify-content-between align-items-center">
              <h5 className="mb-0">
                <FaProjectDiagram className="me-2" />
                Department Projects
              </h5>
            </Card.Header>
            <Card.Body>
              {projects.length === 0 ? (
                <div className="text-center py-4">
                  <p className="text-muted">No projects assigned to this department yet.</p>
                </div>
              ) : (
                <Table responsive hover>
                  <thead>
                    <tr>
                      <th>Project Name</th>
                      <th>Client</th>
                      <th>Head of Project</th>
                      <th>Status</th>
                      <th>Team Size</th>
                      <th>Progress</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {projects.map((project) => (
                      <tr key={project._id}>
                        <td>
                          <strong>{project.name}</strong>
                        </td>
                        <td>{project.client?.name || 'N/A'}</td>
                        <td>
                          {project.projectHead ? (
                            <div>
                              <div>{project.projectHead.name}</div>
                              <small className="text-muted">{project.projectHead.designation}</small>
                            </div>
                          ) : (
                            <Badge bg="warning">Not Assigned</Badge>
                          )}
                        </td>
                        <td>
                          <Badge
                            bg={
                              project.status === 'Completed'
                                ? 'success'
                                : project.status === 'In Progress'
                                ? 'primary'
                                : project.status === 'On Hold'
                                ? 'warning'
                                : 'secondary'
                            }
                          >
                            {project.status}
                          </Badge>
                        </td>
                        <td>{project.teamMembers?.length || 0} members</td>
                        <td>
                          <div className="d-flex align-items-center">
                            <div className="progress flex-grow-1 me-2" style={{ height: '8px' }}>
                              <div
                                className="progress-bar"
                                role="progressbar"
                                style={{ width: `${project.progress || 0}%` }}
                              ></div>
                            </div>
                            <small>{project.progress || 0}%</small>
                          </div>
                        </td>
                        <td>
                          {!project.projectHead && (
                            <Button
                              size="sm"
                              variant="outline-primary"
                              onClick={() => openAssignHoPModal(project)}
                            >
                              <FaPlus className="me-1" />
                              Assign HoP
                            </Button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Team Members Section */}
      <Row>
        <Col>
          <Card>
            <Card.Header>
              <h5 className="mb-0">
                <FaUsers className="me-2" />
                Team Members
              </h5>
            </Card.Header>
            <Card.Body>
              {members.length === 0 ? (
                <div className="text-center py-4">
                  <p className="text-muted">No team members in this department yet.</p>
                </div>
              ) : (
                <Table responsive hover>
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Email</th>
                      <th>Designation</th>
                      <th>Employee ID</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {members.map((member) => (
                      <tr key={member._id}>
                        <td>
                          <strong>{member.name}</strong>
                        </td>
                        <td>{member.email}</td>
                        <td>{member.designation || 'N/A'}</td>
                        <td>{member.employeeId || 'N/A'}</td>
                        <td>
                          <Badge bg={member.status === 'active' ? 'success' : 'secondary'}>
                            {member.status}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Assign HoP Modal */}
      <Modal show={showAssignHoPModal} onHide={() => setShowAssignHoPModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Assign Head of Project</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedProject && (
            <>
              <p>
                <strong>Project:</strong> {selectedProject.name}
              </p>
              <Form.Group className="mb-3">
                <Form.Label>Select Team Member</Form.Label>
                <Form.Select
                  value={selectedUserId}
                  onChange={(e) => setSelectedUserId(e.target.value)}
                >
                  <option value="">Choose...</option>
                  {members
                    .filter((m) => m.status === 'active')
                    .map((member) => (
                      <option key={member._id} value={member._id}>
                        {member.name} - {member.designation || 'Employee'}
                      </option>
                    ))}
                </Form.Select>
                <Form.Text className="text-muted">
                  Select a team member from your department to lead this project
                </Form.Text>
              </Form.Group>
            </>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowAssignHoPModal(false)}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleAssignHoP}>
            Assign as HoP
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
};

export default HoDDashboard;
