import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Container, Row, Col, Button, Form, Table, Pagination, Alert, Spinner } from "react-bootstrap";
import { FaPlus, FaEdit, FaTrash, FaEye, FaSearch } from "react-icons/fa";
import LicenseStatusBadge from "../../components/licenses/LicenseStatusBadge";
import { getAllLicenses, deleteLicense } from "../../api/softwareLicenseApi";
import "./SoftwareLicenseList.css";

const SoftwareLicenseList = () => {
  const navigate = useNavigate();
  const [licenses, setLicenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [filters, setFilters] = useState({
    status: "",
    category: "",
    search: "",
    page: 1,
    limit: 10,
  });
  const [pagination, setPagination] = useState({});

  useEffect(() => {
    fetchLicenses();
  }, [filters]);

  const fetchLicenses = async () => {
    try {
      setLoading(true);
      const response = await getAllLicenses(filters);
      setLicenses(response.data);
      setPagination(response.pagination);
      setError(null);
    } catch (err) {
      setError(err.message || "Failed to fetch licenses");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm("Are you sure you want to delete this license?")) {
      try {
        await deleteLicense(id);
        setSuccess("License deleted successfully");
        fetchLicenses();
        setTimeout(() => setSuccess(null), 3000);
      } catch (err) {
        setError(err.message || "Failed to delete license");
      }
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

  const handleSearch = (e) => {
    e.preventDefault();
    setFilters(prev => ({
      ...prev,
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
    <Container fluid className="software-license-list-page py-4">
      <Row className="mb-4">
        <Col>
          <h1 className="page-title">Software Licenses</h1>
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

      {error && <Alert variant="danger">{error}</Alert>}
      {success && <Alert variant="success">{success}</Alert>}

      <div className="filters-section mb-4">
        <Form onSubmit={handleSearch}>
          <Row>
            <Col md={4}>
              <Form.Group>
                <Form.Label>Search</Form.Label>
                <Form.Control
                  type="text"
                  name="search"
                  placeholder="Search by name, vendor, or ID..."
                  value={filters.search}
                  onChange={handleFilterChange}
                />
              </Form.Group>
            </Col>
            <Col md={3}>
              <Form.Group>
                <Form.Label>Status</Form.Label>
                <Form.Select
                  name="status"
                  value={filters.status}
                  onChange={handleFilterChange}
                >
                  <option value="">All Statuses</option>
                  <option value="Active">Active</option>
                  <option value="Expired">Expired</option>
                  <option value="Inactive">Inactive</option>
                  <option value="Revoked">Revoked</option>
                </Form.Select>
              </Form.Group>
            </Col>
            <Col md={3}>
              <Form.Group>
                <Form.Label>Category</Form.Label>
                <Form.Select
                  name="category"
                  value={filters.category}
                  onChange={handleFilterChange}
                >
                  <option value="">All Categories</option>
                  <option value="Development">Development</option>
                  <option value="Productivity">Productivity</option>
                  <option value="Design">Design</option>
                  <option value="Security">Security</option>
                  <option value="Utilities">Utilities</option>
                  <option value="Other">Other</option>
                </Form.Select>
              </Form.Group>
            </Col>
            <Col md={2} className="d-flex align-items-end">
              <Button variant="outline-secondary" type="submit" className="w-100">
                <FaSearch /> Search
              </Button>
            </Col>
          </Row>
        </Form>
      </div>

      {loading ? (
        <div className="text-center py-5">
          <Spinner animation="border" role="status">
            <span className="visually-hidden">Loading...</span>
          </Spinner>
        </div>
      ) : licenses.length === 0 ? (
        <Alert variant="info">No licenses found</Alert>
      ) : (
        <>
          <div className="table-responsive">
            <Table hover className="licenses-table">
              <thead>
                <tr>
                  <th>License ID</th>
                  <th>Software Name</th>
                  <th>Vendor</th>
                  <th>Type</th>
                  <th>Category</th>
                  <th>Expiry Date</th>
                  <th>Status</th>
                  <th>Cost</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {licenses.map((license) => (
                  <tr key={license._id}>
                    <td className="license-id">{license.licenseId}</td>
                    <td>{license.softwareName}</td>
                    <td>{license.vendor}</td>
                    <td>{license.licenseType}</td>
                    <td>{license.category}</td>
                    <td>
                      {license.expiryDate
                        ? new Date(license.expiryDate).toLocaleDateString()
                        : "N/A"}
                    </td>
                    <td>
                      <LicenseStatusBadge status={license.status} />
                    </td>
                    <td>
                      {license.cost} {license.currency}
                    </td>
                    <td>
                      <div className="action-buttons">
                        <Button
                          variant="info"
                          size="sm"
                          onClick={() => navigate(`/licenses/${license._id}`)}
                          title="View Details"
                        >
                          <FaEye />
                        </Button>
                        <Button
                          variant="warning"
                          size="sm"
                          onClick={() => navigate(`/licenses/${license._id}/edit`)}
                          title="Edit"
                        >
                          <FaEdit />
                        </Button>
                        <Button
                          variant="danger"
                          size="sm"
                          onClick={() => handleDelete(license._id)}
                          title="Delete"
                        >
                          <FaTrash />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
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

export default SoftwareLicenseList;
