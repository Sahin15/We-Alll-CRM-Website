import React, { useMemo, useState } from "react";
import { Alert, Button, Form, ListGroup, Spinner } from "react-bootstrap";
import { toast } from "react-toastify";
import creativeWorkflowApi from "../../api/creativeWorkflowApi";

/**
 * Creative revision + posting actions panel for a work item.
 * Assignees execute work (start / submit / rework); assigners review (changes / approve / deliver).
 */
const CreativeWorkflowPanel = ({ workItem, onUpdated, currentUser }) => {
  const [revisions, setRevisions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [reviewNotes, setReviewNotes] = useState("");
  const [postUrlsText, setPostUrlsText] = useState("");
  const [fileUrl, setFileUrl] = useState("");
  const [fileName, setFileName] = useState("");
  /** Local status so review buttons disable immediately after a decision (parent workItem can be stale). */
  const [localStatus, setLocalStatus] = useState(workItem?.status || "");

  React.useEffect(() => {
    setLocalStatus(workItem?.status || "");
  }, [workItem?._id, workItem?.status]);

  const workItemId = workItem?._id || workItem?.id;
  const isCreative =
    workItem?.workflowMode === "creative" ||
    workItem?.workflowType === "design" ||
    workItem?.workflowType === "video-production";

  const tip = useMemo(
    () => revisions.find((r) => r.isCurrentTip) || revisions[0],
    [revisions]
  );

  const changeRequestSummary = useMemo(() => {
    const changeRevs = revisions.filter((r) =>
      ["changes_requested", "rejected"].includes(r.status) ||
      ["minor", "major", "reject"].includes(r.decisionSeverity) ||
      ["minor", "major", "reject", "send_back"].includes(r.lastDecision)
    );
    const byReviewer = {};
    changeRevs.forEach((r) => {
      const name =
        r.reviewedBy?.name ||
        r.reviewedBy?.email ||
        "Unknown reviewer";
      if (!byReviewer[name]) {
        byReviewer[name] = { name, count: 0, minor: 0, major: 0, reject: 0 };
      }
      byReviewer[name].count += 1;
      const sev = r.decisionSeverity || r.lastDecision || "minor";
      if (sev === "major") byReviewer[name].major += 1;
      else if (sev === "reject" || sev === "rejected") byReviewer[name].reject += 1;
      else byReviewer[name].minor += 1;
    });
    return {
      total: changeRevs.length,
      byReviewer: Object.values(byReviewer),
      changeRevs,
    };
  }, [revisions]);

  const currentUserId = String(currentUser?._id || currentUser?.id || "");

  const sameId = (value) => {
    if (!value || !currentUserId) return false;
    const id = typeof value === "object" ? value._id || value.id : value;
    return id && String(id) === currentUserId;
  };

  const isAssignee =
    sameId(workItem?.assignedTo) ||
    (Array.isArray(workItem?.assignedToMultiple) &&
      workItem.assignedToMultiple.some((a) => sameId(a?._id || a)));

  const isAssigner = sameId(workItem?.createdBy);

  const isElevatedReviewer = ["admin", "superadmin", "hr", "manager", "hod"].includes(
    currentUser?.role
  );

  // Worker: the person doing the creative work
  const canWork = isAssignee;
  // Reviewer: who assigned the work, or managers/HR/admin (not for self-approve unless elevated)
  const canReview = isAssigner || isElevatedReviewer;

  const status = localStatus || workItem?.status || "";
  const awaitingReview = status === "Submitted for Review";
  const workerStartStatuses = ["To Do", "Assigned", "Backlog"];
  const workerSubmitStatuses = [
    "In Progress",
    "Rework In Progress",
    "Changes Requested",
  ];
  const workerReworkStatuses = ["Changes Requested"];
  const deliverStatuses = ["Approved", "QA Review"];
  const closeStatuses = ["Delivered", "Posted", "Approved"];

  const showWorkerStart =
    canWork &&
    (workerStartStatuses.includes(status) ||
      (status === "In Progress" && revisions.length === 0));
  const showWorkerSubmit = canWork && workerSubmitStatuses.includes(status);
  const showWorkerRework = canWork && workerReworkStatuses.includes(status);
  const showWorkerFiles =
    canWork &&
    ["In Progress", "Rework In Progress", "Changes Requested", "To Do", "Assigned"].includes(
      status
    );
  // Review actions only while Submitted for Review — then they disappear / stay inactive
  const showReviewActions = canReview && awaitingReview;
  const showDeliver = canReview && deliverStatuses.includes(status);
  const showClose = canReview && closeStatuses.includes(status);

  const isPostingAssignee = sameId(workItem?.postingAssignedTo) || isElevatedReviewer;
  const showPostingSubmit =
    workItem?.requiresPosting &&
    isPostingAssignee &&
    (status === "Awaiting Posting" || status === "Delivered");

  const loadRevisions = async () => {
    if (!workItemId) return;
    setLoading(true);
    try {
      const res = await creativeWorkflowApi.listRevisions(workItemId);
      setRevisions(res.data || []);
    } catch (error) {
      toast.error(error.response?.data?.error || "Failed to load revisions");
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    if (isCreative && workItemId) {
      loadRevisions();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workItemId, isCreative]);

  if (!isCreative) {
    return null;
  }

  const runAction = async (fn, successMessage, { nextStatus } = {}) => {
    setLoading(true);
    try {
      await fn();
      toast.success(successMessage);
      if (nextStatus) {
        setLocalStatus(nextStatus);
      }
      await loadRevisions();
      if (typeof onUpdated === "function") {
        try {
          await onUpdated();
        } catch (refreshError) {
          console.error("Creative workflow refresh after action failed:", refreshError);
        }
      }
    } catch (error) {
      toast.error(error.response?.data?.error || error.message || "Action failed");
    } finally {
      setLoading(false);
    }
  };

  const runReviewDecision = async (decision, successMessage) => {
    if (!awaitingReview) {
      toast.error("Review actions are only available after Submit for Review");
      return;
    }
    const needsNotes = decision === "minor" || decision === "major" || decision === "reject";
    if (needsNotes && !String(reviewNotes || "").trim()) {
      toast.error("Review / QA notes are required when requesting changes");
      return;
    }
    await runAction(
      () =>
        creativeWorkflowApi.recordReview(workItemId, {
          decision,
          notes: String(reviewNotes || "").trim(),
        }),
      successMessage,
      {
        nextStatus: decision === "approve" ? "Approved" : "Changes Requested",
      }
    );
    setReviewNotes("");
  };

  return (
    <div className="border rounded p-3 bg-light">
      <div className="d-flex justify-content-between align-items-center mb-2">
        <h6 className="mb-0">Creative Workflow</h6>
        <Button size="sm" variant="outline-secondary" onClick={loadRevisions} disabled={loading}>
          Refresh
        </Button>
      </div>

      <p className="small text-muted mb-2">
        Status: <strong>{status}</strong>
        {workItem.requiresPosting ? (
          <>
            {" "}
            · Posting date:{" "}
            <strong>
              {workItem.postingDate
                ? new Date(workItem.postingDate).toLocaleDateString()
                : "—"}
            </strong>
          </>
        ) : (
          " · Client posts (no Posting department)"
        )}
      </p>

      {changeRequestSummary.total > 0 && (
        <Alert variant="warning" className="py-2 small mb-3">
          <strong>
            Change requests on this task: {changeRequestSummary.total}
          </strong>
          <ul className="mb-0 mt-1 ps-3">
            {changeRequestSummary.byReviewer.map((row) => (
              <li key={row.name}>
                {row.name}: {row.count}
                {row.minor ? ` · minor ${row.minor}` : ""}
                {row.major ? ` · major ${row.major}` : ""}
                {row.reject ? ` · reject ${row.reject}` : ""}
              </li>
            ))}
          </ul>
          <div className="text-muted mt-1">
            Full history also appears in Activity Timeline (system comments + revision reviews).
          </div>
        </Alert>
      )}

      {loading && <Spinner animation="border" size="sm" className="mb-2" />}

      <p className="small text-muted mb-2">
        {canWork && !canReview && "Your actions: work on the task, then submit for review."}
        {canReview && !canWork && "Your actions: review the submission and request changes or approve."}
        {canWork && canReview && "You can both work on and review this task."}
        {!canWork && !canReview && "You can view this creative workflow but have no actions."}
      </p>

      {showReviewActions && (
        <Form.Group className="mb-3">
          <Form.Label className="small fw-bold">
            Review / QA notes <span className="text-danger">*</span>
            <span className="text-muted fw-normal"> (required for change requests)</span>
          </Form.Label>
          <Form.Control
            as="textarea"
            rows={2}
            value={reviewNotes}
            onChange={(e) => setReviewNotes(e.target.value)}
            placeholder="Describe what must change (required for minor/major change requests)"
            disabled={loading}
          />
        </Form.Group>
      )}

      <div className="d-flex flex-wrap gap-2 mb-3">
        {showWorkerStart && (
          <Button
            size="sm"
            disabled={loading}
            onClick={() =>
              runAction(
                () => creativeWorkflowApi.startWork(workItemId),
                "Work started",
                { nextStatus: "In Progress" }
              )
            }
          >
            Start / Revision 1
          </Button>
        )}
        {showWorkerSubmit && (
          <Button
            size="sm"
            variant="primary"
            disabled={loading}
            onClick={() =>
              runAction(
                () => creativeWorkflowApi.submitForReview(workItemId),
                "Submitted for review",
                { nextStatus: "Submitted for Review" }
              )
            }
          >
            Submit for Review
          </Button>
        )}
        {showReviewActions && (
          <>
            <Button
              size="sm"
              variant="warning"
              disabled={loading || !String(reviewNotes || "").trim()}
              title={
                !String(reviewNotes || "").trim()
                  ? "Enter Review / QA notes first"
                  : undefined
              }
              onClick={() => runReviewDecision("minor", "Minor changes requested")}
            >
              Request Minor Changes
            </Button>
            <Button
              size="sm"
              variant="outline-danger"
              disabled={loading || !String(reviewNotes || "").trim()}
              title={
                !String(reviewNotes || "").trim()
                  ? "Enter Review / QA notes first"
                  : undefined
              }
              onClick={() => runReviewDecision("major", "Major changes requested")}
            >
              Request Major Changes
            </Button>
            <Button
              size="sm"
              variant="success"
              disabled={loading}
              onClick={() => runReviewDecision("approve", "Approved")}
            >
              Approve
            </Button>
          </>
        )}
        {canReview && !awaitingReview && (
          <span className="small text-muted align-self-center">
            Review buttons appear only after the assignee submits for review.
          </span>
        )}
        {showWorkerRework && (
          <Button
            size="sm"
            variant="outline-warning"
            disabled={loading}
            onClick={() =>
              runAction(
                () => creativeWorkflowApi.startRework(workItemId),
                "Rework started",
                { nextStatus: "Rework In Progress" }
              )
            }
          >
            Start Rework
          </Button>
        )}
        {showDeliver && (
          <Button
            size="sm"
            variant="outline-success"
            disabled={loading}
            onClick={() =>
              runAction(
                () => creativeWorkflowApi.markDelivered(workItemId),
                "Delivered",
                { nextStatus: workItem.requiresPosting ? "Awaiting Posting" : "Delivered" }
              )
            }
          >
            Mark Delivered
          </Button>
        )}
        {showClose && (
          <Button
            size="sm"
            variant="dark"
            disabled={loading}
            onClick={() =>
              runAction(
                () => creativeWorkflowApi.closeTask(workItemId),
                "Closed",
                { nextStatus: "Closed" }
              )
            }
          >
            Close
          </Button>
        )}
      </div>

      {showWorkerFiles && (
        <Form.Group className="mb-3">
          <Form.Label className="small fw-bold">Add file URL to current draft revision</Form.Label>
          <div className="d-flex gap-2 align-items-center w-100">
            <div className="flex-grow-1" style={{ minWidth: 0 }}>
              <Form.Control
                placeholder="File name"
                value={fileName}
                onChange={(e) => setFileName(e.target.value)}
              />
            </div>
            <div className="flex-grow-1" style={{ minWidth: 0 }}>
              <Form.Control
                placeholder="https://..."
                value={fileUrl}
                onChange={(e) => setFileUrl(e.target.value)}
              />
            </div>
            <Button
              size="sm"
              className="flex-shrink-0 text-nowrap"
              onClick={() =>
                runAction(
                  () =>
                    creativeWorkflowApi.addRevisionAttachment(workItemId, {
                      name: fileName || "attachment",
                      url: fileUrl,
                      type: "other",
                    }),
                  "Attachment added"
                )
              }
              disabled={!fileUrl}
            >
              Add
            </Button>
          </div>
        </Form.Group>
      )}

      {showPostingSubmit && (
          <Alert variant="info" className="mb-3">
            <Form.Group className="mb-2">
              <Form.Label className="fw-bold">Post URL(s) — one per line</Form.Label>
              <Form.Control
                as="textarea"
                rows={3}
                value={postUrlsText}
                onChange={(e) => setPostUrlsText(e.target.value)}
                placeholder="https://instagram.com/p/...&#10;https://facebook.com/..."
              />
            </Form.Group>
            <Button
              size="sm"
              variant="success"
              onClick={() =>
                runAction(
                  () =>
                    creativeWorkflowApi.submitPostingDone(workItemId, {
                      postUrls: postUrlsText
                        .split("\n")
                        .map((u) => u.trim())
                        .filter(Boolean),
                    }),
                  "Posting marked done"
                )
              }
            >
              Submit Posting Done
            </Button>
          </Alert>
        )}

      <h6 className="mt-2">Revisions</h6>
      {revisions.length === 0 ? (
        <p className="small text-muted mb-0">No revisions yet. Click Start / Revision 1.</p>
      ) : (
        <ListGroup>
          {revisions.map((rev) => (
            <ListGroup.Item key={rev._id}>
              <strong>Revision {rev.revisionNumber}</strong>
              {rev.isCurrentTip ? " (current)" : ""} — {rev.status}
              {rev.parentRevision?.revisionNumber
                ? ` · based on R${rev.parentRevision.revisionNumber}`
                : ""}
              <div className="small text-muted">{rev.reason}</div>
              <div className="small">
                Files: {(rev.attachments || []).filter((a) => !a.softDeprecated).length}
              </div>
              {rev.reviewedAt && rev.lastDecision && rev.lastDecision !== "none" && (
                <div className="small mt-1">
                  Review by <strong>{rev.reviewedBy?.name || "Reviewer"}</strong>
                  {": "}
                  {rev.lastDecision}
                  {rev.decisionSeverity && rev.decisionSeverity !== "none"
                    ? ` (${rev.decisionSeverity})`
                    : ""}
                  {rev.reviewNotes ? ` — ${rev.reviewNotes}` : ""}
                </div>
              )}
            </ListGroup.Item>
          ))}
        </ListGroup>
      )}

      {tip && (
        <p className="small text-muted mt-2 mb-0">
          Tip revision: R{tip.revisionNumber} ({tip.status})
        </p>
      )}
    </div>
  );
};

export default CreativeWorkflowPanel;
