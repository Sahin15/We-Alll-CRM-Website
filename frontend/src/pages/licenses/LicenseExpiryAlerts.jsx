import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Container, Row, Col, Button, Table, Alert, Spinner, Form } from "react-bootstrap";
import { FaEye, FaCalendarAlt } from "react-icons/fa";
import LicenseStatusBadge from "../../components/licenses/LicenseStatusBadge";
import { getExpiringLicenses } from "../../api/softwareLicenseApi";
import "./LicenseExpiryAlerts.css";

const LicenseExpiryAlerts = () => {
  const navigate = useNavigate();
  const [licenses, setLicenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [daysAhead, setDaysAhead] = useState(30);

  useEffect(() => {
    fetchExpiringLicenses();
  }, [daysAhead]);

  const fetchExpiringLicenses = async () => {
    try {
      setLoading(true);
      const response = await getExpiringLicenses(daysAhead);
      setLicenses(response.data);
      setError(null);
    } catch (err) {
      setError(err.message || "Failed to fetch expiring licenses");
    } finally {
      setLoading(false);
    }
  };

  const getDaysUntilExpiry = (expiryDate) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const expiry = new Date(expiryDate);
    expiry.setHours(0, 0, 0, 0);
    const diff = expiry - today;
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  };

  const getAlertLevel = (daysLeft) => {
    if (daysLeft < 0) return "expired";
    if (daysLeft <= 7) return "critical";
    if (daysLeft <= 14) return "warning";
    return "info";
  };

  return (
    <Container fluid className="license-expiry-alerts-page py-4">
      <Row className="mb-4">
        <Col>
          <h1 className="page-title">License Expiry Alerts</h1>
        </Col>
      </Row>

      <div className="filters-section mb-4">
        <Form.Group>
          <Form.Label>Show licenses expiring within</Form.Label>
          <div className="d-flex gap-2">
            <Form.Select
              style={{ maxWidth: "200px" }}
              value={daysAhead}
              onChange={(e) => setDaysAhead(parseInt(e.target.value))}
            >
              <option value={7}>7 days</option>
              <option value={14}>14 days</option>
              <option value={30}>30 days</option>
              <option value={60}>60 days</option>
              <option value={90}>90 days</option>
            </Form.Select>
            <span className="align-self-center text-muted">
              ({licenses.length} licenses)
            </span>
          </div>
        </Form.Group>
      </div>

      {error && <Alert variant="danger">{error}</Alert>}

      {loading ? (
        <div className="text-center py-5">
          <Spinner animation="border" role="status">
            <span className="visually-hidden">Loading...</span>
          </Spinner>
        </div>
      ) : licenses.length === 0 ? (
        <Alert variant="success">
          <FaCalendarAlt /> No licenses expiring within the selected period
        </Alert>
      ) : (
        <>
          <div className="alerts-container">
            {licenses.map((license) => {
              const daysLeft = getDaysUntilExpiry(license.expiryDate);
              const alertLevel = getAlertLevel(daysLeft);

              return (
                <div key={license._id} className={`alert-card alert-${alertLevel}`}>
                  <div className="alert-header">
                    <div className="alert-title">
                      <h5>{license.softwareName}</h5>
                      <p className="vendor">{license.vendor}</p>
                    </div>
                    <div className="alert-status">
                      <LicenseStatusBadge status={license.status} />
                    </div>
                  </div>

                  <div className="alert-body">
                    <Row>
                      <Col md={3}>
                        <p className="label">License ID</p>
                        <p className="value">{license.licenseId}</p>
                      </Col>
                      <Col md={3}>
                        <p className="label">Expiry Date</p>
                        <p className="value">
                          {new Date(license.expiryDate).toLocaleDateString()}
                        </p>
                      </Col>
                      <Col md={3}>
                        <p className="label">Days Left</p>
                        <p className={`value days-${alertLevel}`}>
                          {daysLeft < 0 ? "Expired" : `${daysLeft} days`}
                        </p>
                      </Col>
                      <Col md={3}>
                        <p className="label">Cost</p>
                        <p className="value">
                          {license.cost} {license.currency}
                        </p>
                      </Col>
                    </Row>

                    {license.description && (
                      <Row className="mt-2">
                        <Col md={12}>
                          <p className="label">Description</p>
                          <p className="value">{license.description}</p>
                        </Col>
                      </Row>
                    )}
                  </div>

                  <div className="alert-footer">
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => navigate(`/licenses/${license._id}`)}
                    >
                      <FaEye /> View Details
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </Container>
  );
};

export default LicenseExpiryAlerts;
