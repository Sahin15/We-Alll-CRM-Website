import { useState, useEffect } from 'react';
import { Row, Col, Card, Button, Modal, Form, Badge } from 'react-bootstrap';
import { FaPlus, FaTrash, FaUserShield, FaTasks } from 'react-icons/fa';
import { toast } from 'react-toastify';
import projectApi from '../../../api/projectApi';
import userApi from '../../../api/userApi';
import { useAuth } from '../../../context/AuthContext';
import { checkPageAccess, PAGE_ACCESS } from '../../../constants/pageAccess';
import AssignWorkModal from '../../work/AssignWorkModal';

/**
 * SimplifiedTeamTab - Only for managing team members
 * No work assignment here - that's in Work tab
 */
const SimplifiedTeamTab = ({ project, onRefresh }) => {
  const { user, canAccess } = useAuth();
  const [currentProject, setCurrentProject] = useState(project);
  const [teamMembers, setTeamMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showAssignWorkModal, setShowAssignWorkModal] = useState(false);
  const [selectedMemberForWork, setSelectedMemberForWork] = useState(null);
  const [availableUsers, setAvailableUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState('');
  const [memberRole, setMemberRole] = useState('');
  const [addingMember, setAddingMember] = useState(false);
  
  // Remove confirmation modal states
  const [showRemoveConfirmModal, setShowRemoveConfirmModal] = useState(false);
  const [memberToRemove, setMemberToRemove] = useState(null);

  // Check if user can manage team - updated to match backend logic
  const canManageTeam =
    canAccess('team.user.update', ['admin', 'superadmin', 'hr']) ||
    user?._id === currentProject.projectHead?._id ||
    (currentProject.department?.head && user?._id === currentProject.department.head._id) ||
    currentProject.assignedUsers?.some(u => (u._id || u) === user?._id);

  // Update currentProject when project prop changes
  useEffect(() => {
    setCurrentProject(project);
  }, [project]);

  // Function to refresh project data
  const refreshProjectData = async () => {
    try {
      // Use getProjectWorkspace instead of getProjectById for better populated data
      const response = await projectApi.getProjectWorkspace(project._id);
      const updatedProject = response.data?.project || response.project || response;
      setCurrentProject(updatedProject);
      return updatedProject;
    } catch (error) {
      console.error('Error refreshing project data:', error);
      // Fallback to getProjectById
      try {
        const response = await projectApi.getProjectById(project._id);
        const updatedProject = response.data || response;
        setCurrentProject(updatedProject);
        return updatedProject;
      } catch (fallbackError) {
        console.error('Fallback error:', fallbackError);
        return currentProject;
      }
    }
  };

  useEffect(() => {
    loadTeamMembers();
    if (canManageTeam) {
      loadAvailableUsers();
    }
  }, [currentProject._id, currentProject.teamMembers, currentProject.assignedUsers, currentProject.projectHead, canManageTeam]);

  const loadTeamMembers = () => {
    try {
      setLoading(true);
      const byId = new Map();

      // Prefer teamMembers (role metadata), then fill gaps from assignedUsers
      if (currentProject.teamMembers?.length) {
        currentProject.teamMembers.forEach((member) => {
          if (member?.isActive === false) return;
          const userObj =
            typeof member.user === 'object' && member.user !== null
              ? member.user
              : null;
          const memberId = String(
            userObj?._id || member.user || member._id || ''
          );
          if (!memberId || memberId === 'undefined') return;
          byId.set(memberId, userObj || { _id: memberId });
        });
      }

      (currentProject.assignedUsers || []).forEach((user) => {
        const memberId = String(user?._id || user || '');
        if (!memberId || memberId === 'undefined') return;
        if (!byId.has(memberId)) {
          byId.set(memberId, typeof user === 'object' ? user : { _id: memberId });
        }
      });

      if (currentProject.projectHead) {
        const headId = String(
          currentProject.projectHead._id || currentProject.projectHead
        );
        if (headId && !byId.has(headId)) {
          byId.set(
            headId,
            typeof currentProject.projectHead === 'object'
              ? currentProject.projectHead
              : { _id: headId }
          );
        }
      }

      setTeamMembers([...byId.values()]);
    } catch (error) {
      console.error('Error loading team members:', error);
      toast.error('Failed to load team members');
    } finally {
      setLoading(false);
    }
  };

  const loadAvailableUsers = async () => {
    try {
      const candidates = await projectApi.getTeamMemberCandidates(currentProject._id);
      setAvailableUsers(candidates);
    } catch (error) {
      console.error('Error loading available users:', error);
      toast.error('Failed to load available users');
    }
  };

  const handleAddMember = async () => {
    if (!selectedUser) {
      toast.error('Please select a user');
      return;
    }

    if (!memberRole.trim()) {
      toast.error('Please enter a role for the team member');
      return;
    }

    // Double-check if user is already a team member before making the API call
    const currentTeamIds = new Set();
    
    // Check teamMembers array
    if (currentProject.teamMembers) {
      currentProject.teamMembers.forEach(member => {
        const userId = member.user?._id || member.user;
        if (userId) currentTeamIds.add(userId);
      });
    }
    
    // Check assignedUsers array
    if (currentProject.assignedUsers) {
      currentProject.assignedUsers.forEach(user => {
        const userId = user._id || user;
        if (userId) currentTeamIds.add(userId);
      });
    }
    
    // Check project head
    if (currentProject.projectHead) {
      const headId = currentProject.projectHead._id || currentProject.projectHead;
      if (headId) currentTeamIds.add(headId);
    }
    
    if (currentTeamIds.has(selectedUser)) {
      toast.error('This user is already a team member');
      return;
    }

    try {
      setAddingMember(true);
      const response = await projectApi.addTeamMember(currentProject._id, selectedUser, memberRole.trim());
      toast.success('Team member added successfully!');
      setShowAddModal(false);
      setSelectedUser('');
      setMemberRole('');
      
      // Refresh project data to get the updated team with populated user data
      await refreshProjectData();
      
      // Also call parent refresh if available
      if (onRefresh) {
        await onRefresh();
      }
      
      loadAvailableUsers();
    } catch (error) {
      console.error('Error adding team member:', error);
      const errorMessage = error.response?.data?.message || 'Failed to add team member';
      toast.error(errorMessage);
    } finally {
      setAddingMember(false);
    }
  };

  const handleRemoveMember = async (memberId) => {
    // Don't allow removing project head
    if (memberId === (currentProject.projectHead?._id || currentProject.projectHead)) {
      toast.error('Cannot remove project head');
      return;
    }

    // Find the member to get their name
    const member = teamMembers.find(m => (m._id || m) === memberId);
    setMemberToRemove({ memberId, name: member?.name || 'Team Member' });
    setShowRemoveConfirmModal(true);
  };

  const confirmRemoveMember = async () => {
    if (!memberToRemove) return;

    try {
      await projectApi.removeTeamMember(currentProject._id, memberToRemove.memberId);
      toast.success('Team member removed successfully!');
      setShowRemoveConfirmModal(false);
      setMemberToRemove(null);
      
      // Refresh project data
      await refreshProjectData();
      
      if (onRefresh) {
        await onRefresh();
      }
      
      loadAvailableUsers();
    } catch (error) {
      console.error('Error removing team member:', error);
      toast.error('Failed to remove team member');
      setShowRemoveConfirmModal(false);
      setMemberToRemove(null);
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
            const isProjectHead = memberId === (currentProject.projectHead?._id || currentProject.projectHead);
            
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
                      <small className="text-muted">Project Role:</small>
                      <div>
                        <Badge bg="info">
                          {(() => {
                            // Find the team member entry for this user to get project-specific role
                            const teamMember = currentProject.teamMembers?.find(tm => 
                              (tm.user?._id || tm.user) === memberId
                            );
                            
                            // If this is the project head, show "Project Head"
                            if (isProjectHead) {
                              return 'Project Head';
                            }
                            
                            // Use project-specific role from teamMembers, or default to "Team Member"
                            return teamMember?.role || 'Team Member';
                          })()}
                        </Badge>
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
          <Form.Group className="mb-3">
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
          
          <Form.Group>
            <Form.Label>Role in Project</Form.Label>
            <Form.Control
              type="text"
              placeholder="e.g., Frontend Developer, Designer, QA Tester"
              value={memberRole}
              onChange={(e) => setMemberRole(e.target.value)}
              disabled={addingMember}
            />
            <Form.Text className="text-muted">
              Specify the role or responsibility of this member in the project
            </Form.Text>
          </Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <Button 
            variant="secondary" 
            onClick={() => {
              setShowAddModal(false);
              setSelectedUser('');
              setMemberRole('');
            }}
            disabled={addingMember}
          >
            Cancel
          </Button>
          <Button 
            variant="primary" 
            onClick={handleAddMember}
            disabled={addingMember || !selectedUser || !memberRole.trim()}
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
        defaultProject={currentProject}
        defaultAssignee={selectedMemberForWork?._id}
      />

      {/* Remove Team Member Confirmation Modal */}
      <Modal show={showRemoveConfirmModal} onHide={() => setShowRemoveConfirmModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Remove Team Member</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <div className="text-center mb-3">
            <FaTrash className="text-danger" style={{ fontSize: '2rem' }} />
          </div>
          <p className="text-center">
            Are you sure you want to remove <strong>{memberToRemove?.name}</strong> from the team?
          </p>
          <p className="text-center text-muted small">
            This action cannot be undone.
          </p>
        </Modal.Body>
        <Modal.Footer>
          <Button 
            variant="secondary" 
            onClick={() => {
              setShowRemoveConfirmModal(false);
              setMemberToRemove(null);
            }}
          >
            Cancel
          </Button>
          <Button 
            variant="danger" 
            onClick={confirmRemoveMember}
          >
            Remove
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
};

export default SimplifiedTeamTab;
