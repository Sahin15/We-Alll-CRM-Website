import { useState, useEffect, useMemo } from "react";
import {
  Container,
  Row,
  Col,
  Card,
  Button,
  Badge,
  InputGroup,
  ProgressBar,
} from "react-bootstrap";
import {
  FaPlus,
  FaEdit,
  FaTrash,
  FaEye,
  FaSearch,
  FaFilter,
  FaTh,
  FaList,
  FaUsers,
  FaCalendar,
  FaCheckCircle,
  FaClock,
  FaExclamationTriangle,
} from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { useAuth } from "../../context/AuthContext";
import { projectApi } from "../../api/projectApi";
import { clientApi } from "../../api/clientApi";
import { formatDate, getStatusVariant } from "../../utils/helpers";
import SimplifiedProjectModal from "../../components/projects/SimplifiedProjectModal";

const ProjectList = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  
  // Data states
  const [projects, setProjects] = useState([]);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // UI states
  const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'list'
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterClient, setFilterClient] = useState('all');
  const [sortBy, setSortBy] = useState('recent'); // 'recent', 'name', 'progress', 'dueDate'
  
  // Modal states
  const [showModal, setShowModal] = useState(false);
  const [currentProject, setCurrentProject] = useState(null);

  useEffect(() => {
    fetchProjects();
    fetchClients();
  }, []);

  const fetchProjects = async () => {
    try {
      setLoading(true);
      
      // Use appropriate API method based on user role
      let response;
      if (['admin', 'superadmin', 'hr', 'manager'].includes(user?.role)) {
        // Admin roles can see all projects
        response = await projectApi.getAllProjects();
      } else if (user?.role === 'hod') {
        // HoD sees their department's projects
        response = await projectApi.getMyDepartmentProjects();
      } else {
        // Regular employees see only their assigned projects
        response = await projectApi.getMyProjects();
      }
      
      // console.log('📊 Projects API Response:', response);
      
      // Handle both old and new response formats
      if (response.data && Array.isArray(response.data)) {
        // New paginated format
        // console.log('📊 First project sample:', response.data[0]);
        // console.log('📊 assignedUsers:', response.data[0]?.assignedUsers);
        setProjects(response.data);
      } else if (Array.isArray(response)) {
        // Old format
        // console.log('📊 First project sample:', response[0]);
        // console.log('📊 assignedUsers:', response[0]?.assignedUsers);
        setProjects(response);
      } else {
        setProjects([]);
      }
    } catch (error) {
      console.error("Project fetch error:", error);
      if (error.response?.status === 403) {
        toast.info("You can only view projects you are assigned to");
      } else {
        toast.error("Failed to fetch projects");
      }
      setProjects([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchClients = async () => {
    // Only fetch clients if user has permission (not employee role)
    if (user?.role === 'employee') {
      setClients([]);
      return;
    }
    
    try {
      const response = await clientApi.getAllClients();
      
      // Handle both old and new response formats
      if (response.data && Array.isArray(response.data)) {
        // New paginated format
        setClients(response.data);
      } else if (Array.isArray(response)) {
        // Old format
        setClients(response);
      } else {
        setClients([]);
      }
    } catch (error) {
      console.error("Failed to fetch clients:", error);
      // Only show error if it's not a permission issue (403)
      if (error.response?.status !== 403) {
        toast.error("Failed to load clients");
      }
      setClients([]);
    }
  };

  const handleShowModal = (project = null) => {
    setCurrentProject(project);
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setCurrentProject(null);
  };

  const handleDelete = async (id) => {
    if (window.confirm("Are you sure you want to delete this project?")) {
      try {
        await projectApi.deleteProject(id);
        toast.success("Project deleted successfully");
        fetchProjects();
      } catch (error) {
        toast.error("Failed to delete project");
      }
    }
  };

  // Calculate project statistics
  const stats = useMemo(() => {
    const total = projects.length;
    const active = projects.filter(p => p.status === 'In Progress' || p.status === 'Active').length;
    const completed = projects.filter(p => p.status === 'Completed').length;
    const onHold = projects.filter(p => p.status === 'On Hold').length;
    
    // Calculate overdue projects
    const today = new Date();
    const overdue = projects.filter(p => {
      if (!p.endDate || p.status === 'Completed') return false;
      return new Date(p.endDate) < today;
    }).length;

    return { total, active, completed, onHold, overdue };
  }, [projects]);

  // Filter and sort projects
  const filteredProjects = useMemo(() => {
    let filtered = [...projects];

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(p =>
        p.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.client?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.description?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Status filter
    if (filterStatus !== 'all') {
      filtered = filtered.filter(p => p.status === filterStatus);
    }

    // Client filter
    if (filterClient !== 'all') {
      filtered = filtered.filter(p => p.client?._id === filterClient);
    }

    // Sort
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name);
        case 'progress':
          return (b.progress || 0) - (a.progress || 0);
        case 'dueDate':
          if (!a.endDate) return 1;
          if (!b.endDate) return -1;
          return new Date(a.endDate) - new Date(b.endDate);
        case 'recent':
        default:
          return new Date(b.createdAt || b.startDate) - new Date(a.createdAt || a.startDate);
      }
    });

    return filtered;
  }, [projects, searchTerm, filterStatus, filterClient, sortBy]);

  const clearFilters = () => {
    setSearchTerm('');
    setFilterStatus('all');
    setFilterClient('all');
    setSortBy('recent');
  };

  const getProjectProgress = (project) => {
    // Calculate progress based on tasks/slots if available
    return project.progress || 0;
  };

  const getProjectStatusColor = (status) => {
    switch (status) {
      case 'Active':
      case 'In Progress':
        return 'primary';
      case 'Completed':
        return 'success';
      case 'On Hold':
        return 'warning';
      case 'Cancelled':
        return 'danger';
      default:
        return 'secondary';
    }
  };

  const isProjectOverdue = (project) => {
    if (!project.endDate || project.status === 'Completed') return false;
    return new Date(project.endDate) < new Date();
  };

  const getDaysRemaining = (endDate) => {
    if (!endDate) return null;
    const today = new Date();
    const end = new Date(endDate);
    const diffTime = end - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };



  return (
    <Container fluid>
      {/* Header */}
      <Row className="mb-4">
        <Col>
          <h2 className="mb-1">
            {user?.role === 'employee' ? 'My Projects' : 'Project Management'}
          </h2>
          <p className="text-muted">
            {user?.role === 'employee' 
              ? 'Projects you are assigned to' 
              : 'Manage and track all your projects'}
          </p>
        </Col>
        {['admin', 'superadmin', 'hr', 'manager'].includes(user?.role) && (
          <Col xs="auto" className="d-flex align-items-center">
            <Button variant="primary" onClick={() => handleShowModal()} size="lg">
              <FaPlus className="me-2" />
              New Project
            </Button>
          </Col>
        )}
      </Row>

      {/* Statistics Cards */}
      <Row className="g-3 mb-4">
        <Col lg={2} md={4} sm={6}>
          <Card 
            className={`border-0 shadow-sm h-100 ${filterStatus === 'all' ? 'border-primary border-2' : ''}`}
            style={{ cursor: 'pointer', transition: 'all 0.2s' }}
            onClick={() => {
              setFilterStatus('all');
              setFilterClient('all');
            }}
            onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
            onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
          >
            <Card.Body className="text-center py-3">
              <div className="mb-2">
                <FaTh style={{ fontSize: '2rem', color: '#6c757d' }} />
              </div>
              <h3 className="mb-1 fw-bold">{stats.total}</h3>
              <small className="text-muted">Total Projects</small>
            </Card.Body>
          </Card>
        </Col>
        <Col lg={2} md={4} sm={6}>
          <Card 
            className={`border-0 shadow-sm h-100 ${filterStatus === 'In Progress' ? 'border-primary border-3' : ''}`}
            style={{ borderLeft: '4px solid #0d6efd', cursor: 'pointer', transition: 'all 0.2s' }}
            onClick={() => setFilterStatus('In Progress')}
            onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
            onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
          >
            <Card.Body className="text-center py-3">
              <div className="mb-2">
                <FaClock style={{ fontSize: '2rem', color: '#0d6efd' }} />
              </div>
              <h3 className="mb-1 fw-bold text-primary">{stats.active}</h3>
              <small className="text-muted">Active</small>
            </Card.Body>
          </Card>
        </Col>
        <Col lg={2} md={4} sm={6}>
          <Card 
            className={`border-0 shadow-sm h-100 ${filterStatus === 'Completed' ? 'border-success border-3' : ''}`}
            style={{ borderLeft: '4px solid #198754', cursor: 'pointer', transition: 'all 0.2s' }}
            onClick={() => setFilterStatus('Completed')}
            onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
            onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
          >
            <Card.Body className="text-center py-3">
              <div className="mb-2">
                <FaCheckCircle style={{ fontSize: '2rem', color: '#198754' }} />
              </div>
              <h3 className="mb-1 fw-bold text-success">{stats.completed}</h3>
              <small className="text-muted">Completed</small>
            </Card.Body>
          </Card>
        </Col>
        <Col lg={2} md={4} sm={6}>
          <Card 
            className={`border-0 shadow-sm h-100 ${filterStatus === 'On Hold' ? 'border-warning border-3' : ''}`}
            style={{ borderLeft: '4px solid #ffc107', cursor: 'pointer', transition: 'all 0.2s' }}
            onClick={() => setFilterStatus('On Hold')}
            onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
            onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
          >
            <Card.Body className="text-center py-3">
              <div className="mb-2">
                <FaExclamationTriangle style={{ fontSize: '2rem', color: '#ffc107' }} />
              </div>
              <h3 className="mb-1 fw-bold text-warning">{stats.onHold}</h3>
              <small className="text-muted">On Hold</small>
            </Card.Body>
          </Card>
        </Col>
        <Col lg={2} md={4} sm={6}>
          <Card 
            className="border-0 shadow-sm h-100"
            style={{ borderLeft: '4px solid #dc3545', cursor: 'pointer', transition: 'all 0.2s' }}
            onClick={() => {
              // Filter to show overdue projects
              setFilterStatus('all');
              toast.info('Showing overdue projects');
            }}
            onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
            onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
          >
            <Card.Body className="text-center py-3">
              <div className="mb-2">
                <FaCalendar style={{ fontSize: '2rem', color: '#dc3545' }} />
              </div>
              <h3 className="mb-1 fw-bold text-danger">{stats.overdue}</h3>
              <small className="text-muted">Overdue</small>
            </Card.Body>
          </Card>
        </Col>
        <Col lg={2} md={4} sm={6}>
          <Card 
            className="border-0 shadow-sm h-100"
            style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', cursor: 'default' }}
          >
            <Card.Body className="text-center py-3 text-white">
              <div className="mb-2">
                <FaUsers style={{ fontSize: '2rem' }} />
              </div>
              <h3 className="mb-1 fw-bold">
                {projects.reduce((sum, p) => {
                  const assignedCount = p.assignedUsers?.length || 0;
                  const projectHeadId = p.projectHead?._id || p.projectHead;
                  const isProjectHeadInTeam = projectHeadId && p.assignedUsers?.some(
                    user => (user._id || user) === projectHeadId
                  );
                  return sum + assignedCount + (projectHeadId && !isProjectHeadInTeam ? 1 : 0);
                }, 0)}
              </h3>
              <small>Team Members</small>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Active Filter Indicator */}
      {filterStatus !== 'all' && (
        <div className="alert alert-info d-flex justify-content-between align-items-center mb-3">
          <div>
            <strong>Filter Active:</strong> Showing {filterStatus} projects
          </div>
          <Button variant="outline-info" size="sm" onClick={() => setFilterStatus('all')}>
            Clear Filter
          </Button>
        </div>
      )}

      {/* Search and Filters */}
      <Card className="mb-4 border-0 shadow-sm">
        <Card.Body>
          <Row className="g-3">
            <Col md={4}>
              <InputGroup>
                <InputGroup.Text>
                  <FaSearch />
                </InputGroup.Text>
                <Form.Control
                  type="text"
                  placeholder="Search projects..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </InputGroup>
            </Col>
            <Col md={2}>
              <Form.Select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
                <option value="all">All Status</option>
                <option value="Active">Active</option>
                <option value="In Progress">In Progress</option>
                <option value="Completed">Completed</option>
                <option value="On Hold">On Hold</option>
              </Form.Select>
            </Col>
            <Col md={2}>
              <Form.Select value={filterClient} onChange={(e) => setFilterClient(e.target.value)}>
                <option value="all">All Clients</option>
                {clients.map(client => (
                  <option key={client._id} value={client._id}>{client.name}</option>
                ))}
              </Form.Select>
            </Col>
            <Col md={2}>
              <Form.Select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
                <option value="recent">Most Recent</option>
                <option value="name">Name (A-Z)</option>
                <option value="progress">Progress</option>
                <option value="dueDate">Due Date</option>
              </Form.Select>
            </Col>
            <Col md={2} className="d-flex gap-2">
              <Button 
                variant={viewMode === 'grid' ? 'primary' : 'outline-secondary'}
                onClick={() => setViewMode('grid')}
                className="flex-grow-1"
              >
                <FaTh />
              </Button>
              <Button 
                variant={viewMode === 'list' ? 'primary' : 'outline-secondary'}
                onClick={() => setViewMode('list')}
                className="flex-grow-1"
              >
                <FaList />
              </Button>
            </Col>
          </Row>
          {(searchTerm || filterStatus !== 'all' || filterClient !== 'all') && (
            <Row className="mt-3">
              <Col>
                <Button variant="outline-secondary" size="sm" onClick={clearFilters}>
                  <FaFilter className="me-2" />
                  Clear Filters
                </Button>
                <span className="ms-3 text-muted">
                  Showing {filteredProjects.length} of {projects.length} projects
                </span>
              </Col>
            </Row>
          )}
        </Card.Body>
      </Card>

      {/* Projects Display */}
      {loading ? (
        <div className="text-center py-5">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
          <p className="mt-3 text-muted">Loading projects...</p>
        </div>
      ) : filteredProjects.length === 0 ? (
        <Card className="border-0 shadow-sm">
          <Card.Body className="text-center py-5">
            <FaTh style={{ fontSize: '4rem', color: '#dee2e6' }} className="mb-3" />
            <h5 className="text-muted">No projects found</h5>
            <p className="text-muted">
              {searchTerm || filterStatus !== 'all' || filterClient !== 'all'
                ? 'Try adjusting your filters'
                : 'Create your first project to get started'}
            </p>
            {['admin', 'superadmin', 'hr', 'manager'].includes(user?.role) && (
              <Button variant="primary" onClick={() => handleShowModal()} className="mt-2">
                <FaPlus className="me-2" />
                Create Project
              </Button>
            )}
          </Card.Body>
        </Card>
      ) : viewMode === 'grid' ? (
        <Row className="g-4">
          {filteredProjects.map((project) => {
            const progress = getProjectProgress(project);
            const daysLeft = getDaysRemaining(project.endDate);
            const overdue = isProjectOverdue(project);
            
            return (
              <Col key={project._id} lg={4} md={6}>
                <Card 
                  className="h-100 border-0 shadow-sm" 
                  style={{ 
                    transition: 'transform 0.2s, box-shadow 0.2s',
                    cursor: 'pointer'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-4px)';
                    e.currentTarget.style.boxShadow = '0 8px 16px rgba(0,0,0,0.1)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = '';
                  }}
                  onClick={() => navigate(`/projects/${project._id}`)}
                >
                  <Card.Body>
                    <div className="d-flex justify-content-between align-items-start mb-3">
                      <div className="flex-grow-1">
                        <h5 className="mb-1">
                          {project.name}
                          {project.name.includes(' Project') && project.client && (
                            <Badge bg="info" className="ms-2" style={{ fontSize: '0.7rem' }}>
                              Auto-created
                            </Badge>
                          )}
                        </h5>
                        <small className="text-muted">
                          {project.client?.name || 'No client'}
                        </small>
                      </div>
                      <Badge bg={getProjectStatusColor(project.status)}>
                        {project.status}
                      </Badge>
                    </div>

                    {project.description && (
                      <p className="text-muted small mb-3" style={{ 
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical'
                      }}>
                        {project.description}
                      </p>
                    )}

                    <div className="mb-3">
                      <div className="d-flex justify-content-between mb-1">
                        <small className="text-muted">Progress</small>
                        <small className="fw-bold">{progress}%</small>
                      </div>
                      <ProgressBar 
                        now={progress} 
                        variant={progress === 100 ? 'success' : progress > 50 ? 'primary' : 'warning'}
                        style={{ height: '8px' }}
                      />
                    </div>

                    <Row className="g-2 mb-3">
                      <Col xs={4}>
                        <div className="text-center p-2 bg-light rounded">
                          <FaUsers className="text-primary mb-1" />
                          <div className="fw-bold">
                            {(() => {
                              // Count assigned users
                              const assignedCount = project.assignedUsers?.length || 0;
                              
                              // Check if project head is already in assigned users
                              const projectHeadId = project.projectHead?._id || project.projectHead;
                              const isProjectHeadInTeam = projectHeadId && project.assignedUsers?.some(
                                user => (user._id || user) === projectHeadId
                              );
                              
                              // Add 1 if project head exists and is not in assigned users
                              const totalCount = assignedCount + (projectHeadId && !isProjectHeadInTeam ? 1 : 0);
                              
                              return totalCount;
                            })()}
                          </div>
                          <small className="text-muted">Members</small>
                        </div>
                      </Col>
                      <Col xs={4}>
                        <div className="text-center p-2 bg-light rounded">
                          <FaTasks className="text-info mb-1" />
                          <div className="fw-bold">{project.workItemStats?.total || 0}</div>
                          <small className="text-muted">Items</small>
                        </div>
                      </Col>
                      <Col xs={4}>
                        <div className="text-center p-2 bg-light rounded">
                          <FaCheckCircle className="text-success mb-1" />
                          <div className="fw-bold">{project.workItemStats?.done || 0}</div>
                          <small className="text-muted">Done</small>
                        </div>
                      </Col>
                    </Row>

                    {project.endDate && (
                      <div className="mb-3 text-center">
                        <small className="text-muted d-block">Due Date</small>
                        <div className="mt-1">
                          <small className={overdue ? 'text-danger fw-bold' : 'fw-bold'}>
                            {daysLeft !== null && daysLeft >= 0 ? `${daysLeft}d left` : 'Overdue'}
                          </small>
                          {' • '}
                          <small className="text-muted">{formatDate(project.endDate)}</small>
                        </div>
                      </div>
                    )}

                    <div className="d-flex gap-2">
                      {['admin', 'superadmin', 'hr', 'manager'].includes(user?.role) && (
                        <Button
                          variant="outline-primary"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleShowModal(project);
                          }}
                          title="Edit Project"
                        >
                          <FaEdit />
                        </Button>
                      )}
                      {(user?.role === 'admin' || user?.role === 'superadmin') && (
                        <Button
                          variant="outline-danger"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(project._id);
                          }}
                          title="Delete Project"
                        >
                          <FaTrash />
                        </Button>
                      )}
                      <Button
                        variant="primary"
                        size="sm"
                        className="flex-grow-1"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/projects/${project._id}`);
                        }}
                      >
                        <FaEye className="me-1" />
                        View Details
                      </Button>
                    </div>
                  </Card.Body>
                </Card>
              </Col>
            );
          })}
        </Row>
      ) : (
        <Card className="border-0 shadow-sm">
          <Card.Body className="p-0">
            <div className="table-responsive">
              <table className="table table-hover mb-0">
                <thead className="table-light">
                  <tr>
                    <th style={{ width: '25%' }}>Project</th>
                    <th style={{ width: '12%' }}>Client</th>
                    <th style={{ width: '12%' }}>Progress</th>
                    <th style={{ width: '8%' }}>Members</th>
                    <th style={{ width: '8%' }}>Items</th>
                    <th style={{ width: '8%' }}>Done</th>
                    <th style={{ width: '12%' }}>Due Date</th>
                    <th style={{ width: '10%' }}>Status</th>
                    <th style={{ width: '5%' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredProjects.map((project) => {
                    const progress = getProjectProgress(project);
                    const overdue = isProjectOverdue(project);
                    
                    return (
                      <tr key={project._id}>
                        <td>
                          <div className="fw-bold">
                            {project.name}
                            {project.name.includes(' Project') && project.client && (
                              <Badge bg="info" className="ms-2" style={{ fontSize: '0.7rem' }}>
                                Auto-created
                              </Badge>
                            )}
                          </div>
                          {project.description && (
                            <small className="text-muted">{project.description.substring(0, 50)}...</small>
                          )}
                        </td>
                        <td>{project.client?.name || 'N/A'}</td>
                        <td>
                          <ProgressBar 
                            now={progress} 
                            label={`${progress}%`}
                            variant={progress === 100 ? 'success' : progress > 50 ? 'primary' : 'warning'}
                            style={{ height: '20px' }}
                          />
                        </td>
                        <td className="text-center">
                          {(() => {
                            const assignedCount = project.assignedUsers?.length || 0;
                            const projectHeadId = project.projectHead?._id || project.projectHead;
                            const isProjectHeadInTeam = projectHeadId && project.assignedUsers?.some(
                              user => (user._id || user) === projectHeadId
                            );
                            return assignedCount + (projectHeadId && !isProjectHeadInTeam ? 1 : 0);
                          })()}
                        </td>
                        <td className="text-center">
                          {project.workItemStats?.total || 0}
                        </td>
                        <td className="text-center">
                          <Badge bg="success">{project.workItemStats?.done || 0}</Badge>
                        </td>
                        <td>
                          {project.endDate ? (
                            <span className={overdue ? 'text-danger' : ''}>
                              {formatDate(project.endDate)}
                            </span>
                          ) : (
                            'Ongoing'
                          )}
                        </td>
                        <td>
                          <Badge bg={getProjectStatusColor(project.status)}>
                            {project.status}
                          </Badge>
                        </td>
                        <td>
                          <div className="btn-group">
                            <Button
                              size="sm"
                              variant="outline-primary"
                              onClick={() => navigate(`/projects/${project._id}`)}
                              title="View Details"
                            >
                              <FaEye />
                            </Button>
                            {['admin', 'superadmin', 'hr', 'manager'].includes(user?.role) && (
                              <Button
                                size="sm"
                                variant="outline-secondary"
                                onClick={() => handleShowModal(project)}
                                title="Edit Project"
                              >
                                <FaEdit />
                              </Button>
                            )}
                            {(user?.role === 'admin' || user?.role === 'superadmin') && (
                              <Button
                                size="sm"
                                variant="outline-danger"
                                onClick={() => handleDelete(project._id)}
                                title="Delete Project"
                              >
                                <FaTrash />
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card.Body>
        </Card>
      )}

      {/* Simplified Project Modal */}
      <SimplifiedProjectModal
        show={showModal}
        onHide={handleCloseModal}
        onSuccess={fetchProjects}
        project={currentProject}
      />
    </Container>
  );
};

export default ProjectList;
