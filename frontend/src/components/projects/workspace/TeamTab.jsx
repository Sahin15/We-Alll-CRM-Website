import { useState, useEffect } from 'react';
import { Row, Col, Card, Badge, Button, ListGroup, Modal, Form } from 'react-bootstrap';
import { FaUser, FaTasks, FaExclamationTriangle, FaPlus, FaTrash } from 'react-icons/fa';
import { toast } from 'react-toastify';
import { Pie } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import projectApi from '../../../api/projectApi';
import userApi from '../../../api/userApi';
import { useAuth } from '../../../context/AuthContext';

ChartJS.register(ArcElement, Tooltip, Legend);

/**
 * TeamTab Component
 * Displays team members with workload and allows management
 * Requirements: 4.4, 7.1, 7.4
 */
const TeamTab = ({ project, onRefresh }) => {
  const { user } = useAuth();
  const [teamWorkload, setTeamWorkload] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [availableUsers, setAvailableUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState('');
  const [addingMember, setAddingMember] = useState(false);

  useEffect(() => {
    loadTeamWorkload();
    loadAvailableUsers();
  }, [project._id]);

  const loadTeamWorkload = async () => {
    try {
      setLoading(true);
      const response = await projectApi.getTeamWorkload(project._id);
      const workloadData = response.data?.workload || response.workload || [];
      
      // Get all team members from project
      const allTeamMembers = project.assignedUsers || [];
      
      // Create a map of workload data by user ID
      const workloadMap = {};
      workloadData.forEach(item => {
        if (item.user?._id) {
          workloadMap[item.user._id] = item;
        }
      });
      
      // Merge team members with workload data
      const mergedTeamData = allTeamMembers.map(member => {
        const memberId = member._id || member;
        const workload = workloadMap[memberId];
        
        if (workload) {
          return workload;
        } else {
          // Team member with no work items
          return {
            user: member,
            total: 0,
            toDo: 0,
            inProgress: 0,
            review: 0,
            done: 0,
            overdue: 0,
            completionRate: 0,
            activeItems: 0,
          };
        }
      });
      
      setTeamWorkload(mergedTeamData);
    } catch (error) {
      console.error('Error loading team workload:', error);
      toast.error('Failed to load team workload');
      setTeamWorkload([]);
    } finally {
      setLoading(false);
    }
  };

  const loadAvailableUsers = async () => {
    try {
      const response = await userApi.getAllUsers();
      const allUsers = response.data || response.users || [];
      
      // Get current team member IDs
      const teamMemberIds = [
        ...(project.assignedUsers?.map((m) => m._id || m) || []),
        ...(project.teamMembers?.map((m) => m.user?._id || m.user || m._id || m) || [])
      ];
      
      // Get project head ID
      const projectHeadId = project.projectHead?._id || project.projectHead;
      
      // Get project department ID
      const projectDeptId = project.department?._id || project.department;
      
      // Filter users
      const available = allUsers.filter((u) => {
        // Only include employees and HoDs
        if (u.role !== 'employee' && u.role !== 'hod') {
          return false;
        }
        
        // Exclude if already a team member
        if (teamMemberIds.includes(u._id)) {
          return false;
        }
        
        // Exclude if project head (unless they're the current HoD wanting to add themselves)
        if (u._id === projectHeadId && u._id !== user?._id) {
          return false;
        }
        
        // Include only if from same department
        if (projectDeptId) {
          const userDeptId = u.department?._id || u.department;
          return userDeptId === projectDeptId;
        }
        
        // If no department, still only show employees/HoDs
        return true;
      });
      
      setAvailableUsers(available);
    } catch (error) {
      console.error('Error loading users:', error);
      toast.error('Failed to load available users');
    }
  };

  const handleAddMember = async () => {
    if (!selectedUser) {
      toast.error('Please select a user');
      return;
    }

    try {
      setAddingMember(true);
      await projectApi.addTeamMember(project._id, selectedUser);
      toast.success('Team member added successfully!');
      setShowAddModal(false);
      setSelectedUser('');
      loadTeamWorkload();
      loadAvailableUsers();
      if (onRefresh) {
        onRefresh();
      }
    } catch (error) {
      console.error('Error adding team member:', error);
      toast.error(error.response?.data?.message || 'Failed to add team member');
    } finally {
      setAddingMember(false);
    }
  };

  const handleRemoveMember = async (userId) => {
    if (!window.confirm('Are you sure you want to remove this team member?')) {
      return;
    }

    try {
      await projectApi.removeTeamMember(project._id, userId);
      toast.success('Team member removed successfully!');
      loadTeamWorkload();
      loadAvailableUsers();
      if (onRefresh) {
        onRefresh();
      }
    } catch (error) {
      console.error('Error removing team member:', error);
      toast.error(error.response?.data?.message || 'Failed to remove team member');
    }
  };

  // Check if user can manage team (Admin, SuperAdmin, HoD, or Project Head)
  const canManageTeam = 
    user?.role === 'admin' || 
    user?.role === 'superadmin' || 
    user?.role === 'hod' ||
    user?._id === project.projectHead?._id;

  // Prepare chart data
  const chartData = {
    labels: teamWorkload.map((member) => member.user?.name || 'Unknown'),
    datasets: [
      {
        label: 'Active Work Items',
        data: teamWorkload.map((member) => member.activeItems || member.activeCount || 0),
        backgroundColor: [
          '#0d6efd',
          '#198754',
          '#ffc107',
          '#dc3545',
          '#6c757d',
          '#0dcaf0',
          '#6610f2',
          '#fd7e14'
        ],
        borderWidth: 2,
        borderColor: '#fff'
      }
    ]
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom'
      },
      tooltip: {
        callbacks: {
          label: (context) => {
            const label = context.label || '';
            const value = context.parsed || 0;
            return `${label}: ${value} active items`;
          }
        }
      }
    }
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

  return (
    <div>
      {/* Team Management Info */}
      <Card className="mb-3 border-0 shadow-sm" style={{ borderRadius: '12px', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
        <Card.Body className="text-white p-3">
          <div className="d-flex align-items-center justify-content-between">
            <div className="d-flex align-items-center">
              <div className="me-3" style={{ fontSize: '2rem' }}>👥</div>
              <div>
                <h6 className="mb-1" style={{ fontWeight: '600' }}>Team Management</h6>
                <small style={{ opacity: 0.9 }}>
                  {canManageTeam 
                    ? 'You can add/remove team members and assign work items to them.'
                    : 'View team members and their workload distribution.'}
                </small>
              </div>
            </div>
            {canManageTeam && (
              <Button
                variant="light"
                size="sm"
                onClick={() => setShowAddModal(true)}
                className="d-flex align-items-center"
                style={{ fontWeight: '500' }}
              >
                <FaPlus className="me-2" />
                Add Member
              </Button>
            )}
          </div>
        </Card.Body>
      </Card>

      <Row className="mb-3">
        <Col>
          <h5 style={{ fontWeight: '600', color: '#2c3e50' }}>Team Members ({teamWorkload.length})</h5>
        </Col>
      </Row>

      <Row>
        {/* Team Members List */}
        <Col md={8}>
          <Card className="mb-3">
            <ListGroup variant="flush">
              {teamWorkload.length === 0 ? (
                <ListGroup.Item className="text-center py-4 text-muted">
                  No team members assigned
                </ListGroup.Item>
              ) : (
                teamWorkload.map((member) => {
                  const activeCount = member.activeItems || member.activeCount || 0;
                  const overdueCount = member.overdue || member.overdueCount || 0;
                  const isOverloaded = activeCount > 10;
                  const hasOverdue = overdueCount > 0;

                  return (
                    <ListGroup.Item key={member.user?._id}>
                      <Row className="align-items-center">
                        <Col md={4}>
                          <div className="d-flex align-items-center">
                            <div
                              className="rounded-circle bg-primary text-white d-flex align-items-center justify-content-center me-3"
                              style={{ width: '40px', height: '40px' }}
                            >
                              <FaUser />
                            </div>
                            <div>
                              <div className="fw-bold">{member.user?.name || 'Unknown'}</div>
                              {member.user?._id === project.projectHead?._id && (
                                <Badge bg="info" className="ms-2" style={{ fontSize: '0.7rem' }}>
                                  Project Head
                                </Badge>
                              )}
                            </div>
                          </div>
                        </Col>
                        <Col md={3}>
                          <div className="text-center">
                            <div className="d-flex align-items-center justify-content-center">
                              <FaTasks className="me-2 text-muted" />
                              <strong className={isOverloaded ? 'text-warning' : ''}>
                                {activeCount}
                              </strong>
                            </div>
                            <small className="text-muted">Active Items</small>
                            {isOverloaded && (
                              <div>
                                <Badge bg="warning" text="dark" style={{ fontSize: '0.65rem' }}>
                                  High Workload
                                </Badge>
                              </div>
                            )}
                          </div>
                        </Col>
                        <Col md={3}>
                          <div className="text-center">
                            <div className="d-flex align-items-center justify-content-center">
                              <FaExclamationTriangle
                                className={`me-2 ${hasOverdue ? 'text-danger' : 'text-muted'}`}
                              />
                              <strong className={hasOverdue ? 'text-danger' : ''}>
                                {overdueCount}
                              </strong>
                            </div>
                            <small className="text-muted">Overdue</small>
                          </div>
                        </Col>
                        <Col md={2} className="text-end">
                          {canManageTeam && member.user?._id !== project.projectHead?._id && (
                            <Button
                              variant="outline-danger"
                              size="sm"
                              onClick={() => handleRemoveMember(member.user?._id)}
                            >
                              <FaTrash />
                            </Button>
                          )}
                        </Col>
                      </Row>
                    </ListGroup.Item>
                  );
                })
              )}
            </ListGroup>
          </Card>
        </Col>

        {/* Workload Distribution Chart */}
        <Col md={4}>
          <Card>
            <Card.Header>
              <h6 className="mb-0">Workload Distribution</h6>
            </Card.Header>
            <Card.Body>
              {teamWorkload.length > 0 ? (
                <div style={{ height: '300px' }}>
                  <Pie data={chartData} options={chartOptions} />
                </div>
              ) : (
                <div className="text-center py-5 text-muted">
                  <p>No data available</p>
                </div>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Add Member Modal */}
      <Modal show={showAddModal} onHide={() => setShowAddModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Add Team Member</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form.Group>
            <Form.Label>Select User</Form.Label>
            <Form.Select
              value={selectedUser}
              onChange={(e) => setSelectedUser(e.target.value)}
            >
              <option value="">Choose a user...</option>
              {availableUsers.map((u) => (
                <option key={u._id} value={u._id}>
                  {u.name} ({u.email})
                </option>
              ))}
            </Form.Select>
          </Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowAddModal(false)}>
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleAddMember}
            disabled={addingMember || !selectedUser}
          >
            {addingMember ? 'Adding...' : 'Add Member'}
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
};

export default TeamTab;
