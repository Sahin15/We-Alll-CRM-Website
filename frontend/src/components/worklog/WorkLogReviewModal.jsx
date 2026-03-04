import { useState } from "react";
import { Modal, Button, Form, Alert, Badge } from "react-bootstrap";
import { toast } from "react-toastify";
import { workLogApi } from "../../api/workLogApi";
import {
  formatWorkLogDate,
  formatWorkLogDateTime,
  getWorkLogStatusBadge,
} from "../../utils/workLogHelpers";

const WorkLogReviewModal = ({ show, onHide, workLog, onSuccess }) => {
  const [reviewNotes, setReviewNotes] = useState("");
  const [loading, setLoading] = useState(false);

  if (!workLog) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();

    setLoading(true);
    try {
      const response = await workLogApi.reviewWorkLog(
        workLog._id,
        reviewNotes.trim()
      );
      toast.success(response.message || "Work log reviewed successfully!");
      
      if (onSuccess) {
        onSuccess();
      }
      
      handleClose();
    } catch (error) {
      toast.error(
        error.response?.data?.message || "Failed to review work log"
      );
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setReviewNotes("");
    onHide();
  };

  return (
    <Modal show={show} onHide={handleClose} size="lg" centered backdrop="static">
      <Modal.Header closeButton>
        <Modal.Title>Review Work Log</Modal.Title>
      </Modal.Header>

      <Modal.Body>
        {/* Employee Info */}
        <div className="mb-3">
          <h6>Employee Information</h6>
          <p className="mb-1">
            <strong>Name:</strong> {workLog.employee?.name || "N/A"}
          </p>
          <p className="mb-1">
            <strong>Email:</strong> {workLog.employee?.email || "N/A"}
          </p>
          {workLog.employee?.designation && (
            <p className="mb-1">
              <strong>Designation:</strong> {workLog.employee.designation}
            </p>
          )}
          {workLog.employee?.department && (
            <p className="mb-1">
              <strong>Department:</strong> {workLog.employee.department}
            </p>
          )}
          <hr />
        </div>

        {/* Date and Status */}
        <div className="mb-3">
          <p className="mb-1">
            <strong>Date:</strong> {formatWorkLogDate(workLog.date)}
          </p>
          <p className="mb-1">
            <strong>Status:</strong>{" "}
            <Badge bg={getWorkLogStatusBadge(workLog.status)}>
              {workLog.status.toUpperCase()}
            </Badge>
            {workLog.isLateSubmission && (
              <Badge bg="warning" className="ms-2">
                Late Submission
              </Badge>
            )}
          </p>
          <p className="mb-1">
            <strong>Submitted At:</strong>{" "}
            {formatWorkLogDateTime(workLog.submittedAt)}
          </p>
        </div>

        {/* Late Submission Remark */}
        {workLog.isLateSubmission && workLog.lateSubmissionRemark && (
          <Alert variant="warning">
            <strong>Late Submission Remark:</strong>
            <br />
            {workLog.lateSubmissionRemark}
          </Alert>
        )}

        {/* Work Log Content */}
        <div className="mb-3">
          <h6>Work Log</h6>
          <div
            className="p-3 bg-light rounded"
            style={{
              whiteSpace: "pre-wrap",
              maxHeight: "300px",
              overflowY: "auto",
            }}
          >
            {workLog.workLog}
          </div>
        </div>

        {/* Review Notes */}
        <Form onSubmit={handleSubmit}>
          <Form.Group className="mb-3">
            <Form.Label>Review Notes (Optional)</Form.Label>
            <Form.Control
              as="textarea"
              rows={4}
              value={reviewNotes}
              onChange={(e) => setReviewNotes(e.target.value)}
              placeholder="Add any feedback or comments for the employee..."
              disabled={loading}
            />
            <Form.Text className="text-muted">
              These notes will be visible to the employee.
            </Form.Text>
          </Form.Group>
        </Form>
      </Modal.Body>

      <Modal.Footer>
        <Button variant="secondary" onClick={handleClose} disabled={loading}>
          Cancel
        </Button>
        <Button
          variant="success"
          onClick={handleSubmit}
          disabled={loading}
        >
          {loading ? "Reviewing..." : "Mark as Reviewed"}
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default WorkLogReviewModal;
