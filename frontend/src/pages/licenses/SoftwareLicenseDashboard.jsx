import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Container, Row, Col, Card, Button, Alert, Spinner, Table } from "react-bootstrap";
import { FaPlus, FaEye, FaExclamationTriangle, FaCheckCircle, FaClock, FaTimesCircle, FaUser } from "react-icons/fa";
import LicenseStatusBadge from "../../components/licenses/LicenseStatusBadge";
import { getLicenseDashboard } from "../../api/softwareLicenseApi";
import "./SoftwareLicenseDashboard.css";

const SoftwareLicenseDashboard = () => {
  const navigate = useNavigate();
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchDashboard();
  }, []);

  const fetchDashboard = async () => {
    try {
      setLoading(true);
      const response = await getLicenseDashboard();
      setDashboard(response.data);
      setError(null);
    } catch (err) {
      setError(err.message || "Failed to fetch dashboard data");
    } finally {
      setLoading(false);
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

  if (error) {
    return (
      <Container className="py-5">
        <Alert variant="danger">{error}</Alert>
      </Container>
    );
  }

  return (
    <Container fluid className="software-license-dashboard-page py-4">
      <Row className="mb-4">
        <Col>
          <h1 className="page-title">Software License Dashboard</h1>
        </Col>
        <Col className="text-end">
          <Button
            variant="primary"
            onClick={() => navigate("/licenses/add")}
            className="btn-add"
          >
            <FaPlus /> Add License
          </Button>
        </Col>
      </Row>

      {/* Summary Cards */}
      <div className="summary-cards">
        <div className="summary-card" onClick={() => navigate("/licenses")} style={{ cursor: "pointer" }}>
          <div className="card-icon-container total">
            <FaClock />
          </div>
          <div className="card-content">
            <div className="card-value">{dashboard?.totalLicenses || 0}</div>
            <div className="card-label">Total Licenses</div>
          </div>
        </div>
        <div className="summary-card" onClick={() => navigate("/licenses")} style={{ cursor: "pointer" }}>
          <div className="card-icon-container active">
            <FaCheckCircle />
          </div>
          <div className="card-content">
            <div className="card-value">{dashboard?.activeLicenses || 0}</div>
            <div className="card-label">Active Licenses</div>
          </div>
        </div>
        <div className="summary-card" onClick={() => navigate("/licenses/expiry-alerts")} style={{ cursor: "pointer" }}>
          <div className="card-icon-container expired">
            <FaTimesCircle />
          </div>
          <div className="card-content">
            <div className="card-value">{dashboard?.expiredLicenses || 0}</div>
            <div className="card-label">Expired Licenses</div>
          </div>
        </div>
        <div className="summary-card" onClick={() => navigate("/licenses")} style={{ cursor: "pointer" }}>
          <div className="card-icon-container assignments">
            <FaUser />
          </div>
          <div className="card-content">
            <div className="card-value">{dashboard?.totalAssignments || 0}</div>
            <div className="card-label">Active Assignments</div>
          </div>
        </div>
      </div>

      <Row className="mb-4">
        {/* Category Distribution */}
        <Col md={6} className="mb-4">
          <Card>
            <Card.Header className="bg-light">
              <h5 className="mb-0">License Distribution by Category</h5>
            </Card.Header>
            <Card.Body>
              {dashboard?.categoryDistribution && dashboard.categoryDistribution.length > 0 ? (
                <div className="category-list">
                  {dashboard.categoryDistribution.map((cat) => (
                    <div key={cat._id} className="category-item">
                      <span className="category-name">{cat._id}</span>
                      <span className="category-count">{cat.count}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted">No data available</p>
              )}
            </Card.Body>
          </Card>
        </Col>

        {/* Quick Actions */}
        <Col md={6} className="mb-4">
          <Card>
            <Card.Header className="bg-light">
              <h5 className="mb-0">Quick Actions</h5>
            </Card.Header>
            <Card.Body>
              <div className="d-grid gap-2">
                <Button
                  variant="primary"
                  onClick={() => navigate("/licenses/add")}
                >
                  <FaPlus /> Add New License
                </Button>
                <Button
                  variant="info"
                  onClick={() => navigate("/licenses")}
                >
                  <FaEye /> View All Licenses
                </Button>
                <Button
                  variant="warning"
                  onClick={() => navigate("/licenses/expiry-alerts")}
                >
                  <FaExclamationTriangle /> View Expiry Alerts
                </Button>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Recent Licenses */}
      <Row className="mb-4">
        <Col md={6}>
          <Card>
            <Card.Header className="bg-light">
              <h5 className="mb-0">Recent Licenses</h5>
            </Card.Header>
            <Card.Body>
              {dashboard?.recentLicenses && dashboard.recentLicenses.length > 0 ? (
                <div className="table-responsive">
                  <Table hover size="sm" className="mb-0">
                    <thead>
                      <tr>
                        <th>Software</th>
                        <th>Vendor</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {dashboard.recentLicenses.map((license) => (
                        <tr
                          key={license._id}
                          onClick={() => navigate(`/licenses/${license._id}`)}
                          style={{ cursor: "pointer" }}
                        >
                          <td>{license.softwareName}</td>
                          <td>{license.vendor}</td>
                          <td>
                            <LicenseStatusBadge status={license.status} size="sm" />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                </div>
              ) : (
                <p className="text-muted">No recent licenses</p>
              )}
            </Card.Body>
          </Card>
        </Col>

        {/* Expiring Soon */}
        <Col md={6}>
          <Card>
            <Card.Header className="bg-light">
              <h5 className="mb-0">Expiring Soon (30 days)</h5>
            </Card.Header>
            <Card.Body>
              {dashboard?.expiringLicenses && dashboard.expiringLicenses.length > 0 ? (
                <div className="table-responsive">
                  <Table hover size="sm" className="mb-0">
                    <thead>
                      <tr>
                        <th>Software</th>
                        <th>Expiry Date</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {dashboard.expiringLicenses.map((license) => (
                        <tr
                          key={license._id}
                          onClick={() => navigate(`/licenses/${license._id}`)}
                          style={{ cursor: "pointer" }}
                        >
                          <td>{license.softwareName}</td>
                          <td>
                            {new Date(license.expiryDate).toLocaleDateString()}
                          </td>
                          <td>
                            <LicenseStatusBadge status={license.status} size="sm" />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                </div>
              ) : (
                <p className="text-muted text-success">
                  <FaCheckCircle /> No licenses expiring soon
                </p>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
};

export default SoftwareLicenseDashboard;
