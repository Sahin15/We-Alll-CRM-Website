import { useState, useEffect } from "react";
import {
  Container,
  Row,
  Col,
  Card,
  Table,
  Badge,
  Button,
  Form,
  Alert,
  Spinner,
  Modal,
  Dropdown,
  ButtonGroup,
} from "react-bootstrap";
import {
  FaClock,
  FaCalendarAlt,
  FaDownload,
  FaEye,
  FaExclamationTriangle,
  FaCheckCircle,
  FaTimesCircle,
  FaEdit,
  FaArrowLeft,
  FaFileCsv,
  FaFilePdf,
} from "react-icons/fa";
import { useParams, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import api from "../../services/api";

const EmployeeAttendanceReport = () => {
  const { employeeId } = useParams();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(true);
  const [employee, setEmployee] = useState(null);
  const [attendance, setAttendance] = useState([]);
  const [summary, setSummary] = useState({
    totalDays: 0,
    present: 0,
    late: 0,
    halfDay: 0,
    absent: 0,
    onLeave: 0,
    totalWorkHours: 0,
    totalOvertime: 0,
    manuallyModified: 0,
    averageClockIn: "N/A",
    averageWorkHours: 0,
  });
  
  // Month/Year selection
  const currentDate = new Date();
  const [selectedMonth, setSelectedMonth] = useState(currentDate.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(currentDate.getFullYear());
  
  // Modal for viewing details
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState(null);

  useEffect(() => {
    if (employeeId) {
      fetchAttendanceData();
    }
  }, [employeeId, selectedMonth, selectedYear]);

  const fetchAttendanceData = async () => {
    try {
      setLoading(true);
      const response = await api.get(
        `/attendance/summary/${employeeId}?month=${selectedMonth}&year=${selectedYear}`
      );
      
      setEmployee(response.data.employee);
      setAttendance(response.data.attendance || []);
      setSummary(response.data.summary || {
        totalDays: 0,
        present: 0,
        late: 0,
        halfDay: 0,
        absent: 0,
        onLeave: 0,
        totalWorkHours: 0,
        totalOvertime: 0,
        manuallyModified: 0,
        averageClockIn: "N/A",
        averageWorkHours: 0,
      });
    } catch (error) {
      console.error("Error fetching attendance data:", error);
      toast.error("Failed to load attendance data");
      // Set empty data on error
      setAttendance([]);
      setSummary({
        totalDays: 0,
        present: 0,
        late: 0,
        halfDay: 0,
        absent: 0,
        onLeave: 0,
        totalWorkHours: 0,
        totalOvertime: 0,
        manuallyModified: 0,
        averageClockIn: "N/A",
        averageWorkHours: 0,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleViewDetails = (record) => {
    setSelectedRecord(record);
    setShowDetailsModal(true);
  };

  const formatTime = (time) => {
    if (!time) return "N/A";
    return new Date(time).toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString("en-US", {
      weekday: "short",
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const calculateWorkHours = (clockIn, clockOut) => {
    if (!clockIn || !clockOut) return "N/A";
    const start = new Date(clockIn);
    const end = new Date(clockOut);
    const diff = (end - start) / (1000 * 60 * 60);
    return `${diff.toFixed(2)}h`;
  };

  const getStatusBadge = (status) => {
    const variants = {
      present: "success",
      absent: "danger",
      late: "warning",
      "half-day": "info",
      "on-leave": "secondary",
    };
    const icons = {
      present: <FaCheckCircle className="me-1" />,
      absent: <FaTimesCircle className="me-1" />,
      late: <FaExclamationTriangle className="me-1" />,
      "half-day": <FaClock className="me-1" />,
      "on-leave": <FaCalendarAlt className="me-1" />,
    };
    return (
      <Badge bg={variants[status] || "secondary"}>
        {icons[status]}
        {status}
      </Badge>
    );
  };

  const handleExportCSV = () => {
    // Create CSV content
    const headers = ["Date", "Day", "Clock In", "Clock Out", "Work Hours", "Status", "Modified"];
    const rows = attendance.map((record) => [
      new Date(record.date).toLocaleDateString(),
      new Date(record.date).toLocaleDateString("en-US", { weekday: "long" }),
      formatTime(record.clockIn),
      formatTime(record.clockOut),
      calculateWorkHours(record.clockIn, record.clockOut),
      record.status,
      record.isManuallyModified ? "Yes" : "No",
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map((row) => row.join(",")),
    ].join("\n");

    // Download CSV
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${employee?.name || "employee"}_attendance_${selectedMonth}_${selectedYear}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    
    toast.success("CSV exported successfully!");
  };

  const handleExportPDF = () => {
    // Create a printable version
    const printWindow = window.open('', '_blank');
    const monthName = months[selectedMonth - 1];
    
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Attendance Report - ${employee?.name}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; }
          h1 { color: #333; border-bottom: 2px solid #007bff; padding-bottom: 10px; }
          .header { margin-bottom: 20px; }
          .stats { display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px; margin: 20px 0; }
          .stat-card { border: 1px solid #ddd; padding: 15px; border-radius: 5px; text-align: center; }
          .stat-value { font-size: 24px; font-weight: bold; margin: 10px 0; }
          .stat-label { color: #666; font-size: 14px; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
          th { background-color: #f8f9fa; font-weight: bold; }
          .modified { background-color: #fff3cd; }
          .status-present { color: #28a745; }
          .status-late { color: #ffc107; }
          .status-halfday { color: #17a2b8; }
          .status-absent { color: #dc3545; }
          @media print {
            .no-print { display: none; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Attendance Report</h1>
          <p><strong>Employee:</strong> ${employee?.name}</p>
          <p><strong>Email:</strong> ${employee?.email}</p>
          <p><strong>Department:</strong> ${employee?.department?.name || 'N/A'}</p>
          <p><strong>Period:</strong> ${monthName} ${selectedYear}</p>
        </div>
        
        <div class="stats">
          <div class="stat-card">
            <div class="stat-label">Present</div>
            <div class="stat-value" style="color: #28a745;">${summary.present}</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">Late</div>
            <div class="stat-value" style="color: #ffc107;">${summary.late}</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">Half Day</div>
            <div class="stat-value" style="color: #17a2b8;">${summary.halfDay}</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">Absent</div>
            <div class="stat-value" style="color: #dc3545;">${summary.absent}</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">Total Hours</div>
            <div class="stat-value">${summary.totalWorkHours.toFixed(2)}h</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">Avg Hours/Day</div>
            <div class="stat-value">${summary.averageWorkHours}h</div>
          </div>
        </div>
        
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Day</th>
              <th>Clock In</th>
              <th>Clock Out</th>
              <th>Work Hours</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            ${attendance.map((record) => `
              <tr class="${record.isManuallyModified ? 'modified' : ''}">
                <td>${new Date(record.date).toLocaleDateString()}</td>
                <td>${new Date(record.date).toLocaleDateString("en-US", { weekday: "long" })}</td>
                <td>${formatTime(record.clockIn)}</td>
                <td>${formatTime(record.clockOut)}</td>
                <td>${calculateWorkHours(record.clockIn, record.clockOut)}</td>
                <td class="status-${record.status}">${record.status}${record.isManuallyModified ? ' (Modified)' : ''}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        
        <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd;">
          <p style="color: #666; font-size: 12px;">
            Generated on ${new Date().toLocaleString()}<br>
            Yellow highlighted rows indicate manually modified records.
          </p>
        </div>
        
        <div class="no-print" style="margin-top: 20px; text-align: center;">
          <button onclick="window.print()" style="padding: 10px 20px; background: #007bff; color: white; border: none; border-radius: 5px; cursor: pointer;">
            Print / Save as PDF
          </button>
          <button onclick="window.close()" style="padding: 10px 20px; background: #6c757d; color: white; border: none; border-radius: 5px; cursor: pointer; margin-left: 10px;">
            Close
          </button>
        </div>
      </body>
      </html>
    `;
    
    printWindow.document.write(htmlContent);
    printWindow.document.close();
    
    toast.success("PDF preview opened! Use Print to save as PDF.");
  };

  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  const years = Array.from({ length: 5 }, (_, i) => currentDate.getFullYear() - i);

  if (loading) {
    return (
      <Container fluid className="py-4">
        <div className="text-center py-5">
          <Spinner animation="border" variant="primary" />
          <p className="mt-3 text-muted">Loading attendance data...</p>
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
              <Button
                variant="outline-secondary"
                size="sm"
                onClick={() => navigate(-1)}
                className="me-3"
              >
                <FaArrowLeft className="me-2" />
                Back
              </Button>
              <h3 className="d-inline-block mb-0">
                <FaClock className="me-2 text-primary" />
                Attendance Report
              </h3>
            </div>
            <Dropdown as={ButtonGroup}>
              <Button variant="success" onClick={handleExportCSV}>
                <FaDownload className="me-2" />
                Export
              </Button>
              <Dropdown.Toggle split variant="success" />
              <Dropdown.Menu>
                <Dropdown.Item onClick={handleExportCSV}>
                  <FaFileCsv className="me-2" />
                  Export as CSV
                </Dropdown.Item>
                <Dropdown.Item onClick={handleExportPDF}>
                  <FaFilePdf className="me-2" />
                  Export as PDF
                </Dropdown.Item>
              </Dropdown.Menu>
            </Dropdown>
          </div>
        </Col>
      </Row>

      {/* Employee Info */}
      {employee && (
        <Card className="mb-4 border-0 shadow-sm">
          <Card.Body>
            <Row>
              <Col md={6}>
                <h5 className="mb-3">{employee.name}</h5>
                <p className="mb-1">
                  <strong>Email:</strong> {employee.email}
                </p>
                <p className="mb-0">
                  <strong>Department:</strong> {employee.department?.name || "N/A"}
                </p>
              </Col>
              <Col md={6} className="text-md-end">
                <Form.Group className="d-inline-block me-3">
                  <Form.Select
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                    style={{ width: "150px" }}
                  >
                    {months.map((month, index) => (
                      <option key={index} value={index + 1}>
                        {month}
                      </option>
                    ))}
                  </Form.Select>
                </Form.Group>
                <Form.Group className="d-inline-block">
                  <Form.Select
                    value={selectedYear}
                    onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                    style={{ width: "120px" }}
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
          </Card.Body>
        </Card>
      )}

      {/* Summary Statistics */}
      <Row className="mb-4">
        <Col lg={2} md={4} sm={6} className="mb-3">
          <Card className="border-0 bg-success bg-opacity-10 h-100">
            <Card.Body className="text-center">
              <FaCheckCircle className="text-success fs-2 mb-2" />
              <h3 className="mb-0 text-success">{summary.present}</h3>
              <small className="text-muted">Present</small>
            </Card.Body>
          </Card>
        </Col>
        <Col lg={2} md={4} sm={6} className="mb-3">
          <Card className="border-0 bg-warning bg-opacity-10 h-100">
            <Card.Body className="text-center">
              <FaExclamationTriangle className="text-warning fs-2 mb-2" />
              <h3 className="mb-0 text-warning">{summary.late}</h3>
              <small className="text-muted">Late</small>
            </Card.Body>
          </Card>
        </Col>
        <Col lg={2} md={4} sm={6} className="mb-3">
          <Card className="border-0 bg-info bg-opacity-10 h-100">
            <Card.Body className="text-center">
              <FaClock className="text-info fs-2 mb-2" />
              <h3 className="mb-0 text-info">{summary.halfDay}</h3>
              <small className="text-muted">Half Day</small>
            </Card.Body>
          </Card>
        </Col>
        <Col lg={2} md={4} sm={6} className="mb-3">
          <Card className="border-0 bg-danger bg-opacity-10 h-100">
            <Card.Body className="text-center">
              <FaTimesCircle className="text-danger fs-2 mb-2" />
              <h3 className="mb-0 text-danger">{summary.absent}</h3>
              <small className="text-muted">Absent</small>
            </Card.Body>
          </Card>
        </Col>
        <Col lg={2} md={4} sm={6} className="mb-3">
          <Card className="border-0 bg-secondary bg-opacity-10 h-100">
            <Card.Body className="text-center">
              <FaCalendarAlt className="text-secondary fs-2 mb-2" />
              <h3 className="mb-0 text-secondary">{summary.onLeave}</h3>
              <small className="text-muted">On Leave</small>
            </Card.Body>
          </Card>
        </Col>
        <Col lg={2} md={4} sm={6} className="mb-3">
          <Card className="border-0 bg-primary bg-opacity-10 h-100">
            <Card.Body className="text-center">
              <FaClock className="text-primary fs-2 mb-2" />
              <h3 className="mb-0 text-primary">{summary.totalDays}</h3>
              <small className="text-muted">Total Days</small>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Additional Statistics */}
      <Row className="mb-4">
        <Col md={3}>
          <Card className="border-0 shadow-sm h-100">
            <Card.Body className="text-center">
              <h4 className="mb-0">{summary.totalWorkHours.toFixed(2)}h</h4>
              <small className="text-muted">Total Work Hours</small>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3}>
          <Card className="border-0 shadow-sm h-100">
            <Card.Body className="text-center">
              <h4 className="mb-0">{summary.averageWorkHours}h</h4>
              <small className="text-muted">Avg Hours/Day</small>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3}>
          <Card className="border-0 shadow-sm h-100">
            <Card.Body className="text-center">
              <h4 className="mb-0">{summary.averageClockIn}</h4>
              <small className="text-muted">Avg Clock In</small>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3}>
          <Card className="border-0 shadow-sm h-100">
            <Card.Body className="text-center">
              <h4 className="mb-0 text-warning">{summary.manuallyModified}</h4>
              <small className="text-muted">Modified Records</small>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Attendance Table */}
      <Card className="border-0 shadow-sm">
        <Card.Header className="bg-white">
          <h5 className="mb-0">
            Detailed Attendance - {months[selectedMonth - 1]} {selectedYear}
          </h5>
        </Card.Header>
        <Card.Body className="p-0">
          {attendance.length > 0 ? (
            <div className="table-responsive">
              <Table hover className="mb-0">
                <thead className="bg-light">
                  <tr>
                    <th>Date</th>
                    <th>Day</th>
                    <th>Clock In</th>
                    <th>Clock Out</th>
                    <th>Work Hours</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {attendance.map((record) => (
                    <tr
                      key={record._id}
                      style={{
                        backgroundColor: record.isManuallyModified
                          ? "rgba(255, 193, 7, 0.1)"
                          : "transparent",
                        borderLeft: record.isManuallyModified
                          ? "3px solid #ffc107"
                          : "none",
                      }}
                      title={
                        record.isManuallyModified
                          ? "This record has been manually modified"
                          : ""
                      }
                    >
                      <td>{formatDate(record.date)}</td>
                      <td>
                        {new Date(record.date).toLocaleDateString("en-US", {
                          weekday: "long",
                        })}
                      </td>
                      <td>
                        <span
                          className={
                            record.status === "late" ? "text-warning fw-bold" : ""
                          }
                        >
                          {formatTime(record.clockIn)}
                        </span>
                      </td>
                      <td>{formatTime(record.clockOut)}</td>
                      <td>
                        <Badge bg="secondary">
                          {calculateWorkHours(record.clockIn, record.clockOut)}
                        </Badge>
                      </td>
                      <td>
                        {getStatusBadge(record.status)}
                        {record.isManuallyModified && (
                          <Badge bg="warning" className="ms-2">
                            <FaEdit className="me-1" />
                            Modified
                          </Badge>
                        )}
                      </td>
                      <td>
                        <Button
                          size="sm"
                          variant="outline-primary"
                          onClick={() => handleViewDetails(record)}
                        >
                          <FaEye />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </div>
          ) : (
            <Alert variant="info" className="m-3 text-center">
              <FaCalendarAlt className="fs-1 mb-3 opacity-25" />
              <p className="mb-0">No attendance records found for this month</p>
            </Alert>
          )}
        </Card.Body>
      </Card>

      {/* Details Modal */}
      <Modal
        show={showDetailsModal}
        onHide={() => setShowDetailsModal(false)}
        size="lg"
        centered
      >
        <Modal.Header closeButton>
          <Modal.Title>Attendance Details</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedRecord && (
            <>
              <Row className="mb-3">
                <Col md={6}>
                  <strong>Date:</strong>
                  <p>{formatDate(selectedRecord.date)}</p>
                </Col>
                <Col md={6}>
                  <strong>Status:</strong>
                  <p>{getStatusBadge(selectedRecord.status)}</p>
                </Col>
              </Row>

              <Row className="mb-3">
                <Col md={4}>
                  <strong>Clock In:</strong>
                  <p>{formatTime(selectedRecord.clockIn)}</p>
                </Col>
                <Col md={4}>
                  <strong>Clock Out:</strong>
                  <p>{formatTime(selectedRecord.clockOut)}</p>
                </Col>
                <Col md={4}>
                  <strong>Work Hours:</strong>
                  <p>
                    {calculateWorkHours(
                      selectedRecord.clockIn,
                      selectedRecord.clockOut
                    )}
                  </p>
                </Col>
              </Row>

              {selectedRecord.notes && (
                <Row className="mb-3">
                  <Col md={12}>
                    <strong>Notes:</strong>
                    <p className="text-muted">{selectedRecord.notes}</p>
                  </Col>
                </Row>
              )}

              {/* Manual Modification Indicator */}
              {selectedRecord.isManuallyModified && (
                <>
                  <Alert variant="warning" className="mb-3">
                    <div className="d-flex align-items-center mb-2">
                      <FaEdit className="me-2" />
                      <strong>This record has been manually modified</strong>
                    </div>
                    {selectedRecord.originalStatus && (
                      <small>
                        Original Status:{" "}
                        <Badge bg="secondary">
                          {selectedRecord.originalStatus}
                        </Badge>
                        {selectedRecord.originalClockIn && (
                          <>
                            {" "}
                            • Original Clock In:{" "}
                            {formatTime(selectedRecord.originalClockIn)}
                          </>
                        )}
                      </small>
                    )}
                  </Alert>

                  {/* Modification History */}
                  {selectedRecord.modificationHistory &&
                    selectedRecord.modificationHistory.length > 0 && (
                      <Row className="mb-3">
                        <Col md={12}>
                          <strong>Modification History:</strong>
                          <div className="mt-2">
                            {selectedRecord.modificationHistory.map(
                              (mod, index) => (
                                <Card key={index} className="mb-2 border-warning">
                                  <Card.Body className="py-2">
                                    <small className="text-muted">
                                      Modified by:{" "}
                                      <strong>
                                        {mod.modifiedBy?.name || "Unknown"}
                                      </strong>
                                      {mod.modifiedBy?.role &&
                                        ` (${mod.modifiedBy.role})`}
                                    </small>
                                    <br />
                                    <small className="text-muted">
                                      Date:{" "}
                                      {new Date(mod.modifiedAt).toLocaleString()}
                                    </small>
                                    <br />
                                    <small>
                                      <strong>Reason:</strong> {mod.reason}
                                    </small>
                                    {mod.changes && (
                                      <div className="mt-1">
                                        <small className="text-muted">
                                          {mod.changes.oldStatus !==
                                            mod.changes.newStatus && (
                                            <>
                                              Status: {mod.changes.oldStatus} →{" "}
                                              {mod.changes.newStatus}
                                              <br />
                                            </>
                                          )}
                                          {mod.changes.oldClockIn !==
                                            mod.changes.newClockIn && (
                                            <>
                                              Clock In:{" "}
                                              {formatTime(mod.changes.oldClockIn)}{" "}
                                              →{" "}
                                              {formatTime(mod.changes.newClockIn)}
                                              <br />
                                            </>
                                          )}
                                          {mod.changes.oldClockOut !==
                                            mod.changes.newClockOut && (
                                            <>
                                              Clock Out:{" "}
                                              {formatTime(
                                                mod.changes.oldClockOut
                                              )}{" "}
                                              →{" "}
                                              {formatTime(mod.changes.newClockOut)}
                                            </>
                                          )}
                                        </small>
                                      </div>
                                    )}
                                  </Card.Body>
                                </Card>
                              )
                            )}
                          </div>
                        </Col>
                      </Row>
                    )}
                </>
              )}
            </>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button
            variant="secondary"
            onClick={() => setShowDetailsModal(false)}
          >
            Close
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
};

export default EmployeeAttendanceReport;
