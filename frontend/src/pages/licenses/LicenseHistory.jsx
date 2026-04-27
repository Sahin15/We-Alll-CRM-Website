import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Container, Row, Col, Button, Table, Pagination, Alert, Spinner } from "react-bootstrap";
import { FaArrowLeft, FaTrash } from "react-icons/fa";
import { getAssignments, revokeLicense } from "../../api/softwareLicenseApi";
import "./LicenseHistory.css";

const LicenseHistory = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({});

  useEffect(() => {
    fetchAssignments();
  }, [id, page]);

  const fetchAssignments = async () => {
    try {
      setLoading(true);
      const response = await getAssignments({
        licenseId: id,
        page,
        limit: 10,
      });
      setAssignments(response.data);
      setPagination(response.pagination);
      setError(null);
    } catch (err) {
      setError(err.message || "Failed to fetch assignments");
    } finally {
      setLoading(false);
    }
  };

  const handleRevoke = async (assignmentId) => {
    if (window.confirm("Are you sure you want to revoke this assignment?")) {
      try {
        await revokeLicense(assignmentId, "Revoked from history page");
        setSuccess("Assignment revoked successfully");
        fetchAssignments();
        setTimeout(() => setSuccess(null), 3000);
      } catch (err) {
        setError(err.message || "Failed to revoke assignment");
      }
    }
  };

  const handlePageChange = (newPage) => {
    setPage(newPage);
  };

  return (
    <Container fluid className="license-history-page py-4">
      <Row className="mb-4">
        <Col>
          <Button
            variant="outline-secondary"
            onClick={() => navigate(`/licenses/${id}`)}
            className="mb-3"
          >
            <FaArrowLeft /> Back to License
          </Button>
          <h1 className="page-title">Assignment History</h1>
        </Col>
      </Row>

      {error && <Alert variant="danger">{error}</Alert>}
      {success && <Alert variant="success">{success}</Alert>}

      {loading ? (
        <div className="text-center py-5">
          <Spinner animation="border" role="status">
            <span className="visually-hidden">Loading...</span>
          </Spinner>
        </div>
      ) : assignments.length === 0 ? (
        <Alert variant="info">No assignments found for this license</Alert>
      ) : (
        <>
          <div className="table-responsive">
            <Table hover className="history-table">
              <thead>
                <tr>
                  <th>Assignment ID</th>
                  <th>Assigned To</th>
                  <th>Assigned By</th>
                  <th>Assignment Date</th>
                  <th>Status</th>
                  <th>Device Info</th>
                  <th>Installation Path</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {assignments.map((assignment) => (
                  <tr key={assignment._id}>
                    <td className="assignment-id">{assignment.assignmentId}</td>
                    <td>{assignment.assignedTo?.name}</td>
                    <td>{assignment.assignedBy?.name}</td>
                    <td>
                      {new Date(assignment.assignmentDate).toLocaleDateString()}
                    </td>
                    <td>
                      <span
                        className={`status-badge status-${assignment.status.toLowerCase()}`}
                      >
                        {assignment.status}
                      </span>
                    </td>
                    <td>{assignment.deviceInfo || "N/A"}</td>
                    <td>{assignment.installationPath || "N/A"}</td>
                    <td>
                      {assignment.status === "Active" && (
                        <Button
                          variant="danger"
                          size="sm"
                          onClick={() => handleRevoke(assignment._id)}
                          title="Revoke"
                        >
                          <FaTrash />
                        </Button>
                      )}
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
                  (p) => (
                    <Pagination.Item
                      key={p}
                      active={p === pagination.page}
                      onClick={() => handlePageChange(p)}
                    >
                      {p}
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

export default LicenseHistory;
