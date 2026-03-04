import { useState, useEffect } from "react";
import {
  Container,
  Row,
  Col,
  Card,
  Table,
  Button,
  Form,
  Badge,
  Spinner,
  Pagination,
} from "react-bootstrap";
import {
  FaEye,
  FaCheckCircle,
  FaEdit,
  FaDownload,
  FaUsers,
  FaClock,
  FaExclamationTriangle,
} from "react-icons/fa";
import { toast } from "react-toastify";
import { workLogApi } from "../../api/workLogApi";
import {
  truncateWorkLog,
  formatWorkLogDate,
  formatWorkLogDateTime,
  getWorkLogStatusBadge,
} from "../../utils/workLogHelpers";
import WorkLogViewModal from "../../components/worklog/WorkLogViewModal";
import WorkLogReviewModal from "../../components/worklog/WorkLogReviewModal";
import "../../styles/worklog.css";

const WorkLogManagement = () => {
  const [workLogs, setWorkLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [stats, setStats] = useState(null);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    pages: 0,
  });
  const [filters, setFilters] = useState({
    startDate: new Date(new Date().setDate(new Date().getDate() - 7)).toISOString().split("T")[0], // Last 7 days
    endDate: new Date().toISOString().split("T")[0], // Today
    status: "all",
    search: "",
  });
  const [selectedLog, setSelectedLog] = useState(null);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);

  useEffect(() => {
    fetchWorkLogs();
    fetchStats();
  }, [pagination.page, filters]);

  const fetchWorkLogs = async () => {
    try {
      setLoading(true);
      const params = {
        ...filters,
        page: pagination.page,
        limit: pagination.limit,
      };

      if (filters.status === "all") {
        delete params.status;
      }

      const response = await workLogApi.getAllWorkLogs(params);
      setWorkLogs(response.workLogs);
      setPagination(response.pagination);
    } catch (error) {
      toast.error("Failed to fetch work logs");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const params = {
        startDate: filters.startDate,
        endDate: filters.endDate,
      };
      const data = await workLogApi.getWorkLogStats(params);
      setStats(data);
    } catch (error) {
      console.error("Failed to fetch stats:", error);
    }
  };

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters((prev) => ({ ...prev, [name]: value }));
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  const handlePageChange = (page) => {
    setPagination((prev) => ({ ...prev, page }));
  };

  const handleView = (log) => {
    setSelectedLog(log);
    setShowViewModal(true);
  };

  const handleReview = (log) => {
    setSelectedLog(log);
    setShowReviewModal(true);
  };

  const handleReviewSuccess = () => {
    fetchWorkLogs();
    fetchStats();
    setShowReviewModal(false);
  };

  const handleExport = async () => {
    try {
      setExporting(true);
      const params = { ...filters };
      if (filters.status === "all") {
        delete params.status;
      }

      const blob = await workLogApi.exportWorkLogs(params);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `work-logs-${new Date().toISOString().split("T")[0]}.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      toast.success("Work logs exported successfully!");
    } catch (error) {
      toast.error("Failed to export work logs");
      console.error(error);
    } finally {
      setExporting(false);
    }
  };

  const renderPagination = () => {
    if (pagination.pages <= 1) return null;

    const items = [];
    const maxPages = 5;
    let startPage = Math.max(1, pagination.page - Math.floor(maxPages / 2));
    let endPage = Math.min(pagination.pages, startPage + maxPages - 1);

    if (endPage - startPage < maxPages - 1) {
      startPage = Math.max(1, endPage - maxPages + 1);
    }

    for (let i = startPage; i <= endPage; i++) {
      items.push(
        <Pagination.Item
          key={i}
          active={i === pagination.page}
          onClick={() => handlePageChange(i)}
        >
          {i}
        </Pagination.Item>
      );
    }

    return (
      <Pagination>
        <Pagination.First
          disabled={pagination.page === 1}
          onClick={() => handlePageChange(1)}
        />
        <Pagination.Prev
          disabled={pagination.page === 1}
          onClick={() => handlePageChange(pagination.page - 1)}
        />
        {items}
        <Pagination.Next
          disabled={pagination.page === pagination.pages}
          onClick={() => handlePageChange(pagination.page + 1)}
        />
        <Pagination.Last
          disabled={pagination.page === pagination.pages}
          onClick={() => handlePageChange(pagination.pages)}
        />
      </Pagination>
    );
  };

  return (
    <Container fluid className="mt-4">
      <Row className="mb-4">
        <Col>
          <h2>Work Log Management</h2>
          <p className="text-muted">View and manage employee work logs</p>
        </Col>
      </Row>

      {/* Stats Cards */}
      {stats && (
        <Row className="mb-4">
          <Col md={3}>
            <Card className="text-center">
              <Card.Body>
                <FaClock size={30} className="text-primary mb-2" />
                <h3>{stats.todayLogs}</h3>
                <p className="text-muted mb-0">Today's Logs</p>
              </Card.Body>
            </Card>
          </Col>
          <Col md={3}>
            <Card className="text-center">
              <Card.Body>
                <FaExclamationTriangle size={30} className="text-warning mb-2" />
                <h3>{stats.pendingReview}</h3>
                <p className="text-muted mb-0">Pending Review</p>
              </Card.Body>
            </Card>
          </Col>
          <Col md={3}>
            <Card className="text-center">
              <Card.Body>
                <FaExclamationTriangle size={30} className="text-danger mb-2" />
                <h3>{stats.lateSubmissions}</h3>
                <p className="text-muted mb-0">Late Submissions</p>
              </Card.Body>
            </Card>
          </Col>
          <Col md={3}>
            <Card className="text-center">
              <Card.Body>
                <FaUsers size={30} className="text-success mb-2" />
                <h3>{stats.totalEmployees}</h3>
                <p className="text-muted mb-0">Total Employees</p>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      )}

      {/* Filters */}
      <Row className="mb-4">
        <Col>
          <Card>
            <Card.Body>
              <Row className="align-items-end">
                <Col md={2}>
                  <Form.Group>
                    <Form.Label>Start Date</Form.Label>
                    <Form.Control
                      type="date"
                      name="startDate"
                      value={filters.startDate}
                      onChange={handleFilterChange}
                    />
                  </Form.Group>
                </Col>
                <Col md={2}>
                  <Form.Group>
                    <Form.Label>End Date</Form.Label>
                    <Form.Control
                      type="date"
                      name="endDate"
                      value={filters.endDate}
                      onChange={handleFilterChange}
                    />
                  </Form.Group>
                </Col>
                <Col md={2}>
                  <Form.Group>
                    <Form.Label>Status</Form.Label>
                    <Form.Select
                      name="status"
                      value={filters.status}
                      onChange={handleFilterChange}
                    >
                      <option value="all">All</option>
                      <option value="submitted">Submitted</option>
                      <option value="reviewed">Reviewed</option>
                    </Form.Select>
                  </Form.Group>
                </Col>
                <Col md={3}>
                  <Form.Group>
                    <Form.Label>Search Employee</Form.Label>
                    <Form.Control
                      type="text"
                      name="search"
                      placeholder="Name or email..."
                      value={filters.search}
                      onChange={handleFilterChange}
                    />
                  </Form.Group>
                </Col>
                <Col md={3}>
                  <Button
                    variant="success"
                    onClick={handleExport}
                    disabled={exporting || workLogs.length === 0}
                    className="w-100"
                  >
                    <FaDownload className="me-1" />
                    {exporting ? "Exporting..." : "Export"}
                  </Button>
                </Col>
              </Row>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Work Logs Table */}
      <Row>
        <Col>
          <Card>
            <Card.Body>
              {loading ? (
                <div className="text-center py-5">
                  <Spinner animation="border" />
                  <p className="mt-2">Loading work logs...</p>
                </div>
              ) : workLogs.length === 0 ? (
                <div className="text-center py-5">
                  <p className="text-muted">No work logs found</p>
                </div>
              ) : (
                <>
                  <div className="table-responsive">
                    <Table hover>
                      <thead>
                        <tr>
                          <th>Employee</th>
                          <th>Date</th>
                          <th>Work Log</th>
                          <th>Status</th>
                          <th>Submitted At</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {workLogs.map((log) => (
                          <tr key={log._id}>
                            <td>
                              <div>
                                <strong>{log.employee?.name || "N/A"}</strong>
                                <br />
                                <small className="text-muted">
                                  {log.employee?.designation || "N/A"}
                                </small>
                              </div>
                            </td>
                            <td>{formatWorkLogDate(log.date)}</td>
                            <td>
                              <div style={{ maxWidth: "300px" }}>
                                {truncateWorkLog(log.workLog, 80)}
                              </div>
                            </td>
                            <td>
                              <Badge bg={getWorkLogStatusBadge(log.status)}>
                                {log.status}
                              </Badge>
                              {log.isLateSubmission && (
                                <Badge bg="warning" className="ms-1">
                                  Late
                                </Badge>
                              )}
                            </td>
                            <td>
                              <small>
                                {formatWorkLogDateTime(log.submittedAt)}
                              </small>
                            </td>
                            <td>
                              <div className="d-flex gap-1">
                                <Button
                                  variant="outline-primary"
                                  size="sm"
                                  onClick={() => handleView(log)}
                                  title="View"
                                >
                                  <FaEye />
                                </Button>
                                {log.status !== "reviewed" && (
                                  <Button
                                    variant="outline-success"
                                    size="sm"
                                    onClick={() => handleReview(log)}
                                    title="Review"
                                  >
                                    <FaCheckCircle />
                                  </Button>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </Table>
                  </div>

                  {/* Pagination */}
                  <div className="d-flex justify-content-between align-items-center mt-3">
                    <div>
                      Showing {workLogs.length} of {pagination.total} work logs
                    </div>
                    {renderPagination()}
                  </div>
                </>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Modals */}
      <WorkLogViewModal
        show={showViewModal}
        onHide={() => setShowViewModal(false)}
        workLog={selectedLog}
      />

      <WorkLogReviewModal
        show={showReviewModal}
        onHide={() => setShowReviewModal(false)}
        workLog={selectedLog}
        onSuccess={handleReviewSuccess}
      />
    </Container>
  );
};

export default WorkLogManagement;
