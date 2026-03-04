import { useState, useEffect } from "react";
import {
  Row,
  Col,
  Card,
  Table,
  Button,
  Form,
  Badge,
  Spinner,
  Alert,
} from "react-bootstrap";
import { FaEye, FaCheckCircle, FaCalendarAlt, FaFilter } from "react-icons/fa";
import { toast } from "react-toastify";
import { workLogApi } from "../../api/workLogApi";
import {
  truncateWorkLog,
  formatWorkLogDate,
  formatWorkLogDateTime,
  getWorkLogStatusBadge,
} from "../../utils/workLogHelpers";
import WorkLogViewModal from "./WorkLogViewModal";
import WorkLogReviewModal from "./WorkLogReviewModal";
import moment from "moment";

const EmployeeWorkLogsTab = ({ employeeId, employeeName }) => {
  const [workLogs, setWorkLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("week"); // week, month, all
  const [selectedLog, setSelectedLog] = useState(null);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [stats, setStats] = useState({
    total: 0,
    reviewed: 0,
    pending: 0,
    lateSubmissions: 0,
  });

  useEffect(() => {
    if (employeeId) {
      fetchWorkLogs();
    }
  }, [employeeId, filter]);

  const getDateRange = () => {
    const endDate = moment().format("YYYY-MM-DD");
    let startDate;

    switch (filter) {
      case "week":
        startDate = moment().subtract(7, "days").format("YYYY-MM-DD");
        break;
      case "month":
        startDate = moment().subtract(30, "days").format("YYYY-MM-DD");
        break;
      case "all":
        startDate = moment().subtract(1, "year").format("YYYY-MM-DD");
        break;
      default:
        startDate = moment().subtract(7, "days").format("YYYY-MM-DD");
    }

    return { startDate, endDate };
  };

  const fetchWorkLogs = async () => {
    try {
      setLoading(true);
      const { startDate, endDate } = getDateRange();

      const response = await workLogApi.getEmployeeWorkLogs(employeeId, {
        startDate,
        endDate,
        limit: 100,
      });

      const logs = response.workLogs || [];
      setWorkLogs(logs);

      // Calculate stats
      const total = logs.length;
      const reviewed = logs.filter((log) => log.status === "reviewed").length;
      const pending = logs.filter((log) => log.status === "submitted").length;
      const lateSubmissions = logs.filter((log) => log.isLateSubmission).length;

      setStats({ total, reviewed, pending, lateSubmissions });
    } catch (error) {
      console.error("Failed to fetch work logs:", error);
      toast.error("Failed to load work logs");
    } finally {
      setLoading(false);
    }
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
    setShowReviewModal(false);
  };

  const handleFilterChange = (newFilter) => {
    setFilter(newFilter);
  };

  if (loading) {
    return (
      <div className="text-center py-5">
        <Spinner animation="border" />
        <p className="mt-2">Loading work logs...</p>
      </div>
    );
  }

  return (
    <>
      <Row className="mb-4">
        {/* Stats Cards */}
        <Col md={3}>
          <Card className="text-center">
            <Card.Body>
              <h4>{stats.total}</h4>
              <small className="text-muted">Total Logs</small>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3}>
          <Card className="text-center">
            <Card.Body>
              <h4 className="text-success">{stats.reviewed}</h4>
              <small className="text-muted">Reviewed</small>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3}>
          <Card className="text-center">
            <Card.Body>
              <h4 className="text-primary">{stats.pending}</h4>
              <small className="text-muted">Pending Review</small>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3}>
          <Card className="text-center">
            <Card.Body>
              <h4 className="text-warning">{stats.lateSubmissions}</h4>
              <small className="text-muted">Late Submissions</small>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      <Row className="mb-3">
        <Col>
          <Card>
            <Card.Body>
              <div className="d-flex justify-content-between align-items-center">
                <h5 className="mb-0">
                  <FaCalendarAlt className="me-2" />
                  Work Logs for {employeeName}
                </h5>
                <div className="d-flex gap-2">
                  <Button
                    size="sm"
                    variant={filter === "week" ? "primary" : "outline-primary"}
                    onClick={() => handleFilterChange("week")}
                  >
                    Last Week
                  </Button>
                  <Button
                    size="sm"
                    variant={filter === "month" ? "primary" : "outline-primary"}
                    onClick={() => handleFilterChange("month")}
                  >
                    Last Month
                  </Button>
                  <Button
                    size="sm"
                    variant={filter === "all" ? "primary" : "outline-primary"}
                    onClick={() => handleFilterChange("all")}
                  >
                    All
                  </Button>
                </div>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      <Row>
        <Col>
          <Card>
            <Card.Body>
              {workLogs.length === 0 ? (
                <Alert variant="info">
                  No work logs found for the selected period.
                </Alert>
              ) : (
                <div className="table-responsive">
                  <Table hover>
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Work Log</th>
                        <th>Status</th>
                        <th>Submitted At</th>
                        <th>Reviewed By</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {workLogs.map((log) => (
                        <tr key={log._id}>
                          <td>
                            <strong>{formatWorkLogDate(log.date)}</strong>
                          </td>
                          <td>
                            <div style={{ maxWidth: "400px" }}>
                              {truncateWorkLog(log.workLog, 100)}
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
                          <td>{log.reviewedBy?.name || "-"}</td>
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
    </>
  );
};

export default EmployeeWorkLogsTab;
