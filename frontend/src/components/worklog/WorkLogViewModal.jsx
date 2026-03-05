import { Modal, Badge, Alert } from "react-bootstrap";
import {
  formatWorkLogDate,
  formatWorkLogDateTime,
  getWorkLogStatusBadge,
} from "../../utils/workLogHelpers";

const WorkLogViewModal = ({ show, onHide, workLog }) => {
  if (!workLog) return null;

  return (
    <Modal show={show} onHide={onHide} size="lg" centered>
      <Modal.Header closeButton>
        <Modal.Title>Work Log Details</Modal.Title>
      </Modal.Header>

      <Modal.Body>
        {/* Employee Info (if available) */}
        {workLog.employee && (
          <div className="mb-3">
            <h6>Employee Information</h6>
            <p className="mb-1">
              <strong>Name:</strong> {workLog.employee.name}
            </p>
            <p className="mb-1">
              <strong>Email:</strong> {workLog.employee.email}
            </p>
            {workLog.employee.designation && (
              <p className="mb-1">
                <strong>Designation:</strong> {workLog.employee.designation}
              </p>
            )}
            {workLog.employee.department && (
              <p className="mb-1">
                <strong>Department:</strong> {typeof workLog.employee.department === 'object' ? workLog.employee.department.name : workLog.employee.department}
              </p>
            )}
            <hr />
          </div>
        )}

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
            style={{ whiteSpace: "pre-wrap" }}
          >
            {workLog.workLog}
          </div>
        </div>

        {/* Review Information */}
        {workLog.status === "reviewed" && (
          <div className="mb-3">
            <Alert variant="success">
              <h6>Review Information</h6>
              <p className="mb-1">
                <strong>Reviewed By:</strong> {workLog.reviewedBy?.name || "N/A"}
              </p>
              <p className="mb-1">
                <strong>Reviewed At:</strong>{" "}
                {formatWorkLogDateTime(workLog.reviewedAt)}
              </p>
              {workLog.reviewNotes && (
                <>
                  <hr />
                  <p className="mb-0">
                    <strong>Review Notes:</strong>
                    <br />
                    {workLog.reviewNotes}
                  </p>
                </>
              )}
            </Alert>
          </div>
        )}

        {/* Edit History */}
        {workLog.editHistory && workLog.editHistory.length > 0 && (
          <div className="mb-3">
            <h6>Edit History</h6>
            <div className="p-3 bg-light rounded">
              {workLog.editHistory.map((edit, index) => (
                <div key={index} className="mb-2">
                  <small>
                    <strong>
                      {formatWorkLogDateTime(edit.editedAt)}
                    </strong>
                    {edit.reason && ` - ${edit.reason}`}
                  </small>
                </div>
              ))}
            </div>
          </div>
        )}
      </Modal.Body>

      <Modal.Footer>
        <button className="btn btn-secondary" onClick={onHide}>
          Close
        </button>
      </Modal.Footer>
    </Modal>
  );
};

export default WorkLogViewModal;
