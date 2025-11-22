import { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Form, InputGroup, Badge, Alert, Spinner } from 'react-bootstrap';
import api from '../../services/api';

const TeamDirectory = () => {
  const [employees, setEmployees] = useState([]);
  const [filteredEmployees, setFilteredEmployees] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    filterEmployees();
  }, [searchTerm, selectedDepartment, employees]);

  const fetchData = async () => {
    try {
      const [employeesRes, departmentsRes] = await Promise.all([
        api.get('/users/employees'),
        api.get('/departments')
      ]);
      
      setEmployees(employeesRes.data);
      setFilteredEmployees(employeesRes.data);
      setDepartments(departmentsRes.data);
      setLoading(false);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch team data');
      setLoading(false);
    }
  };

  const filterEmployees = () => {
    let filtered = employees;

    if (searchTerm) {
      filtered = filtered.filter(emp =>
        emp.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        emp.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        emp.designation?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (selectedDepartment) {
      filtered = filtered.filter(emp => emp.department?._id === selectedDepartment);
    }

    setFilteredEmployees(filtered);
  };

  const getStatusColor = (status) => {
    const statusMap = {
      'active': 'success',
      'on-leave': 'warning',
      'inactive': 'secondary'
    };
    return statusMap[status] || 'secondary';
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
      <h2 className="mb-4">Team Directory</h2>

      {error && <Alert variant="danger">{error}</Alert>}

      <Row className="mb-4">
        <Col md={6}>
          <InputGroup>
            <InputGroup.Text>
              <i className="bi bi-search"></i>
            </InputGroup.Text>
            <Form.Control
              type="text"
              placeholder="Search by name, email, or designation..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </InputGroup>
        </Col>
        <Col md={6}>
          <Form.Select
            value={selectedDepartment}
            onChange={(e) => setSelectedDepartment(e.target.value)}
          >
            <option value="">All Departments</option>
            {departments.map(dept => (
              <option key={dept._id} value={dept._id}>{dept.name}</option>
            ))}
          </Form.Select>
        </Col>
      </Row>

      {filteredEmployees.length === 0 ? (
        <Alert variant="info">
          <i className="bi bi-info-circle me-2"></i>
          No employees found matching your criteria.
        </Alert>
      ) : (
        <>
          <div className="mb-3">
            <small className="text-muted">
              Showing {filteredEmployees.length} of {employees.length} employees
            </small>
          </div>
          <Row>
            {filteredEmployees.map((employee) => (
              <Col md={6} lg={4} key={employee._id} className="mb-4">
                <Card className="h-100 shadow-sm">
                  <Card.Body>
                    <div className="text-center mb-3">
                      {employee.profilePicture ? (
                        <img
                          src={employee.profilePicture}
                          alt={employee.name}
                          className="rounded-circle"
                          style={{ width: '80px', height: '80px', objectFit: 'cover' }}
                        />
                      ) : (
                        <div
                          className="rounded-circle bg-primary text-white d-flex align-items-center justify-content-center mx-auto"
                          style={{ width: '80px', height: '80px', fontSize: '32px' }}
                        >
                          {employee.name.charAt(0).toUpperCase()}
                        </div>
                      )}
                    </div>

                    <h5 className="text-center mb-1">{employee.name}</h5>
                    <p className="text-center text-muted small mb-2">
                      {employee.designation || 'Employee'}
                    </p>

                    {employee.status && (
                      <div className="text-center mb-3">
                        <Badge bg={getStatusColor(employee.status)}>
                          {employee.status}
                        </Badge>
                      </div>
                    )}

                    <div className="mb-2">
                      <small className="text-muted">
                        <i className="bi bi-envelope me-2"></i>
                        {employee.email}
                      </small>
                    </div>

                    {employee.phone && (
                      <div className="mb-2">
                        <small className="text-muted">
                          <i className="bi bi-telephone me-2"></i>
                          {employee.phone}
                        </small>
                      </div>
                    )}

                    {employee.department && (
                      <div className="mb-2">
                        <small className="text-muted">
                          <i className="bi bi-building me-2"></i>
                          {employee.department.name}
                        </small>
                      </div>
                    )}

                    {employee.employeeId && (
                      <div>
                        <small className="text-muted">
                          <i className="bi bi-person-badge me-2"></i>
                          ID: {employee.employeeId}
                        </small>
                      </div>
                    )}
                  </Card.Body>
                </Card>
              </Col>
            ))}
          </Row>
        </>
      )}
    </Container>
  );
};

export default TeamDirectory;
