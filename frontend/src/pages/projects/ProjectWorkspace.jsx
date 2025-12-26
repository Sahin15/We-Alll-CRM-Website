import { useState, useEffect } from 'react';
import { Container, Row, Col, Button, Tabs, Tab, Spinner } from 'react-bootstrap';
import { useParams, useNavigate } from 'react-router-dom';
import { FaArrowLeft, FaPlus, FaCheckCircle } from 'react-icons/fa';
import { toast } from 'react-toastify';
import projectApi from '../../api/projectApi';
import OverviewTab from '../../components/projects/workspace/OverviewTab';
import WorkBoardTab from '../../components/projects/workspace/WorkBoardTab';
import CalendarTab from '../../components/projects/workspace/CalendarTab';
import TeamTab from '../../components/projects/workspace/TeamTab';
import SlotProgressDisplay from '../../components/projects/SlotProgressDisplay';
import SlotStatisticsCards from '../../components/projects/SlotStatisticsCards';
import ProfessionalWorkCreationModal from '../../components/work/ProfessionalWorkCreationModal';

/**
 * ProjectWorkspace Component
 * Centralized project management interface with tabs
 * Requirements: 4.1, 4.5
 */
const ProjectWorkspace = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Slot system states
  const [slots, setSlots] = useState([]);
  const [slotStatistics, setSlotStatistics] = useState(null);
  const [loadingSlots, setLoadingSlots] = useState(false);

  useEffect(() => {
    loadProject();
  }, [id]);

  useEffect(() => {
    // Fetch slot data when project is loaded and uses slot system
    if (project && project.slotConfiguration?.enableSlotSystem) {
      fetchSlotData();
    }
  }, [project]);

  const loadProject = async () => {
    try {
      setLoading(true);
      const response = await projectApi.getProjectById(id);
      const projectData = response.data || response.project || response;
      setProject(projectData);
    } catch (error) {
      console.error('Error loading project:', error);
      toast.error('Failed to load project');
    } finally {
      setLoading(false);
    }
  };

  const fetchSlotData = async () => {
    if (!project?._id) return;
    
    setLoadingSlots(true);
    try {
      // Fetch slot statistics
      const statsResponse = await projectApi.getProjectSlotStatistics(project._id);
      if (statsResponse.success) {
        setSlotStatistics(statsResponse.data);
      }

      // Fetch available slots
      const slotsResponse = await projectApi.getAvailableSlots(project._id);
      if (slotsResponse.success) {
        setSlots(slotsResponse.data?.slots || []);
      }
    } catch (error) {
      console.error("Error fetching slot data:", error);
      // Don't show error toast as slot system is optional
    } finally {
      setLoadingSlots(false);
    }
  };

  const handleRefreshSlotData = async () => {
    await fetchSlotData();
  };

  if (loading) {
    return (
      <Container fluid className="text-center py-5">
        <Spinner animation="border" variant="primary" />
        <p className="mt-3 text-muted">Loading project...</p>
      </Container>
    );
  }

  if (!project) {
    return (
      <Container fluid>
        <div className="text-center py-5">
          <p className="text-muted">Project not found</p>
          <Button variant="primary" onClick={() => navigate('/projects')}>
            Back to Projects
          </Button>
        </div>
      </Container>
    );
  }

  return (
    <Container fluid className="px-4 py-3">
      {/* Enhanced Header */}
      <div className="mb-4">
        {/* Back Button */}
        <Button
          variant="outline-secondary"
          size="sm"
          onClick={() => navigate('/projects')}
          className="mb-3 d-inline-flex align-items-center"
          style={{
            borderRadius: '8px',
            padding: '6px 12px',
            fontWeight: '500'
          }}
        >
          <FaArrowLeft className="me-2" style={{ fontSize: '14px' }} />
          Back to Projects
        </Button>

        {/* Project Header Card */}
        <div 
          className="bg-white rounded-3 shadow-sm p-4 mb-3"
          style={{ border: '1px solid #e9ecef' }}
        >
          <Row className="align-items-center">
            <Col>
              <div className="d-flex align-items-center mb-2">
                <h2 className="mb-0 me-3" style={{ fontWeight: '600', color: '#2c3e50' }}>
                  {project.name}
                </h2>
                {project.status && (
                  <span 
                    className={`badge bg-${
                      project.status === 'Active' ? 'success' :
                      project.status === 'On Hold' ? 'warning' :
                      project.status === 'Completed' ? 'info' : 'secondary'
                    }`}
                    style={{ 
                      fontSize: '0.85rem',
                      padding: '6px 12px',
                      borderRadius: '6px'
                    }}
                  >
                    {project.status}
                  </span>
                )}
              </div>
              {project.client && (
                <p className="text-muted mb-0 d-flex align-items-center" style={{ fontSize: '0.95rem' }}>
                  <span className="me-2">📋</span>
                  <strong className="me-2">Client:</strong> {project.client.name}
                </p>
              )}
              {project.description && (
                <p className="text-muted mb-0 mt-2" style={{ fontSize: '0.9rem' }}>
                  {project.description}
                </p>
              )}
              {project.createdBy && (
                <div className="mt-3 pt-3 border-top">
                  <small className="text-muted d-flex align-items-center">
                    <span className="me-2">👤</span>
                    <strong className="me-2">Created by:</strong> {project.createdBy.name}
                    {project.createdAt && (
                      <span className="ms-3">
                        <span className="me-2">📅</span>
                        <strong className="me-2">on</strong> {new Date(project.createdAt).toLocaleDateString('en-US', { 
                          year: 'numeric', 
                          month: 'long', 
                          day: 'numeric' 
                        })}
                      </span>
                    )}
                  </small>
                </div>
              )}
            </Col>
            <Col xs="auto">
              <Button
                variant="primary"
                onClick={() => setShowCreateModal(true)}
                className="d-flex align-items-center shadow-sm"
                style={{
                  borderRadius: '8px',
                  padding: '10px 20px',
                  fontWeight: '500',
                  fontSize: '0.95rem'
                }}
              >
                <FaPlus className="me-2" />
                Create Work Item
              </Button>
            </Col>
          </Row>
        </div>
      </div>

      {/* Enhanced Tabs */}
      <Tabs
        activeKey={activeTab}
        onSelect={(k) => setActiveTab(k)}
        className="mb-4 border-0"
        style={{
          borderBottom: '2px solid #e9ecef'
        }}
      >
        <Tab 
          eventKey="overview" 
          title={
            <span style={{ fontWeight: activeTab === 'overview' ? '600' : '500' }}>
              📊 Overview
            </span>
          }
        >
          <OverviewTab project={project} onRefresh={loadProject} />
        </Tab>
        <Tab 
          eventKey="workboard" 
          title={
            <span style={{ fontWeight: activeTab === 'workboard' ? '600' : '500' }}>
              📋 Work Board
            </span>
          }
        >
          <WorkBoardTab project={project} onRefresh={loadProject} />
        </Tab>
        <Tab 
          eventKey="calendar" 
          title={
            <span style={{ fontWeight: activeTab === 'calendar' ? '600' : '500' }}>
              📅 Calendar
            </span>
          }
        >
          <CalendarTab project={project} onRefresh={loadProject} />
        </Tab>
        <Tab 
          eventKey="team" 
          title={
            <span style={{ fontWeight: activeTab === 'team' ? '600' : '500' }}>
              👥 Team
            </span>
          }
        >
          <TeamTab project={project} onRefresh={loadProject} />
        </Tab>

        {/* Slots Tab - Only show if slot system is enabled */}
        {project?.slotConfiguration?.enableSlotSystem && (
          <Tab 
            eventKey="slots" 
            title={
              <span style={{ fontWeight: activeTab === 'slots' ? '600' : '500' }}>
                <FaCheckCircle className="me-2" />
                Slots ({slotStatistics?.totalSlots || 0})
              </span>
            }
          >
            <Row className="g-4">
              <Col lg={12}>
                {/* Slot Statistics Cards */}
                <SlotStatisticsCards
                  project={project}
                  slots={slots}
                  realTimeUpdates={true}
                  onRefresh={handleRefreshSlotData}
                />
              </Col>
              
              <Col lg={12}>
                {/* Slot Progress Display */}
                <SlotProgressDisplay
                  project={project}
                  slots={slots}
                  showDetailed={true}
                  onSlotClick={(slot) => {
                    // Handle slot click - could navigate to slot details
                    // console.log('Slot clicked:', slot);
                  }}
                  realTimeUpdates={true}
                />
              </Col>
            </Row>
          </Tab>
        )}
      </Tabs>

      {/* Professional Work Creation Modal */}
      <ProfessionalWorkCreationModal
        show={showCreateModal}
        onHide={() => setShowCreateModal(false)}
        onSuccess={loadProject}
        defaultProject={project._id}
        mode="work-item"
      />
    </Container>
  );
};

export default ProjectWorkspace;
