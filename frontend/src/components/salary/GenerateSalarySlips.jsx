import { useState, useEffect } from "react";
import {
  Row,
  Col,
  Card,
  Button,
  Form,
  Alert,
  Spinner,
  Modal,
  Table,
  Badge,
} from "react-bootstrap";
import {
  FaFileInvoiceDollar,
  FaUsers,
  FaEnvelope,
  FaCheck,
  FaTimes,
} from "react-icons/fa";
import { toast } from "react-toastify";
import { salarySlipApi } from "../../api/salaryApi";
import { payrollPeriodApi } from "../../api/payrollPeriodApi";
import api from "../../services/api";
import { getCompanyYearOptions } from "../../constants/branding";

const GenerateSalarySlips = () => {
  // Default to previous month — current month's slips are typically not generated yet
  const getPrevMonth = () => {
    const now = new Date();
    const m = now.getMonth(); // 0-indexed = previous month as 1-indexed
    return { month: m === 0 ? 12 : m, year: m === 0 ? now.getFullYear() - 1 : now.getFullYear() };
  };
  const prev = getPrevMonth();

  const [formData, setFormData] = useState({
    month: prev.month,
    year: prev.year,
    paymentDate: "",
  });
  const [employees, setEmployees] = useState([]);
  const [selectedEmployee, setSelectedEmployee] = useState("");
  const [employeeSearchTerm, setEmployeeSearchTerm] = useState("");
  const [showEmployeeDropdown, setShowEmployeeDropdown] = useState(false);
  const [loading, setLoading] = useState(false);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [showResultModal, setShowResultModal] = useState(false);
  const [bulkResults, setBulkResults] = useState(null);
  const [gate, setGate] = useState(null);

  useEffect(() => {
    fetchEmployees();
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await payrollPeriodApi.gatesStatus({
          month: formData.month,
          year: formData.year,
        });
        if (!cancelled) setGate(res.data?.data || null);
      } catch {
        if (!cancelled) setGate(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [formData.month, formData.year]);

  const generateBlocked = Boolean(gate?.enabled && !gate?.allowed?.generate);

  const fetchEmployees = async () => {
    try {
      const response = await api.get("/users/employees");
      // The API returns employees directly as an array
      setEmployees(response.data || []);
    } catch (error) {
      console.error("Error fetching employees:", error);
      toast.error("Failed to load employees");
    }
  };

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleGenerateSingle = async (e) => {
    e.preventDefault();

    if (generateBlocked) {
      toast.error(
        "Payroll period gates block generate for this month. Open or unfreeze the period under Pay Periods."
      );
      return;
    }
    
    if (!selectedEmployee) {
      toast.error("Please select an employee");
      return;
    }

    try {
      setLoading(true);
      const data = {
        employeeId: selectedEmployee,
        month: formData.month,
        year: formData.year,
        paymentDate: formData.paymentDate || undefined,
      };

      await salarySlipApi.generate(data);
      toast.success("Salary slip generated successfully");
      
      // Reset form
      setSelectedEmployee("");
      setEmployeeSearchTerm("");
    } catch (error) {
      console.error("Error generating salary slip:", error);
      const message = error.response?.data?.message || "Failed to generate salary slip";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateBulk = async () => {
    if (generateBlocked) {
      toast.error(
        "Payroll period gates block generate for this month. Open or unfreeze the period under Pay Periods."
      );
      return;
    }
    try {
      setBulkLoading(true);
      const data = {
        month: formData.month,
        year: formData.year,
        paymentDate: formData.paymentDate || undefined,
      };

      const response = await salarySlipApi.generateBulk(data);
      setBulkResults(response.data);
      setShowResultModal(true);
      
      if (response.data.summary.success > 0) {
        toast.success(`Generated ${response.data.summary.success} salary slips successfully`);
      }
    } catch (error) {
      console.error("Error generating bulk salary slips:", error);
      const message = error.response?.data?.message || "Failed to generate salary slips";
      toast.error(message);
    } finally {
      setBulkLoading(false);
    }
  };

  const handleSendBulkEmails = async () => {
    try {
      setBulkLoading(true);
      const data = {
        month: formData.month,
        year: formData.year,
      };

      const response = await salarySlipApi.sendBulkEmails(data);
      
      if (response.data.summary.success > 0) {
        toast.success(`Sent ${response.data.summary.success} emails successfully`);
      }
      
      if (response.data.summary.failed > 0) {
        toast.warning(`${response.data.summary.failed} emails failed to send`);
      }
    } catch (error) {
      console.error("Error sending bulk emails:", error);
      toast.error("Failed to send emails");
    } finally {
      setBulkLoading(false);
    }
  };

  const months = [
    { value: 1, label: "January" },
    { value: 2, label: "February" },
    { value: 3, label: "March" },
    { value: 4, label: "April" },
    { value: 5, label: "May" },
    { value: 6, label: "June" },
    { value: 7, label: "July" },
    { value: 8, label: "August" },
    { value: 9, label: "September" },
    { value: 10, label: "October" },
    { value: 11, label: "November" },
    { value: 12, label: "December" },
  ];

  const years = getCompanyYearOptions();

  return (
    <>
      <Row>
        {/* Single Employee Generation */}
        <Col md={6}>
          <Card className="h-100">
            <Card.Header className="bg-primary text-white">
              <h5 className="mb-0">
                <FaFileInvoiceDollar className="me-2" />
                Generate Single Slip
              </h5>
            </Card.Header>
            <Card.Body>
              {generateBlocked && (
                <Alert variant="warning" className="py-2">
                  Period gates are on
                  {gate?.status
                    ? ` (status: ${gate.status})`
                    : " (period not opened)"}
                  . Generate requires an <strong>open</strong> or{" "}
                  <strong>frozen</strong> pay period.
                </Alert>
              )}
              <Form onSubmit={handleGenerateSingle}>
                <Row className="mb-3">
                  <Col md={6}>
                    <Form.Group>
                      <Form.Label>Month</Form.Label>
                      <Form.Select
                        value={formData.month}
                        onChange={(e) => handleInputChange("month", parseInt(e.target.value))}
                        required
                      >
                        {months.map((month) => (
                          <option key={month.value} value={month.value}>
                            {month.label}
                          </option>
                        ))}
                      </Form.Select>
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group>
                      <Form.Label>Year</Form.Label>
                      <Form.Select
                        value={formData.year}
                        onChange={(e) => handleInputChange("year", parseInt(e.target.value))}
                        required
                      >
                        {years.map((year) => (
                          <option key={year} value={year}>
                            {year}
                          </option>
                        ))}
                      </Form.Select>
                    </Form.Group>
                  </Col>
                </Row>

                <Form.Group className="mb-3">
                  <Form.Label>Employee</Form.Label>
                  <div className="position-relative">
                    <Form.Control
                      type="text"
                      placeholder="Type to search employees..."
                      value={employeeSearchTerm}
                      onChange={(e) => {
                        setEmployeeSearchTerm(e.target.value);
                        setShowEmployeeDropdown(true);
                        setSelectedEmployee(''); // Clear selection when typing
                      }}
                      onFocus={() => setShowEmployeeDropdown(true)}
                      required={!selectedEmployee}
                    />
                    
                    {/* Selected employee display */}
                    {selectedEmployee && !showEmployeeDropdown && (
                      <div className="mt-2">
                        <span className="badge bg-primary me-2">
                          {employees.find(emp => emp._id === selectedEmployee)?.name}
                          <button
                            type="button"
                            className="btn-close btn-close-white ms-2"
                            style={{ fontSize: '0.7em' }}
                            onClick={() => {
                              setSelectedEmployee('');
                              setEmployeeSearchTerm('');
                            }}
                          ></button>
                        </span>
                      </div>
                    )}

                    {/* Dropdown list */}
                    {showEmployeeDropdown && (
                      <div 
                        className="position-absolute w-100 bg-white border rounded shadow-sm mt-1"
                        style={{ 
                          top: '100%', 
                          zIndex: 1000, 
                          maxHeight: '200px', 
                          overflowY: 'auto' 
                        }}
                      >
                        {employees
                          .filter(emp => 
                            emp.name.toLowerCase().includes(employeeSearchTerm.toLowerCase())
                          )
                          .slice(0, 10) // Limit to 10 results for performance
                          .map((employee) => (
                            <div
                              key={employee._id}
                              className="p-2 border-bottom"
                              style={{ cursor: 'pointer' }}
                              onMouseEnter={(e) => e.target.style.backgroundColor = '#f8f9fa'}
                              onMouseLeave={(e) => e.target.style.backgroundColor = 'white'}
                              onClick={() => {
                                setSelectedEmployee(employee._id);
                                setEmployeeSearchTerm(employee.name);
                                setShowEmployeeDropdown(false);
                              }}
                            >
                              <div className="fw-medium">{employee.name}</div>
                              {employee.department && (
                                <small className="text-muted">{employee.department.name}</small>
                              )}
                            </div>
                          ))
                        }
                        {employees.filter(emp => 
                          emp.name.toLowerCase().includes(employeeSearchTerm.toLowerCase())
                        ).length === 0 && (
                          <div className="p-3 text-muted text-center">
                            No employees found matching "{employeeSearchTerm}"
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  
                  {/* Click outside to close dropdown */}
                  {showEmployeeDropdown && (
                    <div 
                      className="position-fixed w-100 h-100"
                      style={{ top: 0, left: 0, zIndex: 999 }}
                      onClick={() => setShowEmployeeDropdown(false)}
                    />
                  )}
                </Form.Group>

                <Form.Group className="mb-3">
                  <Form.Label>Payment Date (Optional)</Form.Label>
                  <Form.Control
                    type="date"
                    value={formData.paymentDate}
                    onChange={(e) => handleInputChange("paymentDate", e.target.value)}
                  />
                </Form.Group>

                <div className="d-grid">
                  <Button
                    type="submit"
                    variant="primary"
                    disabled={loading || generateBlocked}
                  >
                    {loading ? (
                      <>
                        <Spinner
                          as="span"
                          animation="border"
                          size="sm"
                          className="me-2"
                        />
                        Generating...
                      </>
                    ) : (
                      <>
                        <FaFileInvoiceDollar className="me-2" />
                        Generate Slip
                      </>
                    )}
                  </Button>
                </div>
              </Form>
            </Card.Body>
          </Card>
        </Col>

        {/* Bulk Generation */}
        <Col md={6}>
          <Card className="h-100">
            <Card.Header className="bg-success text-white">
              <h5 className="mb-0">
                <FaUsers className="me-2" />
                Bulk Operations
              </h5>
            </Card.Header>
            <Card.Body>
              {generateBlocked && (
                <Alert variant="warning" className="py-2">
                  Period gates block bulk generate until the pay period is open or
                  frozen.
                </Alert>
              )}
              <Row className="mb-3">
                <Col md={6}>
                  <Form.Group>
                    <Form.Label>Month</Form.Label>
                    <Form.Select
                      value={formData.month}
                      onChange={(e) => handleInputChange("month", parseInt(e.target.value))}
                    >
                      {months.map((month) => (
                        <option key={month.value} value={month.value}>
                          {month.label}
                        </option>
                      ))}
                    </Form.Select>
                  </Form.Group>
                </Col>
                <Col md={6}>
                  <Form.Group>
                    <Form.Label>Year</Form.Label>
                    <Form.Select
                      value={formData.year}
                      onChange={(e) => handleInputChange("year", parseInt(e.target.value))}
                    >
                      {years.map((year) => (
                        <option key={year} value={year}>
                          {year}
                        </option>
                      ))}
                    </Form.Select>
                  </Form.Group>
                </Col>
              </Row>

              <Form.Group className="mb-3">
                <Form.Label>Payment Date (Optional)</Form.Label>
                <Form.Control
                  type="date"
                  value={formData.paymentDate}
                  onChange={(e) => handleInputChange("paymentDate", e.target.value)}
                />
              </Form.Group>

              <Alert variant="info" className="mb-3">
                <small>
                  This will generate salary slips for all active employees who don't
                  already have a slip for the selected month.
                </small>
              </Alert>

              <div className="d-grid gap-2">
                <Button
                  variant="success"
                  onClick={handleGenerateBulk}
                  disabled={bulkLoading || generateBlocked}
                >
                  {bulkLoading ? (
                    <>
                      <Spinner
                        as="span"
                        animation="border"
                        size="sm"
                        className="me-2"
                      />
                      Processing...
                    </>
                  ) : (
                    <>
                      <FaUsers className="me-2" />
                      Generate All Slips
                    </>
                  )}
                </Button>

                <Button
                  variant="outline-primary"
                  onClick={handleSendBulkEmails}
                  disabled={bulkLoading}
                >
                  {bulkLoading ? (
                    <>
                      <Spinner
                        as="span"
                        animation="border"
                        size="sm"
                        className="me-2"
                      />
                      Sending...
                    </>
                  ) : (
                    <>
                      <FaEnvelope className="me-2" />
                      Send All Emails
                    </>
                  )}
                </Button>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Bulk Results Modal */}
      <Modal
        show={showResultModal}
        onHide={() => setShowResultModal(false)}
        size="lg"
      >
        <Modal.Header closeButton>
          <Modal.Title>Bulk Generation Results</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {bulkResults && (
            <>
              {/* Summary */}
              <Row className="mb-4">
                <Col md={4}>
                  <Card className="text-center">
                    <Card.Body>
                      <h3 className="text-success">{bulkResults.summary.success}</h3>
                      <p className="mb-0">Successful</p>
                    </Card.Body>
                  </Card>
                </Col>
                <Col md={4}>
                  <Card className="text-center">
                    <Card.Body>
                      <h3 className="text-danger">{bulkResults.summary.failed}</h3>
                      <p className="mb-0">Failed</p>
                    </Card.Body>
                  </Card>
                </Col>
                <Col md={4}>
                  <Card className="text-center">
                    <Card.Body>
                      <h3 className="text-warning">{bulkResults.summary.skipped}</h3>
                      <p className="mb-0">Skipped</p>
                    </Card.Body>
                  </Card>
                </Col>
              </Row>

              {/* Detailed Results */}
              <Table responsive striped>
                <thead>
                  <tr>
                    <th>Employee ID</th>
                    <th>Name</th>
                    <th>Status</th>
                    <th>Reason</th>
                  </tr>
                </thead>
                <tbody>
                  {bulkResults.results.success.map((item) => (
                    <tr key={item.employeeId}>
                      <td>{item.employeeId}</td>
                      <td>{item.name}</td>
                      <td>
                        <Badge bg="success">
                          <FaCheck className="me-1" />
                          Success
                        </Badge>
                      </td>
                      <td>-</td>
                    </tr>
                  ))}
                  {bulkResults.results.failed.map((item) => (
                    <tr key={item.employeeId}>
                      <td>{item.employeeId}</td>
                      <td>{item.name}</td>
                      <td>
                        <Badge bg="danger">
                          <FaTimes className="me-1" />
                          Failed
                        </Badge>
                      </td>
                      <td>{item.reason}</td>
                    </tr>
                  ))}
                  {bulkResults.results.skipped.map((item) => (
                    <tr key={item.employeeId}>
                      <td>{item.employeeId}</td>
                      <td>{item.name}</td>
                      <td>
                        <Badge bg="warning">Skipped</Badge>
                      </td>
                      <td>{item.reason}</td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowResultModal(false)}>
            Close
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  );
};

export default GenerateSalarySlips;