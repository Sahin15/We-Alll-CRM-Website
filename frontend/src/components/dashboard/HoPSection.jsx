import React, { useState, useEffect } from 'react';
import { Row, Col, Card, Button, Table, Badge, Modal, Form } from 'react-bootstrap';
import { FaProjectDiagram, FaUsers, FaTasks, FaPlus, FaChevronDown, FaChevronUp, FaClock, FaExclamationTriangle } from 'react-icons/fa';
import { projectApi } from '../../api/projectApi';
import slotApi from '../../api/slotApi';
import toast from '../../utils/toast';
import { useNavigate } from 'react-router-dom';

const HoPSection = ({ user }) => {
  const navigate = useNavigate();
  const [expanded, setExpanded] = useState(true);
  const [loading, setLoading] = useState(false);
  const [projects, setProjects] = useState([]);
  const [allTeamMembers, setAllTeamMembers] = useState([]);
  const [allSlots, setAllSlots] = useState([]);
  const [slotStats, setSlotStats] = useState({
    total: 0,
    pending: 0,
    inProgress: 0,
    completed: 0,
    overdue: 0
  });
  
  // Modal states
  const [showTeamModal, setShowTeamModal] = useState(false);
  const [showSlotModal, setShowSlotModal] = useState(false);
  const [showActivityModal, setShowActivityModal] = useState(false);
  const [selectedProject, setSelectedProject] = useState(null);

  useEffect(() => {
    if (user.headOfProjects && user.headOfProjects.length > 0) {
      loadHoPData();
    }
  }, [user]);

  const loadHoPData = async () => {
    try {
      setLoading(true);
      const response = await projectApi.getMyLeadingProjects();
      const projectsData = response.data || [];
      setProjects(projectsData);
      
      // Collect all unique team members from all projects
      const teamMembersMap = new Map();
      projectsData.forEach(project => {
        project.teamMembers?.forEach(member => {
          if (member.user && !teamMembersMap.has(member.user._id)) {
            teamMembersMap.set(member.user._id, {
              ...member.user,
              role: member.role,
              projectName: project.name,
              projectId: project._id
            });
          }
        });
      });
      setAllTeamMembers(Array.from(teamMembersMap.values()));

      // Load slots for all projects
      const allSlotsData = [];
      for (const project of projectsData) {
        try {
          const slotsResponse = await slotApi.getSlotsByProject(project._id);
          if (slotsResponse.data) {
            allSlotsData.push(...slotsResponse.data);
          }
        } catch (err) {
          console.error(`Error loading slots for project ${project._id}:`, err);
        }
      }
      setAllSlots(allSlotsData);

      // Calculate slot statistics
      const now = new Date();
      const stats = {
        total: allSlotsData.length,
        pending: allSlotsData.filter(s => s.designStatus === 'Planned').length,
        inProgress: allSlotsData.filter(s => ['In Design', 'Ready for Review', 'Needs Revision'].includes(s.designStatus)).length,
        completed: allSlotsData.filter(s => s.postingStatus === 'Posted').length,
        overdue: allSlotsData.filter(s => {
          const deadline = new Date(s.designDeadline);
          return deadline < now && s.designStatus !== 'Approved' && s.postingStatus !== 'Posted';
        }).length
      };
      setSlotStats(stats);
    } catch (error) {
      console.error('Error loading HoP data:', error);
      toast.error('Failed to load leading projects');
    } finally {
      setLoading(false);
    }
  };

  const handleViewProject = (projectId) => {
    navigate(`/projects/${projectId}`);
  };

  if (!user.headOfProjects || user.headOfProjects.length === 0) {
    return null;
  }

  const totalTeamMembers = projects.reduce((sum, p) => sum + (p.teamMembers?.length || 0), 0);
  const activeProjects = projects.filter(p => p.status === 'In Progress').length;
  const completedProjects = projects.filter(p => p.status === 'Completed').length;

  return (
    <Card className="dashboard-section-card mb-4 border-0 shadow-sm" style={{ borderLeft: '4px solid #10b981' }}>
      <Card.Header 
        className="dashboard-section-header bg-gradient d-flex justify-content-between align-items-center"
        onClick={() => setExpanded(!expanded)}
        style={{ 
          background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.1) 0%, rgba(5, 150, 105, 0.1) 100%)',
        }}
      >
        <div>
          <h5 className="mb-0">
            <FaProjectDiagram className="me-2 text-success" />
            Head of Project - Leading {projects.length} {projects.length === 1 ? 'Project' : 'Projects'}
          </h5>
          <small className="text-muted">Manage your projects and teams</small>
        </div>
        {expanded ? <FaChevronUp /> : <FaChevronDown />}
      </Card.Header>

      {expanded && (
        <Card.Body>
          {loading ? (
            <div className="text-center py-4">
              <div className="spinner-border text-success" role="status">
                <span className="visually-hidden">Loading...</span>
              </div>
            </div>
          ) : (
            <>
              {/* Quick Stats */}
              <Row className="mb-4">
                <Col lg={2} md={4} sm={6} className="mb-3">
                  <Card 
                    className="border-0 bg-light text-center" 
                    style={{ cursor: 'pointer' }}
                    onClick={() => navigate('/projects')}
                  >
                    <Card.Body className="py-3">
                      <FaProjectDiagram className="text-success mb-2" size={20} />
                      <h5 className="mb-0">{projects.length}</h5>
                      <small className="text-muted">Projects</small>
                    </Card.Body>
                  </Card>
                </Col>
                <Col lg={2} md={4} sm={6} className="mb-3">
                  <Card 
                    className="border-0 bg-light text-center" 
                    style={{ cursor: 'pointer' }}
                    onClick={() => setShowTeamModal(true)}
                  >
                    <Card.Body className="py-3">
                      <FaUsers className="text-info mb-2" size={20} />
                      <h5 className="mb-0">{totalTeamMembers}</h5>
                      <small className="text-muted">Team</small>
                    </Card.Body>
                  </Card>
                </Col>
                <Col lg={2} md={4} sm={6} className="mb-3">
                  <Card 
                    className="border-0 bg-light text-center"
                    style={{ cursor: 'pointer' }}
                    onClick={() => setShowActivityModal(true)}
                  >
                    <Card.Body className="py-3">
                      <FaTasks className="text-primary mb-2" size={20} />
                      <h5 className="mb-0">{slotStats.total}</h5>
                      <small className="text-muted">Total Tasks</small>
                    </Card.Body>
                  </Card>
                </Col>
                <Col lg={2} md={4} sm={6} className="mb-3">
                  <Card className="border-0 bg-light text-center">
                    <Card.Body className="py-3">
                      <FaClock className="text-warning mb-2" size={20} />
                      <h5 className="mb-0">{slotStats.inProgress}</h5>
                      <small className="text-muted">In Progress</small>
                    </Card.Body>
                  </Card>
                </Col>
                <Col lg={2} md={4} sm={6} className="mb-3">
                  <Card className="border-0 bg-light text-center">
                    <Card.Body className="py-3">
                      <div className="text-success mb-2">✓</div>
                      <h5 className="mb-0">{slotStats.completed}</h5>
                      <small className="text-muted">Completed</small>
                    </Card.Body>
                  </Card>
                </Col>
                <Col lg={2} md={4} sm={6} className="mb-3">
                  <Card className="border-0 bg-light text-center">
                    <Card.Body className="py-3">
                      <FaExclamationTriangle className="text-danger mb-2" size={20} />
                      <h5 className="mb-0">{slotStats.overdue}</h5>
                      <small className="text-muted">Overdue</small>
                    </Card.Body>
                  </Card>
                </Col>
              </Row>

              {/* Projects List */}
              <div className="mb-3">
                <h6 className="mb-3">
                  <FaProjectDiagram className="me-2" />
                  My Leading Projects
                </h6>
                {projects.length === 0 ? (
                  <div className="text-center py-3 text-muted">
                    <p>No projects assigned yet.</p>
                  </div>
                ) : (
                  <div className="table-responsive">
                    <Table hover size="sm">
                      <thead>
                        <tr>
                          <th>Project</th>
                          <th>Client</th>
                          <th>Department</th>
                          <th>Status</th>
                          <th>Team Size</th>
                          <th>Progress</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {projects.map((project) => (
                          <tr key={project._id}>
                            <td><strong>{project.name}</strong></td>
                            <td>{project.client?.name || 'N/A'}</td>
                            <td>{project.department?.name || 'N/A'}</td>
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
                                <div className="progress flex-grow-1 me-2" style={{ height: '6px', minWidth: '60px' }}>
                                  <div
                                    className="progress-bar bg-success"
                                    role="progressbar"
                                    style={{ width: `${project.progress || 0}%` }}
                                  ></div>
                                </div>
                                <small>{project.progress || 0}%</small>
                              </div>
                            </td>
                            <td>
                              <Button
                                size="sm"
                                variant="outline-success"
                                onClick={() => handleViewProject(project._id)}
                              >
                                Manage
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </Table>
                  </div>
                )}
              </div>

              {/* Quick Actions */}
              <div className="d-flex gap-2 flex-wrap">
                <Button 
                  size="sm" 
                  variant="success"
                  onClick={() => setShowSlotModal(true)}
                >
                  <FaPlus className="me-1" />
                  Create Slot
                </Button>
                <Button 
                  size="sm" 
                  variant="outline-success"
                  onClick={() => navigate('/content-calendar')}
                >
                  <FaTasks className="me-1" />
                  View Content Calendar
                </Button>
                <Button 
                  size="sm" 
                  variant="outline-primary"
                  onClick={() => navigate('/projects')}
                >
                  <FaProjectDiagram className="me-1" />
                  View All Projects
                </Button>
              </div>
            </>
          )}
        </Card.Body>
      )}

      {/* Team Members Modal */}
      <Modal show={showTeamModal} onHide={() => setShowTeamModal(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>
            <FaUsers className="me-2" />
            All Team Members
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {allTeamMembers.length === 0 ? (
            <div className="text-center py-4 text-muted">
              <FaUsers size={48} className="mb-3 opacity-50" />
              <p>No team members yet. Add members to your projects to see them here.</p>
            </div>
          ) : (
            <div className="table-responsive">
              <Table hover>
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Role</th>
                    <th>Project</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {allTeamMembers.map((member) => (
                    <tr key={`${member._id}-${member.projectId}`}>
                      <td><strong>{member.name}</strong></td>
                      <td>{member.email}</td>
                      <td>
                        <Badge bg="info">{member.role || 'Member'}</Badge>
                      </td>
                      <td>{member.projectName}</td>
                      <td>
                        <Button
                          size="sm"
                          variant="outline-primary"
                          onClick={() => {
                            setShowTeamModal(false);
                            navigate(`/projects/${member.projectId}`);
                          }}
                        >
                          View Project
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </div>
          )}
          <div className="mt-3 text-muted">
            <small>Total Team Members: {allTeamMembers.length}</small>
          </div>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowTeamModal(false)}>
            Close
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Quick Slot Creation Modal */}
      <Modal show={showSlotModal} onHide={() => setShowSlotModal(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>
            <FaPlus className="me-2" />
            Create New Slot
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p className="text-muted mb-3">
            Quick slot creation. For more options, use the Content Calendar.
          </p>
          <Form.Group className="mb-3">
            <Form.Label>Select Project</Form.Label>
            <Form.Select
              value={selectedProject?._id || ''}
              onChange={(e) => {
                const project = projects.find(p => p._id === e.target.value);
                setSelectedProject(project);
              }}
            >
              <option value="">Choose a project...</option>
              {projects.map((project) => (
                <option key={project._id} value={project._id}>
                  {project.name} - {project.client?.name || 'No Client'}
                </option>
              ))}
            </Form.Select>
          </Form.Group>

          {selectedProject && (
            <div className="alert alert-info">
              <strong>Selected:</strong> {selectedProject.name}
              <br />
              <small>Team Members: {selectedProject.teamMembers?.length || 0}</small>
            </div>
          )}

          <div className="text-center mt-4">
            <Button
              variant="success"
              disabled={!selectedProject}
              onClick={() => {
                setShowSlotModal(false);
                navigate('/content-calendar', { 
                  state: { preselectedProject: selectedProject } 
                });
              }}
            >
              Continue to Content Calendar
            </Button>
          </div>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowSlotModal(false)}>
            Cancel
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Recent Activity Modal */}
      <Modal show={showActivityModal} onHide={() => setShowActivityModal(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>
            <FaTasks className="me-2" />
            Recent Activity & Tasks
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Row className="mb-3">
            <Col md={3} sm={6} className="mb-2">
              <div className="text-center p-2 bg-light rounded">
                <strong>{slotStats.total}</strong>
                <br />
                <small className="text-muted">Total</small>
              </div>
            </Col>
            <Col md={3} sm={6} className="mb-2">
              <div className="text-center p-2 bg-light rounded">
                <strong className="text-warning">{slotStats.pending}</strong>
                <br />
                <small className="text-muted">Pending</small>
              </div>
            </Col>
            <Col md={3} sm={6} className="mb-2">
              <div className="text-center p-2 bg-light rounded">
                <strong className="text-primary">{slotStats.inProgress}</strong>
                <br />
                <small className="text-muted">In Progress</small>
              </div>
            </Col>
            <Col md={3} sm={6} className="mb-2">
              <div className="text-center p-2 bg-light rounded">
                <strong className="text-danger">{slotStats.overdue}</strong>
                <br />
                <small className="text-muted">Overdue</small>
              </div>
            </Col>
          </Row>

          <h6 className="mb-3">Recent Tasks</h6>
          {allSlots.length === 0 ? (
            <div className="text-center py-4 text-muted">
              <FaTasks size={48} className="mb-3 opacity-50" />
              <p>No tasks created yet. Create slots from the Content Calendar.</p>
            </div>
          ) : (
            <div className="table-responsive">
              <Table hover size="sm">
                <thead>
                  <tr>
                    <th>Task</th>
                    <th>Assigned To</th>
                    <th>Status</th>
                    <th>Deadline</th>
                    <th>Project</th>
                  </tr>
                </thead>
                <tbody>
                  {allSlots.slice(0, 10).map((slot) => {
                    const isOverdue = new Date(slot.designDeadline) < new Date() && 
                                     slot.designStatus !== 'Approved' && 
                                     slot.postingStatus !== 'Posted';
                    return (
                      <tr key={slot._id} className={isOverdue ? 'table-danger' : ''}>
                        <td>
                          <strong>{slot.brief?.substring(0, 40)}{slot.brief?.length > 40 ? '...' : ''}</strong>
                          <br />
                          <small className="text-muted">{slot.postType}</small>
                        </td>
                        <td>{slot.assignedTo?.name || 'Unassigned'}</td>
                        <td>
                          <Badge 
                            bg={
                              slot.postingStatus === 'Posted' ? 'success' :
                              slot.designStatus === 'Approved' ? 'primary' :
                              slot.designStatus === 'In Design' ? 'info' :
                              slot.designStatus === 'Needs Revision' ? 'warning' :
                              'secondary'
                            }
                          >
                            {slot.postingStatus === 'Posted' ? 'Posted' : slot.designStatus}
                          </Badge>
                        </td>
                        <td>
                          <small className={isOverdue ? 'text-danger fw-bold' : ''}>
                            {new Date(slot.designDeadline).toLocaleDateString('en-GB')}
                            {isOverdue && ' ⚠️'}
                          </small>
                        </td>
                        <td>
                          <small>{slot.project?.name || 'N/A'}</small>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </Table>
            </div>
          )}
          {allSlots.length > 10 && (
            <div className="text-center mt-2">
              <small className="text-muted">Showing 10 of {allSlots.length} tasks</small>
            </div>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button 
            variant="success" 
            onClick={() => {
              setShowActivityModal(false);
              navigate('/content-calendar');
            }}
          >
            View All in Calendar
          </Button>
          <Button variant="secondary" onClick={() => setShowActivityModal(false)}>
            Close
          </Button>
        </Modal.Footer>
      </Modal>
    </Card>
  );
};

export default HoPSection;
