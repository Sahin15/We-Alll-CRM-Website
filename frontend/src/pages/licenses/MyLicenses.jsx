import React, { useState, useEffect } from "react";
import { Container, Row, Col, Button, Table, Pagination, Alert, Spinner, Form } from "react-bootstrap";
import { FaEye, FaDownload } from "react-icons/fa";
import LicenseStatusBadge from "../../components/licenses/LicenseStatusBadge";
import { getMyLicenses } from "../../api/softwareLicenseApi";
import "./MyLicenses.css";

const MyLicenses = () => {
  const [licenses, setLicenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({
    status: "",
    page: 1,
    limit: 10,
  });
  const [pagination, setPagination] = useState({});

  useEffect(() => {
    fetchMyLicenses();
  }, [filters]);

  const fetchMyLicenses = async () => {
    try {
      setLoading(true);
      const response = await getMyLicenses(filters);
      setLicenses(response.data || []);
      setPagination(response.pagination || {});
      setError(null);
    } catch (err) {
      setError(err.message || "Failed to fetch licenses");
      console.error("Error fetching user licenses:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({
      ...prev,
      [name]: value,
      page: 1,
    }));
  };

  const handlePageChange = (page) => {
    setFilters(prev => ({
      ...prev,
      page,
    }));
  };

  return (
    <Container fluid className="my-licenses-page py-4">
      <Row className="mb-4">
        <Col>
          <h1 className="page-title">My Software Licenses</h1>
          <p className="subtitle">View and manage your assigned software licenses</p>
        </Col>
      </Row>

      {error && <Alert variant="danger">{error}</Alert>}

      <div className="filters-section mb-4">
        <Form.Group>
          <Form.Label>Filter by Status</Form.Label>
          <Form.Select
            name="status"
            value={filters.status}
            onChange={handleFilterChange}
            style={{ maxWidth: "200px" }}
          >
            <option value="">All Statuses</option>
            <option value="Active">Active</option>
            <option value="Revoked">Revoked</option>
            <option value="Expired">Expired</option>
          </Form.Select>
        </Form.Group>
      </div>

      {loading ? (
        <div className="text-center py-5">
          <Spinner animation="border" role="status">
            <span className="visually-hidden">Loading...</span>
          </Spinner>
        </div>
      ) : licenses.length === 0 ? (
        <Alert variant="info">No licenses assigned to you</Alert>
      ) : (
        <>
          <div className="licenses-grid">
            {licenses.map((assignment) => (
              <div key={assignment._id} className="license-card">
                <div className="card-header">
                  <h5>{assignment.license?.softwareName}</h5>
                  <LicenseStatusBadge status={assignment.status} />
                </div>

                <div className="card-body">
                  <div className="info-row">
                    <span className="label">Vendor</span>
                    <span className="value">{assignment.license?.vendor}</span>
                  </div>

                  <div className="info-row">
                    <span className="label">License ID</span>
                    <span className="value">{assignment.license?.licenseId}</span>
                  </div>

                  <div className="info-row">
                    <span className="label">Assigned Date</span>
                    <span className="value">
                      {new Date(assignment.assignmentDate).toLocaleDateString()}
                    </span>
                  </div>

                  {assignment.deviceInfo && (
                    <div className="info-row">
                      <span className="label">Device</span>
                      <span className="value">{assignment.deviceInfo}</span>
                    </div>
                  )}

                  {assignment.installationPath && (
                    <div className="info-row">
                      <span className="label">Installation Path</span>
                      <span className="value installation-path">
                        {assignment.installationPath}
                      </span>
                    </div>
                  )}

                  {assignment.notes && (
                    <div className="info-row">
                      <span className="label">Notes</span>
                      <span className="value">{assignment.notes}</span>
                    </div>
                  )}
                </div>

                <div className="card-footer">
                  {assignment.license?.documentUrl && (
                    <Button
                      variant="outline-primary"
                      size="sm"
                      href={assignment.license.documentUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <FaDownload /> Download
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>

          {pagination.pages > 1 && (
            <div className="pagination-section">
              <Pagination>
                <Pagination.First
                  onClick={() => handlePageChange(1)}
                  disabled={pagination.page === 1}
                />
                <Pagination.Prev
                  onClick={() => handlePageChange(pagination.page - 1)}
                  disabled={pagination.page === 1}
                />
                {Array.from({ length: pagination.pages }, (_, i) => i + 1).map(
                  (page) => (
                    <Pagination.Item
                      key={page}
                      active={page === pagination.page}
                      onClick={() => handlePageChange(page)}
                    >
                      {page}
                    </Pagination.Item>
                  )
                )}
                <Pagination.Next
                  onClick={() => handlePageChange(pagination.page + 1)}
                  disabled={pagination.page === pagination.pages}
                />
                <Pagination.Last
                  onClick={() => handlePageChange(pagination.pages)}
                  disabled={pagination.page === pagination.pages}
                />
              </Pagination>
            </div>
          )}
        </>
      )}
    </Container>
  );
};

export default MyLicenses;
