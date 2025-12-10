import { Row, Col, Form, Button } from 'react-bootstrap';
import { FaFilter } from 'react-icons/fa';

/**
 * WorkItemFilters Component
 * Provides filtering controls for work items
 */
const WorkItemFilters = ({ filters, onFilterChange, onClearFilters }) => {
  const handleChange = (field, value) => {
    onFilterChange({ ...filters, [field]: value });
  };

  const activeFiltersCount = Object.values(filters).filter(
    (value) => value && value !== 'all'
  ).length;

  return (
    <Row className="g-3">
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
          <Form.Label className="small text-muted mb-1">Priority</Form.Label>
          <Form.Select
            size="sm"
            value={filters.priority || 'all'}
            onChange={(e) => handleChange('priority', e.target.value)}
          >
            <option value="all">All Priorities</option>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="urgent">Urgent</option>
          </Form.Select>
        </Form.Group>
      </Col>

      <Col md={3}>
        <Form.Group>
          <Form.Label className="small text-muted mb-1">Due Date</Form.Label>
          <Form.Select
            size="sm"
            value={filters.dueDate || 'all'}
            onChange={(e) => handleChange('dueDate', e.target.value)}
          >
            <option value="all">All Dates</option>
            <option value="overdue">Overdue</option>
            <option value="today">Due Today</option>
            <option value="week">This Week</option>
            <option value="month">This Month</option>
          </Form.Select>
        </Form.Group>
      </Col>

      {activeFiltersCount > 0 && (
        <Col md={12}>
          <Button
            variant="outline-secondary"
            size="sm"
            onClick={onClearFilters}
          >
            <FaFilter className="me-2" />
            Clear Filters ({activeFiltersCount})
          </Button>
        </Col>
      )}
    </Row>
  );
};

export default WorkItemFilters;
