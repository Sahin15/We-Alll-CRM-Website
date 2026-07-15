import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Tabs, Tab, Button, Alert, Spinner } from 'react-bootstrap';
import { FaArrowLeft, FaSync, FaCog, FaChartLine } from 'react-icons/fa';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';

// Import the new slot components
import SlotProgressDisplay from './SlotProgressDisplay';
import SlotManagementInterface from './SlotManagementInterface';
import SlotStatisticsCards from './SlotStatisticsCards';
import ProgressTrendChart from './ProgressTrendChart';
import SlotConflictResolution from './SlotConflictResolution';

// Import existing components and APIs
import { projectApi } from '../../api/projectApi';
import { useAuth } from '../../context/AuthContext';
import { checkPageAccess, PAGE_ACCESS } from '../../constants/pageAccess';

/**
 * EnhancedProjectOverview Component
 * 
 * Comprehensive project overview with slot-based progress tracking
 * Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 7.1, 7.2, 7.3
 */
const EnhancedProjectOverview = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, canAccess } = useAuth();

  // State management
  const [project, setProject] = useState(null);
  const [slots, setSlots] = useState([]);
  const [conflicts, setConflicts] = useState([]);
  const [availableUsers, setAvailableUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');

  // Permission checks
  const isProjectHead = project?.projectHead?._id === user?._id;
  const canManage = canAccess('projects.project.manage', ['admin', 'superadmin', 'hod']) || isProjectHead;

  useEffect(() => {
    if (id) {
      fetchProjectData();
    }
  }, [id]);

  const fetchProjectData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        fetchProject(),
        fetchSlots(),
        fetchConflicts(),
        fetchAvailableUsers()
      ]);
    } catch (error) {
      console.error('Error fetching project data:', error);
      toast.error('Failed to load project data');
    } finally {
      setLoading(false);
    }
  };

  const fetchProject = async () => {
    try {
      const response = await projectApi.getProjectById(id);
      const projectData = response?.data || response;
      setProject(projectData);
    } catch (error) {
      console.error('Error fetching project:', error);
      if (error.response?.status === 404) {
        toast.error('Project not found');
        navigate('/projects');
      }
      throw error;
    }
  };

  const fetchSlots = async () => {
    try {
      // Mock slot data - replace with actual API call
      const mockSlots = [
        {
          _id: '1',
          slotNumber: 1,
          slotIdentifier: 'Slot 1',
          title: 'Initial Setup',
          description: 'Project setup and configuration',
          assignmentStatus: 'completed',
          assignedTo: { _id: 'user1', name: 'John Doe', email: 'john@example.com' },
          priority: 'High',
          dueDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
          completionStatus: { isCompleted: true, completedAt: new Date().toISOString() },
          createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString()
        },
        {
          _id: '2',
          slotNumber: 2,
          slotIdentifier: 'Slot 2',
          title: 'Development Phase 1',
          description: 'Core functionality development',
          assignmentStatus: 'in-progress',
          assignedTo: { _id: 'user2', name: 'Jane Smith', email: 'jane@example.com' },
          priority: 'High',
          dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
          completionStatus: { isCompleted: false },
          createdAt: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString()
        },
        {
          _id: '3',
          slotNumber: 3,
          slotIdentifier: 'Slot 3',
          title: 'Testing Phase',
          description: 'Quality assurance and testing',
          assignmentStatus: 'assigned',
          assignedTo: { _id: 'user3', name: 'Bob Johnson', email: 'bob@example.com' },
          priority: 'Medium',
          dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          completionStatus: { isCompleted: false },
          createdAt: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString()
        },
        {
          _id: '4',
          slotNumber: 4,
          slotIdentifier: 'Slot 4',
          title: 'Documentation',
          description: 'Project documentation and user guides',
          assignmentStatus: 'available',
          priority: 'Low',
          dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
          completionStatus: { isCompleted: false },
          createdAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString()
        }
      ];
      setSlots(mockSlots);
    } catch (error) {
      console.error('Error fetching slots:', error);
      throw error;
    }
  };

  const fetchConflicts = async () => {
    try {
      // Mock conflict data - replace with actual API call
      const mockConflicts = [
        {
          id: 'conflict1',
          type: 'overdue-assignment',
          description: 'Slot 2 assignment is overdue by 2 days',
          affectedSlots: ['2'],
          severity: 'medium',
          createdAt: new Date().toISOString()
        }
      ];
      setConflicts(mockConflicts);
    } catch (error) {
      console.error('Error fetching conflicts:', error);
      throw error;
    }
  };

  const fetchAvailableUsers = async () => {
    try {
      // Mock user data - replace with actual API call
      const mockUsers = [
        { _id: 'user1', name: 'John Doe', email: 'john@example.com', role: 'employee' },
        { _id: 'user2', name: 'Jane Smith', email: 'jane@example.com', role: 'employee' },
        { _id: 'user3', name: 'Bob Johnson', email: 'bob@example.com', role: 'employee' },
        { _id: 'user4', name: 'Alice Brown', email: 'alice@example.com', role: 'employee' }
      ];
      setAvailableUsers(mockUsers);
    } catch (error) {
      console.error('Error fetching users:', error);
      throw error;
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await fetchProjectData();
      toast.success('Project data refreshed');
    } catch (error) {
      toast.error('Failed to refresh project data');
    } finally {
      setRefreshing(false);
    }
  };

  // Slot management handlers
  const handleSlotUpdate = async (projectId, updates) => {
    try {
      await projectApi.updateProject(projectId, updates);
      await fetchProject();
      toast.success('Project updated successfully');
    } catch (error) {
      console.error('Error updating project:', error);
      throw error;
    }
  };

  const handleSlotCreate = async (slotData) => {
    try {
      // Mock slot creation - replace with actual API call
      console.log('Creating slot:', slotData);
      await fetchSlots();
      toast.success('Slot created successfully');
    } catch (error) {
      console.error('Error creating slot:', error);
      throw error;
    }
  };

  const handleSlotDelete = async (slotId) => {
    try {
      // Mock slot deletion - replace with actual API call
      console.log('Deleting slot:', slotId);
      await fetchSlots();
      toast.success('Slot deleted successfully');
    } catch (error) {
      console.error('Error deleting slot:', error);
      throw error;
    }
  };

  const handleSlotAssign = async (slotId, assignmentData) => {
    try {
      // Mock slot assignment - replace with actual API call
      console.log('Assigning slot:', slotId, assignmentData);
      await fetchSlots();
      toast.success('Slot assigned successfully');
    } catch (error) {
      console.error('Error assigning slot:', error);
      throw error;
    }
  };

  const handleSlotRelease = async (slotId) => {
    try {
      // Mock slot release - replace with actual API call
      console.log('Releasing slot:', slotId);
      await fetchSlots();
      toast.success('Slot released successfully');
    } catch (error) {
      console.error('Error releasing slot:', error);
      throw error;
    }
  };

  const handleSlotComplete = async (slotId) => {
    try {
      // Mock slot completion - replace with actual API call
      console.log('Completing slot:', slotId);
      await fetchSlots();
      toast.success('Slot completed successfully');
    } catch (error) {
      console.error('Error completing slot:', error);
      throw error;
    }
  };

  const handleResolveConflict = async (conflictId, resolution) => {
    try {
      // Mock conflict resolution - replace with actual API call
      console.log('Resolving conflict:', conflictId, resolution);
      await fetchConflicts();
      await fetchSlots();
      toast.success('Conflict resolved successfully');
    } catch (error) {
      console.error('Error resolving conflict:', error);
      throw error;
    }
  };

  // Handle slot reassignment
  const handleSlotReassign = async (slot, newAssigneeId) => {
    if (!slot?.assignedWorkItem?._id) {
      throw new Error("No work item found for this slot");
    }

    try {
      // This would be replaced with actual API call when integrated
      console.log('Reassigning slot:', slot, 'to user:', newAssigneeId);
      await fetchSlots();
      toast.success("Work item reassigned successfully!");
    } catch (error) {
      console.error("Failed to reassign work item:", error);
      throw new Error("Failed to reassign work item");
    }
  };

  if (loading) {
    return (
      <Container fluid className="py-4">
        <div className="text-center">
          <Spinner animation="border" role="status">
            <span className="visually-hidden">Loading...</span>
          </Spinner>
          <p className="mt-2 text-muted">Loading project overview...</p>
        </div>
      </Container>
    );
  }

  if (!project) {
    return (
      <Container fluid className="py-4">
        <Alert variant="danger">
          <h5>Project Not Found</h5>
          <p>The requested project could not be found or you don't have permission to view it.</p>
          <Button variant="primary" onClick={() => navigate('/projects')}>
            Back to Projects
          </Button>
        </Alert>
      </Container>
    );
  }

  return (
    <Container fluid className="py-4">
      {/* Header */}
      <Row className="mb-4">
        <Col>
          <div className="d-flex justify-content-between align-items-center">
            <div>
              <Button
                variant="outline-secondary"
                size="sm"
                onClick={() => navigate('/projects')}
                className="mb-2"
              >
                <FaArrowLeft className="me-2" />
                Back to Projects
              </Button>
              <h2 className="mb-0">{project.name}</h2>
              <p className="text-muted mb-0">Enhanced Project Overview with Slot Management</p>
            </div>
            <div>
              <Button
                variant="outline-primary"
                size="sm"
                onClick={handleRefresh}
                disabled={refreshing}
                className="me-2"
              >
                {refreshing ? (
                  <Spinner size="sm" className="me-2" />
                ) : (
                  <FaSync className="me-2" />
                )}
                Refresh
              </Button>
              {canManage && (
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => navigate(`/projects/${id}/edit`)}
                >
                  <FaCog className="me-2" />
                  Settings
                </Button>
              )}
            </div>
          </div>
        </Col>
      </Row>

      {/* Main Content Tabs */}
      <Tabs activeKey={activeTab} onSelect={(k) => setActiveTab(k)} className="mb-4">
        
        {/* Overview Tab */}
        <Tab eventKey="overview" title="Overview">
          <Row className="g-4">
            <Col lg={8}>
              <SlotProgressDisplay
                project={project}
                slots={slots}
                showDetailed={true}
                onSlotClick={(slot) => console.log('Slot clicked:', slot)}
                onSlotReassign={handleSlotReassign}
                availableUsers={availableUsers}
                realTimeUpdates={true}
              />
            </Col>
            <Col lg={4}>
              <SlotStatisticsCards
                project={project}
                slots={slots}
                realTimeUpdates={true}
                onRefresh={fetchSlots}
              />
            </Col>
          </Row>
        </Tab>

        {/* Management Tab */}
        <Tab eventKey="management" title="Slot Management">
          <SlotManagementInterface
            project={project}
            slots={slots}
            onSlotUpdate={handleSlotUpdate}
            onSlotCreate={handleSlotCreate}
            onSlotDelete={handleSlotDelete}
            onSlotAssign={handleSlotAssign}
            onSlotRelease={handleSlotRelease}
            onSlotComplete={handleSlotComplete}
            isProjectHead={canManage}
            availableUsers={availableUsers}
          />
        </Tab>

        {/* Analytics Tab */}
        <Tab eventKey="analytics" title="Analytics">
          <Row className="g-4">
            <Col lg={12}>
              <ProgressTrendChart
                project={project}
                progressHistory={project?.progressTracking?.progressHistory || []}
                slots={slots}
                showControls={true}
                height={400}
              />
            </Col>
            <Col lg={12}>
              <SlotStatisticsCards
                project={project}
                slots={slots}
                realTimeUpdates={true}
                onRefresh={fetchSlots}
              />
            </Col>
          </Row>
        </Tab>

        {/* Conflicts Tab */}
        <Tab 
          eventKey="conflicts" 
          title={
            <span>
              Conflicts
              {conflicts.length > 0 && (
                <span className="badge bg-danger ms-2">{conflicts.length}</span>
              )}
            </span>
          }
        >
          <SlotConflictResolution
            project={project}
            conflicts={conflicts}
            onResolveConflict={handleResolveConflict}
            onRefreshConflicts={fetchConflicts}
            availableUsers={availableUsers}
            isProjectHead={canManage}
          />
        </Tab>

      </Tabs>

      {/* Project Info Footer */}
      <Row className="mt-4">
        <Col>
          <Card className="bg-light">
            <Card.Body>
              <Row className="g-3">
                <Col md={3}>
                  <div className="small text-muted">Client</div>
                  <div className="fw-semibold">{project.client?.name || 'No client'}</div>
                </Col>
                <Col md={3}>
                  <div className="small text-muted">Project Head</div>
                  <div className="fw-semibold">{project.projectHead?.name || 'Not assigned'}</div>
                </Col>
                <Col md={3}>
                  <div className="small text-muted">Status</div>
                  <div className="fw-semibold">{project.status || 'Unknown'}</div>
                </Col>
                <Col md={3}>
                  <div className="small text-muted">Last Updated</div>
                  <div className="fw-semibold">
                    {project.updatedAt ? new Date(project.updatedAt).toLocaleDateString() : 'Unknown'}
                  </div>
                </Col>
              </Row>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
};

export default EnhancedProjectOverview;