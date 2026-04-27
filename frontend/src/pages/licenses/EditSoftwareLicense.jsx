import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Container, Row, Col, Form, Button, Alert, Spinner } from "react-bootstrap";
import { FaSave, FaTimes, FaArrowLeft } from "react-icons/fa";
import { getLicenseById, updateLicense } from "../../api/softwareLicenseApi";
import "./EditSoftwareLicense.css";

const EditSoftwareLicense = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [formData, setFormData] = useState({
    softwareName: "",
    vendor: "",
    licenseType: "Subscription",
    licenseKey: "",
    purchaseDate: "",
    expiryDate: "",
    cost: "",
    currency: "INR",
    quantity: 1,
    category: "Development",
    description: "",
    supportEndDate: "",
    renewalReminder: true,
    reminderDaysBefore: 30,
    documentUrl: "",
    notes: "",
  });

  useEffect(() => {
    fetchLicense();
  }, [id]);

  const fetchLicense = async () => {
    try {
      setLoading(true);
      const response = await getLicenseById(id);
      const license = response.data;
      setFormData({
        softwareName: license.softwareName,
        vendor: license.vendor,
        licenseType: license.licenseType,
        licenseKey: license.licenseKey || "",
        purchaseDate: license.purchaseDate?.split("T")[0] || "",
        expiryDate: license.expiryDate?.split("T")[0] || "",
        cost: license.cost,
        currency: license.currency,
        quantity: license.quantity,
        category: license.category,
        description: license.description || "",
        supportEndDate: license.supportEndDate?.split("T")[0] || "",
        renewalReminder: license.renewalReminder,
        reminderDaysBefore: license.reminderDaysBefore,
        documentUrl: license.documentUrl || "",
        notes: license.notes || "",
      });
      setError(null);
    } catch (err) {
      setError(err.message || "Failed to fetch license");
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (!formData.softwareName || !formData.vendor || !formData.purchaseDate || !formData.cost) {
      setError("Please fill in all required fields");
      return;
    }

    try {
      setSaving(true);
      await updateLicense(id, formData);
      navigate(`/licenses/${id}`);
    } catch (err) {
      setError(err.message || "Failed to update license");
    } finally {
      setSaving(false);
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

  return (
    <Container fluid className="edit-software-license-page py-4">
      <Row className="mb-4">
        <Col>
          <Button
            variant="outline-secondary"
            onClick={() => navigate(`/licenses/${id}`)}
            className="mb-3"
          >
            <FaArrowLeft /> Back
          </Button>
          <h1 className="page-title">Edit Software License</h1>
        </Col>
      </Row>

      {error && <Alert variant="danger">{error}</Alert>}

      <div className="form-container">
        <Form onSubmit={handleSubmit}>
          <Row>
            <Col md={6}>
              <Form.Group className="mb-3">
                <Form.Label>Software Name *</Form.Label>
                <Form.Control
                  type="text"
                  name="softwareName"
                  value={formData.softwareName}
                  onChange={handleChange}
                  placeholder="e.g., Microsoft Office 365"
                  required
                />
              </Form.Group>
            </Col>
            <Col md={6}>
              <Form.Group className="mb-3">
                <Form.Label>Vendor *</Form.Label>
                <Form.Control
                  type="text"
                  name="vendor"
                  value={formData.vendor}
                  onChange={handleChange}
                  placeholder="e.g., Microsoft"
                  required
                />
              </Form.Group>
            </Col>
          </Row>

          <Row>
            <Col md={4}>
              <Form.Group className="mb-3">
                <Form.Label>License Type *</Form.Label>
                <Form.Select
                  name="licenseType"
                  value={formData.licenseType}
                  onChange={handleChange}
                  required
                >
                  <option value="Perpetual">Perpetual</option>
                  <option value="Subscription">Subscription</option>
                  <option value="Trial">Trial</option>
                  <option value="Educational">Educational</option>
                  <option value="Open Source">Open Source</option>
                </Form.Select>
              </Form.Group>
            </Col>
            <Col md={4}>
              <Form.Group className="mb-3">
                <Form.Label>Category *</Form.Label>
                <Form.Select
                  name="category"
                  value={formData.category}
                  onChange={handleChange}
                  required
                >
                  <option value="Development">Development</option>
                  <option value="Productivity">Productivity</option>
                  <option value="Design">Design</option>
                  <option value="Security">Security</option>
                  <option value="Utilities">Utilities</option>
                  <option value="Other">Other</option>
                </Form.Select>
              </Form.Group>
            </Col>
            <Col md={4}>
              <Form.Group className="mb-3">
                <Form.Label>Quantity</Form.Label>
                <Form.Control
                  type="number"
                  name="quantity"
                  value={formData.quantity}
                  onChange={handleChange}
                  min="1"
                />
              </Form.Group>
            </Col>
          </Row>

          <Row>
            <Col md={6}>
              <Form.Group className="mb-3">
                <Form.Label>License Key</Form.Label>
                <Form.Control
                  type="text"
                  name="licenseKey"
                  value={formData.licenseKey}
                  onChange={handleChange}
                  placeholder="Enter license key"
                />
              </Form.Group>
            </Col>
            <Col md={6}>
              <Form.Group className="mb-3">
                <Form.Label>Purchase Date *</Form.Label>
                <Form.Control
                  type="date"
                  name="purchaseDate"
                  value={formData.purchaseDate}
                  onChange={handleChange}
                  required
                />
              </Form.Group>
            </Col>
          </Row>

          <Row>
            <Col md={4}>
              <Form.Group className="mb-3">
                <Form.Label>Expiry Date</Form.Label>
                <Form.Control
                  type="date"
                  name="expiryDate"
                  value={formData.expiryDate}
                  onChange={handleChange}
                />
              </Form.Group>
            </Col>
            <Col md={4}>
              <Form.Group className="mb-3">
                <Form.Label>Support End Date</Form.Label>
                <Form.Control
                  type="date"
                  name="supportEndDate"
                  value={formData.supportEndDate}
                  onChange={handleChange}
                />
              </Form.Group>
            </Col>
            <Col md={4}>
              <Form.Group className="mb-3">
                <Form.Label>Cost *</Form.Label>
                <Form.Control
                  type="number"
                  name="cost"
                  value={formData.cost}
                  onChange={handleChange}
                  placeholder="0.00"
                  step="0.01"
                  min="0"
                  required
                />
              </Form.Group>
            </Col>
          </Row>

          <Row>
            <Col md={6}>
              <Form.Group className="mb-3">
                <Form.Label>Currency</Form.Label>
                <Form.Control
                  type="text"
                  name="currency"
                  value={formData.currency}
                  onChange={handleChange}
                />
              </Form.Group>
            </Col>
            <Col md={6}>
              <Form.Group className="mb-3">
                <Form.Label>Document URL</Form.Label>
                <Form.Control
                  type="url"
                  name="documentUrl"
                  value={formData.documentUrl}
                  onChange={handleChange}
                  placeholder="https://..."
                />
              </Form.Group>
            </Col>
          </Row>

          <Row>
            <Col md={12}>
              <Form.Group className="mb-3">
                <Form.Label>Description</Form.Label>
                <Form.Control
                  as="textarea"
                  rows={3}
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  placeholder="Enter license description"
                />
              </Form.Group>
            </Col>
          </Row>

          <Row>
            <Col md={12}>
              <Form.Group className="mb-3">
                <Form.Label>Notes</Form.Label>
                <Form.Control
                  as="textarea"
                  rows={3}
                  name="notes"
                  value={formData.notes}
                  onChange={handleChange}
                  placeholder="Enter additional notes"
                />
              </Form.Group>
            </Col>
          </Row>

          <Row>
            <Col md={6}>
              <Form.Group className="mb-3">
                <Form.Check
                  type="checkbox"
                  name="renewalReminder"
                  label="Enable Renewal Reminder"
                  checked={formData.renewalReminder}
                  onChange={handleChange}
                />
              </Form.Group>
            </Col>
            <Col md={6}>
              <Form.Group className="mb-3">
                <Form.Label>Reminder Days Before Expiry</Form.Label>
                <Form.Control
                  type="number"
                  name="reminderDaysBefore"
                  value={formData.reminderDaysBefore}
                  onChange={handleChange}
                  min="1"
                  disabled={!formData.renewalReminder}
                />
              </Form.Group>
            </Col>
          </Row>

          <div className="form-actions">
            <Button
              variant="primary"
              type="submit"
              disabled={saving}
              className="btn-save"
            >
              {saving ? (
                <>
                  <Spinner animation="border" size="sm" className="me-2" />
                  Saving...
                </>
              ) : (
                <>
                  <FaSave /> Update License
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
      </div>
    </Container>
  );
};

export default EditSoftwareLicense;
