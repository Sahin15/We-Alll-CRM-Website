import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Row, Col, Card, Button, Table, Badge, Modal, Form } from 'react-bootstrap';
import { FaUsers, FaProjectDiagram, FaUserTie, FaPlus, FaChevronDown, FaChevronUp } from 'react-icons/fa';
import { departmentApi } from '../../api/departmentApi';
import { projectApi } from '../../api/projectApi';
import toast from '../../utils/toast';

const HoDSection = ({ user }) => {
  const navigate = useNavigate();
  const [expanded, setExpanded] = useState(true);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState(null);
  const [projects, setProjects] = useState([]);
  const [members, setMembers] = useState([]);
  const [department, setDepartment] = useState(null);
  
  // Modal states
  const [showMembersModal, setShowMembersModal] = useState(false);

  useEffect(() => {
    if (user.headOfDepartment) {
      loadHoDData();
    }
  }, [user]);

  const loadHoDData = async () => {
    try {
      setLoading(true);
      // Extract department ID - it might be an object or a string
      const departmentId = typeof user.headOfDepartment === 'object' 
        ? user.headOfDepartment?._id 
        : user.headOfDepartment;

      if (!departmentId) {
        throw new Error('No department ID found. Please log out and log back in.');
      }

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
      console.error('Error loading HoD data:', error);
      toast.error('Failed to load department data');
    } finally {
      setLoading(false);
    }
  };



  if (!user.headOfDepartment) {
    return null;
  }

  return (
    <>
      {/* HoD Section Header */}
      <Card className="mb-4 border-0 shadow-sm" style={{ borderLeft: '4px solid #667eea' }}>
        <Card.Header 
          className="bg-gradient d-flex justify-content-between align-items-center cursor-pointer"
          onClick={() => setExpanded(!expanded)}
          style={{ 
            background: 'linear-gradient(135deg, rgba(102, 126, 234, 0.1) 0%, rgba(118, 75, 162, 0.1) 100%)',
            cursor: 'pointer'
          }}
        >
          <div>
            <h5 className="mb-0">
              <FaUserTie className="me-2 text-primary" />
              Head of Department - {department?.name || 'Loading...'}
            </h5>
            <small className="text-muted">Manage your department and assign project leads</small>
          </div>
          {expanded ? <FaChevronUp /> : <FaChevronDown />}
        </Card.Header>

        {expanded && (
          <Card.Body>
            {loading ? (
              <div className="text-center py-4">
                <div className="spinner-border text-primary" role="status">
                  <span className="visually-hidden">Loading...</span>
                </div>
              </div>
            ) : (
              <>
                {/* Quick Stats */}
                <Row className="mb-4">
                  <Col md={3} sm={6} className="mb-3">
                    <Card 
                      className="border-0 bg-light text-center" 
                      style={{ cursor: 'pointer' }}
                      onClick={() => setShowMembersModal(true)}
                    >
                      <Card.Body>
                        <FaUsers className="text-primary mb-2" size={24} />
                        <h4 className="mb-0">{stats?.totalMembers || 0}</h4>
                        <small className="text-muted">Team Members</small>
                      </Card.Body>
                    </Card>
                  </Col>
                  <Col md={3} sm={6} className="mb-3">
                    <Card 
                      className="border-0 bg-light text-center" 
                      style={{ cursor: 'pointer' }}
                      onClick={() => navigate('/projects')}
                    >
                      <Card.Body>
                        <FaProjectDiagram className="text-info mb-2" size={24} />
                        <h4 className="mb-0">{stats?.totalProjects || 0}</h4>
                        <small className="text-muted">Total Projects</small>
                      </Card.Body>
                    </Card>
                  </Col>
                  <Col md={3} sm={6} className="mb-3">
                    <Card className="border-0 bg-light text-center">
                      <Card.Body>
                        <div className="text-warning mb-2">⏳</div>
                        <h4 className="mb-0">{stats?.activeProjects || 0}</h4>
                        <small className="text-muted">Active</small>
                      </Card.Body>
                    </Card>
                  </Col>
                  <Col md={3} sm={6} className="mb-3">
                    <Card className="border-0 bg-light text-center">
                      <Card.Body>
                        <div className="text-success mb-2">✓</div>
                        <h4 className="mb-0">{stats?.completedProjects || 0}</h4>
                        <small className="text-muted">Completed</small>
                      </Card.Body>
                    </Card>
                  </Col>
                </Row>


              </>
            )}
          </Card.Body>
        )}
      </Card>

      {/* Team Members Modal */}
      <Modal show={showMembersModal} onHide={() => setShowMembersModal(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>
            <FaUsers className="me-2" />
            Department Team Members
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {members.length === 0 ? (
            <div className="text-center py-4 text-muted">
              <FaUsers size={48} className="mb-3 opacity-50" />
              <p>No team members in this department yet.</p>
            </div>
          ) : (
            <div className="table-responsive">
              <Table hover>
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
                      <td><strong>{member.name}</strong></td>
                      <td>{member.email}</td>
                      <td>{member.designation || 'N/A'}</td>
                      <td>{member.employeeId || 'N/A'}</td>
                      <td>
                        <Badge bg={member.status === 'active' ? 'success' : 'secondary'}>
                          {member.status || 'active'}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </div>
          )}
          <div className="mt-3 text-muted">
            <small>Total Members: {members.length}</small>
          </div>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowMembersModal(false)}>
            Close
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  );
};

export default HoDSection;
