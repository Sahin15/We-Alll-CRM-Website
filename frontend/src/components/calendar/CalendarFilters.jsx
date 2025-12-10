import { Row, Col, Form, Button } from 'react-bootstrap';
import { FaFilter } from 'react-icons/fa';

/**
 * CalendarFilters Component
 * Provides filtering controls for calendar view
 */
const CalendarFilters = ({ filters, onFilterChange, workItems }) => {
  const handleChange = (field, value) => {
    onFilterChange({ ...filters, [field]: value });
  };

  const handleClearFilters = () => {
    onFilterChange({
      project: 'all',
      type: 'all',
      status: 'all'
    });
  };

  const activeFiltersCount = Object.values(filters).filter(
    (value) => value && value !== 'all'
  ).length;

  // Get unique projects
  const projects = [...new Set(workItems.map((item) => item.project).filter(Boolean))];

  return (
    <Row className="g-3 align-items-end">
      <Col md={3}>
        <Form.Group>
          <Form.Label className="small text-muted mb-1">Project</Form.Label>
          <Form.Select
            size="sm"
            value={filters.project || 'all'}
            onChange={(e) => handleChange('project', e.target.value)}
          >
            <option value="all">All Projects</option>
            {projects.map((project) => (
              <option key={project._id} value={project._id}>
                {project.name}
              </option>
            ))}
          </Form.Select>
        </Form.Group>
      </Col>

      <Col md={3}>
        <Form.Group>
          <Form.Label className="small text-muted mb-1">Type</Form.Label>
          <Form.Select
            size="sm"
            value={filters.type || 'all'}
            onChange={(e) => handleChange('type', e.target.value)}
          >
            <option value="all">All Types</option>
            <option value="task">Tasks</option>
            <option value="content">Content</option>
          </Form.Select>
        </Form.Group>
      </Col>

      <Col md={3}>
        <Form.Group>
          <Form.Label className="small text-muted mb-1">Status</Form.Label>
          <Form.Select
            size="sm"
            value={filters.status || 'all'}
            onChange={(e) => handleChange('status', e.target.value)}
          >
            <option value="all">All Statuses</option>
            <option value="To Do">To Do</option>
            <option value="In Progress">In Progress</option>
            <option value="Review">Review</option>
            <option value="Done">Done</option>
          </Form.Select>
        </Form.Group>
      </Col>

      <Col md={3}>
        {activeFiltersCount > 0 && (
          <Button
            variant="outline-secondary"
            size="sm"
            onClick={handleClearFilters}
          >
            <FaFilter className="me-2" />
            Clear Filters ({activeFiltersCount})
          </Button>
        )}
      </Col>
    </Row>
  );
};

export default CalendarFilters;
