import { useState, useEffect } from "react";
import {
  Card,
  Row,
  Col,
  Table,
  Button,
  Badge,
  Modal,
  Form,
  Alert,
  Spinner,
  Tabs,
  Tab,
  InputGroup,
  Dropdown
} from "react-bootstrap";
import { toast } from "react-toastify";
import { 
  FaEye, 
  FaUsers, 
  FaExclamationTriangle, 
  FaCheckCircle, 
  FaReply,
  FaEdit,
  FaPlus,
  FaDownload,
  FaUser,
  FaBuilding,
  FaCheckSquare
} from "react-icons/fa";
import { salaryPreviewApi } from "../../api/salaryApi";
import api from "../../services/api";

const HRSalaryPreviewManagement = () => {
  const [activeTab, setActiveTab] = useState("overview");
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [previews, setPreviews] = useState([]);
  const [statistics, setStatistics] = useState(null);
  const [attentionPreviews, setAttentionPreviews] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedPreview, setSelectedPreview] = useState(null);
  const [showResponseModal, setShowResponseModal] = useState(false);
  const [showCorrectionsModal, setShowCorrectionsModal] = useState(false);
  const [responseText, setResponseText] = useState("");
  const [selectedQueryIndex, setSelectedQueryIndex] = useState(null);
  const [selectedEmployees, setSelectedEmployees] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [generateType, setGenerateType] = useState('bulk'); // 'bulk', 'individual', 'department'
  const [selectedDepartment, setSelectedDepartment] = useState('');
  const [departments, setDepartments] = useState([]);

  useEffect(() => {
    if (selectedMonth && selectedYear) {
      fetchData();
    }
    fetchEmployees();
    fetchDepartments();
  }, [selectedMonth, selectedYear, activeTab]);

  const fetchData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        fetchPreviews(),
        fetchStatistics(),
        fetchAttentionPreviews()
      ]);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchPreviews = async () => {
    try {
      const response = await salaryPreviewApi.getMonthPreviews(selectedMonth, selectedYear);
      setPreviews(response.data);
    } catch (error) {
      console.error("Error fetching previews:", error);
      toast.error("Failed to load previews");
    }
  };

  const fetchStatistics = async () => {
    try {
      const response = await salaryPreviewApi.getStatistics(selectedMonth, selectedYear);
      setStatistics(response.data);
    } catch (error) {
      console.error("Error fetching statistics:", error);
    }
  };

  const fetchAttentionPreviews = async () => {
    try {
      const response = await salaryPreviewApi.getAttentionPreviews(selectedMonth, selectedYear);
      setAttentionPreviews(response.data);
    } catch (error) {
      console.error("Error fetching attention previews:", error);
    }
  };

  const fetchEmployees = async () => {
    try {
      const response = await api.get('/users/employees');
      setEmployees(response.data || []);
    } catch (error) {
      console.error("Error fetching employees:", error);
    }
  };

  const fetchDepartments = async () => {
    try {
      const response = await api.get('/departments');
      setDepartments(response.data || []);
    } catch (error) {
      console.error("Error fetching departments:", error);
    }
  };

  const handleRespondToQuery = async () => {
    if (!responseText.trim()) {
      toast.error("Please enter a response");
      return;
    }

    try {
      await salaryPreviewApi.respondToQuery(selectedPreview._id, selectedQueryIndex, responseText.trim());
      toast.success("Response submitted successfully");
      setShowResponseModal(false);
      setResponseText("");
      setSelectedQueryIndex(null);
      fetchData();
    } catch (error) {
      console.error("Error submitting response:", error);
      toast.error("Failed to submit response");
    }
  };

  const handleFinalizePreview = async (previewId) => {
    try {
      await salaryPreviewApi.finalize(previewId);
      toast.success("Preview finalized successfully");
      fetchData();
    } catch (error) {
      console.error("Error finalizing preview:", error);
      toast.error("Failed to finalize preview");
    }
  };

  const handleBulkGenerate = async () => {
    try {
      // Get all active employees
      const employeesResponse = await api.get('/users/employees');
      const employees = employeesResponse.data;
      const employeeIds = employees.map(emp => emp._id);

      const response = await salaryPreviewApi.bulkGenerate({
        employeeIds,
        month: selectedMonth,
        year: selectedYear
      });

      const data = response.data;
      toast.success(`Bulk generation completed: ${data.summary.success} successful, ${data.summary.failed} failed`);
      fetchData();
    } catch (error) {
      console.error("Error in bulk generation:", error);
      toast.error("Failed to generate previews");
    }
  };

  const handleIndividualGenerate = async (employeeId) => {
    try {
      const response = await salaryPreviewApi.generate(employeeId, selectedMonth, selectedYear);
      toast.success(`Preview generated for ${response.data.preview.employee.name}`);
      fetchData();
    } catch (error) {
      console.error("Error generating individual preview:", error);
      toast.error("Failed to generate preview");
    }
  };

  const handleDepartmentGenerate = async (departmentId) => {
    try {
      // Get employees from selected department
      const departmentEmployees = employees.filter(emp => emp.department?._id === departmentId);
      const employeeIds = departmentEmployees.map(emp => emp._id);

      if (employeeIds.length === 0) {
        toast.warning("No employees found in selected department");
        return;
      }

      const response = await salaryPreviewApi.bulkGenerate({
        employeeIds,
        month: selectedMonth,
        year: selectedYear
      });

      const data = response.data;
      const department = departments.find(d => d._id === departmentId);
      toast.success(`Department generation completed for ${department?.name}: ${data.summary.success} successful, ${data.summary.failed} failed`);
      fetchData();
    } catch (error) {
      console.error("Error in department generation:", error);
      toast.error("Failed to generate department previews");
    }
  };

  const handleSelectedEmployeesGenerate = async () => {
    try {
      if (selectedEmployees.length === 0) {
        toast.warning("Please select employees to generate previews");
        return;
      }

      const response = await salaryPreviewApi.bulkGenerate({
        employeeIds: selectedEmployees,
        month: selectedMonth,
        year: selectedYear
      });

      const data = response.data;
      toast.success(`Selected employees generation completed: ${data.summary.success} successful, ${data.summary.failed} failed`);
      setSelectedEmployees([]);
      setShowGenerateModal(false);
      fetchData();
    } catch (error) {
      console.error("Error generating selected employees previews:", error);
      toast.error("Failed to generate previews");
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      generated: { variant: "info", text: "Generated" },
      under_review: { variant: "warning", text: "Under Review" },
      query_raised: { variant: "danger", text: "Query Raised" },
      acknowledged: { variant: "success", text: "Acknowledged" },
      finalized: { variant: "success", text: "Finalized" }
    };

    const config = statusConfig[status] || statusConfig.generated;
    return <Badge bg={config.variant}>{config.text}</Badge>;
  };

  const generateMonthOptions = () => {
    const months = [
      "January", "February", "March", "April", "May", "June",
      "July", "August", "September", "October", "November", "December"
    ];
    
    return months.map((month, index) => (
      <option key={index + 1} value={index + 1}>
        {month}
      </option>
    ));
  };

  const generateYearOptions = () => {
    const currentYear = new Date().getFullYear();
    const years = [];
    
    for (let year = currentYear; year >= currentYear - 2; year--) {
      years.push(year);
    }
    
    return years.map(year => (
      <option key={year} value={year}>
        {year}
      </option>
    ));
  };

  return (
    <div>
      {/* Header with Controls */}
      <Row className="mb-4">
        <Col>
          <div className="d-flex justify-content-between align-items-center">
            <div>
              <h4>Salary Preview Management</h4>
              <p className="text-muted mb-0">Manage employee salary previews and queries</p>
            </div>
            <div className="d-flex gap-2">
              <Form.Select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                style={{ width: 'auto' }}
              >
                {generateMonthOptions()}
              </Form.Select>
              <Form.Select
                value={selectedYear}
                onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                style={{ width: 'auto' }}
              >
                {generateYearOptions()}
              </Form.Select>
              
              {/* Generate Preview Options */}
              <Dropdown>
                <Dropdown.Toggle variant="primary" id="generate-dropdown">
                  <FaPlus className="me-2" />
                  Generate Previews
                </Dropdown.Toggle>
                <Dropdown.Menu>
                  <Dropdown.Item onClick={handleBulkGenerate}>
                    <FaUsers className="me-2" />
                    All Employees (Bulk)
                  </Dropdown.Item>
                  <Dropdown.Divider />
                  <Dropdown.Item onClick={() => {
                    setGenerateType('individual');
                    setShowGenerateModal(true);
                  }}>
                    <FaUser className="me-2" />
                    Individual Employee
                  </Dropdown.Item>
                  <Dropdown.Item onClick={() => {
                    setGenerateType('department');
                    setShowGenerateModal(true);
                  }}>
                    <FaBuilding className="me-2" />
                    By Department
                  </Dropdown.Item>
                  <Dropdown.Item onClick={() => {
                    setGenerateType('selected');
                    setShowGenerateModal(true);
                  }}>
                    <FaCheckSquare className="me-2" />
                    Selected Employees
                  </Dropdown.Item>
                </Dropdown.Menu>
              </Dropdown>
            </div>
          </div>
        </Col>
      </Row>

      {/* Statistics Cards */}
      {statistics && (
        <Row className="mb-4">
          <Col md={3}>
            <Card className="text-center">
              <Card.Body>
                <h3 className="text-primary">{statistics.totalPreviews}</h3>
                <p className="mb-0">Total Previews</p>
              </Card.Body>
            </Card>
          </Col>
          <Col md={3}>
            <Card className="text-center">
              <Card.Body>
                <h3 className="text-warning">{statistics.queriesRaised}</h3>
                <p className="mb-0">Queries Raised</p>
              </Card.Body>
            </Card>
          </Col>
          <Col md={3}>
            <Card className="text-center">
              <Card.Body>
                <h3 className="text-danger">{statistics.pendingQueries}</h3>
                <p className="mb-0">Pending Queries</p>
              </Card.Body>
            </Card>
          </Col>
          <Col md={3}>
            <Card className="text-center">
              <Card.Body>
                <h3 className="text-info">{statistics.expiredReviews}</h3>
                <p className="mb-0">Expired Reviews</p>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      )}

      {/* Tabs */}
      <Tabs activeKey={activeTab} onSelect={setActiveTab} className="mb-4">
        <Tab eventKey="overview" title="All Previews">
          <Card>
            <Card.Body>
              {loading ? (
                <div className="text-center py-4">
                  <Spinner animation="border" />
                </div>
              ) : (
                <Table responsive hover>
                  <thead>
                    <tr>
                      <th>Employee</th>
                      <th>Department</th>
                      <th>Status</th>
                      <th>Net Salary</th>
                      <th>Queries</th>
                      <th>Deadline</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {previews.map((preview) => (
                      <tr key={preview._id}>
                        <td>
                          <div>
                            <strong>{preview.employee.name}</strong>
                            <br />
                            <small className="text-muted">{preview.employee.employeeId}</small>
                          </div>
                        </td>
                        <td>{preview.employee.department?.name || 'N/A'}</td>
                        <td>{getStatusBadge(preview.status)}</td>
                        <td>{formatCurrency(preview.salaryBreakdown.netSalary)}</td>
                        <td>
                          {preview.employeeQueries.length > 0 ? (
                            <Badge bg="warning">{preview.employeeQueries.length}</Badge>
                          ) : (
                            <span className="text-muted">None</span>
                          )}
                        </td>
                        <td>
                          <small>
                            {new Date(preview.reviewDeadline).toLocaleDateString()}
                            {preview.isReviewExpired && (
                              <Badge bg="danger" className="ms-1">Expired</Badge>
                            )}
                          </small>
                        </td>
                        <td>
                          <Dropdown>
                            <Dropdown.Toggle variant="outline-primary" size="sm">
                              Actions
                            </Dropdown.Toggle>
                            <Dropdown.Menu>
                              <Dropdown.Item onClick={() => setSelectedPreview(preview)}>
                                <FaEye className="me-2" />
                                View Details
                              </Dropdown.Item>
                              {preview.employeeQueries.some(q => q.status === 'pending') && (
                                <Dropdown.Item 
                                  onClick={() => {
                                    setSelectedPreview(preview);
                                    setSelectedQueryIndex(preview.employeeQueries.findIndex(q => q.status === 'pending'));
                                    setShowResponseModal(true);
                                  }}
                                >
                                  <FaReply className="me-2" />
                                  Respond to Query
                                </Dropdown.Item>
                              )}
                              <Dropdown.Item 
                                onClick={() => {
                                  setSelectedPreview(preview);
                                  setShowCorrectionsModal(true);
                                }}
                              >
                                <FaEdit className="me-2" />
                                Make Corrections
                              </Dropdown.Item>
                              <Dropdown.Divider />
                              <Dropdown.Item 
                                onClick={() => handleIndividualGenerate(preview.employee._id)}
                                className="text-success"
                              >
                                <FaPlus className="me-2" />
                                Regenerate Preview
                              </Dropdown.Item>
                              {(preview.status === 'acknowledged' || preview.isReviewExpired) && (
                                <Dropdown.Item 
                                  onClick={() => handleFinalizePreview(preview._id)}
                                >
                                  <FaCheckCircle className="me-2" />
                                  Finalize
                                </Dropdown.Item>
                              )}
                            </Dropdown.Menu>
                          </Dropdown>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              )}
            </Card.Body>
          </Card>
        </Tab>

        <Tab eventKey="attention" title={`Needs Attention (${attentionPreviews.length})`}>
          <Card>
            <Card.Body>
              {attentionPreviews.length === 0 ? (
                <Alert variant="success" className="text-center">
                  <FaCheckCircle size={48} className="mb-3" />
                  <h5>All Good!</h5>
                  <p>No previews require immediate attention.</p>
                </Alert>
              ) : (
                <Table responsive hover>
                  <thead>
                    <tr>
                      <th>Employee</th>
                      <th>Issue</th>
                      <th>Status</th>
                      <th>Priority</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {attentionPreviews.map((preview) => (
                      <tr key={preview._id}>
                        <td>
                          <strong>{preview.employee.name}</strong>
                          <br />
                          <small className="text-muted">{preview.employee.employeeId}</small>
                        </td>
                        <td>
                          {preview.status === 'query_raised' && 'Employee Query Pending'}
                          {preview.isReviewExpired && 'Review Period Expired'}
                        </td>
                        <td>{getStatusBadge(preview.status)}</td>
                        <td>
                          <Badge bg={preview.status === 'query_raised' ? 'danger' : 'warning'}>
                            {preview.status === 'query_raised' ? 'High' : 'Medium'}
                          </Badge>
                        </td>
                        <td>
                          <Button 
                            variant="primary" 
                            size="sm"
                            onClick={() => setSelectedPreview(preview)}
                          >
                            Review
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              )}
            </Card.Body>
          </Card>
        </Tab>
      </Tabs>

      {/* Response Modal */}
      <Modal show={showResponseModal} onHide={() => setShowResponseModal(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>Respond to Employee Query</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedPreview && selectedQueryIndex !== null && (
            <div>
              <Alert variant="info">
                <strong>Employee Query:</strong><br />
                {selectedPreview.employeeQueries[selectedQueryIndex]?.query}
              </Alert>
              <Form.Group>
                <Form.Label>Your Response</Form.Label>
                <Form.Control
                  as="textarea"
                  rows={4}
                  value={responseText}
                  onChange={(e) => setResponseText(e.target.value)}
                  placeholder="Enter your response to the employee's query..."
                />
              </Form.Group>
            </div>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowResponseModal(false)}>
            Cancel
          </Button>
          <Button 
            variant="primary" 
            onClick={handleRespondToQuery}
            disabled={!responseText.trim()}
          >
            Send Response
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Preview Details Modal */}
      {selectedPreview && !showResponseModal && !showCorrectionsModal && (
        <Modal 
          show={!!selectedPreview} 
          onHide={() => setSelectedPreview(null)} 
          size="xl"
        >
          <Modal.Header closeButton>
            <Modal.Title>
              Salary Preview - {selectedPreview.employee.name}
            </Modal.Title>
          </Modal.Header>
          <Modal.Body>
            {/* Preview details would go here - similar to employee view but with HR controls */}
            <Row>
              <Col md={6}>
                <h6>Working Days Breakdown</h6>
                <Table size="sm">
                  <tbody>
                    <tr>
                      <td>Total Days</td>
                      <td>{selectedPreview.workingDaysBreakdown.totalDays}</td>
                    </tr>
                    <tr>
                      <td>Working Days</td>
                      <td>{selectedPreview.workingDaysBreakdown.workingDays}</td>
                    </tr>
                    <tr>
                      <td>Weekends</td>
                      <td>{selectedPreview.workingDaysBreakdown.weekends}</td>
                    </tr>
                    <tr>
                      <td>Holidays</td>
                      <td>{selectedPreview.workingDaysBreakdown.holidays}</td>
                    </tr>
                  </tbody>
                </Table>
              </Col>
              <Col md={6}>
                <h6>Leave Impact</h6>
                <Table size="sm">
                  <tbody>
                    <tr>
                      <td>Per Day Salary</td>
                      <td>{formatCurrency(selectedPreview.leaveImpact.perDaySalary)}</td>
                    </tr>
                    <tr>
                      <td>Paid Leaves</td>
                      <td>{selectedPreview.leaveImpact.paidLeaves} days</td>
                    </tr>
                    <tr>
                      <td>Unpaid Leaves</td>
                      <td>{selectedPreview.leaveImpact.unpaidLeaves} days</td>
                    </tr>
                    <tr>
                      <td>Deduction</td>
                      <td>{formatCurrency(selectedPreview.leaveImpact.deductionAmount)}</td>
                    </tr>
                  </tbody>
                </Table>
              </Col>
            </Row>
            
            <Alert variant="success" className="text-center mt-3">
              <h5>Net Salary: {formatCurrency(selectedPreview.salaryBreakdown.netSalary)}</h5>
            </Alert>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setSelectedPreview(null)}>
              Close
            </Button>
          </Modal.Footer>
        </Modal>
      )}

      {/* Generate Preview Modal */}
      <Modal show={showGenerateModal} onHide={() => setShowGenerateModal(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>
            Generate Salary Previews - {
              generateType === 'individual' ? 'Individual Employee' :
              generateType === 'department' ? 'By Department' :
              generateType === 'selected' ? 'Selected Employees' : 'Bulk'
            }
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {generateType === 'individual' && (
            <div>
              <Form.Group className="mb-3">
                <Form.Label>Select Employee</Form.Label>
                <Form.Select
                  value={selectedEmployees[0] || ''}
                  onChange={(e) => setSelectedEmployees(e.target.value ? [e.target.value] : [])}
                >
                  <option value="">Choose an employee...</option>
                  {employees.map(emp => (
                    <option key={emp._id} value={emp._id}>
                      {emp.name} - {emp.employeeId} ({emp.department?.name || 'No Department'})
                    </option>
                  ))}
                </Form.Select>
              </Form.Group>
              <Alert variant="info">
                <small>Generate salary preview for a single employee for {new Date(selectedYear, selectedMonth - 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</small>
              </Alert>
            </div>
          )}

          {generateType === 'department' && (
            <div>
              <Form.Group className="mb-3">
                <Form.Label>Select Department</Form.Label>
                <Form.Select
                  value={selectedDepartment}
                  onChange={(e) => setSelectedDepartment(e.target.value)}
                >
                  <option value="">Choose a department...</option>
                  {departments.map(dept => (
                    <option key={dept._id} value={dept._id}>
                      {dept.name} ({employees.filter(emp => emp.department?._id === dept._id).length} employees)
                    </option>
                  ))}
                </Form.Select>
              </Form.Group>
              {selectedDepartment && (
                <Alert variant="info">
                  <small>
                    This will generate previews for {employees.filter(emp => emp.department?._id === selectedDepartment).length} employees 
                    in {departments.find(d => d._id === selectedDepartment)?.name} department
                  </small>
                </Alert>
              )}
            </div>
          )}

          {generateType === 'selected' && (
            <div>
              <Form.Group className="mb-3">
                <Form.Label>Select Employees ({selectedEmployees.length} selected)</Form.Label>
                <div style={{ maxHeight: '300px', overflowY: 'auto', border: '1px solid #dee2e6', borderRadius: '0.375rem', padding: '0.5rem' }}>
                  {employees.map(emp => (
                    <Form.Check
                      key={emp._id}
                      type="checkbox"
                      id={`emp-${emp._id}`}
                      label={`${emp.name} - ${emp.employeeId} (${emp.department?.name || 'No Department'})`}
                      checked={selectedEmployees.includes(emp._id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedEmployees([...selectedEmployees, emp._id]);
                        } else {
                          setSelectedEmployees(selectedEmployees.filter(id => id !== emp._id));
                        }
                      }}
                      className="mb-2"
                    />
                  ))}
                </div>
              </Form.Group>
              <div className="d-flex gap-2 mb-3">
                <Button 
                  variant="outline-primary" 
                  size="sm"
                  onClick={() => setSelectedEmployees(employees.map(emp => emp._id))}
                >
                  Select All
                </Button>
                <Button 
                  variant="outline-secondary" 
                  size="sm"
                  onClick={() => setSelectedEmployees([])}
                >
                  Clear All
                </Button>
              </div>
              {selectedEmployees.length > 0 && (
                <Alert variant="info">
                  <small>Generate previews for {selectedEmployees.length} selected employees</small>
                </Alert>
              )}
            </div>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => {
            setShowGenerateModal(false);
            setSelectedEmployees([]);
            setSelectedDepartment('');
          }}>
            Cancel
          </Button>
          <Button 
            variant="primary" 
            onClick={() => {
              if (generateType === 'individual' && selectedEmployees[0]) {
                handleIndividualGenerate(selectedEmployees[0]);
                setShowGenerateModal(false);
                setSelectedEmployees([]);
              } else if (generateType === 'department' && selectedDepartment) {
                handleDepartmentGenerate(selectedDepartment);
                setShowGenerateModal(false);
                setSelectedDepartment('');
              } else if (generateType === 'selected') {
                handleSelectedEmployeesGenerate();
              }
            }}
            disabled={
              (generateType === 'individual' && !selectedEmployees[0]) ||
              (generateType === 'department' && !selectedDepartment) ||
              (generateType === 'selected' && selectedEmployees.length === 0)
            }
          >
            Generate Previews
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
};

export default HRSalaryPreviewManagement;