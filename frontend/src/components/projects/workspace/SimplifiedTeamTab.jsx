import { useState, useEffect } from 'react';
import { Row, Col, Card, Button, Modal, Form, Badge } from 'react-bootstrap';
import { FaPlus, FaTrash, FaUserShield, FaTasks } from 'react-icons/fa';
import { toast } from 'react-toastify';
import projectApi from '../../../api/projectApi';
import userApi from '../../../api/userApi';
import { useAuth } from '../../../context/AuthContext';
import AssignWorkModal from '../../work/AssignWorkModal';

/**
 * SimplifiedTeamTab - Only for managing team members
 * No work assignment here - that's in Work tab
 */
const SimplifiedTeamTab = ({ project, onRefresh }) => {
  const { user } = useAuth();
  const [teamMembers, setTeamMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showAssignWorkModal, setShowAssignWorkModal] = useState(false);
  const [selectedMemberForWork, setSelectedMemberForWork] = useState(null);
  const [availableUsers, setAvailableUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState('');
  const [addingMember, setAddingMember] = useState(false);

  // Check if user can manage team
  const canManageTeam = 
    ['admin', 'superadmin', 'hr', 'manager'].includes(user?.role) ||
    user?._id === project.projectHead?._id ||
    project.assignedUsers?.some(u => (u._id || u) === user?._id);

  useEffect(() => {
    loadTeamMembers();
    loadAvailableUsers();
  }, [project._id]);

  const loadTeamMembers = () => {
    try {
      setLoading(true);
      const members = project.assignedUsers || [];
      
      // Add project head if not in the list
      if (project.projectHead && !members.find(m => (m._id || m) === (project.projectHead._id || project.projectHead))) {
        members.unshift(project.projectHead);
      }
      
      setTeamMembers(members);
    } catch (error) {
      console.error('Error loading team members:', error);
      toast.error('Failed to load team members');
    } finally {
      setLoading(false);
    }
  };

  const loadAvailableUsers = async () => {
    try {
      const response = await userApi.getAllUsers();
      const allUsers = response.data || response || [];
      
      // Filter out users already in the team
      const currentTeamIds = teamMembers.map(m => m._id || m);
      const available = allUsers.filter(u => !currentTeamIds.includes(u._id));
      
      setAvailableUsers(available);
    } catch (error) {
      console.error('Error loading available users:', error);
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
      
      if (onRefresh) {
        await onRefresh();
      }
      loadTeamMembers();
      loadAvailableUsers();
    } catch (error) {
      console.error('Error adding team member:', error);
      toast.error(error.response?.data?.message || 'Failed to add team member');
    } finally {
      setAddingMember(false);
    }
  };

  const handleRemoveMember = async (memberId) => {
    // Don't allow removing project head
    if (memberId === (project.projectHead?._id || project.projectHead)) {
      toast.error('Cannot remove project head');
      return;
    }

    if (!window.confirm('Are you sure you want to remove this team member?')) {
      return;
    }

    try {
      await projectApi.removeTeamMember(project._id, memberId);
      toast.success('Team member removed successfully!');
      
      if (onRefresh) {
        await onRefresh();
      }
      loadTeamMembers();
      loadAvailableUsers();
    } catch (error) {
      console.error('Error removing team member:', error);
      toast.error('Failed to remove team member');
    }
  };

  const handleAssignWork = (member) => {
    setSelectedMemberForWork(member);
    setShowAssignWorkModal(true);
  };

  const handleWorkAssignSuccess = () => {
    setShowAssignWorkModal(false);
    setSelectedMemberForWork(null);
    // Don't show toast here - AssignWorkModal already shows it
    if (onRefresh) {
      onRefresh();
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
      {/* Header */}
      <Card className="mb-3 border-0 shadow-sm">
        <Card.Body>
          <div className="d-flex justify-content-between align-items-center">
            <div>
              <h5 className="mb-1">Team Members ({teamMembers.length})</h5>
              <small className="text-muted">
                Manage project team members
              </small>
            </div>
            {canManageTeam && (
              <Button 
                variant="primary" 
                onClick={() => setShowAddModal(true)}
                className="d-flex align-items-center"
              >
                <FaPlus className="me-2" />
                Add Member
              </Button>
            )}
          </div>
        </Card.Body>
      </Card>

      {/* Team Members List */}
      <Row>
        {teamMembers.length === 0 ? (
          <Col md={12}>
            <Card className="border-0 shadow-sm">
              <Card.Body className="text-center py-5">
                <p className="text-muted mb-3">No team members yet</p>
                {canManageTeam && (
                  <Button 
                    variant="outline-primary" 
                    onClick={() => setShowAddModal(true)}
                  >
                    <FaPlus className="me-2" />
                    Add First Member
                  </Button>
                )}
              </Card.Body>
            </Card>
          </Col>
        ) : (
          teamMembers.map((member) => {
            const memberId = member._id || member;
            const isProjectHead = memberId === (project.projectHead?._id || project.projectHead);
            
            return (
              <Col md={6} lg={4} key={memberId} className="mb-3">
                <Card className="border-0 shadow-sm h-100">
                  <Card.Body>
                    <div className="d-flex justify-content-between align-items-start mb-3">
                      <div className="d-flex align-items-center">
                        <div 
                          className="rounded-circle bg-primary text-white d-flex align-items-center justify-content-center me-3"
                          style={{ width: '50px', height: '50px', fontSize: '20px', fontWeight: 'bold' }}
                        >
                          {member.name?.charAt(0).toUpperCase() || 'U'}
                        </div>
                        <div>
                          <h6 className="mb-0">{member.name || 'Unknown'}</h6>
                          <small className="text-muted">{member.email || ''}</small>
                        </div>
                      </div>
                      {isProjectHead && (
                        <Badge bg="success" className="d-flex align-items-center">
                          <FaUserShield className="me-1" />
                          Head
                        </Badge>
                      )}
                    </div>

                    <div className="mb-2">
                      <small className="text-muted">Role:</small>
                      <div>
                        <Badge bg="info">{member.role || 'employee'}</Badge>
                      </div>
                    </div>

                    {member.department && (
                      <div className="mb-2">
                        <small className="text-muted">Department:</small>
                        <div>
                          <Badge bg="secondary">{member.department.name || member.department}</Badge>
                        </div>
                      </div>
                    )}

                    <div className="mt-3 pt-3 border-top">
                      {canManageTeam && (
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={() => handleAssignWork(member)}
                          className="w-100 mb-2"
                        >
                          <FaTasks className="me-2" />
                          Assign Work
                        </Button>
                      )}
                      
                      {canManageTeam && !isProjectHead && (
                        <Button
                          variant="outline-danger"
                          size="sm"
                          onClick={() => handleRemoveMember(memberId)}
                          className="w-100"
                        >
                          <FaTrash className="me-2" />
                          Remove from Team
                        </Button>
                      )}
                    </div>
                  </Card.Body>
                </Card>
              </Col>
            );
          })
        )}
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
              disabled={addingMember}
            >
              <option value="">Choose a user...</option>
              {availableUsers.map(u => (
                <option key={u._id} value={u._id}>
                  {u.name}
                </option>
              ))}
            </Form.Select>
          </Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <Button 
            variant="secondary" 
            onClick={() => setShowAddModal(false)}
            disabled={addingMember}
          >
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

      {/* Assign Work Modal */}
      <AssignWorkModal
        show={showAssignWorkModal}
        onHide={() => {
          setShowAssignWorkModal(false);
          setSelectedMemberForWork(null);
        }}
        onSuccess={handleWorkAssignSuccess}
        defaultProject={project._id}
        defaultAssignee={selectedMemberForWork?._id}
      />
    </div>
  );
};

export default SimplifiedTeamTab;
