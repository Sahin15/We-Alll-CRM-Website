import { useState, useEffect } from "react";
import { Container, Row, Col, Card, Button, Table, Badge, Modal, Form, ProgressBar, Alert, Nav } from "react-bootstrap";
import { FaPlus, FaCalendarAlt, FaUmbrellaBeach, FaHospital, FaExclamationTriangle, FaInfoCircle, FaHome, FaEye, FaClock, FaFileAlt } from "react-icons/fa";
import { toast } from "react-toastify";
import { useAuth } from "../../context/AuthContext";
import { leaveApi } from "../../api/leaveApi";
import { getMyWFHRequests, cancelWFHRequest } from "../../api/wfhApi";
import { LEAVE_TYPE_DETAILS, getLeaveTypeLabel } from "../../utils/constants";
import { formatDate, getStatusVariant } from "../../utils/helpers";
import {
  canApplyPaidLeave,
  formatEmploymentType,
  getAllowedLeaveTypes,
  isFullTimeEmployee,
} from "../../utils/leaveEligibility";
import { getLeaveRequestDays } from "../../utils/leaveDays";
import ApplyWFHModal from "../../components/wfh/ApplyWFHModal";
import "../../styles/table-mobile.css";
import "../../styles/modal-mobile.css";

const MyLeaves = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('leaves');
  const [leaves, setLeaves] = useState([]);
  const [wfhRequests, setWfhRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showWFHModal, setShowWFHModal] = useState(false);
  const [leaveBalance, setLeaveBalance] = useState(null);
  const [viewLeave, setViewLeave] = useState(null);
  const defaultLeaveType = isFullTimeEmployee(user) ? "casual" : "unpaid";
  const [formData, setFormData] = useState({
    leaveType: defaultLeaveType,
    startDate: "",
    endDate: "",
    reason: "",
    document: null,
  });

  const paidLeaveEligible = canApplyPaidLeave(user, leaveBalance);
  const allowedLeaveTypes = getAllowedLeaveTypes(user, leaveBalance);

  useEffect(() => {
    fetchLeaves();
    fetchLeaveBalance();
    if (activeTab === 'wfh') {
      fetchWFHRequests();
    }
  }, [activeTab]);

  const fetchLeaves = async () => {
    try {
      setLoading(true);
      const response = await leaveApi.getMyLeaves();
      setLeaves(response.data);
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

  const fetchLeaveBalance = async () => {
    try {
      const response = await leaveApi.getLeaveBalance();
      setLeaveBalance(response.data.balance);
    } catch (error) {
      console.error("Error fetching leave balance:", error);
      toast.error("Failed to load leave balance");
    }
  };

  const fetchWFHRequests = async () => {
    try {
      const response = await getMyWFHRequests();
      setWfhRequests(response.data || []);
    } catch (error) {
      console.error("Error fetching WFH requests:", error);
      toast.error("Failed to load WFH requests");
    }
  };

  const handleCancelWFH = async (id) => {
    if (!window.confirm("Are you sure you want to cancel this WFH request?")) {
      return;
    }
    try {
      await cancelWFHRequest(id);
      toast.success("WFH request cancelled successfully");
      fetchWFHRequests();
    } catch (error) {
      console.error("Error cancelling WFH request:", error);
      toast.error(error.response?.data?.message || "Failed to cancel WFH request");
    }
  };

  const handleShowModal = () => setShowModal(true);
  const handleCloseModal = () => {
    setShowModal(false);
    setFormData({
      leaveType: paidLeaveEligible ? "casual" : "unpaid",
      startDate: "",
      endDate: "",
      reason: "",
      document: null,
    });
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => {
      const next = { ...prev, [name]: value };
      if (next.leaveType === "half_day" && (name === "startDate" || name === "leaveType")) {
        next.endDate = name === "startDate" ? value : prev.startDate || prev.endDate;
      }
      return next;
    });
  };

  const handleFileChange = (e) => {
    setFormData({ ...formData, document: e.target.files[0] });
  };

  const calculateDays = (leaveType, startDate, endDate) =>
    getLeaveRequestDays(leaveType, startDate, endDate);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.startDate || !formData.endDate || !formData.reason) {
      toast.error("Please fill all required fields");
      return;
    }

    if (formData.leaveType === "half_day" && formData.startDate !== formData.endDate) {
      toast.error("Half-day leave must be for a single date");
      return;
    }

    // Check leave balance (skip for unpaid leave and work from home)
    const requestedDays = calculateDays(formData.leaveType, formData.startDate, formData.endDate);
    
    if (paidLeaveEligible && formData.leaveType !== 'unpaid') {
      const availableBalance = leaveBalance?.earned?.remaining || 0;

      if (requestedDays > availableBalance) {
        toast.error(`Insufficient earned leave balance. Available: ${availableBalance} days, Requested: ${requestedDays} days. You have earned ${leaveBalance?.earned?.earned || 0} out of 24 annual leaves.`);
        return;
      }
    }
    
    try {
      const formDataToSend = new FormData();
      formDataToSend.append('leaveType', formData.leaveType);
      formDataToSend.append('startDate', formData.startDate);
      formDataToSend.append('endDate', formData.endDate);
      formDataToSend.append('reason', formData.reason);
      
      if (formData.document) {
        formDataToSend.append('attachments', formData.document);
      }

      await leaveApi.createLeaveRequest(formDataToSend);
      
      toast.success("Leave application submitted successfully!");
      handleCloseModal();
      fetchLeaves();
      fetchLeaveBalance();
    } catch (error) {
      console.error("Error applying for leave:", error);
      toast.error(error.response?.data?.message || "Failed to submit leave application");
    }
  };

  const handleCancel = async (id) => {
    if (window.confirm("Are you sure you want to cancel this leave request?")) {
      try {
        await leaveApi.cancelLeave(id);
        toast.success("Leave request cancelled");
        fetchLeaves();
        fetchLeaveBalance();
      } catch (error) {
        toast.error("Failed to cancel leave request");
      }
    }
  };

  const getLeaveTypeIcon = (type) => {
    const icons = {
      casual: FaUmbrellaBeach,
      medical: FaHospital,
      half_day: FaClock,
      unpaid: FaCalendarAlt
    };
    const IconComponent = icons[type] || FaCalendarAlt;
    return <IconComponent />;
  };

  const getLeaveTypeColor = (type) => {
    const colors = {
      casual: "primary",
      medical: "danger",
      personal: "primary",
      vacation: "primary",
      half_day: "warning",
      unpaid: "secondary"
    };
    return colors[type] || "secondary";
  };

  const requestedDays = calculateDays(formData.leaveType, formData.startDate, formData.endDate);
  const availableBalance = leaveBalance?.earned?.remaining || 0;

  return (
    <Container fluid className="py-4">
      <Row className="mb-4">
        <Col>
          <div className="d-flex justify-content-between align-items-center">
            <div>
              <h2 className="text-dark mb-0">My Leaves & WFH</h2>
              <p className="text-muted mb-0">Manage your leave applications and work from home requests</p>
            </div>
            <div className="d-flex gap-2">
              <Button variant="primary" onClick={handleShowModal}>
                <FaPlus className="me-2" />
                Apply for Leave
              </Button>
            </div>
          </div>
        </Col>
      </Row>

      {/* Tab Navigation */}
      <Row className="mb-4">
        <Col>
          <Card className="border-0 shadow-sm">
            <Card.Body className="py-2">
              <Nav variant="pills">
                <Nav.Item>
                  <Nav.Link 
                    active={activeTab === 'leaves'}
                    onClick={() => setActiveTab('leaves')}
                  >
                    <FaCalendarAlt className="me-2" />
                    Leave Requests
                  </Nav.Link>
                </Nav.Item>
                <Nav.Item>
                  <Nav.Link 
                    active={activeTab === 'wfh'}
                    onClick={() => setActiveTab('wfh')}
                  >
                    <FaHome className="me-2" />
                    WFH Requests
                  </Nav.Link>
                </Nav.Item>
              </Nav>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {activeTab === 'leaves' ? (
        <>
      {/* Info alert for HR employees */}
      {user?.department?.name === 'HR' && (
        <Alert variant="info" className="mb-4">
          <FaInfoCircle className="me-2" />
          <strong>HR Department:</strong> Your leave and WFH requests require Admin approval. You can apply for WFH using the "Apply here" link at the bottom of the Leave History table below.
        </Alert>
      )}

      {!paidLeaveEligible && (
        <Alert variant="info" className="mb-4">
          <FaInfoCircle className="me-2" />
          As a <strong>{formatEmploymentType(user?.employmentType)}</strong> employee, you are not eligible for earned leave.
          You may apply for <strong>unpaid leave</strong> only.
        </Alert>
      )}

      {/* Leave Balance Cards */}
      {leaveBalance && paidLeaveEligible && (
        <>
          {/* Earned Leave Summary Card */}
          <Row className="mb-4">
            <Col xs={12}>
              <Card className="border-0 shadow-sm bg-primary bg-opacity-10">
                <Card.Body>
                  <Row className="align-items-center">
                    <Col xs={12} md={8}>
                      <h5 className="mb-2 text-primary">
                        <FaInfoCircle className="me-2" />
                        Annual Leave Balance (Earned System)
                      </h5>
                      <p className="mb-0 text-muted">
                        You earn 2 leaves per month. Total annual allowance: 24 days.
                        {leaveBalance.earned && (
                          <span className="ms-2">
                            <strong>Earned so far:</strong> {leaveBalance.earned.earned} days | 
                            <strong className="ms-2">Used:</strong> {leaveBalance.earned.used} days | 
                            <strong className="ms-2">Available:</strong> {leaveBalance.earned.remaining} days
                          </span>
                        )}
                      </p>
                    </Col>
                    <Col xs={12} md={4} className="text-md-end mt-3 mt-md-0">
                      {leaveBalance.earned && (
                        <div className="d-flex justify-content-between justify-content-md-end align-items-center">
                          <div className="me-3">
                            <div className="text-muted small">Progress</div>
                            <div className="h4 mb-0 text-primary">
                              {leaveBalance.earned.used}/{leaveBalance.earned.earned}
                            </div>
                          </div>
                          <div>
                            <ProgressBar 
                              now={(leaveBalance.earned.used / leaveBalance.earned.earned) * 100} 
                              variant="primary"
                              style={{ width: '100px', height: '8px' }}
                            />
                          </div>
                        </div>
                      )}
                    </Col>
                  </Row>
                </Card.Body>
              </Card>
            </Col>
          </Row>

          {/* Leave type usage (labels — progress vs earned pool) */}
          <Row className="mb-4">
            {["medical", "casual"].map((type) => {
              const balance = leaveBalance?.[type];
              const details = LEAVE_TYPE_DETAILS[type];
              const used = balance?.used || 0;
              const earnedTotal = leaveBalance?.earned?.earned || 0;
              const progressPct = earnedTotal > 0 ? Math.min(100, (used / earnedTotal) * 100) : 0;
              if (!details) return null;

              return (
                <Col xs={12} md={6} key={type} className="mb-3">
                  <Card className="border-0 shadow-sm h-100">
                    <Card.Body>
                      <div className="d-flex align-items-center mb-3">
                        <div className={`bg-${getLeaveTypeColor(type)} bg-opacity-10 p-3 rounded me-3`}>
                          <div className={`text-${getLeaveTypeColor(type)} fs-4`}>
                            {getLeaveTypeIcon(type)}
                          </div>
                        </div>
                        <div className="flex-grow-1">
                          <h6 className="mb-0">{details.name}</h6>
                          <small className="text-muted">
                            {used} day{used === 1 ? "" : "s"} taken this year
                          </small>
                        </div>
                      </div>
                      <ProgressBar
                        now={progressPct}
                        variant={getLeaveTypeColor(type)}
                        style={{ height: "8px" }}
                      />
                      <small className="text-muted d-block mt-2">
                        {used} of {earnedTotal} earned days
                      </small>
                    </Card.Body>
                  </Card>
                </Col>
              );
            })}
            
            {/* Unpaid Leave Card - Special Display */}
            {leaveBalance.unpaid && leaveBalance.unpaid.used > 0 && (
              <Col xs={12} md={4} className="mb-3">
                <Card className="border-0 shadow-sm h-100">
                  <Card.Body>
                    <div className="d-flex align-items-center mb-3">
                      <div className="bg-secondary bg-opacity-10 p-3 rounded me-3">
                        <div className="text-secondary fs-4">
                          {getLeaveTypeIcon('unpaid')}
                        </div>
                      </div>
                      <div>
                        <h6 className="mb-0">Unpaid Leave</h6>
                        <small className="text-muted">
                          {leaveBalance.unpaid.used} days taken (no limit)
                        </small>
                      </div>
                    </div>
                    <small className="text-muted">Used: {leaveBalance.unpaid.used} days</small>
                  </Card.Body>
                </Card>
              </Col>
            )}
          </Row>
        </>
      )}

      {/* Leave Balance Summary */}
      {leaveBalance && paidLeaveEligible && leaveBalance.earned && (
        <Row className="mb-4">
          <Col xs={6} sm={6} md={3} className="mb-3">
            <Card className="border-0 shadow-sm">
              <Card.Body className="text-center">
                <h6 className="text-muted">Earned This Year</h6>
                <h2 className="mb-0 text-primary">{leaveBalance.earned.earned} days</h2>
                <small className="text-muted">of 24 total</small>
              </Card.Body>
            </Card>
          </Col>
          <Col xs={6} sm={6} md={3} className="mb-3">
            <Card className="border-0 shadow-sm">
              <Card.Body className="text-center">
                <h6 className="text-muted">Used</h6>
                <h2 className="mb-0 text-danger">{leaveBalance.earned.used} days</h2>
                <small className="text-muted">paid leaves</small>
              </Card.Body>
            </Card>
          </Col>
          <Col xs={6} sm={6} md={3} className="mb-3">
            <Card className="border-0 shadow-sm">
              <Card.Body className="text-center">
                <h6 className="text-muted">Available</h6>
                <h2 className="mb-0 text-success">{leaveBalance.earned.remaining} days</h2>
                <small className="text-muted">can be used</small>
              </Card.Body>
            </Card>
          </Col>
          <Col xs={6} sm={6} md={3} className="mb-3">
            <Card className="border-0 shadow-sm">
              <Card.Body className="text-center">
                <h6 className="text-muted">Pending Approval</h6>
                <h2 className="mb-0 text-warning">
                  {leaves.filter(leave => leave.status === 'pending' && leave.leaveType !== 'unpaid').reduce((sum, leave) => sum + leave.numberOfDays, 0)} days
                </h2>
                <small className="text-muted">awaiting decision</small>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      )}

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
                <Table responsive hover className="leave-table">
                  <thead>
                    <tr>
                      <th>Leave Type</th>
                      <th>Start Date</th>
                      <th>End Date</th>
                      <th>Days</th>
                      <th className="hide-mobile">Reason</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {leaves.length === 0 ? (
                      <tr>
                        <td colSpan="7" className="text-center text-muted py-4">
                          No leave applications yet
                        </td>
                      </tr>
                    ) : (
                      leaves.map((leave) => (
                        <tr key={leave._id}>
                          <td>
                            <Badge bg={getLeaveTypeColor(leave.leaveType)} className="text-capitalize">
                              {LEAVE_TYPE_DETAILS[leave.leaveType]?.name || leave.leaveType}
                            </Badge>
                          </td>
                          <td className="date-cell">{formatDate(leave.startDate)}</td>
                          <td className="date-cell">{formatDate(leave.endDate)}</td>
                          <td>{leave.numberOfDays}</td>
                          <td className="reason-cell hide-mobile">{leave.reason}</td>
                          <td>
                            <Badge bg={getStatusVariant(leave.status)}>
                              {leave.status}
                            </Badge>
                          </td>
                          <td>
                            <div className="d-flex gap-1 flex-wrap">
                              <Button
                                size="sm"
                                variant="outline-primary"
                                onClick={() => setViewLeave(leave)}
                                title="View details"
                              >
                                <FaEye size={12} />
                              </Button>
                              {leave.status === "pending" && (
                                <Button
                                  size="sm"
                                  variant="outline-danger"
                                  onClick={() => handleCancel(leave._id)}
                                >
                                  Cancel
                                </Button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </Table>
              )}
            </Card.Body>
            <Card.Footer className="bg-light border-top-0">
              <div className="text-center py-2">
                <small className="text-muted">
                  <FaHome className="me-1" />
                  Need to work from home?{' '}
                  <a 
                    href="#" 
                    onClick={(e) => {
                      e.preventDefault();
                      setShowWFHModal(true);
                    }}
                    className="text-decoration-none fw-bold"
                    style={{ fontSize: '0.9rem', color: '#0d6efd' }}
                  >
                    Apply here
                  </a>
                  {user?.department?.name === 'HR' && (
                    <span className="text-warning ms-2">(Requires Admin approval)</span>
                  )}
                </small>
              </div>
            </Card.Footer>
          </Card>
        </Col>
      </Row>
      </>
      ) : (
        /* WFH Requests Tab */
        <>
          <Alert variant="info" className="mb-4">
            <strong>Remember:</strong> When working from home, you must clock in at 10:00 AM and clock out at 7:00 PM (same as office hours).
          </Alert>

          <Row>
            <Col>
              <Card className="border-0 shadow-sm">
                <Card.Header className="bg-white border-bottom">
                  <div className="d-flex justify-content-between align-items-center">
                    <h5 className="mb-0">
                      <FaHome className="me-2 text-primary" />
                      Work From Home History
                    </h5>
                    <Badge bg="secondary" pill>
                      {wfhRequests.length} {wfhRequests.length === 1 ? 'Request' : 'Requests'}
                    </Badge>
                  </div>
                </Card.Header>
                <Card.Body className="p-0">
                  
                  {loading ? (
                    <div className="text-center py-5">
                      <div className="spinner-border text-primary" role="status">
                        <span className="visually-hidden">Loading...</span>
                      </div>
                    </div>
                  ) : (
                    <Table responsive hover className="leave-table mb-0">
                      <thead className="bg-light">
                        <tr>
                          <th className="border-0">Date</th>
                          <th className="border-0">Reason</th>
                          <th className="border-0">Status</th>
                          <th className="border-0">Applied On</th>
                          <th className="border-0 hide-mobile">Approved/Rejected By</th>
                          <th className="border-0">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {wfhRequests.length === 0 ? (
                          <tr>
                            <td colSpan="6" className="text-center py-5">
                              <FaHome size={40} className="text-muted mb-3 d-block mx-auto" />
                              <p className="text-muted mb-0">No WFH requests yet</p>
                            </td>
                          </tr>
                        ) : (
                          wfhRequests.map((request) => (
                            <tr key={request._id}>
                              <td className="date-cell">
                                <div className="d-flex align-items-center gap-2">
                                  <strong>{formatDate(request.date)}</strong>
                                  {new Date(request.date).toDateString() === new Date().toDateString() && (
                                    <Badge bg="info" className="small">TODAY</Badge>
                                  )}
                                </div>
                              </td>
                              <td className="reason-cell">
                                <div style={{ maxWidth: '350px' }}>
                                  {request.reason}
                                </div>
                              </td>
                              <td>
                                <Badge bg={getStatusVariant(request.status)} className="text-capitalize">
                                  {request.status}
                                </Badge>
                              </td>
                              <td className="date-cell">
                                <small className="text-muted">{formatDate(request.createdAt)}</small>
                              </td>
                              <td className="hide-mobile">
                                {request.status === 'approved' && request.approvedBy && (
                                  <div>
                                    <div className="text-success small fw-bold">
                                      {request.approvedBy.name}
                                    </div>
                                    <small className="text-muted">
                                      {formatDate(request.approvedAt)}
                                    </small>
                                  </div>
                                )}
                                {request.status === 'rejected' && request.rejectedBy && (
                                  <div>
                                    <div className="text-danger small fw-bold">
                                      {request.rejectedBy.name}
                                    </div>
                                    <small className="text-muted">
                                      {formatDate(request.rejectedAt)}
                                    </small>
                                    {request.rejectionReason && (
                                      <div className="mt-1">
                                        <small className="text-muted fst-italic">
                                          "{request.rejectionReason}"
                                        </small>
                                      </div>
                                    )}
                                  </div>
                                )}
                                {request.status === 'pending' && (
                                  <small className="text-muted">Awaiting approval</small>
                                )}
                              </td>
                              <td>
                                <div className="d-flex gap-1">
                                  <Button
                                    size="sm"
                                    variant="outline-primary"
                                    onClick={() => setViewLeave({ ...request, _wfh: true })}
                                    title="View details"
                                  >
                                    <FaEye size={12} />
                                  </Button>
                                  {request.status === 'pending' && new Date(request.date) >= new Date() && (
                                    <Button
                                      size="sm"
                                      variant="outline-danger"
                                      onClick={() => handleCancelWFH(request._id)}
                                    >
                                      Cancel
                                    </Button>
                                  )}
                                </div>
                              </td>
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
        </>
      )}

      {/* Apply Leave Modal */}
      <Modal show={showModal} onHide={handleCloseModal} size="lg" centered>
        <Modal.Header closeButton>
          <Modal.Title>
            <FaCalendarAlt className="me-2" />
            Request Leave
          </Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleSubmit}>
          <Modal.Body>
            {/* Leave Type Selection - Card Style */}
            <div className="mb-4">
              <h6 className="mb-3">Leave Type</h6>
              {!paidLeaveEligible && (
                <Alert variant="secondary" className="mb-3">
                  Only unpaid leave is available for your employment type.
                </Alert>
              )}
              <Row className="g-3">
                {allowedLeaveTypes.includes('medical') && (
                <Col md={6}>
                  <Card 
                    className={`leave-type-card ${formData.leaveType === 'medical' ? 'selected' : ''}`}
                    onClick={() => setFormData(prev => ({ ...prev, leaveType: 'medical' }))}
                    style={{ cursor: 'pointer', border: formData.leaveType === 'medical' ? '2px solid #0d6efd' : '1px solid #dee2e6' }}
                  >
                    <Card.Body className="py-2 px-3">
                      <div className="d-flex align-items-center">
                        <div className="me-3">
                          <div style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: '#dc3545' }}></div>
                        </div>
                        <h6 className="mb-0">Medical Leave</h6>
                      </div>
                    </Card.Body>
                  </Card>
                </Col>
                )}
                {allowedLeaveTypes.includes('casual') && (
                <Col md={6}>
                  <Card 
                    className={`leave-type-card ${formData.leaveType === 'casual' ? 'selected' : ''}`}
                    onClick={() => setFormData(prev => ({ ...prev, leaveType: 'casual' }))}
                    style={{ cursor: 'pointer', border: formData.leaveType === 'casual' ? '2px solid #0d6efd' : '1px solid #dee2e6' }}
                  >
                    <Card.Body className="py-2 px-3">
                      <div className="d-flex align-items-center">
                        <div className="me-3">
                          <div style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: '#0dcaf0' }}></div>
                        </div>
                        <h6 className="mb-0">Casual Leave</h6>
                      </div>
                    </Card.Body>
                  </Card>
                </Col>
                )}
                {allowedLeaveTypes.includes('half_day') && (
                <Col md={6}>
                  <Card 
                    className={`leave-type-card ${formData.leaveType === 'half_day' ? 'selected' : ''}`}
                    onClick={() => setFormData(prev => ({
                      ...prev,
                      leaveType: 'half_day',
                      endDate: prev.startDate || prev.endDate,
                    }))}
                    style={{ cursor: 'pointer', border: formData.leaveType === 'half_day' ? '2px solid #0d6efd' : '1px solid #dee2e6' }}
                  >
                    <Card.Body className="py-2 px-3">
                      <div className="d-flex align-items-center">
                        <div className="me-3">
                          <div style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: '#ffc107' }}></div>
                        </div>
                        <h6 className="mb-0">Half Day Leave</h6>
                      </div>
                    </Card.Body>
                  </Card>
                </Col>
                )}
                {allowedLeaveTypes.includes('unpaid') && (
                <Col md={6}>
                  <Card 
                    className={`leave-type-card ${formData.leaveType === 'unpaid' ? 'selected' : ''}`}
                    onClick={() => setFormData(prev => ({ ...prev, leaveType: 'unpaid' }))}
                    style={{ cursor: 'pointer', border: formData.leaveType === 'unpaid' ? '2px solid #0d6efd' : '1px solid #dee2e6' }}
                  >
                    <Card.Body className="py-2 px-3">
                      <div className="d-flex align-items-center">
                        <div className="me-3">
                          <div style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: '#6c757d' }}></div>
                        </div>
                        <h6 className="mb-0">Unpaid Leave</h6>
                      </div>
                    </Card.Body>
                  </Card>
                </Col>
                )}
              </Row>
            </div>

            {/* Date Fields */}
            <Row className="mb-3">
              <Col md={formData.leaveType === 'half_day' ? 12 : 6}>
                <Form.Group>
                  <Form.Label>{formData.leaveType === 'half_day' ? 'Date' : 'Start Date'}</Form.Label>
                  <Form.Control
                    type="date"
                    name="startDate"
                    value={formData.startDate}
                    onChange={handleChange}
                    min={new Date().toISOString().split('T')[0]}
                    required
                  />
                </Form.Group>
              </Col>
              {formData.leaveType !== 'half_day' && (
              <Col md={6}>
                <Form.Group>
                  <Form.Label>End Date</Form.Label>
                  <Form.Control
                    type="date"
                    name="endDate"
                    value={formData.endDate}
                    onChange={handleChange}
                    min={formData.startDate || new Date().toISOString().split('T')[0]}
                    required
                  />
                </Form.Group>
              </Col>
              )}
            </Row>

            {/* Validation Alerts */}
            {formData.startDate && formData.endDate && (
              <Alert variant="info" className="mb-3">
                <FaInfoCircle className="me-2" />
                <strong>Leave Duration:</strong> {requestedDays} day{requestedDays === 1 ? '' : 's'}
                {formData.leaveType === 'half_day' && (
                  <>
                    <br />
                    <span className="text-muted">Half-day leave deducts 0.5 days from your earned balance.</span>
                  </>
                )}
                <br />
                {formData.leaveType === 'unpaid' ? (
                  <span>
                    <strong>Type:</strong> Unpaid Leave (no limit, no pay)
                  </span>
                ) : (
                  <>
                    <strong>Available Balance:</strong> {availableBalance} day(s) (earned leaves)
                    {requestedDays > availableBalance && (
                      <div className="text-danger mt-1">
                        <FaExclamationTriangle className="me-1" />
                        Insufficient earned leave balance! You have earned {leaveBalance?.earned?.earned || 0} out of 24 annual leaves.
                      </div>
                    )}
                  </>
                )}
              </Alert>
            )}

            {/* Reason Field */}
            <Form.Group className="mb-3">
              <Form.Label>Reason for Leave</Form.Label>
              <Form.Control
                as="textarea"
                rows={4}
                name="reason"
                value={formData.reason}
                onChange={handleChange}
                placeholder="Please provide a reason for your leave request..."
                maxLength={500}
                required
              />
              <Form.Text className="text-muted">
                {formData.reason.length}/500 characters
              </Form.Text>
            </Form.Group>

            {/* Attachments */}
            <Form.Group className="mb-3">
              <Form.Label>📎 Attachments (Optional)</Form.Label>
              <Form.Control
                type="file"
                onChange={handleFileChange}
                accept=".pdf,.jpg,.jpeg,.png"
              />
              <Form.Text className="text-muted">
                For medical leave, please attach medical certificate if available
              </Form.Text>
            </Form.Group>
          </Modal.Body>
          <Modal.Footer>
            <div className="d-flex justify-content-end gap-2">
              <Button variant="secondary" onClick={handleCloseModal}>
                Cancel
              </Button>
              <Button 
                variant="primary" 
                type="submit"
                disabled={paidLeaveEligible && formData.leaveType !== 'unpaid' && requestedDays > availableBalance}
              >
                Submit Request
              </Button>
            </div>
          </Modal.Footer>
        </Form>
      </Modal>

      {/* Add CSS for leave type cards */}
      <style>{`
        .leave-type-card {
          transition: all 0.2s ease;
          cursor: pointer;
          border-radius: 8px;
        }

        .leave-type-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
        }

        .leave-type-card.selected {
          background-color: #f8f9fa;
          border-color: #0d6efd !important;
          box-shadow: 0 0 0 3px rgba(13, 110, 253, 0.1);
        }

        .leave-type-card h6 {
          font-size: 0.95rem !important;
          font-weight: 600;
          margin-bottom: 0;
        }
      `}</style>

      {/* Apply WFH Modal */}
      <ApplyWFHModal
        show={showWFHModal}
        onHide={() => setShowWFHModal(false)}
        onSuccess={() => {
          setShowWFHModal(false);
          fetchWFHRequests();
          toast.success('WFH request submitted successfully!');
        }}
      />

      {/* Leave / WFH Detail View Modal — HR style */}
      <Modal show={!!viewLeave} onHide={() => setViewLeave(null)} centered size="lg">
        <Modal.Header closeButton className="border-0 pb-0">
          <Modal.Title className="d-flex align-items-center gap-2">
            <FaCalendarAlt className="text-primary" />
            {viewLeave?._wfh ? 'Work From Home Request Details' : 'Leave Request Details'}
            {viewLeave && (
              <Badge
                bg={viewLeave.status === 'approved' ? 'success' : viewLeave.status === 'rejected' ? 'danger' : viewLeave.status === 'cancelled' ? 'secondary' : 'warning'}
                className="ms-2 text-capitalize"
              >
                {viewLeave.status}
              </Badge>
            )}
          </Modal.Title>
        </Modal.Header>

        {viewLeave && (
          <Modal.Body className="pt-2">

            {/* Details grid */}
            <div className="leave-details-section mb-4">
              <h6 className="section-title mb-3">
                {viewLeave._wfh ? 'WFH Details' : 'Leave Details'}
              </h6>
              <Row className="g-3">
                {viewLeave._wfh ? (
                  <>
                    <Col md={6}>
                      <div className="detail-card p-3 border rounded">
                        <div className="d-flex align-items-center gap-2 mb-2">
                          <FaCalendarAlt className="text-primary" />
                          <span className="fw-bold">WFH Date</span>
                        </div>
                        <div className="detail-value">{formatDate(viewLeave.date)}</div>
                      </div>
                    </Col>
                    <Col md={6}>
                      <div className="detail-card p-3 border rounded">
                        <div className="d-flex align-items-center gap-2 mb-2">
                          <FaClock className="text-info" />
                          <span className="fw-bold">Applied On</span>
                        </div>
                        <div className="detail-value">{formatDate(viewLeave.createdAt)}</div>
                      </div>
                    </Col>
                  </>
                ) : (
                  <>
                    <Col md={6}>
                      <div className="detail-card p-3 border rounded">
                        <div className="d-flex align-items-center gap-2 mb-2">
                          <FaCalendarAlt className="text-primary" />
                          <span className="fw-bold">Start Date</span>
                        </div>
                        <div className="detail-value">{formatDate(viewLeave.startDate)}</div>
                      </div>
                    </Col>
                    <Col md={6}>
                      <div className="detail-card p-3 border rounded">
                        <div className="d-flex align-items-center gap-2 mb-2">
                          <FaCalendarAlt className="text-primary" />
                          <span className="fw-bold">End Date</span>
                        </div>
                        <div className="detail-value">{formatDate(viewLeave.endDate)}</div>
                      </div>
                    </Col>
                    <Col md={6}>
                      <div className="detail-card p-3 border rounded">
                        <div className="d-flex align-items-center gap-2 mb-2">
                          <FaClock className="text-info" />
                          <span className="fw-bold">Duration</span>
                        </div>
                        <div className="detail-value text-primary">{viewLeave.numberOfDays} day(s)</div>
                      </div>
                    </Col>
                    <Col md={6}>
                      <div className="detail-card p-3 border rounded">
                        <div className="d-flex align-items-center gap-2 mb-2">
                          <FaClock className="text-info" />
                          <span className="fw-bold">Leave Type</span>
                        </div>
                        <div className="detail-value">
                          <Badge bg={getLeaveTypeColor(viewLeave.leaveType)} className="text-capitalize">
                            {getLeaveTypeLabel(viewLeave.leaveType)}
                          </Badge>
                        </div>
                      </div>
                    </Col>
                  </>
                )}
              </Row>
            </div>

            {/* Reason */}
            <div className="reason-section mb-4">
              <h6 className="section-title mb-3">
                <FaFileAlt className="me-2" />
                {viewLeave._wfh ? 'Reason for WFH' : 'Reason for Leave'}
              </h6>
              <div className="reason-content p-3 bg-light rounded">
                {viewLeave.reason}
              </div>
            </div>

            {/* Approval note (leave only) */}
            {!viewLeave._wfh && viewLeave.status === 'approved' && viewLeave.rejectionReason && (
              <div className="mb-4">
                <h6 className="section-title mb-2">✅ Approval Note</h6>
                <div className="p-3 rounded" style={{ background: '#ECFDF5', border: '1px solid #A7F3D0', color: '#065F46' }}>
                  {viewLeave.rejectionReason}
                </div>
              </div>
            )}

            {/* Rejection reason */}
            {viewLeave.status === 'rejected' && viewLeave.rejectionReason && (
              <div className="mb-4">
                <h6 className="section-title mb-2">❌ Rejection Reason</h6>
                <div className="p-3 rounded" style={{ background: '#FEF2F2', border: '1px solid #FECACA', color: '#991B1B' }}>
                  {viewLeave.rejectionReason}
                </div>
              </div>
            )}

            {/* Reviewed by */}
            {(viewLeave.approvedBy || viewLeave.approvedDate) && viewLeave.status !== 'pending' && (
              <div className="p-3 bg-light rounded text-muted small">
                {viewLeave.status === 'approved' ? '✅ Approved' : '❌ Reviewed'} by{' '}
                <strong>
                  {viewLeave.approvedBy?.name || (typeof viewLeave.approvedBy === 'string' ? 'HR' : 'HR')}
                </strong>
                {viewLeave.approvedDate &&
                  ` on ${formatDate(viewLeave.approvedDate)}`}
              </div>
            )}
          </Modal.Body>
        )}

        <Modal.Footer className="border-0 pt-0">
          <Button variant="outline-secondary" onClick={() => setViewLeave(null)}>Close</Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
};

export default MyLeaves;

