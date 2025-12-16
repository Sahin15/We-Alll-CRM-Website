import { Row, Col, Form, Button } from 'react-bootstrap';
import { FaFilter } from 'react-icons/fa';
import { useAuth } from '../../context/AuthContext';

/**
 * ProjectFilters Component
 * Provides filtering controls for projects
 */
const ProjectFilters = ({ filters, onFilterChange, onClearFilters, clients, departments }) => {
  const { user } = useAuth();
  const handleChange = (field, value) => {
    onFilterChange({ ...filters, [field]: value });
  };

  const activeFiltersCount = Object.values(filters).filter(
    (value) => value && value !== 'all'
  ).length;

  // Check if user has access to client/department filters
  const canViewClientFilters = ['admin', 'superadmin', 'hr', 'hod', 'manager'].includes(user?.role);
  
  return (
    <Row className="g-3">
      <Col md={canViewClientFilters ? 4 : 12}>
        <Form.Group>
          <Form.Label className="small text-muted mb-1">Status</Form.Label>
          <Form.Select
            size="sm"
            value={filters.status || 'all'}
            onChange={(e) => handleChange('status', e.target.value)}
          >
            <option value="all">All Statuses</option>
            <option value="Active">Active</option>
            <option value="On Hold">On Hold</option>
            <option value="Completed">Completed</option>
            <option value="Cancelled">Cancelled</option>
          </Form.Select>
        </Form.Group>
      </Col>

      {canViewClientFilters && (
        <>
          <Col md={4}>
            <Form.Group>
              <Form.Label className="small text-muted mb-1">Client</Form.Label>
              <Form.Select
                size="sm"
                value={filters.client || 'all'}
                onChange={(e) => handleChange('client', e.target.value)}
              >
                <option value="all">All Clients</option>
                {clients.map((client) => (
                  <option key={client._id} value={client._id}>
                    {client.name}
                  </option>
                ))}
              </Form.Select>
            </Form.Group>
          </Col>

          <Col md={4}>
            <Form.Group>
              <Form.Label className="small text-muted mb-1">Department</Form.Label>
              <Form.Select
                size="sm"
                value={filters.department || 'all'}
                onChange={(e) => handleChange('department', e.target.value)}
              >
                <option value="all">All Departments</option>
                {departments.map((dept) => (
                  <option key={dept._id} value={dept._id}>
                    {dept.name}
                  </option>
                ))}
              </Form.Select>
            </Form.Group>
          </Col>
        </>
      )}

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

export default ProjectFilters;
