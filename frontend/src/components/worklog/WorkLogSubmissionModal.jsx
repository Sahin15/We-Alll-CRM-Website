import { useState, useEffect, useRef } from "react";
import { Modal, Button, Form, Alert } from "react-bootstrap";
import { toast } from "react-toastify";
import { workLogApi } from "../../api/workLogApi";
import {
  validateWorkLog,
  getCharCountColor,
  getCharCountMessage,
} from "../../utils/workLogHelpers";
import { useAuth } from "../../context/AuthContext";

const WorkLogSubmissionModal = ({ show, onHide, onSubmit, onSkip }) => {
  const { user } = useAuth();
  const [workLog, setWorkLog] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [charCount, setCharCount] = useState(0);
  const textareaRef = useRef(null);

  const isManager = user?.role === "manager";

  useEffect(() => {
    if (show) {
      // Auto-focus textarea when modal opens
      setTimeout(() => {
        textareaRef.current?.focus();
      }, 100);

      // Try to load existing work log
      loadTodayWorkLog();
    }
  }, [show]);

  useEffect(() => {
    setCharCount(workLog.trim().length);
  }, [workLog]);

  const loadTodayWorkLog = async () => {
    try {
      const data = await workLogApi.getTodayWorkLog();
      if (data && data.workLog) {
        setWorkLog(data.workLog);
      }
    } catch (error) {
      // Silently handle - no work log for today is expected
      console.debug("No existing work log for today");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    const validation = validateWorkLog(workLog);
    if (!validation.valid) {
      setError(validation.message);
      return;
    }

    setLoading(true);
    try {
      const response = await workLogApi.submitWorkLog(workLog.trim());
      toast.success(response.message || "Work log submitted successfully!");
      
      if (onSubmit) {
        onSubmit(response.workLog);
      }
      
      handleClose();
    } catch (error) {
      const errorMsg =
        error.response?.data?.message || "Failed to submit work log";
      setError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleSkipClick = () => {
    if (onSkip) {
      onSkip();
    }
    handleClose();
  };

  const handleClose = () => {
    setWorkLog("");
    setError("");
    setCharCount(0);
    onHide();
  };

  return (
    <Modal
      show={show}
      onHide={handleClose}
      size="lg"
      backdrop="static"
      keyboard={false}
      centered
    >
      <Modal.Header closeButton>
        <Modal.Title>Submit Daily Work Log</Modal.Title>
      </Modal.Header>

      <Modal.Body>
        {error && <Alert variant="danger">{error}</Alert>}

        <Alert variant="info">
          <strong>Before you clock out...</strong>
          <br />
          Please describe what you worked on today. This helps track progress
          and productivity.
          {isManager && (
            <>
              <br />
              <small className="text-muted">
                As a manager, you can skip this step if needed.
              </small>
            </>
          )}
        </Alert>

        <Form onSubmit={handleSubmit}>
          <Form.Group className="mb-3">
            <Form.Label>
              What did you work on today? <span className="text-danger">*</span>
            </Form.Label>
            <Form.Control
              as="textarea"
              ref={textareaRef}
              rows={8}
              value={workLog}
              onChange={(e) => setWorkLog(e.target.value)}
              placeholder="Describe your work activities, tasks completed, meetings attended, issues resolved, etc. (Minimum 50 characters)"
              disabled={loading}
              className="mb-2"
            />
            <div className="d-flex justify-content-between align-items-center">
              <small className={`text-${getCharCountColor(charCount)}`}>
                {getCharCountMessage(charCount)}
              </small>
              {charCount >= 50 && (
                <small className="text-success">✓ Ready to submit</small>
              )}
            </div>
          </Form.Group>
        </Form>
      </Modal.Body>

      <Modal.Footer>
        <Button variant="secondary" onClick={handleClose} disabled={loading}>
          Cancel
        </Button>
        
        {isManager && (
          <Button
            variant="warning"
            onClick={handleSkipClick}
            disabled={loading}
          >
            Skip & Clock Out
          </Button>
        )}
        
        <Button
          variant="primary"
          onClick={handleSubmit}
          disabled={loading || charCount < 50}
        >
          {loading ? "Submitting..." : "Submit & Clock Out"}
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default WorkLogSubmissionModal;
