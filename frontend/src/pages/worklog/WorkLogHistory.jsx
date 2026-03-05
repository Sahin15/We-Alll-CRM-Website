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
  Modal,
} from "react-bootstrap";
import { FaEye, FaEdit, FaDownload, FaSave } from "react-icons/fa";
import { toast } from "react-toastify";
import { workLogApi } from "../../api/workLogApi";
import {
  truncateWorkLog,
  formatWorkLogDate,
  formatWorkLogDateTime,
  getWorkLogStatusBadge,
  validateWorkLog,
  getCharCountColor,
  getCharCountMessage,
} from "../../utils/workLogHelpers";
import WorkLogViewModal from "../../components/worklog/WorkLogViewModal";
import "../../styles/worklog.css";

const WorkLogHistory = () => {
  const [workLogs, setWorkLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    pages: 0,
  });
  const [filters, setFilters] = useState({
    startDate: new Date(new Date().setDate(1)).toISOString().split("T")[0],
    endDate: new Date().toISOString().split("T")[0],
    status: "all",
  });
  const [selectedLog, setSelectedLog] = useState(null);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editWorkLog, setEditWorkLog] = useState("");
  const [charCount, setCharCount] = useState(0);

  useEffect(() => {
    fetchWorkLogs();
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

      const response = await workLogApi.getMyWorkLogs(params);
      setWorkLogs(response.workLogs);
      setPagination(response.pagination);
    } catch (error) {
      toast.error("Failed to fetch work logs");
      console.error(error);
    } finally {
      setLoading(false);
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

  const handleEdit = (log) => {
    setSelectedLog(log);
    setEditWorkLog(log.workLog);
    setCharCount(log.workLog.length);
    setShowEditModal(true);
  };

  const handleUpdateWorkLog = async () => {
    const validation = validateWorkLog(editWorkLog);
    if (!validation.valid) {
      toast.error(validation.message);
      return;
    }

    setUpdating(true);
    try {
      await workLogApi.submitWorkLog(editWorkLog.trim());
      toast.success("Work log updated successfully!");
      setShowEditModal(false);
      fetchWorkLogs();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to update work log");
    } finally {
      setUpdating(false);
    }
  };

  useEffect(() => {
    setCharCount(editWorkLog.trim().length);
  }, [editWorkLog]);

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
      link.download = `my-work-logs-${new Date().toISOString().split("T")[0]}.xlsx`;
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
    for (let i = 1; i <= pagination.pages; i++) {
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
        <Pagination.Prev
          disabled={pagination.page === 1}
          onClick={() => handlePageChange(pagination.page - 1)}
        />
        {items}
        <Pagination.Next
          disabled={pagination.page === pagination.pages}
          onClick={() => handlePageChange(pagination.page + 1)}
        />
      </Pagination>
    );
  };

  return (
    <Container className="mt-4">
      <Row className="mb-4">
        <Col>
          <h2>Work Log History</h2>
          <p className="text-muted">View your past work log submissions</p>
        </Col>
      </Row>

      {/* Filters */}
      <Row className="mb-4">
        <Col>
          <Card>
            <Card.Body>
              <Row className="align-items-end">
                <Col md={3}>
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
                <Col md={3}>
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
                <Col md={3}>
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
                          <th>Date</th>
                          <th>Work Log</th>
                          <th>Status</th>
                          <th>Reviewed By</th>
                          <th>Submitted At</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {workLogs.map((log) => (
                          <tr key={log._id}>
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
                              {log.editHistory && log.editHistory.length > 0 && (
                                <Badge bg="info" className="ms-1">
                                  Edited
                                </Badge>
                              )}
                            </td>
                            <td>{log.reviewedBy?.name || "-"}</td>
                            <td>
                              <small>
                                {formatWorkLogDateTime(log.submittedAt)}
                              </small>
                            </td>
                            <td>
                              <Button
                                variant="outline-primary"
                                size="sm"
                                onClick={() => handleView(log)}
                                className="me-1"
                              >
                                <FaEye />
                              </Button>
                              {log.status !== "reviewed" && (
                                <Button
                                  variant="outline-secondary"
                                  size="sm"
                                  onClick={() => handleEdit(log)}
                                >
                                  <FaEdit />
                                </Button>
                              )}
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

      {/* View Modal */}
      <WorkLogViewModal
        show={showViewModal}
        onHide={() => setShowViewModal(false)}
        workLog={selectedLog}
      />

      {/* Edit Modal */}
      <Modal show={showEditModal} onHide={() => setShowEditModal(false)} size="lg" centered>
        <Modal.Header closeButton>
          <Modal.Title>Edit Work Log</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form>
            <Form.Group className="mb-3">
              <Form.Label>
                Work Log <span className="text-danger">*</span>
              </Form.Label>
              <Form.Control
                as="textarea"
                rows={10}
                value={editWorkLog}
                onChange={(e) => setEditWorkLog(e.target.value)}
                placeholder="Describe your work activities, tasks completed, meetings attended, issues resolved, etc. (Minimum 50 characters)"
                disabled={updating}
              />
              <div className="d-flex justify-content-between align-items-center mt-2">
                <small className={`text-${getCharCountColor(charCount)}`}>
                  {getCharCountMessage(charCount)}
                </small>
                {charCount >= 50 && (
                  <small className="text-success">✓ Ready to update</small>
                )}
              </div>
            </Form.Group>
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowEditModal(false)} disabled={updating}>
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleUpdateWorkLog}
            disabled={updating || charCount < 50}
          >
            <FaSave className="me-1" />
            {updating ? "Updating..." : "Update Work Log"}
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
};

export default WorkLogHistory;
