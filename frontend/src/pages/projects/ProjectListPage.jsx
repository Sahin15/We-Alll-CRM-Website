import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Container, Row, Col, Card, Button, ButtonGroup, Badge } from 'react-bootstrap';
import { FaPlus, FaTh, FaList, FaEye, FaEdit, FaTrash } from 'react-icons/fa';
import { toast } from 'react-toastify';
import { useAuth } from '../../context/AuthContext';
import { PAGE_ACCESS, checkPageAccess } from '../../constants/pageAccess';
import projectApi from '../../api/projectApi';
import clientApi from '../../api/clientApi';
import { departmentApi } from '../../api/departmentApi';
import ProjectCard from '../../components/projects/ProjectCard';
import ProjectFilters from '../../components/projects/ProjectFilters';
import ProjectSearch from '../../components/projects/ProjectSearch';
import SimplifiedProjectModal from '../../components/projects/SimplifiedProjectModal';

/**
 * ProjectListPage Component
 * Main page for viewing and managing all projects
 * Requirements: 8.3
 * Performance optimizations:
 * - Parallel API calls with Promise.all
 * - Memoized filtering and sorting
 * - Lazy rendering with pagination
 * - Cached data to avoid unnecessary reloads
 */
const ProjectListPage = () => {
  const { user, canAccess } = useAuth();
  const canViewAllProjects = canAccess(
    PAGE_ACCESS.projectManage.permission,
    ['admin', 'superadmin', 'hr', 'manager']
  );
  const canFilterProjectsAdmin = checkPageAccess(canAccess, PAGE_ACCESS.projectFilterAdmin);
  const canManageProjects = checkPageAccess(canAccess, PAGE_ACCESS.projectManage);
  const isPlatformAdmin = checkPageAccess(canAccess, PAGE_ACCESS.platformAdmin);
  const [projects, setProjects] = useState([]);
  const [clients, setClients] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({
    status: 'all',
    client: 'all',
    department: 'all',
    serviceCompany: 'all'
  });
  const [viewMode, setViewMode] = useState('grid');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingProject, setEditingProject] = useState(null);
  const [displayLimit, setDisplayLimit] = useState(50); // Pagination: show 50 projects at a time
  const dataLoadedRef = useRef(false); // Prevent duplicate loads

  useEffect(() => {
    // Only load data once per user change
    if (!dataLoadedRef.current) {
      loadData();
      dataLoadedRef.current = true;
    }
  }, [user?.id]);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      
      // Parallel API calls for better performance
      const projectsPromise = getProjectsByRole();
      const clientsPromise = canFilterProjectsAdmin
        ? clientApi.getAllClients()
        : Promise.resolve({ data: [], clients: [] });
      const departmentsPromise = canFilterProjectsAdmin
        ? departmentApi.getAllDepartments()
        : Promise.resolve({ data: [], departments: [] });

      const [projectsRes, clientsRes, deptsRes] = await Promise.all([
        projectsPromise,
        clientsPromise,
        departmentsPromise
      ]);

      // Handle different response formats
      const projectsData = projectsRes.data || projectsRes.projects || projectsRes || [];
      setProjects(Array.isArray(projectsData) ? projectsData : []);
      setClients(clientsRes.data || clientsRes.clients || []);
      setDepartments(deptsRes.data || deptsRes.departments || []);
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Failed to load projects');
      setProjects([]);
      setClients([]);
      setDepartments([]);
    } finally {
      setLoading(false);
    }
  }, [user?.role]);

  const getProjectsByRole = useCallback(async () => {
    if (canViewAllProjects) {
      return projectApi.getAllProjects();
    } else if (user?.role === 'hod') {
      const [deptProjectsRes, myProjectsRes] = await Promise.allSettled([
        projectApi.getMyDepartmentProjects(),
        projectApi.getMyProjects()
      ]);

      const deptProjects = deptProjectsRes.status === 'fulfilled'
        ? (deptProjectsRes.value?.data || deptProjectsRes.value?.projects || deptProjectsRes.value || [])
        : [];
      const myProjects = myProjectsRes.status === 'fulfilled'
        ? (myProjectsRes.value?.data || myProjectsRes.value?.projects || myProjectsRes.value || [])
        : [];

      // Merge and deduplicate by _id
      const merged = [...deptProjects, ...myProjects];
      const seen = new Set();
      return merged.filter(p => {
        if (!p?._id || seen.has(p._id.toString())) return false;
        seen.add(p._id.toString());
        return true;
      });
    } else {
      return projectApi.getMyProjects();
    }
  }, [user?.role]);

  const handleEdit = useCallback((project) => {
    setEditingProject(project);
    setShowEditModal(true);
  }, []);

  const handleEditSuccess = useCallback(() => {
    setShowEditModal(false);
    setEditingProject(null);
    dataLoadedRef.current = false; // Reset flag to allow reload
    loadData();
  }, [loadData]);

  const handleDelete = useCallback(async (project) => {
    if (window.confirm(`Are you sure you want to delete the project "${project.name}"? This action cannot be undone.`)) {
      try {
        await projectApi.deleteProject(project._id);
        toast.success('Project deleted successfully');
        dataLoadedRef.current = false; // Reset flag to allow reload
        loadData();
      } catch (error) {
        console.error('Error deleting project:', error);
        toast.error(error.response?.data?.message || 'Failed to delete project');
      }
    }
  }, [loadData]);

  // Memoized helper function to check if a project is auto-generated and incomplete
  const isAutoGeneratedIncomplete = useCallback((project) => {
    if (!project || !project.name) return false;
    const isAutoGenerated = project.name.includes(' Project') && project.client;
    if (!isAutoGenerated) return false;
    const hasMinimalDescription = !project.description || 
      project.description === `Project for ${project.client?.name}` ||
      project.description === `Project for ${project.client?.name} (${project.client?.company})` ||
      project.description.length < 20;
    return hasMinimalDescription && (!project.services || project.services.length === 0);
  }, []);

  // Optimized filtering and sorting with single pass
  const { incompleteAutoProjects, regularProjects } = useMemo(() => {
    let filtered = projects;

    // Apply all filters in a single pass
    if (searchTerm || Object.values(filters).some(f => f !== 'all')) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(project => {
        // Search filter
        if (searchTerm && !project.name?.toLowerCase().includes(term) &&
            !project.description?.toLowerCase().includes(term) &&
            !project.client?.name?.toLowerCase().includes(term)) {
          return false;
        }
        // Status filter
        if (filters.status !== 'all' && project.status !== filters.status) return false;
        // Client filter
        if (filters.client !== 'all' && project.client?._id !== filters.client) return false;
        // Department filter
        if (filters.department !== 'all' && project.department?._id !== filters.department) return false;
        // Service Company filter
        if (filters.serviceCompany !== 'all' && project.client?.serviceCompany !== filters.serviceCompany) return false;
        return true;
      });
    }

    // Separate and sort in one pass
    const incompleteAuto = [];
    const regular = [];
    const statusPriority = { 'Active': 1, 'On Hold': 2, 'Pending': 3, 'Cancelled': 4 };

    filtered.forEach(project => {
      if (isAutoGeneratedIncomplete(project)) {
        incompleteAuto.push(project);
      } else {
        regular.push(project);
      }
    });

    // Sort both arrays
    incompleteAuto.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    regular.sort((a, b) => {
      const statusDiff = (statusPriority[a.status] || 999) - (statusPriority[b.status] || 999);
      return statusDiff !== 0 ? statusDiff : (a.name || '').localeCompare(b.name || '');
    });

    return { incompleteAutoProjects: incompleteAuto, regularProjects: regular };
  }, [projects, searchTerm, filters, isAutoGeneratedIncomplete]);

  // Combined filtered projects for count display
  const filteredProjects = useMemo(() => [...incompleteAutoProjects, ...regularProjects], 
    [incompleteAutoProjects, regularProjects]);

  // Paginated display
  const displayedIncompleteProjects = useMemo(() => 
    incompleteAutoProjects.slice(0, displayLimit),
    [incompleteAutoProjects, displayLimit]
  );

  const displayedRegularProjects = useMemo(() => {
    const incompleteCount = Math.min(incompleteAutoProjects.length, displayLimit);
    const remainingLimit = displayLimit - incompleteCount;
    return regularProjects.slice(0, remainingLimit);
  }, [regularProjects, incompleteAutoProjects.length, displayLimit]);

  const handleClearFilters = useCallback(() => {
    setFilters({
      status: 'all',
      client: 'all',
      department: 'all',
      serviceCompany: 'all'
    });
    setSearchTerm('');
    setDisplayLimit(50); // Reset pagination
  }, []);

  const canCreateProject = canManageProjects;

  if (loading) {
    return (
      <Container fluid>
        <div className="text-center py-5">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
          <p className="mt-3 text-muted">Loading projects...</p>
        </div>
      </Container>
    );
  }

  return (
    <Container fluid>
      <Row className="mb-4">
        <Col>
          <h2>Projects</h2>
          <p className="text-muted">
            {canViewAllProjects 
              ? 'View and manage all projects'
              : user?.role === 'hod'
              ? 'View and manage your department\'s projects'
              : 'View and manage your assigned projects'
            }
          </p>
        </Col>
        <Col xs="auto" className="d-flex align-items-center gap-2">
          {/* View Mode Toggle */}
          <ButtonGroup size="sm">
            <Button
              variant={viewMode === 'grid' ? 'primary' : 'outline-primary'}
              onClick={() => setViewMode('grid')}
            >
              <FaTh />
            </Button>
            <Button
              variant={viewMode === 'list' ? 'primary' : 'outline-primary'}
              onClick={() => setViewMode('list')}
            >
              <FaList />
            </Button>
          </ButtonGroup>

          {/* Create Project Button */}
          {canCreateProject && (
            <Button
              variant="primary"
              onClick={() => setShowCreateModal(true)}
              className="d-flex align-items-center"
            >
              <FaPlus className="me-2" />
              Create Project
            </Button>
          )}
        </Col>
      </Row>

      {/* Search and Filters */}
      <Card className="mb-3">
        <Card.Body>
          <Row className="g-3">
            <Col md={12}>
              <ProjectSearch
                searchTerm={searchTerm}
                onSearchChange={setSearchTerm}
              />
            </Col>
            <Col md={12}>
              <ProjectFilters
                filters={filters}
                onFilterChange={setFilters}
                onClearFilters={handleClearFilters}
                clients={clients}
                departments={departments}
                projects={projects}
              />
            </Col>
          </Row>
        </Card.Body>
      </Card>

      {/* Projects Count */}
      <div className="mb-3">
        <small className="text-muted">
          Showing {filteredProjects.length} of {projects.length} projects
        </small>
      </div>

      {/* Projects Grid/List */}
      {filteredProjects.length === 0 ? (
        <Card>
          <Card.Body className="text-center py-5">
            <p className="text-muted mb-0">
              {projects.length === 0
                ? 'No projects found. Create your first project to get started.'
                : 'No projects match your search criteria.'}
            </p>
          </Card.Body>
        </Card>
      ) : (
        <>
          {/* Incomplete Auto-Generated Projects Section */}
          {displayedIncompleteProjects.length > 0 && (
            <div className="mb-4">
              <div className="d-flex align-items-center mb-3">
                <h5 className="mb-0 text-warning">
                  <Badge bg="warning" className="me-2">
                    {incompleteAutoProjects.length}
                  </Badge>
                  Newly Created Projects - Needs Details
                </h5>
              </div>
              <Card className="border-warning">
                <Card.Header className="bg-warning bg-opacity-10">
                  <small className="text-muted">
                    These projects were automatically created from client onboarding and need additional details to be completed.
                  </small>
                </Card.Header>
                <Card.Body className="p-0">
                  {viewMode === 'grid' ? (
                    <div className="p-3">
                      <Row className="g-3">
                        {displayedIncompleteProjects.map((project) => (
                          <Col key={project._id} lg={4} md={6} sm={12}>
                            <ProjectCard project={project} onEdit={handleEdit} />
                          </Col>
                        ))}
                      </Row>
                    </div>
                  ) : (
                    <div className="table-responsive">
                      <table className="table table-hover mb-0">
                        <thead className="table-light">
                          <tr>
                            <th>Project Name</th>
                            <th>Client</th>
                            <th>Status</th>
                            <th>Progress</th>
                            <th>Team</th>
                            <th>Project Head</th>
                            <th>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {displayedIncompleteProjects.map((project) => (
                            <tr
                              key={project._id}
                              style={{ cursor: 'pointer' }}
                              onClick={() => window.location.href = `/projects/${project._id}`}
                              className="table-warning"
                            >
                              <td>
                                <div className="fw-bold">
                                  {project.name}
                                  <Badge bg="warning" className="ms-2" style={{ fontSize: '0.7rem' }}>
                                    Needs Details
                                  </Badge>
                                </div>
                                {project.description && (
                                  <small className="text-muted">
                                    {project.description.substring(0, 50)}
                                    {project.description.length > 50 ? '...' : ''}
                                  </small>
                                )}
                              </td>
                              <td>{project.client?.name || 'N/A'}</td>
                              <td>
                                <span
                                  className={`badge bg-${
                                    project.status === 'Active' ? 'success' :
                                    project.status === 'On Hold' ? 'warning' :
                                    project.status === 'Completed' ? 'info' : 'danger'
                                  }`}
                                >
                                  {project.status}
                                </span>
                              </td>
                              <td>
                                <div style={{ width: '100px' }}>
                                  <div className="progress" style={{ height: '6px' }}>
                                    <div
                                      className={`progress-bar bg-${
                                        project.progress >= 75 ? 'success' :
                                        project.progress >= 50 ? 'info' :
                                        project.progress >= 25 ? 'warning' : 'danger'
                                      }`}
                                      style={{ width: `${project.progress || 0}%` }}
                                    />
                                  </div>
                                  <small className="text-muted">{project.progress || 0}%</small>
                                </div>
                              </td>
                              <td>{project.teamMembers?.length || 0} members</td>
                              <td>{project.projectHead?.name || 'N/A'}</td>
                              <td>
                                <div className="d-flex gap-1">
                                  <Button
                                    variant="outline-primary"
                                    size="sm"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      window.location.href = `/projects/${project._id}`;
                                    }}
                                    title="View Project"
                                  >
                                    <FaEye />
                                  </Button>
                                  {canFilterProjectsAdmin && (
                                    <Button
                                      variant="outline-secondary"
                                      size="sm"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleEdit(project);
                                      }}
                                      title="Edit Project"
                                    >
                                      <FaEdit />
                                    </Button>
                                  )}
                                  {isPlatformAdmin && (
                                    <Button
                                      variant="outline-danger"
                                      size="sm"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleDelete(project);
                                      }}
                                      title="Delete Project"
                                    >
                                      <FaTrash />
                                    </Button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </Card.Body>
              </Card>
            </div>
          )}

          {/* Regular Projects Section */}
          {displayedRegularProjects.length > 0 && (
            <div>
              {displayedIncompleteProjects.length > 0 && (
                <div className="d-flex align-items-center mb-3">
                  <h5 className="mb-0">
                    <Badge bg="primary" className="me-2">
                      {regularProjects.length}
                    </Badge>
                    All Projects
                  </h5>
                </div>
              )}
              
              {viewMode === 'grid' ? (
                <Row className="g-3">
                  {displayedRegularProjects.map((project) => (
                    <Col key={project._id} lg={4} md={6} sm={12}>
                      <ProjectCard project={project} onEdit={handleEdit} />
                    </Col>
                  ))}
                </Row>
              ) : (
                <Card>
                  <Card.Body className="p-0">
                    <div className="table-responsive">
                      <table className="table table-hover mb-0">
                        <thead className="table-light">
                          <tr>
                            <th>Project Name</th>
                            <th>Client</th>
                            <th>Status</th>
                            <th>Progress</th>
                            <th>Team</th>
                            <th>Project Head</th>
                            <th>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {displayedRegularProjects.map((project) => (
                            <tr
                              key={project._id}
                              style={{ cursor: 'pointer' }}
                              onClick={() => window.location.href = `/projects/${project._id}`}
                            >
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
                                  <small className="text-muted">
                                    {project.description.substring(0, 50)}
                                    {project.description.length > 50 ? '...' : ''}
                                  </small>
                                )}
                              </td>
                              <td>{project.client?.name || 'N/A'}</td>
                              <td>
                                <span
                                  className={`badge bg-${
                                    project.status === 'Active' ? 'success' :
                                    project.status === 'On Hold' ? 'warning' :
                                    project.status === 'Completed' ? 'info' : 'danger'
                                  }`}
                                >
                                  {project.status}
                                </span>
                              </td>
                              <td>
                                <div style={{ width: '100px' }}>
                                  <div className="progress" style={{ height: '6px' }}>
                                    <div
                                      className={`progress-bar bg-${
                                        project.progress >= 75 ? 'success' :
                                        project.progress >= 50 ? 'info' :
                                        project.progress >= 25 ? 'warning' : 'danger'
                                      }`}
                                      style={{ width: `${project.progress || 0}%` }}
                                    />
                                  </div>
                                  <small className="text-muted">{project.progress || 0}%</small>
                                </div>
                              </td>
                              <td>{project.teamMembers?.length || 0} members</td>
                              <td>{project.projectHead?.name || 'N/A'}</td>
                              <td>
                                <div className="d-flex gap-1">
                                  <Button
                                    variant="outline-primary"
                                    size="sm"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      window.location.href = `/projects/${project._id}`;
                                    }}
                                    title="View Project"
                                  >
                                    <FaEye />
                                  </Button>
                                  {canFilterProjectsAdmin && (
                                    <Button
                                      variant="outline-secondary"
                                      size="sm"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleEdit(project);
                                      }}
                                      title="Edit Project"
                                    >
                                      <FaEdit />
                                    </Button>
                                  )}
                                  {isPlatformAdmin && (
                                    <Button
                                      variant="outline-danger"
                                      size="sm"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleDelete(project);
                                      }}
                                      title="Delete Project"
                                    >
                                      <FaTrash />
                                    </Button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </Card.Body>
                </Card>
              )}
            </div>
          )}

          {/* Load More Button */}
          {(incompleteAutoProjects.length > displayedIncompleteProjects.length ||
            regularProjects.length > displayedRegularProjects.length) && (
            <div className="text-center mt-4">
              <Button
                variant="outline-primary"
                onClick={() => setDisplayLimit(prev => prev + 50)}
              >
                Load More Projects
              </Button>
            </div>
          )}
        </>
      )}

      {/* Simplified Project Modal - Create */}
      <SimplifiedProjectModal
        show={showCreateModal}
        onHide={() => setShowCreateModal(false)}
        onSuccess={loadData}
      />

      {/* Simplified Project Modal - Edit */}
      <SimplifiedProjectModal
        show={showEditModal}
        onHide={() => {
          setShowEditModal(false);
          setEditingProject(null);
        }}
        onSuccess={handleEditSuccess}
        project={editingProject}
      />
    </Container>
  );
};

export default ProjectListPage;
