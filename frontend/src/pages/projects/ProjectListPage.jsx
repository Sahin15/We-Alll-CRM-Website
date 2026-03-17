import { useState, useEffect, useMemo } from 'react';
import { Container, Row, Col, Card, Button, ButtonGroup, Badge } from 'react-bootstrap';
import { FaPlus, FaTh, FaList, FaEye, FaEdit, FaTrash } from 'react-icons/fa';
import { toast } from 'react-toastify';
import { useAuth } from '../../context/AuthContext';
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
 */
const ProjectListPage = () => {
  const { user } = useAuth();
  const [projects, setProjects] = useState([]);
  const [clients, setClients] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({
    status: 'all',
    client: 'all',
    department: 'all',
    serviceCompany: 'all' // Add service company filter
  });
  const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'list' - default to grid for better overview
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingProject, setEditingProject] = useState(null);

  useEffect(() => {
    loadData();
  }, [user]);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Use appropriate API method based on user role
      let projectsRes;
      if (['admin', 'superadmin', 'hr', 'manager'].includes(user?.role)) {
        // Admin roles can see all projects
        projectsRes = await projectApi.getAllProjects();
      } else if (user?.role === 'hod') {
        // HoD sees their department's projects AND projects where they are project head/assigned
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
        const combined = merged.filter(p => {
          if (!p?._id || seen.has(p._id.toString())) return false;
          seen.add(p._id.toString());
          return true;
        });

        setProjects(combined);
        setLoading(false);
        // Skip the rest of loadData for hod — we already set projects
        try {
          const [clientsRes, deptsRes] = await Promise.all([
            clientApi.getAllClients(),
            departmentApi.getAllDepartments()
          ]);
          setClients(clientsRes.data || clientsRes.clients || []);
          setDepartments(deptsRes.data || deptsRes.departments || []);
        } catch (error) {
          setClients([]);
          setDepartments([]);
        }
        return;
      } else {
        // Regular employees see only their assigned projects
        projectsRes = await projectApi.getMyProjects();
      }
      
      // Handle different response formats
      const projects = projectsRes.data || projectsRes.projects || projectsRes || [];
      setProjects(Array.isArray(projects) ? projects : []);
      
      // Only load clients and departments for roles that need them (admin, hr, hod)
      if (['admin', 'superadmin', 'hr', 'hod', 'manager'].includes(user?.role)) {
        try {
          const [clientsRes, deptsRes] = await Promise.all([
            clientApi.getAllClients(),
            departmentApi.getAllDepartments()
          ]);
          setClients(clientsRes.data || clientsRes.clients || []);
          setDepartments(deptsRes.data || deptsRes.departments || []);
        } catch (error) {
          console.error('Error loading clients/departments:', error);
          // Don't fail the whole page if clients/departments fail to load
          setClients([]);
          setDepartments([]);
        }
      } else {
        // Regular employees don't need client/department data for filtering
        setClients([]);
        setDepartments([]);
      }
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Failed to load projects');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (project) => {
    setEditingProject(project);
    setShowEditModal(true);
  };

  const handleEditSuccess = () => {
    setShowEditModal(false);
    setEditingProject(null);
    loadData(); // Reload projects after edit
  };

  const handleDelete = async (project) => {
    if (window.confirm(`Are you sure you want to delete the project "${project.name}"? This action cannot be undone.`)) {
      try {
        await projectApi.deleteProject(project._id);
        toast.success('Project deleted successfully');
        loadData(); // Reload projects after deletion
      } catch (error) {
        console.error('Error deleting project:', error);
        toast.error(error.response?.data?.message || 'Failed to delete project');
      }
    }
  };

  // Helper function to check if a project is auto-generated and incomplete
  const isAutoGeneratedIncomplete = (project) => {
    const isAutoGenerated = project.name.includes(' Project') && project.client;
    if (!isAutoGenerated) return false;
    
    // Check if project is incomplete (missing key details)
    const hasMinimalDescription = !project.description || 
      project.description === `Project for ${project.client?.name}` ||
      project.description === `Project for ${project.client?.name} (${project.client?.company})` ||
      project.description.length < 20;
    
    // Only mark as incomplete if it has minimal description AND no services
    const isIncomplete = hasMinimalDescription && 
      (!project.services || project.services.length === 0);
    
    return isIncomplete;
  };

  // Filter and separate projects
  const { incompleteAutoProjects, regularProjects } = useMemo(() => {
    let filtered = [...projects];

    // Search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (project) =>
          project.name?.toLowerCase().includes(term) ||
          project.description?.toLowerCase().includes(term) ||
          project.client?.name?.toLowerCase().includes(term)
      );
    }

    // Status filter
    if (filters.status && filters.status !== 'all') {
      filtered = filtered.filter((project) => project.status === filters.status);
    }

    // Client filter
    if (filters.client && filters.client !== 'all') {
      filtered = filtered.filter((project) => project.client?._id === filters.client);
    }

    // Department filter
    if (filters.department && filters.department !== 'all') {
      filtered = filtered.filter(
        (project) => project.department?._id === filters.department
      );
    }

    // Service Company filter (filter by client's service company)
    if (filters.serviceCompany && filters.serviceCompany !== 'all') {
      filtered = filtered.filter(
        (project) => project.client?.serviceCompany === filters.serviceCompany
      );
    }

    // Separate incomplete auto-generated projects from regular projects
    const incompleteAuto = [];
    const regular = [];

    filtered.forEach(project => {
      if (isAutoGeneratedIncomplete(project)) {
        incompleteAuto.push(project);
      } else {
        regular.push(project);
      }
    });

    // Sort incomplete auto projects by creation date (newest first)
    incompleteAuto.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    
    // Sort regular projects by name
    regular.sort((a, b) => a.name.localeCompare(b.name));

    return {
      incompleteAutoProjects: incompleteAuto,
      regularProjects: regular
    };
  }, [projects, searchTerm, filters]);

  // Combined filtered projects for count display
  const filteredProjects = [...incompleteAutoProjects, ...regularProjects];

  const handleClearFilters = () => {
    setFilters({
      status: 'all',
      client: 'all',
      department: 'all',
      serviceCompany: 'all'
    });
    setSearchTerm('');
  };

  const canCreateProject = ['admin', 'superadmin', 'hod', 'hr', 'manager'].includes(user?.role);

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
            {['admin', 'superadmin', 'hr', 'manager'].includes(user?.role) 
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
          {incompleteAutoProjects.length > 0 && (
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
                        {incompleteAutoProjects.map((project) => (
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
                          {incompleteAutoProjects.map((project) => (
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
                                  {['admin', 'superadmin', 'hr', 'hod', 'manager'].includes(user?.role) && (
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
                                  {['admin', 'superadmin'].includes(user?.role) && (
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
          {regularProjects.length > 0 && (
            <div>
              {incompleteAutoProjects.length > 0 && (
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
                  {regularProjects.map((project) => (
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
                          {regularProjects.map((project) => (
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
                                  {['admin', 'superadmin', 'hr', 'hod', 'manager'].includes(user?.role) && (
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
                                  {['admin', 'superadmin'].includes(user?.role) && (
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
