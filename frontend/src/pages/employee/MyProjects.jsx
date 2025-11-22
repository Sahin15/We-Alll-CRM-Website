import { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Badge, ProgressBar, Alert, Spinner } from 'react-bootstrap';
import api from '../../services/api';

const MyProjects = () => {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    try {
      const response = await api.get('/projects/my-projects');
      setProjects(response.data);
      setLoading(false);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch projects');
      setLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    const statusMap = {
      'active': 'success',
      'on-hold': 'warning',
      'completed': 'info',
      'cancelled': 'danger'
    };
    return statusMap[status] || 'secondary';
  };

  const getPriorityBadge = (priority) => {
    const priorityMap = {
      'high': 'danger',
      'medium': 'warning',
      'low': 'info'
    };
    return priorityMap[priority] || 'secondary';
  };

  if (loading) {
    return (
      <Container className="mt-4 text-center">
        <Spinner animation="border" role="status">
          <span className="visually-hidden">Loading...</span>
        </Spinner>
      </Container>
    );
  }

  return (
    <Container className="mt-4">
      <h2 className="mb-4">My Projects</h2>

      {error && <Alert variant="danger">{error}</Alert>}

      {projects.length === 0 ? (
        <Alert variant="info">
          <i className="bi bi-info-circle me-2"></i>
          No projects assigned yet.
        </Alert>
      ) : (
        <Row>
          {projects.map((project) => (
            <Col md={6} lg={4} key={project._id} className="mb-4">
              <Card className="h-100 shadow-sm">
                <Card.Body>
                  <div className="d-flex justify-content-between align-items-start mb-3">
                    <h5 className="mb-0">{project.name}</h5>
                    <Badge bg={getStatusBadge(project.status)}>
                      {project.status}
                    </Badge>
                  </div>

                  <p className="text-muted small mb-3">{project.description}</p>

                  {project.client && (
                    <div className="mb-2">
                      <small className="text-muted">
                        <i className="bi bi-building me-1"></i>
                        Client: {project.client.name}
                      </small>
                    </div>
                  )}

                  <div className="mb-2">
                    <small className="text-muted">
                      <i className="bi bi-calendar me-1"></i>
                      {new Date(project.startDate).toLocaleDateString()} - {new Date(project.endDate).toLocaleDateString()}
                    </small>
                  </div>

                  {project.priority && (
                    <div className="mb-3">
                      <Badge bg={getPriorityBadge(project.priority)} className="me-2">
                        {project.priority} priority
                      </Badge>
                    </div>
                  )}

                  {project.progress !== undefined && (
                    <div className="mb-3">
                      <div className="d-flex justify-content-between mb-1">
                        <small className="text-muted">Progress</small>
                        <small className="text-muted">{project.progress}%</small>
                      </div>
                      <ProgressBar now={project.progress} variant={project.progress === 100 ? 'success' : 'primary'} />
                    </div>
                  )}

                  {project.teamMembers && project.teamMembers.length > 0 && (
                    <div className="mb-2">
                      <small className="text-muted">
                        <i className="bi bi-people me-1"></i>
                        Team: {project.teamMembers.length} members
                      </small>
                    </div>
                  )}

                  {project.manager && (
                    <div>
                      <small className="text-muted">
                        <i className="bi bi-person-badge me-1"></i>
                        Manager: {project.manager.name}
                      </small>
                    </div>
                  )}
                </Card.Body>
              </Card>
            </Col>
          ))}
        </Row>
      )}
    </Container>
  );
};

export default MyProjects;
