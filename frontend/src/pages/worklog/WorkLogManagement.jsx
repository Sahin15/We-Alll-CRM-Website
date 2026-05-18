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

/**
 * Detect low-effort / padding work logs on the frontend.
 */
const isLowQualityWorkLog = (text) => {
  if (!text) return false;
  const trimmed = text.trim();
  const meaningfulChars = (trimmed.match(/[a-zA-Z0-9]/g) || []).length;
  const totalChars = trimmed.length;
  if (totalChars > 0 && meaningfulChars / totalChars < 0.3) return true;
  if (/^[\s.…\-_*]+$/.test(trimmed)) return true;
  if (/^(.)\1{9,}$/.test(trimmed)) return true;
  const words = trimmed.split(/\s+/).filter((w) => /[a-zA-Z]{2,}/.test(w));
  if (totalChars >= 50 && words.length < 3) return true;
  return false;
};

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
  const [quickFilter, setQuickFilter] = useState("yesterday"); // New state for quick filter
  const [filters, setFilters] = useState({
    startDate: new Date(new Date().setDate(new Date().getDate() - 1)).toISOString().split("T")[0], // Yesterday
    endDate: new Date(new Date().setDate(new Date().getDate() - 1)).toISOString().split("T")[0], // Yesterday
    status: "all",
    search: "",
  });
  const [selectedLog, setSelectedLog] = useState(null);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);

  // Handle quick filter change
  const handleQuickFilterChange = (e) => {
    const value = e.target.value;
    setQuickFilter(value);
    
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const last7Days = new Date(today);
    last7Days.setDate(last7Days.getDate() - 7);

    let newStartDate, newEndDate;

    switch (value) {
      case "yesterday":
        newStartDate = yesterday.toISOString().split("T")[0];
        newEndDate = yesterday.toISOString().split("T")[0];
        break;
      case "today":
        newStartDate = today.toISOString().split("T")[0];
        newEndDate = today.toISOString().split("T")[0];
        break;
      case "last7days":
        newStartDate = last7Days.toISOString().split("T")[0];
        newEndDate = today.toISOString().split("T")[0];
        break;
      case "custom":
        // Keep current dates for custom
        return;
      default:
        return;
    }

    setFilters((prev) => ({
      ...prev,
      startDate: newStartDate,
      endDate: newEndDate,
    }));
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

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
    
    // If user manually changes dates, switch to custom
    if (name === "startDate" || name === "endDate") {
      setQuickFilter("custom");
    }
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
      
      // Check if the blob is actually an error response (JSON)
      if (blob.type === 'application/json') {
        const text = await blob.text();
        const error = JSON.parse(text);
        throw new Error(error.message || 'Failed to export work logs');
      }
      
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
      console.error('Export error:', error);
      toast.error(error.message || "Failed to export work logs");
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
                    <Form.Label>Quick Filter</Form.Label>
                    <Form.Select
                      value={quickFilter}
                      onChange={handleQuickFilterChange}
                    >
                      <option value="yesterday">Yesterday</option>
                      <option value="today">Today</option>
                      <option value="last7days">Last 7 Days</option>
                      <option value="custom">Custom Range</option>
                    </Form.Select>
                  </Form.Group>
                </Col>
                <Col md={2}>
                  <Form.Group>
                    <Form.Label>Start Date</Form.Label>
                    <Form.Control
                      type="date"
                      name="startDate"
                      value={filters.startDate}
                      onChange={handleFilterChange}
                      disabled={quickFilter !== "custom"}
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
                      disabled={quickFilter !== "custom"}
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
                      <option value="concern_raised">Concern Raised</option>
                    </Form.Select>
                  </Form.Group>
                </Col>
                <Col md={2}>
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
                <Col md={2}>
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
                          <tr
                            key={log._id}
                            style={
                              log.status === "concern_raised"
                                ? { background: "#fff3cd" }
                                : undefined
                            }
                          >
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
                              {/* Quality warning badge */}
                              {isLowQualityWorkLog(log.workLog) && (
                                <Badge bg="warning" text="dark" className="mt-1 d-flex align-items-center gap-1" style={{ width: "fit-content" }}>
                                  <FaExclamationTriangle size={10} />
                                  Low quality
                                </Badge>
                              )}
                            </td>
                            <td>
                              <Badge bg={getWorkLogStatusBadge(log.status)}>
                                {log.status === "concern_raised" ? "Concern Raised" : log.status}
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
                                    variant={log.status === "concern_raised" ? "outline-warning" : "outline-success"}
                                    size="sm"
                                    onClick={() => handleReview(log)}
                                    title={log.status === "concern_raised" ? "Concern Raised — Review Again" : "Review"}
                                  >
                                    {log.status === "concern_raised"
                                      ? <FaExclamationTriangle />
                                      : <FaCheckCircle />}
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
