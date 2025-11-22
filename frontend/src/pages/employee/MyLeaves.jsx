import { useState, useEffect } from "react";
import { Container, Row, Col, Card, Button, Table, Badge, Modal, Form, ProgressBar } from "react-bootstrap";
import { FaPlus, FaCalendarAlt, FaUmbrellaBeach, FaHospital, FaPlane } from "react-icons/fa";
import toast from "../../utils/toast";
import api from "../../services/api";

const MyLeaves = () => {
  const [leaves, setLeaves] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    leaveType: "personal",
    startDate: "",
    endDate: "",
    reason: "",
    document: null,
  });
  const [leaveBalance, setLeaveBalance] = useState({
    casual: { total: 12, used: 0, remaining: 12 },
    sick: { total: 6, used: 0, remaining: 6 },
    vacation: { total: 0, used: 0, remaining: 0 },
  });

  useEffect(() => {
    fetchLeaves();
  }, []);

  const fetchLeaves = async () => {
    try {
      setLoading(true);
      const response = await api.get("/leaves/my-leaves");
      setLeaves(response.data);
      
      // Calculate used leaves from approved leaves
      const approvedLeaves = response.data.filter(leave => leave.status === 'approved');
      
      const casualUsed = approvedLeaves
        .filter(leave => leave.leaveType === 'personal')
        .reduce((sum, leave) => {
          const days = Math.ceil((new Date(leave.endDate) - new Date(leave.startDate)) / (1000 * 60 * 60 * 24)) + 1;
          return sum + days;
        }, 0);
      
      const sickUsed = approvedLeaves
        .filter(leave => leave.leaveType === 'sick')
        .reduce((sum, leave) => {
          const days = Math.ceil((new Date(leave.endDate) - new Date(leave.startDate)) / (1000 * 60 * 60 * 24)) + 1;
          return sum + days;
        }, 0);
      
      const vacationUsed = approvedLeaves
        .filter(leave => leave.leaveType === 'vacation')
        .reduce((sum, leave) => {
          const days = Math.ceil((new Date(leave.endDate) - new Date(leave.startDate)) / (1000 * 60 * 60 * 24)) + 1;
          return sum + days;
        }, 0);
      
      // Update leave balance with actual used leaves
      setLeaveBalance({
        casual: { total: 12, used: casualUsed, remaining: 12 - casualUsed },
        sick: { total: 6, used: sickUsed, remaining: 6 - sickUsed },
        vacation: { total: 0, used: vacationUsed, remaining: 0 - vacationUsed },
      });
    } catch (error) {
      console.error("Error fetching leaves:", error);
      if (error.response?.status !== 404) {
        toast.error("Failed to load leave records");
      }
      setLeaves([]);
    } finally {
      setLoading(false);
    }
  };

  const handleShowModal = () => setShowModal(true);
  const handleCloseModal = () => {
    setShowModal(false);
    setFormData({
      leaveType: "personal",
      startDate: "",
      endDate: "",
      reason: "",
      document: null,
    });
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleFileChange = (e) => {
    setFormData({ ...formData, document: e.target.files[0] });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.startDate || !formData.endDate || !formData.reason) {
      toast.error("Please fill all required fields");
      return;
    }
    
    try {
      await api.post("/leaves", {
        leaveType: formData.leaveType,
        startDate: formData.startDate,
        endDate: formData.endDate,
        reason: formData.reason,
      });
      
      toast.success("Leave application submitted successfully!");
      handleCloseModal();
      fetchLeaves();
    } catch (error) {
      console.error("Error applying for leave:", error);
      toast.error(error.response?.data?.message || "Failed to submit leave application");
    }
  };

  const getStatusBadge = (status) => {
    const variants = {
      Approved: "success",
      Pending: "warning",
      Rejected: "danger",
    };
    return <Badge bg={variants[status] || "secondary"}>{status}</Badge>;
  };

  return (
    <Container fluid className="py-4">
      <Row className="mb-4">
        <Col>
          <div className="d-flex justify-content-between align-items-center">
            <div>
              <h2>My Leaves</h2>
              <p className="text-muted mb-0">Manage your leave applications</p>
            </div>
            <Button variant="primary" onClick={handleShowModal}>
              <FaPlus className="me-2" />
              Apply for Leave
            </Button>
          </div>
        </Col>
      </Row>

      {/* Leave Balance Cards */}
      <Row className="mb-4">
        <Col md={6} className="mb-3">
          <Card className="border-0 shadow-sm h-100">
            <Card.Body>
              <div className="d-flex align-items-center mb-3">
                <div className="bg-primary bg-opacity-10 p-3 rounded me-3">
                  <FaUmbrellaBeach className="text-primary fs-4" />
                </div>
                <div>
                  <h6 className="mb-0">Casual Leave</h6>
                  <small className="text-muted">{leaveBalance.casual.remaining} of {leaveBalance.casual.total} remaining</small>
                </div>
              </div>
              <ProgressBar 
                now={(leaveBalance.casual.remaining / leaveBalance.casual.total) * 100} 
                variant="primary"
                className="mb-2"
              />
              <small className="text-muted">Used: {leaveBalance.casual.used} days</small>
            </Card.Body>
          </Card>
        </Col>

        <Col md={6} className="mb-3">
          <Card className="border-0 shadow-sm h-100">
            <Card.Body>
              <div className="d-flex align-items-center mb-3">
                <div className="bg-danger bg-opacity-10 p-3 rounded me-3">
                  <FaHospital className="text-danger fs-4" />
                </div>
                <div>
                  <h6 className="mb-0">Medical Leave</h6>
                  <small className="text-muted">{leaveBalance.sick.remaining} of {leaveBalance.sick.total} remaining</small>
                </div>
              </div>
              <ProgressBar 
                now={(leaveBalance.sick.remaining / leaveBalance.sick.total) * 100} 
                variant="danger"
                className="mb-2"
              />
              <small className="text-muted">Used: {leaveBalance.sick.used} days</small>
            </Card.Body>
          </Card>
        </Col>


      </Row>

      {/* Leave Balance Summary */}
      <Row className="mb-4">
        <Col md={3} className="mb-3">
          <Card className="border-0 shadow-sm">
            <Card.Body className="text-center">
              <h6 className="text-muted">Total Annual Leave</h6>
              <h2 className="mb-0">
                {leaveBalance.casual.total + leaveBalance.sick.total + leaveBalance.vacation.total} days
              </h2>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3} className="mb-3">
          <Card className="border-0 shadow-sm">
            <Card.Body className="text-center">
              <h6 className="text-muted">Used</h6>
              <h2 className="mb-0 text-danger">
                {leaveBalance.casual.used + leaveBalance.sick.used + leaveBalance.vacation.used} days
              </h2>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3} className="mb-3">
          <Card className="border-0 shadow-sm">
            <Card.Body className="text-center">
              <h6 className="text-muted">Remaining</h6>
              <h2 className="mb-0 text-success">
                {leaveBalance.casual.remaining + leaveBalance.sick.remaining + leaveBalance.vacation.remaining} days
              </h2>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3} className="mb-3">
          <Card className="border-0 shadow-sm">
            <Card.Body className="text-center">
              <h6 className="text-muted">Pending Approval</h6>
              <h2 className="mb-0 text-warning">
                {leaves.filter(leave => leave.status === 'pending').reduce((sum, leave) => {
                  const days = Math.ceil((new Date(leave.endDate) - new Date(leave.startDate)) / (1000 * 60 * 60 * 24)) + 1;
                  return sum + days;
                }, 0)} days
              </h2>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Leave History */}
      <Row>
        <Col>
          <Card className="border-0 shadow-sm">
            <Card.Body>
              <h5 className="mb-3">Leave History</h5>
              
              {loading ? (
                <div className="text-center py-5">
                  <div className="spinner-border text-primary" role="status">
                    <span className="visually-hidden">Loading...</span>
                  </div>
                </div>
              ) : (
                <Table responsive hover>
                  <thead>
                    <tr>
                      <th>Leave Type</th>
                      <th>Start Date</th>
                      <th>End Date</th>
                      <th>Days</th>
                      <th>Reason</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {leaves.length === 0 ? (
                      <tr>
                        <td colSpan="6" className="text-center text-muted py-4">
                          No leave applications yet
                        </td>
                      </tr>
                    ) : (
                      leaves.map((leave) => (
                        <tr key={leave._id}>
                          <td>{leave.leaveType}</td>
                          <td>{new Date(leave.startDate).toLocaleDateString()}</td>
                          <td>{new Date(leave.endDate).toLocaleDateString()}</td>
                          <td>
                            {Math.ceil((new Date(leave.endDate) - new Date(leave.startDate)) / (1000 * 60 * 60 * 24)) + 1}
                          </td>
                          <td>{leave.reason}</td>
                          <td>{getStatusBadge(leave.status)}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </Table>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Apply Leave Modal */}
      <Modal show={showModal} onHide={handleCloseModal} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>Apply for Leave</Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleSubmit}>
          <Modal.Body>
            <Form.Group className="mb-3">
              <Form.Label>Leave Type *</Form.Label>
              <Form.Select
                name="leaveType"
                value={formData.leaveType}
                onChange={handleChange}
                required
              >
                <option value="personal">Casual Leave (12 days/year)</option>
                <option value="sick">Medical Leave (6 days/year)</option>
                <option value="maternity">Maternity Leave</option>
                <option value="paternity">Paternity Leave</option>
                <option value="unpaid">Unpaid Leave</option>
              </Form.Select>
            </Form.Group>
            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Start Date *</Form.Label>
                  <Form.Control
                    type="date"
                    name="startDate"
                    value={formData.startDate}
                    onChange={handleChange}
                    required
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>End Date *</Form.Label>
                  <Form.Control
                    type="date"
                    name="endDate"
                    value={formData.endDate}
                    onChange={handleChange}
                    required
                  />
                </Form.Group>
              </Col>
            </Row>

            <Form.Group className="mb-3">
              <Form.Label>Reason *</Form.Label>
              <Form.Control
                as="textarea"
                rows={3}
                name="reason"
                value={formData.reason}
                onChange={handleChange}
                placeholder="Please provide a reason for your leave..."
                required
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Attach Document (Optional)</Form.Label>
              <Form.Control
                type="file"
                onChange={handleFileChange}
                accept=".pdf,.jpg,.jpeg,.png"
              />
              <Form.Text className="text-muted">
                For sick leave, please attach medical certificate
              </Form.Text>
            </Form.Group>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={handleCloseModal}>
              Cancel
            </Button>
            <Button variant="primary" type="submit">
              Submit Application
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>
    </Container>
  );
};

export default MyLeaves;
