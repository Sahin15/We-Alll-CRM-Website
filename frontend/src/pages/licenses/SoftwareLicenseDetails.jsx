import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Container, Row, Col, Button, Alert, Spinner, Card, Modal, Form } from "react-bootstrap";
import { FaEdit, FaArrowLeft, FaTrash, FaLink, FaCalendarAlt, FaUser } from "react-icons/fa";
import LicenseStatusBadge from "../../components/licenses/LicenseStatusBadge";
import { getLicenseById, deleteLicense, updateLicense } from "../../api/softwareLicenseApi";
import "./SoftwareLicenseDetails.css";

const RevokeLicenseModal = ({ show, onHide, onRevoke, loading }) => {
  const [reason, setReason] = useState("");

  const handleSubmit = () => {
    onRevoke(reason);
    setReason("");
  };

  return (
    <Modal show={show} onHide={onHide} centered>
      <Modal.Header closeButton>
        <Modal.Title>Revoke License</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <Form.Group>
          <Form.Label>Revocation Reason</Form.Label>
          <Form.Control
            as="textarea"
            rows={3}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Enter reason for revocation"
          />
        </Form.Group>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={onHide} disabled={loading}>
          Cancel
        </Button>
        <Button
          variant="danger"
          onClick={handleSubmit}
          disabled={loading || !reason.trim()}
        >
          {loading ? "Revoking..." : "Revoke License"}
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

const SoftwareLicenseDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [license, setLicense] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [showRevokeModal, setShowRevokeModal] = useState(false);
  const [revoking, setRevoking] = useState(false);

  useEffect(() => {
    fetchLicense();
  }, [id]);

  const fetchLicense = async () => {
    try {
      setLoading(true);
      const response = await getLicenseById(id);
      setLicense(response.data);
      setError(null);
    } catch (err) {
      setError(err.message || "Failed to fetch license");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (window.confirm("Are you sure you want to delete this license?")) {
      try {
        await deleteLicense(id);
        navigate("/licenses");
      } catch (err) {
        setError(err.message || "Failed to delete license");
      }
    }
  };

  const handleRevoke = async (reason) => {
    try {
      setRevoking(true);
      await updateLicense(id, {
        status: "Revoked",
        revocationReason: reason,
      });
      setSuccess("License revoked successfully");
      setShowRevokeModal(false);
      fetchLicense();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err.message || "Failed to revoke license");
    } finally {
      setRevoking(false);
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
    <Container fluid className="software-license-details-page py-4">
      <Row className="mb-4">
        <Col>
          <Button
            variant="outline-secondary"
            onClick={() => navigate("/licenses")}
            className="mb-3"
          >
            <FaArrowLeft /> Back to Licenses
          </Button>
          <h1 className="page-title">{license.softwareName}</h1>
        </Col>
        <Col className="text-end">
          <Button
            variant="warning"
            onClick={() => navigate(`/licenses/${id}/edit`)}
            className="me-2"
          >
            <FaEdit /> Edit
          </Button>
          <Button variant="danger" onClick={handleDelete}>
            <FaTrash /> Delete
          </Button>
        </Col>
      </Row>

      {error && <Alert variant="danger">{error}</Alert>}
      {success && <Alert variant="success">{success}</Alert>}

      <Row>
        <Col md={8}>
          <Card className="mb-4">
            <Card.Header className="bg-light">
              <h5 className="mb-0">License Information</h5>
            </Card.Header>
            <Card.Body>
              <Row className="mb-3">
                <Col md={6}>
                  <p className="label">License ID</p>
                  <p className="value">{license.licenseId}</p>
                </Col>
                <Col md={6}>
                  <p className="label">Status</p>
                  <LicenseStatusBadge status={license.status} />
                </Col>
              </Row>

              <Row className="mb-3">
                <Col md={6}>
                  <p className="label">Vendor</p>
                  <p className="value">{license.vendor}</p>
                </Col>
                <Col md={6}>
                  <p className="label">License Type</p>
                  <p className="value">{license.licenseType}</p>
                </Col>
              </Row>

              <Row className="mb-3">
                <Col md={6}>
                  <p className="label">Category</p>
                  <p className="value">{license.category}</p>
                </Col>
                <Col md={6}>
                  <p className="label">Quantity</p>
                  <p className="value">{license.quantity}</p>
                </Col>
              </Row>

              {license.licenseKey && (
                <Row className="mb-3">
                  <Col md={12}>
                    <p className="label">License Key</p>
                    <p className="value license-key">{license.licenseKey}</p>
                  </Col>
                </Row>
              )}

              <Row className="mb-3">
                <Col md={6}>
                  <p className="label">
                    <FaCalendarAlt /> Purchase Date
                  </p>
                  <p className="value">
                    {new Date(license.purchaseDate).toLocaleDateString()}
                  </p>
                </Col>
                <Col md={6}>
                  <p className="label">
                    <FaCalendarAlt /> Expiry Date
                  </p>
                  <p className="value">
                    {license.expiryDate
                      ? new Date(license.expiryDate).toLocaleDateString()
                      : "N/A"}
                  </p>
                </Col>
              </Row>

              {license.supportEndDate && (
                <Row className="mb-3">
                  <Col md={6}>
                    <p className="label">Support End Date</p>
                    <p className="value">
                      {new Date(license.supportEndDate).toLocaleDateString()}
                    </p>
                  </Col>
                </Row>
              )}

              <Row className="mb-3">
                <Col md={6}>
                  <p className="label">Cost</p>
                  <p className="value">
                    {license.cost} {license.currency}
                  </p>
                </Col>
                <Col md={6}>
                  <p className="label">Renewal Reminder</p>
                  <p className="value">
                    {license.renewalReminder
                      ? `Yes (${license.reminderDaysBefore} days before)`
                      : "No"}
                  </p>
                </Col>
              </Row>

              {license.description && (
                <Row className="mb-3">
                  <Col md={12}>
                    <p className="label">Description</p>
                    <p className="value">{license.description}</p>
                  </Col>
                </Row>
              )}

              {license.notes && (
                <Row className="mb-3">
                  <Col md={12}>
                    <p className="label">Notes</p>
                    <p className="value">{license.notes}</p>
                  </Col>
                </Row>
              )}

              {license.documentUrl && (
                <Row className="mb-3">
                  <Col md={12}>
                    <p className="label">
                      <FaLink /> Document
                    </p>
                    <a
                      href={license.documentUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="value"
                    >
                      View Document
                    </a>
                  </Col>
                </Row>
              )}
            </Card.Body>
          </Card>
        </Col>

        <Col md={4}>
          <Card className="mb-4">
            <Card.Header className="bg-light">
              <h5 className="mb-0">Actions</h5>
            </Card.Header>
            <Card.Body>
              <div className="d-grid gap-2">
                <Button
                  variant="primary"
                  onClick={() => navigate(`/licenses/${id}/assign`)}
                >
                  Assign License
                </Button>
                {license.status === "Active" && (
                  <Button
                    variant="danger"
                    onClick={() => setShowRevokeModal(true)}
                  >
                    Revoke License
                  </Button>
                )}
                <Button
                  variant="info"
                  onClick={() => navigate(`/licenses/${id}/history`)}
                >
                  View Assignment History
                </Button>
              </div>
            </Card.Body>
          </Card>

          <Card>
            <Card.Header className="bg-light">
              <h5 className="mb-0">Metadata</h5>
            </Card.Header>
            <Card.Body>
              <p className="label">Created By</p>
              <p className="value">
                {license.createdBy?.name || "Unknown"}
              </p>
              <p className="label">Created On</p>
              <p className="value">
                {new Date(license.createdAt).toLocaleDateString()}
              </p>
              {license.updatedBy && (
                <>
                  <p className="label">Last Updated By</p>
                  <p className="value">{license.updatedBy.name}</p>
                </>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>

      <RevokeLicenseModal
        show={showRevokeModal}
        onHide={() => setShowRevokeModal(false)}
        onRevoke={handleRevoke}
        loading={revoking}
      />
    </Container>
  );
};

export default SoftwareLicenseDetails;
