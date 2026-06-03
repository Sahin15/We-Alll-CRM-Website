import { useState, useEffect } from 'react';
import {
  Container,
  Row,
  Col,
  Card,
  Table,
  Badge,
  Spinner,
  Form,
  Button,
  Alert,
} from 'react-bootstrap';
import {
  FaClock,
  FaChartBar,
  FaUsers,
  FaBuilding,
  FaDownload,
  FaFilter,
} from 'react-icons/fa';
import { toast } from 'react-toastify';
import { getOvertimeStatistics } from '../../api/overtimeApi';
import { departmentApi } from '../../api/departmentApi';
import { loadXlsx } from '../../utils/lazyLibs';

const OvertimeStatistics = () => {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [departments, setDepartments] = useState([]);
  const [filters, setFilters] = useState({
    startDate: new Date(new Date().setDate(1)).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
    departmentId: '',
  });

  useEffect(() => {
    fetchDepartments();
    fetchStatistics();
  }, []);

  useEffect(() => {
    fetchStatistics();
  }, [filters]);

  const fetchDepartments = async () => {
    try {
      const response = await departmentApi.getAllDepartments();
      setDepartments(response.data || []);
    } catch (error) {
      console.error('Error fetching departments:', error);
    }
  };

  const fetchStatistics = async () => {
    try {
      setLoading(true);
      const response = await getOvertimeStatistics(filters);
      setStats(response);
    } catch (error) {
      console.error('Error fetching overtime statistics:', error);
      toast.error('Failed to load overtime statistics');
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (e) => {
    setFilters({
      ...filters,
      [e.target.name]: e.target.value,
    });
  };

  const exportToExcel = async () => {
    const XLSX = await loadXlsx();
    if (!stats) return;

    // Prepare data for export
    const employeeData = stats.byEmployee.map((emp) => ({
      Employee: emp.name,
      Email: emp.email,
      Department: emp.department,
      'Auto Overtime (hrs)': emp.autoOvertime.toFixed(2),
      'Manual Overtime (hrs)': emp.manualOvertime.toFixed(2),
      'Total Overtime (hrs)': emp.totalOvertime.toFixed(2),
    }));

    const departmentData = stats.byDepartment.map((dept) => ({
      Department: dept.department,
      'Auto Overtime (hrs)': dept.autoOvertime.toFixed(2),
      'Manual Overtime (hrs)': dept.manualOvertime.toFixed(2),
      'Total Overtime (hrs)': dept.totalOvertime.toFixed(2),
    }));

    // Create workbook
    const wb = XLSX.utils.book_new();

    // Add summary sheet
    const summaryData = [
      ['Overtime Statistics Summary'],
      ['Period', `${filters.startDate} to ${filters.endDate}`],
      [],
      ['Total Auto Overtime', `${stats.totalAutoOvertime.toFixed(2)} hrs`],
      ['Total Manual Overtime', `${stats.totalManualOvertime.toFixed(2)} hrs`],
      ['Total Overtime', `${stats.totalOvertime.toFixed(2)} hrs`],
      [],
      ['Pending Approvals', stats.pendingApprovals],
      ['Approved Entries', stats.approvedEntries],
      ['Rejected Entries', stats.rejectedEntries],
    ];
    const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(wb, summarySheet, 'Summary');

    // Add employee sheet
    const employeeSheet = XLSX.utils.json_to_sheet(employeeData);
    XLSX.utils.book_append_sheet(wb, employeeSheet, 'By Employee');

    // Add department sheet
    const departmentSheet = XLSX.utils.json_to_sheet(departmentData);
    XLSX.utils.book_append_sheet(wb, departmentSheet, 'By Department');

    // Save file
    XLSX.writeFile(wb, `Overtime_Statistics_${filters.startDate}_to_${filters.endDate}.xlsx`);
    toast.success('Report exported successfully');
  };

  if (loading) {
    return (
      <Container fluid className="py-4">
        <div className="text-center py-5">
          <Spinner animation="border" variant="primary" />
          <p className="mt-3 text-muted">Loading overtime statistics...</p>
        </div>
      </Container>
    );
  }

  return (
    <Container fluid className="py-4">
      {/* Header */}
      <Row className="mb-4">
        <Col>
          <div className="d-flex justify-content-between align-items-center">
            <div>
              <h2 className="mb-1">
                <FaChartBar className="me-2 text-primary" />
                Overtime Statistics
              </h2>
              <p className="text-muted mb-0">
                Comprehensive overtime analytics and reports
              </p>
            </div>
            <Button variant="success" onClick={exportToExcel}>
              <FaDownload className="me-2" />
              Export to Excel
            </Button>
          </div>
        </Col>
      </Row>

      {/* Filters */}
      <Card className="border-0 shadow-sm mb-4">
        <Card.Body>
          <Row className="align-items-end">
            <Col md={3}>
              <Form.Group>
                <Form.Label>
                  <FaFilter className="me-2" />
                  Start Date
                </Form.Label>
                <Form.Control
                  type="date"
                  name="startDate"
                  value={filters.startDate}
                  onChange={handleFilterChange}
                />
              </Form.Group>
            </Col>
            <Col md={3}>
              <Form.Group>
                <Form.Label>End Date</Form.Label>
                <Form.Control
                  type="date"
                  name="endDate"
                  value={filters.endDate}
                  onChange={handleFilterChange}
                />
              </Form.Group>
            </Col>
            <Col md={3}>
              <Form.Group>
                <Form.Label>
                  <FaBuilding className="me-2" />
                  Department
                </Form.Label>
                <Form.Select
                  name="departmentId"
                  value={filters.departmentId}
                  onChange={handleFilterChange}
                >
                  <option value="">All Departments</option>
                  {departments.map((dept) => (
                    <option key={dept._id} value={dept._id}>
                      {dept.name}
                    </option>
                  ))}
                </Form.Select>
              </Form.Group>
            </Col>
          </Row>
        </Card.Body>
      </Card>

      {stats && (
        <>
          {/* Summary Cards */}
          <Row className="mb-4">
            <Col md={3}>
              <Card className="border-0 shadow-sm h-100">
                <Card.Body className="text-center">
                  <FaClock className="text-primary mb-2" size={32} />
                  <h3 className="mb-1">{stats.totalAutoOvertime.toFixed(2)}</h3>
                  <small className="text-muted">Auto Overtime (hrs)</small>
                </Card.Body>
              </Card>
            </Col>
            <Col md={3}>
              <Card className="border-0 shadow-sm h-100">
                <Card.Body className="text-center">
                  <FaClock className="text-success mb-2" size={32} />
                  <h3 className="mb-1">{stats.totalManualOvertime.toFixed(2)}</h3>
                  <small className="text-muted">Manual Overtime (hrs)</small>
                </Card.Body>
              </Card>
            </Col>
            <Col md={3}>
              <Card className="border-0 shadow-sm h-100">
                <Card.Body className="text-center">
                  <FaClock className="text-info mb-2" size={32} />
                  <h3 className="mb-1">{stats.totalOvertime.toFixed(2)}</h3>
                  <small className="text-muted">Total Overtime (hrs)</small>
                </Card.Body>
              </Card>
            </Col>
            <Col md={3}>
              <Card className="border-0 shadow-sm h-100">
                <Card.Body className="text-center">
                  <FaUsers className="text-warning mb-2" size={32} />
                  <h3 className="mb-1">{stats.pendingApprovals}</h3>
                  <small className="text-muted">Pending Approvals</small>
                </Card.Body>
              </Card>
            </Col>
          </Row>

          {/* Approval Status */}
          <Row className="mb-4">
            <Col md={12}>
              <Card className="border-0 shadow-sm">
                <Card.Header className="bg-white border-bottom">
                  <h6 className="mb-0">Approval Status</h6>
                </Card.Header>
                <Card.Body>
                  <Row>
                    <Col md={4}>
                      <div className="text-center p-3 bg-warning bg-opacity-10 rounded">
                        <h4 className="mb-1 text-warning">{stats.pendingApprovals}</h4>
                        <small className="text-muted">Pending</small>
                      </div>
                    </Col>
                    <Col md={4}>
                      <div className="text-center p-3 bg-success bg-opacity-10 rounded">
                        <h4 className="mb-1 text-success">{stats.approvedEntries}</h4>
                        <small className="text-muted">Approved</small>
                      </div>
                    </Col>
                    <Col md={4}>
                      <div className="text-center p-3 bg-danger bg-opacity-10 rounded">
                        <h4 className="mb-1 text-danger">{stats.rejectedEntries}</h4>
                        <small className="text-muted">Rejected</small>
                      </div>
                    </Col>
                  </Row>
                </Card.Body>
              </Card>
            </Col>
          </Row>

          {/* By Employee */}
          <Row className="mb-4">
            <Col md={12}>
              <Card className="border-0 shadow-sm">
                <Card.Header className="bg-white border-bottom">
                  <h6 className="mb-0">
                    <FaUsers className="me-2 text-primary" />
                    Overtime by Employee
                  </h6>
                </Card.Header>
                <Card.Body>
                  {stats.byEmployee.length === 0 ? (
                    <Alert variant="info" className="mb-0">
                      No overtime data available for the selected period
                    </Alert>
                  ) : (
                    <div className="table-responsive">
                      <Table hover>
                        <thead>
                          <tr>
                            <th>Employee</th>
                            <th>Department</th>
                            <th>Auto OT (hrs)</th>
                            <th>Manual OT (hrs)</th>
                            <th>Total OT (hrs)</th>
                          </tr>
                        </thead>
                        <tbody>
                          {stats.byEmployee.map((emp, index) => (
                            <tr key={index}>
                              <td>
                                <div>
                                  <strong>{emp.name}</strong>
                                  <br />
                                  <small className="text-muted">{emp.email}</small>
                                </div>
                              </td>
                              <td>{emp.department}</td>
                              <td>
                                <Badge bg="primary">{emp.autoOvertime.toFixed(2)}</Badge>
                              </td>
                              <td>
                                <Badge bg="success">{emp.manualOvertime.toFixed(2)}</Badge>
                              </td>
                              <td>
                                <Badge bg="info">{emp.totalOvertime.toFixed(2)}</Badge>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </Table>
                    </div>
                  )}
                </Card.Body>
              </Card>
            </Col>
          </Row>

          {/* By Department */}
          <Row className="mb-4">
            <Col md={12}>
              <Card className="border-0 shadow-sm">
                <Card.Header className="bg-white border-bottom">
                  <h6 className="mb-0">
                    <FaBuilding className="me-2 text-primary" />
                    Overtime by Department
                  </h6>
                </Card.Header>
                <Card.Body>
                  {stats.byDepartment.length === 0 ? (
                    <Alert variant="info" className="mb-0">
                      No department data available
                    </Alert>
                  ) : (
                    <div className="table-responsive">
                      <Table hover>
                        <thead>
                          <tr>
                            <th>Department</th>
                            <th>Auto OT (hrs)</th>
                            <th>Manual OT (hrs)</th>
                            <th>Total OT (hrs)</th>
                          </tr>
                        </thead>
                        <tbody>
                          {stats.byDepartment.map((dept, index) => (
                            <tr key={index}>
                              <td>
                                <strong>{dept.department}</strong>
                              </td>
                              <td>
                                <Badge bg="primary">{dept.autoOvertime.toFixed(2)}</Badge>
                              </td>
                              <td>
                                <Badge bg="success">{dept.manualOvertime.toFixed(2)}</Badge>
                              </td>
                              <td>
                                <Badge bg="info">{dept.totalOvertime.toFixed(2)}</Badge>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </Table>
                    </div>
                  )}
                </Card.Body>
              </Card>
            </Col>
          </Row>
        </>
      )}
    </Container>
  );
};

export default OvertimeStatistics;
