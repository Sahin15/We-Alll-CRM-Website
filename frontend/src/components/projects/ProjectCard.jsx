import { Card, Badge, ProgressBar, Button } from 'react-bootstrap';
import { FaUsers, FaTasks, FaCheckCircle, FaEye } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';

/**
 * ProjectCard Component
 * Displays project information in card format with statistics
 */
const ProjectCard = ({ project }) => {
  const navigate = useNavigate();

  const getStatusColor = (status) => {
    const colors = {
      Active: 'success',
      'On Hold': 'warning',
      Completed: 'info',
      Cancelled: 'danger'
    };
    return colors[status] || 'secondary';
  };

  const handleViewProject = () => {
    navigate(`/projects/${project._id}`);
  };

  return (
    <Card
      className="h-100 shadow-sm"
      style={{ cursor: 'pointer', transition: 'all 0.2s' }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-4px)';
        e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = '';
      }}
      onClick={handleViewProject}
    >
      <Card.Body>
        {/* Header */}
        <div className="d-flex justify-content-between align-items-start mb-3">
          <div className="flex-grow-1">
            <h5 className="mb-1">{project.name}</h5>
            {project.client && (
              <small className="text-muted">{project.client.name}</small>
            )}
          </div>
          <Badge bg={getStatusColor(project.status)}>{project.status}</Badge>
        </div>

        {/* Description */}
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

        {/* Progress */}
        <div className="mb-3">
          <div className="d-flex justify-content-between align-items-center mb-1">
            <small className="text-muted">Progress</small>
            <small className="fw-bold">{project.progress || 0}%</small>
          </div>
          <ProgressBar
            now={project.progress || 0}
            variant={
              project.progress >= 75 ? 'success' :
              project.progress >= 50 ? 'info' :
              project.progress >= 25 ? 'warning' : 'danger'
            }
            style={{ height: '6px' }}
          />
        </div>

        {/* Statistics */}
        <div className="d-flex justify-content-between text-muted small mb-3">
          <div className="d-flex align-items-center">
            <FaUsers className="me-1" />
            <span>{project.teamMembers?.length || 0} members</span>
          </div>
          <div className="d-flex align-items-center">
            <FaTasks className="me-1" />
            <span>{project.totalWorkItems || 0} items</span>
          </div>
          <div className="d-flex align-items-center">
            <FaCheckCircle className="me-1" />
            <span>{project.completedWorkItems || 0} done</span>
          </div>
        </div>

        {/* Footer */}
        <div className="d-flex justify-content-between align-items-center pt-2 border-top">
          <small className="text-muted">
            {project.projectHead?.name || 'No project head'}
          </small>
          <Button
            variant="outline-primary"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              handleViewProject();
            }}
          >
            <FaEye className="me-1" />
            View
          </Button>
        </div>
      </Card.Body>
    </Card>
  );
};

export default ProjectCard;
