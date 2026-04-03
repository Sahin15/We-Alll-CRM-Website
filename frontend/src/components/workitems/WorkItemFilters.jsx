import { Row, Col, Form, Button } from 'react-bootstrap';
import { FaFilter, FaTimes } from 'react-icons/fa';

/**
 * WorkItemFilters Component
 * Provides filtering controls for work items with inline clear buttons
 */
const WorkItemFilters = ({ filters, onFilterChange, onClearFilters }) => {
  const handleChange = (field, value) => {
    onFilterChange({ ...filters, [field]: value });
  };

  const handleClearField = (field) => {
    onFilterChange({ ...filters, [field]: 'all' });
  };

  const activeFiltersCount = Object.values(filters).filter(
    (value) => value && value !== 'all'
  ).length;

  const FilterField = ({ label, field, options }) => {
    const isActive = filters[field] && filters[field] !== 'all';
    
    return (
      <Form.Group className="position-relative">
        <Form.Label className="small text-muted mb-1">{label}</Form.Label>
        <div className="d-flex gap-2 align-items-center">
          <Form.Select
            size="sm"
            value={filters[field] || 'all'}
            onChange={(e) => handleChange(field, e.target.value)}
            style={{
              borderColor: isActive ? '#667eea' : undefined,
              backgroundColor: isActive ? 'rgba(102, 126, 234, 0.05)' : undefined
            }}
          >
            {options.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </Form.Select>
          {isActive && (
            <Button
              variant="link"
              size="sm"
              className="p-0 text-danger"
              onClick={() => handleClearField(field)}
              title="Clear this filter"
              style={{ minWidth: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              <FaTimes />
            </Button>
          )}
        </div>
      </Form.Group>
    );
  };

  return (
    <div>
      <Row className="g-3">
        <Col md={4}>
          <FilterField
            label="Status"
            field="status"
            options={[
              { value: 'all', label: 'All Statuses' },
              { value: 'To Do', label: 'To Do' },
              { value: 'In Progress', label: 'In Progress' },
              { value: 'Review', label: 'Review' },
              { value: 'Done', label: 'Done' }
            ]}
          />
        </Col>

        <Col md={4}>
          <FilterField
            label="Priority"
            field="priority"
            options={[
              { value: 'all', label: 'All Priorities' },
              { value: 'low', label: 'Low' },
              { value: 'medium', label: 'Medium' },
              { value: 'high', label: 'High' },
              { value: 'urgent', label: 'Urgent' }
            ]}
          />
        </Col>

        <Col md={4}>
          <FilterField
            label="Due Date"
            field="dueDate"
            options={[
              { value: 'all', label: 'All Dates' },
              { value: 'overdue', label: 'Overdue' },
              { value: 'today', label: 'Due Today' },
              { value: 'week', label: 'This Week' },
              { value: 'month', label: 'This Month' }
            ]}
          />
        </Col>
      </Row>

      {activeFiltersCount > 0 && (
        <Row className="g-2">
          <Col xs="auto">
            <small className="text-muted">
              <FaFilter className="me-1" />
              {activeFiltersCount} active filter{activeFiltersCount !== 1 ? 's' : ''}
            </small>
          </Col>
          <Col xs="auto">
            <Button
              variant="link"
              size="sm"
              onClick={onClearFilters}
              className="p-0 text-primary"
              style={{ textDecoration: 'none', fontWeight: '500' }}
            >
              Clear all
            </Button>
          </Col>
        </Row>
      )}
    </div>
  );
};

export default WorkItemFilters;
