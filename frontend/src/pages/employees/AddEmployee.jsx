import { useState, useEffect } from "react";
import {
  Container,
  Row,
  Col,
  Card,
  Form,
  Button,
  Spinner,
} from "react-bootstrap";
import { useNavigate } from "react-router-dom";
import { FaSave, FaArrowLeft, FaUser } from "react-icons/fa";
import { toast } from "react-toastify";
import api from "../../services/api";

const AddEmployee = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [departments, setDepartments] = useState([]);
  const [managers, setManagers] = useState([]);

  const [formData, setFormData] = useState({
    // Basic Information only
    name: "",
    email: "",
    password: "",
    phone: "",
    dateOfBirth: "",
    gender: "",
    bloodGroup: "",
    fatherName: "",
    motherName: "",
    maritalStatus: "",
    nationality: "Indian",
    status: "active",
    role: "employee",
  });

  useEffect(() => {
    fetchDepartments();
    fetchManagers();
  }, []);

  const fetchDepartments = async () => {
    try {
      const response = await api.get("/departments");
      setDepartments(response.data);
    } catch (error) {
      console.error("Error fetching departments:", error);
    }
  };

  const fetchManagers = async () => {
    try {
      const response = await api.get("/users", { params: { status: 'active', limit: 1000 } });
      const managerList = response.data.filter(
        (u) => u.role === "hr" || u.role === "hod" || u.role === "admin"
      );
      setManagers(managerList);
    } catch (error) {
      console.error("Error fetching managers:", error);
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    if (type === "checkbox") {
      setFormData((prev) => ({ ...prev, [name]: checked }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validation
    if (!formData.name || !formData.email || !formData.password) {
      toast.error("Please fill in all required fields");
      return;
    }

    try {
      setLoading(true);
      
      // Submit only basic information
      const submitData = {
        name: formData.name,
        email: formData.email,
        password: formData.password,
        phone: formData.phone,
        dateOfBirth: formData.dateOfBirth,
        gender: formData.gender,
        bloodGroup: formData.bloodGroup,
        fatherName: formData.fatherName,
        motherName: formData.motherName,
        maritalStatus: formData.maritalStatus,
        nationality: formData.nationality,
        status: "active",
        role: "employee",
      };
      
      await api.post("/users/register", submitData);
      toast.success("Employee added successfully");
      
      // Reset form data
      setFormData({
        name: "",
        email: "",
        password: "",
        phone: "",
        dateOfBirth: "",
        gender: "",
        bloodGroup: "",
        fatherName: "",
        motherName: "",
        maritalStatus: "",
        nationality: "Indian",
        status: "active",
        role: "employee",
      });
      
      navigate("/employees");
    } catch (error) {
      console.error("Error adding employee:", error);
      toast.error(error.response?.data?.message || "Failed to add employee");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container fluid className="py-4">
      {/* Header */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div className="d-flex align-items-center">
          <Button
            variant="outline-secondary"
            size="sm"
            className="me-3"
            onClick={() => navigate("/employees")}
          >
            <FaArrowLeft className="me-2" />
            Back
          </Button>
          <div>
            <h2 className="mb-0">
              <FaUser className="me-2 text-primary" />
              Add New Employee
            </h2>
            <p className="text-muted mb-0">Fill in employee information</p>
          </div>
        </div>
      </div>

      <Form onSubmit={handleSubmit}>
        <Card className="border-0 shadow-sm">
          <Card.Body>
            {/* Basic Information Section */}
            <div className="mb-4">
              <Row>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>
                        Full Name <span className="text-danger">*</span>
                      </Form.Label>
                      <Form.Control
                        type="text"
                        name="name"
                        value={formData.name}
                        onChange={handleChange}
                        required
                        placeholder="Enter full name"
                      />
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>
                        Email <span className="text-danger">*</span>
                      </Form.Label>
                      <Form.Control
                        type="email"
                        name="email"
                        value={formData.email}
                        onChange={handleChange}
                        required
                        placeholder="employee@company.com"
                      />
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>
                        Password <span className="text-danger">*</span>
                      </Form.Label>
                      <Form.Control
                        type="password"
                        name="password"
                        value={formData.password}
                        onChange={handleChange}
                        required
                        placeholder="Create password"
                      />
                      <Form.Text className="text-muted">
                        Minimum 6 characters
                      </Form.Text>
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Phone Number</Form.Label>
                      <Form.Control
                        type="tel"
                        name="phone"
                        value={formData.phone}
                        onChange={handleChange}
                        placeholder="+91 1234567890"
                      />
                    </Form.Group>
                  </Col>
                  <Col md={4}>
                    <Form.Group className="mb-3">
                      <Form.Label>Date of Birth</Form.Label>
                      <Form.Control
                        type="date"
                        name="dateOfBirth"
                        value={formData.dateOfBirth}
                        onChange={handleChange}
                      />
                    </Form.Group>
                  </Col>
                  <Col md={4}>
                    <Form.Group className="mb-3">
                      <Form.Label>Gender</Form.Label>
                      <Form.Select
                        name="gender"
                        value={formData.gender}
                        onChange={handleChange}
                      >
                        <option value="">Select Gender</option>
                        <option value="male">Male</option>
                        <option value="female">Female</option>
                        <option value="other">Other</option>
                        <option value="prefer-not-to-say">Prefer not to say</option>
                      </Form.Select>
                    </Form.Group>
                  </Col>
                  <Col md={4}>
                    <Form.Group className="mb-3">
                      <Form.Label>Blood Group</Form.Label>
                      <Form.Select
                        name="bloodGroup"
                        value={formData.bloodGroup}
                        onChange={handleChange}
                      >
                        <option value="">Select Blood Group</option>
                        <option value="A+">A+</option>
                        <option value="A-">A-</option>
                        <option value="B+">B+</option>
                        <option value="B-">B-</option>
                        <option value="AB+">AB+</option>
                        <option value="AB-">AB-</option>
                        <option value="O+">O+</option>
                        <option value="O-">O-</option>
                      </Form.Select>
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Father's Name</Form.Label>
                      <Form.Control
                        type="text"
                        name="fatherName"
                        value={formData.fatherName}
                        onChange={handleChange}
                        placeholder="Enter father's name"
                      />
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Mother's Name</Form.Label>
                      <Form.Control
                        type="text"
                        name="motherName"
                        value={formData.motherName}
                        onChange={handleChange}
                        placeholder="Enter mother's name"
                      />
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Marital Status</Form.Label>
                      <Form.Select
                        name="maritalStatus"
                        value={formData.maritalStatus}
                        onChange={handleChange}
                      >
                        <option value="">Select Status</option>
                        <option value="single">Single</option>
                        <option value="married">Married</option>
                        <option value="divorced">Divorced</option>
                        <option value="widowed">Widowed</option>
                      </Form.Select>
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Nationality</Form.Label>
                      <Form.Control
                        type="text"
                        name="nationality"
                        value={formData.nationality}
                        onChange={handleChange}
                        placeholder="Enter nationality"
                      />
                    </Form.Group>
                  </Col>
                </Row>
            </div>

            {/* Action Buttons */}
            <div className="d-flex justify-content-between align-items-center mt-4 pt-3 border-top">
              <Button
                variant="outline-warning"
                onClick={() => {
                  if (window.confirm('Are you sure you want to clear all form data?')) {
                    setFormData({
                      name: "",
                      email: "",
                      password: "",
                      phone: "",
                      dateOfBirth: "",
                      gender: "",
                      bloodGroup: "",
                      fatherName: "",
                      motherName: "",
                      maritalStatus: "",
                      nationality: "Indian",
                      status: "active",
                      role: "employee",
                    });
                    toast.info("Form cleared");
                  }
                }}
                disabled={loading}
              >
                Clear Form
              </Button>
              
              <div className="d-flex gap-2">
                <Button
                  variant="outline-secondary"
                  onClick={() => navigate("/employees")}
                  disabled={loading}
                >
                  Cancel
                </Button>
                <Button type="submit" variant="primary" disabled={loading}>
                  {loading ? (
                    <>
                      <Spinner animation="border" size="sm" className="me-2" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <FaSave className="me-2" />
                      Save Employee
                    </>
                  )}
                </Button>
              </div>
            </div>
          </Card.Body>
        </Card>
      </Form>
    </Container>
  );
};

export default AddEmployee;
