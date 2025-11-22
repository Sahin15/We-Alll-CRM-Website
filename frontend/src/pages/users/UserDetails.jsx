import { useState, useEffect } from "react";
import { 
  Container, 
  Row, 
  Col, 
  Card, 
  Badge, 
  Button, 
  Tabs, 
  Tab,
  Image,
  Spinner,
  Alert,
  ListGroup
} from "react-bootstrap";
import { useParams, useNavigate } from "react-router-dom";
import {
  FaUser,
  FaEnvelope,
  FaPhone,
  FaBriefcase,
  FaCalendarAlt,
  FaMapMarkerAlt,
  FaIdCard,
  FaUniversity,
  FaFileAlt,
  FaEdit,
  FaArrowLeft,
  FaUserCircle,
  FaClock,
  FaTasks,
  FaChartLine
} from "react-icons/fa";
import { toast } from "react-toastify";
import api from "../../services/api";
import DocumentUploadSection from "../../components/employees/DocumentUploadSection";

const UserDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = window.location;
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");
  
  // Check if we're on employees or users page
  const isEmployeesPage = location.pathname.includes('/employees/');

  useEffect(() => {
    fetchUserDetails();
  }, [id]);

  const fetchUserDetails = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/users/${id}`);
      setUser(response.data);
    } catch (error) {
      console.error("Error fetching user details:", error);
      toast.error("Failed to fetch employee details");
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (date) => {
    if (!date) return "N/A";
    return new Date(date).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric"
    });
  };

  const getStatusBadge = (status) => {
    const variants = {
      active: "success",
      inactive: "secondary",
      suspended: "danger"
    };
    return <Badge bg={variants[status] || "secondary"}>{status}</Badge>;
  };

  const getRoleBadge = (role) => {
    const variants = {
      superadmin: "danger",
      admin: "primary",
      hr: "info",
      hod: "warning",
      employee: "success",
      accounts: "secondary",
      client: "dark"
    };
    return <Badge bg={variants[role] || "secondary"} className="text-capitalize">{role}</Badge>;
  };

  if (loading) {
    return (
      <Container fluid className="py-4">
        <div className="text-center py-5">
          <Spinner animation="border" variant="primary" />
          <p className="mt-3 text-muted">Loading employee details...</p>
        </div>
      </Container>
    );
  }

  if (!user) {
    return (
      <Container fluid className="py-4">
        <Alert variant="danger">
          <Alert.Heading>Employee Not Found</Alert.Heading>
          <p>The employee you're looking for doesn't exist or has been removed.</p>
          <Button variant="outline-danger" onClick={() => navigate("/users")}>
            Back to Users
          </Button>
        </Alert>
      </Container>
    );
  }

  return (
    <Container fluid className="py-4">
      {/* Header */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div className="d-flex align-items-center">
          <Button 
            variant="outline-secondary" 
            size="sm" 
            className="me-3"
            onClick={() => navigate(isEmployeesPage ? "/employees" : "/users")}
          >
            <FaArrowLeft className="me-2" />
            Back
          </Button>
          <h2 className="mb-0">Employee Details</h2>
        </div>
        <Button variant="primary" onClick={() => navigate(isEmployeesPage ? `/employees/${id}/edit` : `/users/${id}/edit`)}>
          <FaEdit className="me-2" />
          Edit Employee
        </Button>
      </div>

      {/* Profile Header Card */}
      <Card className="border-0 shadow-sm mb-4">
        <Card.Body className="p-4">
          <Row>
            <Col md={2} className="text-center">
              {user.profilePicture ? (
                <Image
                  src={user.profilePicture}
                  roundedCircle
                  width={120}
                  height={120}
                  className="border"
                  style={{ objectFit: "cover" }}
                />
              ) : (
                <div 
                  className="rounded-circle bg-primary bg-opacity-10 d-flex align-items-center justify-content-center mx-auto"
                  style={{ width: "120px", height: "120px" }}
                >
                  <FaUserCircle size={80} className="text-primary" />
                </div>
              )}
            </Col>
            <Col md={7}>
              <h3 className="mb-2">{user.name}</h3>
              <p className="text-muted mb-3">{user.designation || user.position || "No designation"}</p>
              
              <div className="d-flex flex-wrap gap-2 mb-3">
                {getRoleBadge(user.role)}
                {getStatusBadge(user.status)}
                {user.employmentType && (
                  <Badge bg="info" className="text-capitalize">{user.employmentType}</Badge>
                )}
              </div>

              <Row className="g-3">
                <Col md={6}>
                  <div className="d-flex align-items-center text-muted">
                    <FaEnvelope className="me-2" />
                    <span>{user.email}</span>
                  </div>
                </Col>
                <Col md={6}>
                  <div className="d-flex align-items-center text-muted">
                    <FaPhone className="me-2" />
                    <span>{user.phone || "N/A"}</span>
                  </div>
                </Col>
                <Col md={6}>
                  <div className="d-flex align-items-center text-muted">
                    <FaIdCard className="me-2" />
                    <span>ID: {user.employeeId || "N/A"}</span>
                  </div>
                </Col>
                <Col md={6}>
                  <div className="d-flex align-items-center text-muted">
                    <FaCalendarAlt className="me-2" />
                    <span>Joined: {formatDate(user.joiningDate || user.hireDate)}</span>
                  </div>
                </Col>
              </Row>
            </Col>
            <Col md={3}>
              <Card className="border-0 bg-light h-100">
                <Card.Body>
                  <h6 className="text-muted mb-3">Quick Stats</h6>
                  <div className="mb-2">
                    <FaClock className="text-primary me-2" />
                    <small>Attendance: 95%</small>
                  </div>
                  <div className="mb-2">
                    <FaTasks className="text-success me-2" />
                    <small>Tasks: 12 Active</small>
                  </div>
                  <div>
                    <FaChartLine className="text-info me-2" />
                    <small>Performance: Good</small>
                  </div>
                </Card.Body>
              </Card>
            </Col>
          </Row>
        </Card.Body>
      </Card>

      {/* Detailed Information Tabs */}
      <Card className="border-0 shadow-sm">
        <Card.Body>
          <Tabs
            activeKey={activeTab}
            onSelect={(k) => setActiveTab(k)}
            className="mb-4"
          >
            {/* Overview Tab */}
            <Tab eventKey="overview" title="Overview">
              <Row>
                <Col md={6}>
                  <Card className="border mb-4">
                    <Card.Header className="bg-light">
                      <h6 className="mb-0">
                        <FaUser className="me-2" />
                        Personal Information
                      </h6>
                    </Card.Header>
                    <Card.Body>
                      <ListGroup variant="flush">
                        <ListGroup.Item className="d-flex justify-content-between">
                          <span className="text-muted">Full Name:</span>
                          <strong>{user.name}</strong>
                        </ListGroup.Item>
                        <ListGroup.Item className="d-flex justify-content-between">
                          <span className="text-muted">Date of Birth:</span>
                          <strong>{formatDate(user.dateOfBirth)}</strong>
                        </ListGroup.Item>
                        <ListGroup.Item className="d-flex justify-content-between">
                          <span className="text-muted">Gender:</span>
                          <strong className="text-capitalize">{user.gender || "N/A"}</strong>
                        </ListGroup.Item>
                        <ListGroup.Item className="d-flex justify-content-between">
                          <span className="text-muted">Blood Group:</span>
                          <strong>{user.bloodGroup || "N/A"}</strong>
                        </ListGroup.Item>
                        <ListGroup.Item className="d-flex justify-content-between">
                          <span className="text-muted">Email:</span>
                          <strong>{user.email}</strong>
                        </ListGroup.Item>
                        <ListGroup.Item className="d-flex justify-content-between">
                          <span className="text-muted">Phone:</span>
                          <strong>{user.phone || "N/A"}</strong>
                        </ListGroup.Item>
                      </ListGroup>
                    </Card.Body>
                  </Card>
                </Col>

                <Col md={6}>
                  <Card className="border mb-4">
                    <Card.Header className="bg-light">
                      <h6 className="mb-0">
                        <FaBriefcase className="me-2" />
                        Job Information
                      </h6>
                    </Card.Header>
                    <Card.Body>
                      <ListGroup variant="flush">
                        <ListGroup.Item className="d-flex justify-content-between">
                          <span className="text-muted">Employee ID:</span>
                          <strong>{user.employeeId || "N/A"}</strong>
                        </ListGroup.Item>
                        <ListGroup.Item className="d-flex justify-content-between">
                          <span className="text-muted">Designation:</span>
                          <strong>{user.designation || user.position || "N/A"}</strong>
                        </ListGroup.Item>
                        <ListGroup.Item className="d-flex justify-content-between">
                          <span className="text-muted">Department:</span>
                          <strong>{user.department?.name || "N/A"}</strong>
                        </ListGroup.Item>
                        <ListGroup.Item className="d-flex justify-content-between">
                          <span className="text-muted">Employment Type:</span>
                          <strong className="text-capitalize">{user.employmentType || "N/A"}</strong>
                        </ListGroup.Item>
                        <ListGroup.Item className="d-flex justify-content-between">
                          <span className="text-muted">Joining Date:</span>
                          <strong>{formatDate(user.joiningDate || user.hireDate)}</strong>
                        </ListGroup.Item>
                        <ListGroup.Item className="d-flex justify-content-between">
                          <span className="text-muted">Reporting Manager:</span>
                          <strong>{user.reportingManager?.name || user.manager?.name || "N/A"}</strong>
                        </ListGroup.Item>
                      </ListGroup>
                    </Card.Body>
                  </Card>
                </Col>
              </Row>
            </Tab>

            {/* Contact & Address Tab */}
            <Tab eventKey="contact" title="Contact & Address">
              <Row>
                <Col md={6}>
                  <Card className="border mb-4">
                    <Card.Header className="bg-light">
                      <h6 className="mb-0">
                        <FaMapMarkerAlt className="me-2" />
                        Current Address
                      </h6>
                    </Card.Header>
                    <Card.Body>
                      {user.currentAddress?.street || user.address?.street ? (
                        <>
                          <p className="mb-1">{user.currentAddress?.street || user.address?.street}</p>
                          <p className="mb-1">{user.currentAddress?.city || user.address?.city}, {user.currentAddress?.state || user.address?.state}</p>
                          <p className="mb-1">{user.currentAddress?.pincode || user.address?.zipCode}</p>
                          <p className="mb-0">{user.currentAddress?.country || user.address?.country}</p>
                        </>
                      ) : (
                        <p className="text-muted">No address information available</p>
                      )}
                    </Card.Body>
                  </Card>
                </Col>

                <Col md={6}>
                  <Card className="border mb-4">
                    <Card.Header className="bg-light">
                      <h6 className="mb-0">
                        <FaMapMarkerAlt className="me-2" />
                        Permanent Address
                      </h6>
                    </Card.Header>
                    <Card.Body>
                      {user.permanentAddress?.street ? (
                        <>
                          <p className="mb-1">{user.permanentAddress.street}</p>
                          <p className="mb-1">{user.permanentAddress.city}, {user.permanentAddress.state}</p>
                          <p className="mb-1">{user.permanentAddress.pincode}</p>
                          <p className="mb-0">{user.permanentAddress.country}</p>
                        </>
                      ) : (
                        <p className="text-muted">Same as current address</p>
                      )}
                    </Card.Body>
                  </Card>
                </Col>

                <Col md={12}>
                  <Card className="border mb-4">
                    <Card.Header className="bg-light">
                      <h6 className="mb-0">
                        <FaPhone className="me-2" />
                        Emergency Contact
                      </h6>
                    </Card.Header>
                    <Card.Body>
                      {user.emergencyContact?.name ? (
                        <Row>
                          <Col md={3}>
                            <p className="text-muted mb-1">Name:</p>
                            <p className="fw-bold">{user.emergencyContact.name}</p>
                          </Col>
                          <Col md={3}>
                            <p className="text-muted mb-1">Phone:</p>
                            <p className="fw-bold">{user.emergencyContact.phone}</p>
                          </Col>
                          <Col md={3}>
                            <p className="text-muted mb-1">Relationship:</p>
                            <p className="fw-bold">{user.emergencyContact.relationship}</p>
                          </Col>
                          <Col md={3}>
                            <p className="text-muted mb-1">Address:</p>
                            <p className="fw-bold">{user.emergencyContact.address || "N/A"}</p>
                          </Col>
                        </Row>
                      ) : (
                        <p className="text-muted">No emergency contact information available</p>
                      )}
                    </Card.Body>
                  </Card>
                </Col>
              </Row>
            </Tab>

            {/* Bank & Documents Tab */}
            <Tab eventKey="bank" title="Bank & Documents">
              <Row>
                <Col md={6}>
                  <Card className="border mb-4">
                    <Card.Header className="bg-light">
                      <h6 className="mb-0">
                        <FaUniversity className="me-2" />
                        Bank Details
                      </h6>
                    </Card.Header>
                    <Card.Body>
                      {user.bankDetails?.bankName ? (
                        <ListGroup variant="flush">
                          <ListGroup.Item className="d-flex justify-content-between">
                            <span className="text-muted">Bank Name:</span>
                            <strong>{user.bankDetails.bankName}</strong>
                          </ListGroup.Item>
                          <ListGroup.Item className="d-flex justify-content-between">
                            <span className="text-muted">Account Holder:</span>
                            <strong>{user.bankDetails.accountHolderName || user.name}</strong>
                          </ListGroup.Item>
                          <ListGroup.Item className="d-flex justify-content-between">
                            <span className="text-muted">IFSC Code:</span>
                            <strong>{user.bankDetails.ifscCode}</strong>
                          </ListGroup.Item>
                          <ListGroup.Item className="d-flex justify-content-between">
                            <span className="text-muted">Branch:</span>
                            <strong>{user.bankDetails.branchName || "N/A"}</strong>
                          </ListGroup.Item>
                          <ListGroup.Item className="d-flex justify-content-between">
                            <span className="text-muted">UPI ID:</span>
                            <strong>{user.bankDetails.upiId || "N/A"}</strong>
                          </ListGroup.Item>
                        </ListGroup>
                      ) : (
                        <p className="text-muted">No bank details available</p>
                      )}
                    </Card.Body>
                  </Card>
                </Col>

                <Col md={6}>
                  <Card className="border mb-4">
                    <Card.Header className="bg-light">
                      <h6 className="mb-0">
                        <FaIdCard className="me-2" />
                        Government IDs
                      </h6>
                    </Card.Header>
                    <Card.Body>
                      <ListGroup variant="flush">
                        <ListGroup.Item className="d-flex justify-content-between">
                          <span className="text-muted">PAN Number:</span>
                          <strong>{user.governmentIds?.panNumber ? "••••••" + user.governmentIds.panNumber.slice(-4) : "N/A"}</strong>
                        </ListGroup.Item>
                        <ListGroup.Item className="d-flex justify-content-between">
                          <span className="text-muted">Aadhaar Number:</span>
                          <strong>{user.governmentIds?.aadhaarNumber ? "•••• •••• " + user.governmentIds.aadhaarNumber.slice(-4) : "N/A"}</strong>
                        </ListGroup.Item>
                        <ListGroup.Item className="d-flex justify-content-between">
                          <span className="text-muted">UAN Number:</span>
                          <strong>{user.governmentIds?.uanNumber || "N/A"}</strong>
                        </ListGroup.Item>
                        <ListGroup.Item className="d-flex justify-content-between">
                          <span className="text-muted">ESIC Number:</span>
                          <strong>{user.governmentIds?.esicNumber || "N/A"}</strong>
                        </ListGroup.Item>
                      </ListGroup>
                    </Card.Body>
                  </Card>
                </Col>

                <Col md={12}>
                  <DocumentUploadSection employeeId={id} />
                </Col>
              </Row>
            </Tab>

            {/* Additional Info Tab */}
            <Tab eventKey="additional" title="Additional Info">
              <Card className="border">
                <Card.Body>
                  <Row>
                    <Col md={12} className="mb-3">
                      <h6 className="text-muted">Notes</h6>
                      <p>{user.notes || "No additional notes"}</p>
                    </Col>
                    <Col md={6}>
                      <h6 className="text-muted">Account Status</h6>
                      <p>{getStatusBadge(user.status)}</p>
                    </Col>
                    <Col md={6}>
                      <h6 className="text-muted">Last Updated</h6>
                      <p>{formatDate(user.updatedAt)}</p>
                    </Col>
                  </Row>
                </Card.Body>
              </Card>
            </Tab>
          </Tabs>
        </Card.Body>
      </Card>
    </Container>
  );
};

export default UserDetails;
