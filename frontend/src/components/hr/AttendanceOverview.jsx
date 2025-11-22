import { useState, useEffect } from "react";
import {
  Card,
  Table,
  Badge,
  Button,
  Modal,
  Form,
  Row,
  Col,
  InputGroup,
  Spinner,
  Alert
} from "react-bootstrap";
import {
  FaClock,
  FaPlus,
  FaEye,
  FaSearch,
  FaUser,
  FaCalendarAlt,
  FaEdit,
  FaDownload
} from "react-icons/fa";
import { toast } from "react-toastify";
import api from "../../services/api";
import { formatDate } from "../../utils/helpers";

const AttendanceOverview = () => {
  const [attendance, setAttendance] = useState([]);
  const [filteredAttendance, setFilteredAttendance] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState("create"); // 'create', 'view', or 'edit'
  const [selectedAttendance, setSelectedAttendance] = useState(null);
  const [processing, setProcessing] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    employeeId: "",
    date: "",
    clockIn: "",
    clockOut: "",
    status: "present",
    notes: ""
  });

  // Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [employeeFilter, setEmployeeFilter] = useState("");
  const [dateFilter, setDateFilter] = useState("");

  // Statistics
  const [stats, setStats] = useState({
    present: 0,
    absent: 0,
    late: 0,
    total: 0
  });

  // Show all state
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    fetchAttendance();
    fetchEmployees();
  }, []);

  useEffect(() => {
    // Fetch new data when date or employee filter changes
    if (dateFilter || employeeFilter) {
      fetchFilteredAttendance();
    } else {
      // If no filters, show today's data
      fetchAttendance();
    }
  }, [dateFilter, employeeFilter]);

  useEffect(() => {
    applyFilters();
  }, [attendance, searchTerm, statusFilter]);

  const fetchAttendance = async () => {
    try {
      setLoading(true);
      // Fetch only today's attendance by default
      const today = new Date().toISOString().split('T')[0];
      const response = await api.get(`/attendance?date=${today}`);
      const todayAttendance = response.data;
      
      setAttendance(todayAttendance);
      
      // Calculate statistics for today
      setStats({
        present: todayAttendance.filter(a => a.status === "present").length,
        absent: todayAttendance.filter(a => a.status === "absent").length,
        late: todayAttendance.filter(a => a.status === "late").length,
        total: todayAttendance.length
      });
    } catch (error) {
      console.error("Error fetching attendance:", error);
      toast.error("Failed to fetch attendance records");
    } finally {
      setLoading(false);
    }
  };

  const fetchEmployees = async () => {
    try {
      const response = await api.get("/users");
      setEmployees(response.data.filter(u => u.role === "employee" || u.role === "manager"));
    } catch (error) {
      console.error("Error fetching employees:", error);
    }
  };

  const fetchFilteredAttendance = async () => {
    try {
      setLoading(true);
      let url = "/attendance?";
      
      // Add date filter
      if (dateFilter) {
        url += `date=${dateFilter}&`;
      }
      
      // Add employee filter
      if (employeeFilter) {
        url += `employee=${employeeFilter}&`;
      }
      
      const response = await api.get(url);
      const filteredData = response.data;
      
      setAttendance(filteredData);
      
      // Calculate statistics for filtered data
      setStats({
        present: filteredData.filter(a => a.status === "present").length,
        absent: filteredData.filter(a => a.status === "absent").length,
        late: filteredData.filter(a => a.status === "late").length,
        total: filteredData.length
      });
    } catch (error) {
      console.error("Error fetching filtered attendance:", error);
      toast.error("Failed to fetch attendance records");
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...attendance];

    // Status filter
    if (statusFilter) {
      filtered = filtered.filter(att => att.status === statusFilter);
    }

    // Employee filter
    if (employeeFilter) {
      filtered = filtered.filter(att => att.employee?._id === employeeFilter);
    }

    // Date filter
    if (dateFilter) {
      filtered = filtered.filter(att => {
        const attDate = new Date(att.date).toDateString();
        const filterDate = new Date(dateFilter).toDateString();
        return attDate === filterDate;
      });
    }

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(att =>
        att.employee?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        att.employee?.email?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    setFilteredAttendance(filtered);
  };

  const handleCreateAttendance = () => {
    setModalMode("create");
    setFormData({
      employeeId: "",
      date: new Date().toISOString().split('T')[0],
      clockIn: "",
      clockOut: "",
      status: "present",
      notes: ""
    });
    setShowModal(true);
  };

  const handleViewAttendance = (att) => {
    setSelectedAttendance(att);
    setModalMode("view");
    setShowModal(true);
  };

  const handleEditAttendance = (att) => {
    setSelectedAttendance(att);
    setModalMode("edit");
    
    // Extract time from clockIn/clockOut timestamps
    const extractTime = (timestamp) => {
      if (!timestamp) return "";
      const date = new Date(timestamp);
      return date.toTimeString().slice(0, 5); // Returns HH:MM format
    };
    
    setFormData({
      employeeId: att.employee?._id || "",
      date: new Date(att.date).toISOString().split('T')[0],
      clockIn: extractTime(att.clockIn),
      clockOut: extractTime(att.clockOut),
      status: att.status,
      notes: att.notes || ""
    });
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.employeeId || !formData.date) {
      toast.error("Please fill in all required fields");
      return;
    }

    try {
      setProcessing(true);
      
      if (modalMode === "create") {
        // Prepare data for manual attendance creation
        const attendanceData = {
          employeeId: formData.employeeId,
          date: formData.date,
          clockIn: formData.clockIn ? `${formData.date}T${formData.clockIn}:00` : `${formData.date}T09:00:00`,
          clockOut: formData.clockOut ? `${formData.date}T${formData.clockOut}:00` : undefined,
          status: formData.status,
          notes: formData.notes
        };
        await api.post("/attendance/manual", attendanceData);
        toast.success("Attendance record created successfully");
      } else if (modalMode === "edit") {
        // Prepare data for manual attendance update
        const attendanceData = {
          clockIn: formData.clockIn ? `${formData.date}T${formData.clockIn}:00` : undefined,
          clockOut: formData.clockOut ? `${formData.date}T${formData.clockOut}:00` : undefined,
          status: formData.status,
          notes: formData.notes
        };
        await api.put(`/attendance/${selectedAttendance._id}`, attendanceData);
        toast.success("Attendance record updated successfully");
      }
      
      setShowModal(false);
      fetchAttendance();
    } catch (error) {
      console.error("Error saving attendance:", error);
      toast.error(error.response?.data?.message || "Failed to save attendance record");
    } finally {
      setProcessing(false);
    }
  };

  const handleExport = () => {
    toast.info("Export functionality coming soon!");
    // TODO: Implement CSV/Excel export
  };

  const getStatusBadge = (status) => {
    const variants = {
      present: "success",
      absent: "danger",
      late: "warning",
      "half-day": "info",
      leave: "secondary"
    };
    return <Badge bg={variants[status] || "secondary"}>{status}</Badge>;
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric"
    });
  };

  const formatTime = (time) => {
    if (!time) return "N/A";
    return new Date(time).toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit"
    });
  };

  const calculateWorkHours = (clockIn, clockOut) => {
    if (!clockIn || !clockOut) return "N/A";
    const start = new Date(clockIn);
    const end = new Date(clockOut);
    const diff = (end - start) / (1000 * 60 * 60);
    return `${diff.toFixed(2)} hrs`;
  };

  if (loading) {
    return (
      <Card className="border-0 shadow-sm">
        <Card.Body className="text-center py-5">
          <Spinner animation="border" variant="primary" />
          <p className="mt-3 text-muted">Loading attendance records...</p>
        </Card.Body>
      </Card>
    );
  }

  return (
    <>
      <Card className="border-0 shadow-sm mb-4">
        <Card.Header className="bg-white py-3">
          <div className="d-flex justify-content-between align-items-center">
            <h5 className="mb-0">
              <FaClock className="me-2 text-primary" />
              Attendance Overview
            </h5>
            <div>
              <Button variant="outline-primary" size="sm" className="me-2" onClick={handleExport}>
                <FaDownload className="me-2" />
                Export
              </Button>
              <Button variant="primary" size="sm" onClick={handleCreateAttendance}>
                <FaPlus className="me-2" />
                Manual Entry
              </Button>
            </div>
          </div>
        </Card.Header>
        <Card.Body>
          {/* Statistics */}
          <div className="mb-3">
            <h6 className="text-muted">
              {dateFilter ? `Statistics for ${new Date(dateFilter).toLocaleDateString()}` : "Today's Attendance Statistics"}
            </h6>
          </div>
          <Row className="mb-4">
            <Col md={3}>
              <Card className="border-0 bg-success bg-opacity-10">
                <Card.Body className="text-center">
                  <h3 className="mb-0 text-success">{stats.present}</h3>
                  <small className="text-muted">Present</small>
                </Card.Body>
              </Card>
            </Col>
            <Col md={3}>
              <Card className="border-0 bg-danger bg-opacity-10">
                <Card.Body className="text-center">
                  <h3 className="mb-0 text-danger">{stats.absent}</h3>
                  <small className="text-muted">Absent</small>
                </Card.Body>
              </Card>
            </Col>
            <Col md={3}>
              <Card className="border-0 bg-warning bg-opacity-10">
                <Card.Body className="text-center">
                  <h3 className="mb-0 text-warning">{stats.late}</h3>
                  <small className="text-muted">Late</small>
                </Card.Body>
              </Card>
            </Col>
            <Col md={3}>
              <Card className="border-0 bg-info bg-opacity-10">
                <Card.Body className="text-center">
                  <h3 className="mb-0 text-info">{stats.total}</h3>
                  <small className="text-muted">Total</small>
                </Card.Body>
              </Card>
            </Col>
          </Row>

          {/* Filters */}
          <Row className="mb-3">
            <Col md={3}>
              <InputGroup>
                <InputGroup.Text>
                  <FaSearch />
                </InputGroup.Text>
                <Form.Control
                  type="text"
                  placeholder="Search employee..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </InputGroup>
            </Col>
            <Col md={2}>
              <Form.Select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="">All Status</option>
                <option value="present">Present</option>
                <option value="absent">Absent</option>
                <option value="late">Late</option>
                <option value="half-day">Half Day</option>
                <option value="leave">On Leave</option>
              </Form.Select>
            </Col>
            <Col md={3}>
              <Form.Select
                value={employeeFilter}
                onChange={(e) => setEmployeeFilter(e.target.value)}
              >
                <option value="">All Employees</option>
                {employees.map(emp => (
                  <option key={emp._id} value={emp._id}>{emp.name}</option>
                ))}
              </Form.Select>
            </Col>
            <Col md={2}>
              <Form.Control
                type="date"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                placeholder="Select date"
              />
            </Col>
            <Col md={2}>
              <Button 
                variant="outline-secondary" 
                className="w-100"
                onClick={() => {
                  setDateFilter("");
                  setEmployeeFilter("");
                  setStatusFilter("");
                  setSearchTerm("");
                }}
              >
                Reset to Today
              </Button>
            </Col>
          </Row>
          
          {/* Show current view info */}
          <Row className="mb-2">
            <Col>
              <small className="text-muted">
                {dateFilter ? (
                  <>Showing attendance for: <strong>{formatDate(dateFilter)}</strong></>
                ) : (
                  <>Showing attendance for: <strong>Today ({formatDate(new Date())})</strong></>
                )}
                {employeeFilter && employees.find(e => e._id === employeeFilter) && (
                  <> • Employee: <strong>{employees.find(e => e._id === employeeFilter).name}</strong></>
                )}
              </small>
            </Col>
          </Row>

          {/* Attendance Table */}
          {filteredAttendance.length > 0 ? (
            <div className="table-responsive" style={{ maxHeight: showAll ? 'none' : '350px', overflowY: 'auto' }}>
              <Table hover>
                <thead className="bg-light">
                  <tr>
                    <th>Employee</th>
                    <th>Date</th>
                    <th>Clock In</th>
                    <th>Clock Out</th>
                    <th>Work Hours</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAttendance.map((att) => (
                    <tr key={att._id}>
                      <td>
                        <div className="d-flex align-items-center">
                          <FaUser className="text-muted me-2" />
                          <div>
                            <div className="fw-bold">{att.employee?.name || "N/A"}</div>
                            <small className="text-muted">{att.employee?.email}</small>
                          </div>
                        </div>
                      </td>
                      <td>{formatDate(att.date)}</td>
                      <td>
                        <small className={att.status === "late" ? "text-warning fw-bold" : ""}>
                          {formatTime(att.clockIn)}
                        </small>
                      </td>
                      <td>
                        <small>{formatTime(att.clockOut)}</small>
                      </td>
                      <td>
                        <Badge bg="secondary">
                          {calculateWorkHours(att.clockIn, att.clockOut)}
                        </Badge>
                      </td>
                      <td>{getStatusBadge(att.status)}</td>
                      <td>
                        <div className="d-flex gap-2">
                          <Button
                            size="sm"
                            variant="outline-primary"
                            onClick={() => handleViewAttendance(att)}
                          >
                            <FaEye />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline-warning"
                            onClick={() => handleEditAttendance(att)}
                          >
                            <FaEdit />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </div>
          ) : null}

          {/* Show All / Show Less Button */}
          {filteredAttendance.length > 5 && (
            <div className="text-center mt-3 pt-3 border-top">
              <Button 
                variant="link" 
                className="text-decoration-none"
                onClick={() => setShowAll(!showAll)}
              >
                {showAll ? (
                  <>
                    <span className="fw-semibold">Show Less</span>
                    <Badge bg="secondary" className="ms-2">{filteredAttendance.length - 5} hidden</Badge>
                  </>
                ) : (
                  <>
                    <span className="fw-semibold">Show All Records</span>
                    <Badge bg="primary" className="ms-2">{filteredAttendance.length - 5} more</Badge>
                  </>
                )}
              </Button>
            </div>
          )}

          {filteredAttendance.length === 0 && (
            <Alert variant="info" className="text-center">
              <FaClock className="fs-1 mb-3 opacity-25" />
              <p className="mb-0">No attendance records found</p>
              <small>Try adjusting your filters or add a manual entry</small>
            </Alert>
          )}
        </Card.Body>
      </Card>

      {/* Create/Edit/View Attendance Modal */}
      <Modal show={showModal} onHide={() => setShowModal(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>
            {modalMode === "create" && "Manual Attendance Entry"}
            {modalMode === "edit" && "Edit Attendance Record"}
            {modalMode === "view" && "Attendance Details"}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {modalMode === "view" && selectedAttendance ? (
            <>
              <Row className="mb-3">
                <Col md={6}>
                  <strong>Employee:</strong>
                  <p>{selectedAttendance.employee?.name}</p>
                </Col>
                <Col md={6}>
                  <strong>Email:</strong>
                  <p>{selectedAttendance.employee?.email}</p>
                </Col>
              </Row>

              <Row className="mb-3">
                <Col md={6}>
                  <strong>Date:</strong>
                  <p>{formatDate(selectedAttendance.date)}</p>
                </Col>
                <Col md={6}>
                  <strong>Status:</strong>
                  <p>{getStatusBadge(selectedAttendance.status)}</p>
                </Col>
              </Row>

              <Row className="mb-3">
                <Col md={4}>
                  <strong>Clock In:</strong>
                  <p>{formatTime(selectedAttendance.clockIn)}</p>
                </Col>
                <Col md={4}>
                  <strong>Clock Out:</strong>
                  <p>{formatTime(selectedAttendance.clockOut)}</p>
                </Col>
                <Col md={4}>
                  <strong>Work Hours:</strong>
                  <p>{calculateWorkHours(selectedAttendance.clockIn, selectedAttendance.clockOut)}</p>
                </Col>
              </Row>

              {selectedAttendance.notes && (
                <Row className="mb-3">
                  <Col md={12}>
                    <strong>Notes:</strong>
                    <p className="text-muted">{selectedAttendance.notes}</p>
                  </Col>
                </Row>
              )}
            </>
          ) : (
            <Form onSubmit={handleSubmit}>
              <Form.Group className="mb-3">
                <Form.Label>Employee *</Form.Label>
                <Form.Select
                  value={formData.employeeId}
                  onChange={(e) => setFormData({ ...formData, employeeId: e.target.value })}
                  required
                  disabled={modalMode === "edit"}
                >
                  <option value="">Select Employee</option>
                  {employees.map(emp => (
                    <option key={emp._id} value={emp._id}>{emp.name}</option>
                  ))}
                </Form.Select>
              </Form.Group>

              <Row>
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label>Date *</Form.Label>
                    <Form.Control
                      type="date"
                      value={formData.date}
                      onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                      required
                    />
                  </Form.Group>
                </Col>
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label>Status *</Form.Label>
                    <Form.Select
                      value={formData.status}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                      required
                    >
                      <option value="present">Present</option>
                      <option value="absent">Absent</option>
                      <option value="late">Late</option>
                      <option value="half-day">Half Day</option>
                      <option value="leave">On Leave</option>
                    </Form.Select>
                  </Form.Group>
                </Col>
              </Row>

              <Row>
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label>Clock In Time</Form.Label>
                    <Form.Control
                      type="time"
                      value={formData.clockIn}
                      onChange={(e) => setFormData({ ...formData, clockIn: e.target.value })}
                    />
                  </Form.Group>
                </Col>
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label>Clock Out Time</Form.Label>
                    <Form.Control
                      type="time"
                      value={formData.clockOut}
                      onChange={(e) => setFormData({ ...formData, clockOut: e.target.value })}
                    />
                  </Form.Group>
                </Col>
              </Row>

              <Form.Group className="mb-3">
                <Form.Label>Notes</Form.Label>
                <Form.Control
                  as="textarea"
                  rows={3}
                  placeholder="Add any notes or comments..."
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                />
              </Form.Group>
            </Form>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowModal(false)} disabled={processing}>
            Close
          </Button>
          {modalMode !== "view" && (
            <Button variant="primary" onClick={handleSubmit} disabled={processing}>
              {processing ? (
                <>
                  <Spinner animation="border" size="sm" className="me-2" />
                  Saving...
                </>
              ) : (
                <>
                  {modalMode === "create" ? <FaPlus className="me-2" /> : <FaEdit className="me-2" />}
                  {modalMode === "create" ? "Create Record" : "Update Record"}
                </>
              )}
            </Button>
          )}
        </Modal.Footer>
      </Modal>
    </>
  );
};

export default AttendanceOverview;
