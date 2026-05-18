import { useState } from "react";
import { Modal, Button, Form, Alert, Badge } from "react-bootstrap";
import { FaExclamationTriangle } from "react-icons/fa";
import { toast } from "react-toastify";
import { workLogApi } from "../../api/workLogApi";
import {
  formatWorkLogDate,
  formatWorkLogDateTime,
  getWorkLogStatusBadge,
} from "../../utils/workLogHelpers";

/**
 * Detect low-effort / padding work logs on the frontend.
 * Mirrors the backend isLowQualityWorkLog logic.
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

// Two modes: "review" (mark as reviewed) or "concern" (raise concern)
const WorkLogReviewModal = ({ show, onHide, workLog, onSuccess, isHoD = false }) => {
  const [mode, setMode] = useState("review"); // "review" | "concern"
  const [reviewNotes, setReviewNotes] = useState("");
  const [concernNote, setConcernNote] = useState("");
  const [loading, setLoading] = useState(false);

  if (!workLog) return null;

  const lowQuality = isLowQualityWorkLog(workLog.workLog);

  const handleSubmitReview = async () => {
    setLoading(true);
    try {
      if (isHoD) {
        await workLogApi.reviewDepartmentWorkLog(workLog._id, reviewNotes.trim(), "reviewed");
      } else {
        await workLogApi.reviewWorkLog(workLog._id, reviewNotes.trim());
      }
      toast.success("Work log reviewed successfully!");
      if (onSuccess) onSuccess();
      handleClose();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to review work log");
    } finally {
      setLoading(false);
    }
  };

  const handleRaiseConcern = async () => {
    if (!concernNote.trim() || concernNote.trim().length < 10) {
      toast.warning("Please provide a concern note (minimum 10 characters).");
      return;
    }
    setLoading(true);
    try {
      if (isHoD) {
        await workLogApi.raiseDepartmentConcern(workLog._id, concernNote.trim());
      } else {
        await workLogApi.raiseConcern(workLog._id, concernNote.trim());
      }
      toast.success("Concern raised. Employee has been notified.");
      if (onSuccess) onSuccess();
      handleClose();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to raise concern");
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setMode("review");
    setReviewNotes("");
    setConcernNote("");
    onHide();
  };

  return (
    <Modal show={show} onHide={handleClose} size="lg" centered backdrop="static">
      <Modal.Header closeButton>
        <Modal.Title>
          {mode === "concern" ? "Raise Concern" : "Review Work Log"}
        </Modal.Title>
      </Modal.Header>

      <Modal.Body>
        {/* Employee Info */}
        <div className="mb-3">
          <h6>Employee Information</h6>
          <p className="mb-1"><strong>Name:</strong> {workLog.employee?.name || "N/A"}</p>
          <p className="mb-1"><strong>Email:</strong> {workLog.employee?.email || "N/A"}</p>
          {workLog.employee?.designation && (
            <p className="mb-1"><strong>Designation:</strong> {workLog.employee.designation}</p>
          )}
          {workLog.employee?.department && (
            <p className="mb-1">
              <strong>Department:</strong>{" "}
              {typeof workLog.employee.department === "object"
                ? workLog.employee.department.name
                : workLog.employee.department}
            </p>
          )}
          <hr />
        </div>

        {/* Date and Status */}
        <div className="mb-3">
          <p className="mb-1"><strong>Date:</strong> {formatWorkLogDate(workLog.date)}</p>
          <p className="mb-1">
            <strong>Status:</strong>{" "}
            <Badge bg={getWorkLogStatusBadge(workLog.status)}>
              {workLog.status.toUpperCase()}
            </Badge>
            {workLog.isLateSubmission && (
              <Badge bg="warning" className="ms-2">Late Submission</Badge>
            )}
          </p>
          <p className="mb-1">
            <strong>Submitted At:</strong> {formatWorkLogDateTime(workLog.submittedAt)}
          </p>
        </div>

        {/* Late Submission Remark */}
        {workLog.isLateSubmission && workLog.lateSubmissionRemark && (
          <Alert variant="warning">
            <strong>Late Submission Remark:</strong><br />
            {workLog.lateSubmissionRemark}
          </Alert>
        )}

        {/* Low Quality Warning */}
        {lowQuality && (
          <Alert variant="warning" className="d-flex align-items-start gap-2">
            <FaExclamationTriangle className="mt-1 flex-shrink-0" />
            <div>
              <strong>Quality Warning:</strong> This work log appears to contain
              insufficient meaningful content — it may be padded with spaces, dots,
              or repeated characters. Consider raising a concern.
            </div>
          </Alert>
        )}

        {/* Work Log Content */}
        <div className="mb-3">
          <h6>Work Log</h6>
          <div
            className="p-3 rounded"
            style={{
              whiteSpace: "pre-wrap",
              maxHeight: "300px",
              overflowY: "auto",
              background: lowQuality ? "#fff8e1" : "#f8f9fa",
              border: lowQuality ? "1px solid #ffc107" : "1px solid #dee2e6",
            }}
          >
            {workLog.workLog}
          </div>
        </div>

        {/* Mode: Review */}
        {mode === "review" && (
          <Form.Group className="mb-3">
            <Form.Label>Review Notes (Optional)</Form.Label>
            <Form.Control
              as="textarea"
              rows={3}
              value={reviewNotes}
              onChange={(e) => setReviewNotes(e.target.value)}
              placeholder="Add any feedback or comments for the employee (optional)..."
              disabled={loading}
            />
            <Form.Text className="text-muted">
              Optional: Add feedback that will be visible to the employee.
            </Form.Text>
          </Form.Group>
        )}

        {/* Mode: Concern */}
        {mode === "concern" && (
          <Form.Group className="mb-3">
            <Form.Label>
              Concern Note <span className="text-danger">*</span>
            </Form.Label>
            <Form.Control
              as="textarea"
              rows={4}
              value={concernNote}
              onChange={(e) => setConcernNote(e.target.value)}
              placeholder="Describe the issue with this work log. The employee will be notified and asked to resubmit. (Minimum 10 characters)"
              disabled={loading}
              maxLength={500}
            />
            <div className="d-flex justify-content-between mt-1">
              <Form.Text className="text-muted">
                The employee will receive a notification and can edit &amp; resubmit.
              </Form.Text>
              <small className={concernNote.trim().length < 10 ? "text-danger" : "text-success"}>
                {concernNote.trim().length}/500
              </small>
            </div>
          </Form.Group>
        )}
      </Modal.Body>

      <Modal.Footer className="d-flex justify-content-between">
        {/* Left: toggle between modes */}
        <div>
          {mode === "review" ? (
            <Button
              variant="outline-warning"
              onClick={() => setMode("concern")}
              disabled={loading}
            >
              <FaExclamationTriangle className="me-1" />
              Raise Concern Instead
            </Button>
          ) : (
            <Button
              variant="outline-secondary"
              onClick={() => setMode("review")}
              disabled={loading}
            >
              ← Back to Review
            </Button>
          )}
        </div>

        {/* Right: cancel + action */}
        <div className="d-flex gap-2">
          <Button variant="secondary" onClick={handleClose} disabled={loading}>
            Cancel
          </Button>
          {mode === "review" ? (
            <Button variant="success" onClick={handleSubmitReview} disabled={loading}>
              {loading ? "Reviewing..." : "Mark as Reviewed"}
            </Button>
          ) : (
            <Button
              variant="warning"
              onClick={handleRaiseConcern}
              disabled={loading || concernNote.trim().length < 10}
            >
              {loading ? "Raising Concern..." : "Raise Concern & Notify Employee"}
            </Button>
          )}
        </div>
      </Modal.Footer>
    </Modal>
  );
};

export default WorkLogReviewModal;
