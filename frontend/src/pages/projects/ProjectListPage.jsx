import { useState, useEffect, useMemo } from 'react';
import { Container, Row, Col, Card, Button, ButtonGroup } from 'react-bootstrap';
import { FaPlus, FaTh, FaList } from 'react-icons/fa';
import { toast } from 'react-toastify';
import { useAuth } from '../../context/AuthContext';
import projectApi from '../../api/projectApi';
import clientApi from '../../api/clientApi';
import departmentApi from '../../api/departmentApi';
import ProjectCard from '../../components/projects/ProjectCard';
import ProjectFilters from '../../components/projects/ProjectFilters';
import ProjectSearch from '../../components/projects/ProjectSearch';
import CreateProjectModal from '../../components/projects/CreateProjectModal';

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
    department: 'all'
  });
  const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'list'
  const [showCreateModal, setShowCreateModal] = useState(false);

  useEffect(() => {
    loadData();
  }, [user]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [projectsRes, clientsRes, deptsRes] = await Promise.all([
        projectApi.getAllProjects(),
        clientApi.getAllClients(),
        departmentApi.getAllDepartments()
      ]);
      setProjects(projectsRes.data || projectsRes.projects || []);
      setClients(clientsRes.data || clientsRes.clients || []);
      setDepartments(deptsRes.data || deptsRes.departments || []);
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Failed to load projects');
    } finally {
      setLoading(false);
    }
  };

  // Filter projects
  const filteredProjects = useMemo(() => {
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

    // Sort by name
    filtered.sort((a, b) => a.name.localeCompare(b.name));

    return filtered;
  }, [projects, searchTerm, filters]);

  const handleClearFilters = () => {
    setFilters({
      status: 'all',
      client: 'all',
      department: 'all'
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
          <p className="text-muted">View and manage all accessible projects</p>
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
      ) : viewMode === 'grid' ? (
        <Row className="g-3">
          {filteredProjects.map((project) => (
            <Col key={project._id} lg={4} md={6} sm={12}>
              <ProjectCard project={project} />
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
                  </tr>
                </thead>
                <tbody>
                  {filteredProjects.map((project) => (
                    <tr
                      key={project._id}
                      style={{ cursor: 'pointer' }}
                      onClick={() => window.location.href = `/projects/${project._id}`}
                    >
                      <td>
                        <div className="fw-bold">{project.name}</div>
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
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card.Body>
        </Card>
      )}

      {/* Create Project Modal */}
      <CreateProjectModal
        show={showCreateModal}
        onHide={() => setShowCreateModal(false)}
        onSuccess={loadData}
      />
    </Container>
  );
};

export default ProjectListPage;
