import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Container, Row, Col, Form, Button, Alert, Spinner, Card } from "react-bootstrap";
import { FaSave, FaTimes, FaArrowLeft } from "react-icons/fa";
import { getLicenseById, assignLicense } from "../../api/softwareLicenseApi";
import { getAllUsers } from "../../api/userApi";
import "./AssignSoftwareLicense.css";

const AssignSoftwareLicense = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [license, setLicense] = useState(null);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [assigning, setAssigning] = useState(false);
  const [error, setError] = useState(null);
  const [formData, setFormData] = useState({
    userId: "",
    installationPath: "",
    deviceInfo: "",
    notes: "",
  });

  useEffect(() => {
    fetchData();
  }, [id]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [licenseRes, usersRes] = await Promise.all([
        getLicenseById(id),
        getAllUsers({ limit: 1000 }),
      ]);
      setLicense(licenseRes.data);
      setUsers(usersRes.data || []);
      setError(null);
    } catch (err) {
      setError(err.message || "Failed to fetch data");
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (!formData.userId) {
      setError("Please select a user");
      return;
    }

    try {
      setAssigning(true);
      await assignLicense({
        licenseId: id,
        userId: formData.userId,
        installationPath: formData.installationPath,
        deviceInfo: formData.deviceInfo,
        notes: formData.notes,
      });
      navigate(`/licenses/${id}`);
    } catch (err) {
      setError(err.message || "Failed to assign license");
    } finally {
      setAssigning(false);
    }
  };

  if (loading) {
    return (
      <Container className="py-5 text-center">
        <Spinner animation="border" role="status">
          <span className="visually-hidden">Loading...</span>
        </Spinner>
      </Container>
    );
  }

  if (!license) {
    return (
      <Container className="py-5">
        <Alert variant="danger">License not found</Alert>
      </Container>
    );
  }

  return (
    <Container fluid className="assign-software-license-page py-4">
      <Row className="mb-4">
        <Col>
          <Button
            variant="outline-secondary"
            onClick={() => navigate(`/licenses/${id}`)}
            className="mb-3"
          >
            <FaArrowLeft /> Back
          </Button>
          <h1 className="page-title">Assign License</h1>
          <p className="subtitle">{license.softwareName}</p>
        </Col>
      </Row>

      {error && <Alert variant="danger">{error}</Alert>}

      <Row>
        <Col md={8}>
          <Card className="form-container">
            <Card.Body>
              <Form onSubmit={handleSubmit}>
                <Form.Group className="mb-3">
                  <Form.Label>Select User *</Form.Label>
                  <Form.Select
                    name="userId"
                    value={formData.userId}
                    onChange={handleChange}
                    required
                  >
                    <option value="">-- Select a user --</option>
                    {users.map(user => (
                      <option key={user._id} value={user._id}>
                        {user.name} ({user.email})
                      </option>
                    ))}
                  </Form.Select>
                </Form.Group>

                <Form.Group className="mb-3">
                  <Form.Label>Installation Path</Form.Label>
                  <Form.Control
                    type="text"
                    name="installationPath"
                    value={formData.installationPath}
                    onChange={handleChange}
                    placeholder="e.g., C:\Program Files\Software"
                  />
                </Form.Group>

                <Form.Group className="mb-3">
                  <Form.Label>Device Info</Form.Label>
                  <Form.Control
                    type="text"
                    name="deviceInfo"
                    value={formData.deviceInfo}
                    onChange={handleChange}
                    placeholder="e.g., Dell Laptop, Windows 10"
                  />
                </Form.Group>

                <Form.Group className="mb-3">
                  <Form.Label>Notes</Form.Label>
                  <Form.Control
                    as="textarea"
                    rows={3}
                    name="notes"
                    value={formData.notes}
                    onChange={handleChange}
                    placeholder="Enter assignment notes"
                  />
                </Form.Group>

                <div className="form-actions">
                  <Button
                    variant="primary"
                    type="submit"
                    disabled={assigning}
                    className="btn-save"
                  >
                    {assigning ? (
                      <>
                        <Spinner animation="border" size="sm" className="me-2" />
                        Assigning...
                      </>
                    ) : (
                      <>
                        <FaSave /> Assign License
                      </>
                    )}
                  </Button>
                  <Button
                    variant="outline-secondary"
                    onClick={() => navigate(`/licenses/${id}`)}
                    className="btn-cancel"
                  >
                    <FaTimes /> Cancel
                  </Button>
                </div>
              </Form>
            </Card.Body>
          </Card>
        </Col>

        <Col md={4}>
          <Card>
            <Card.Header className="bg-light">
              <h5 className="mb-0">License Details</h5>
            </Card.Header>
            <Card.Body>
              <p className="label">Software Name</p>
              <p className="value">{license.softwareName}</p>
              <p className="label">Vendor</p>
              <p className="value">{license.vendor}</p>
              <p className="label">License Type</p>
              <p className="value">{license.licenseType}</p>
              <p className="label">Quantity Available</p>
              <p className="value">{license.quantity}</p>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
};

export default AssignSoftwareLicense;
