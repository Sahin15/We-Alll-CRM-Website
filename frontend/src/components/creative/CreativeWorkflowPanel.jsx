import React, { useMemo, useState } from "react";
import { Alert, Button, Form, ListGroup, Spinner } from "react-bootstrap";
import { toast } from "react-toastify";
import creativeWorkflowApi from "../../api/creativeWorkflowApi";
import userApi from "../../api/userApi";
import CreativeWorkflowStepper from "./CreativeWorkflowStepper";
import {
  canReviewCreativeWork,
  canSubmitPostingDone,
  isCreativeAssignee,
  isCreativeWorkflowItem,
  resolveEntityId,
} from "../../utils/creativeWorkflowAccess";

/**
 * Creative revision + posting actions panel for a work item.
 * Assignees execute work (start / submit / rework); reviewers approve, QA, deliver, close.
 *
 * @param {{ workItem: object, project?: object, onUpdated?: () => void, currentUser?: object }} props
 */
const CreativeWorkflowPanel = ({ workItem, project, onUpdated, currentUser }) => {
  const [revisions, setRevisions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [reviewNotes, setReviewNotes] = useState("");
  const [qaNotes, setQaNotes] = useState("");
  const [postUrlsText, setPostUrlsText] = useState("");
  const [fileUrl, setFileUrl] = useState("");
  const [fileName, setFileName] = useState("");
  const [postingUsers, setPostingUsers] = useState([]);
  const [postingForm, setPostingForm] = useState({
    requiresPosting: false,
    postingAssignedTo: "",
    postingDate: "",
  });
  const [localStatus, setLocalStatus] = useState(workItem?.status || "");

  React.useEffect(() => {
    setLocalStatus(workItem?.status || "");
  }, [workItem?._id, workItem?.status]);

  React.useEffect(() => {
    setPostingForm({
      requiresPosting: Boolean(workItem?.requiresPosting),
      postingAssignedTo: resolveEntityId(workItem?.postingAssignedTo),
      postingDate: workItem?.postingDate
        ? new Date(workItem.postingDate).toISOString().slice(0, 10)
        : "",
    });
  }, [
    workItem?._id,
    workItem?.requiresPosting,
    workItem?.postingAssignedTo,
    workItem?.postingDate,
  ]);

  const workItemId = workItem?._id || workItem?.id;
  const isCreative = isCreativeWorkflowItem(workItem);
  const projectContext = project || workItem?.project;

  const tip = useMemo(
    () => revisions.find((r) => r.isCurrentTip) || revisions[0],
    [revisions]
  );

  const changeRequestSummary = useMemo(() => {
    const changeRevs = revisions.filter(
      (r) =>
        ["changes_requested", "rejected"].includes(r.status) ||
        ["minor", "major", "reject"].includes(r.decisionSeverity) ||
        ["minor", "major", "reject", "send_back"].includes(r.lastDecision)
    );
    const byReviewer = {};
    changeRevs.forEach((r) => {
      const name = r.reviewedBy?.name || r.reviewedBy?.email || "Unknown reviewer";
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
    };
  }, [revisions]);

  const canWork = isCreativeAssignee(currentUser, workItem);
  const canReview = canReviewCreativeWork(currentUser, workItem, projectContext);
  const canPosting = canSubmitPostingDone(currentUser, workItem, projectContext);

  const status = localStatus || workItem?.status || "";
  const awaitingReview = status === "Submitted for Review";
  const inQaReview = status === "QA Review";

  const showWorkerStart =
    canWork &&
    (["To Do", "Assigned", "Backlog"].includes(status) ||
      (status === "In Progress" && revisions.length === 0));
  const showWorkerSubmit = canWork && ["In Progress", "Rework In Progress"].includes(status);
  const showWorkerRework = canWork && status === "Changes Requested";
  const showWorkerFiles =
    canWork &&
    ["In Progress", "Rework In Progress", "Changes Requested", "To Do", "Assigned"].includes(
      status
    );
  const showReviewActions = canReview && awaitingReview;
  const showQaActions = canReview && inQaReview;
  const showDeliver = canReview && status === "Approved";
  const showCloseOnly =
    canReview &&
    (workItem?.requiresPosting ? status === "Posted" : status === "Delivered");

  const showPostingHandoffEditor =
    canReview &&
    !["Delivered", "Awaiting Posting", "Posted", "Closed", "Cancelled"].includes(status);

  const showPostingSubmit =
    workItem?.requiresPosting &&
    canPosting &&
    (status === "Awaiting Posting" || status === "Delivered");

  const missingRevisionBanner =
    status === "In Progress" && revisions.length === 0 && canWork;

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

  const loadPostingUsers = async () => {
    try {
      const usersRes = await userApi.getAllUsers({ status: "active", limit: 1000 });
      const userList = usersRes?.data || usersRes?.users || usersRes || [];
      setPostingUsers(
        (Array.isArray(userList) ? userList : []).filter((u) =>
          String(u.department?.name || "")
            .toLowerCase()
            .includes("posting")
        )
      );
    } catch {
      setPostingUsers([]);
    }
  };

  React.useEffect(() => {
    if (isCreative && workItemId) {
      loadRevisions();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workItemId, isCreative]);

  React.useEffect(() => {
    if (showPostingHandoffEditor) {
      loadPostingUsers();
    }
  }, [showPostingHandoffEditor]);

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
      toast.error("Review notes are required when requesting changes");
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
        nextStatus: decision === "approve" ? "QA Review" : "Changes Requested",
      }
    );
    setReviewNotes("");
  };

  const runQaDecision = async (passed) => {
    if (!inQaReview) {
      toast.error("QA actions are only available during QA Review");
      return;
    }
    if (!passed && !String(qaNotes || "").trim()) {
      toast.error("QA notes are required when QA fails");
      return;
    }
    await runAction(
      () =>
        creativeWorkflowApi.recordQa(workItemId, {
          passed,
          notes: String(qaNotes || "").trim(),
        }),
      passed ? "QA passed — approved for delivery" : "QA failed — changes requested",
      { nextStatus: passed ? "Approved" : "Changes Requested" }
    );
    setQaNotes("");
  };

  const savePostingHandoff = async () => {
    if (postingForm.requiresPosting) {
      if (!postingForm.postingAssignedTo || !postingForm.postingDate) {
        toast.error("Select a posting assignee and posting date");
        return;
      }
    }
    await runAction(
      () =>
        creativeWorkflowApi.setPostingHandoff(workItemId, {
          requiresPosting: postingForm.requiresPosting,
          postingAssignedTo: postingForm.requiresPosting
            ? postingForm.postingAssignedTo
            : null,
          postingDate: postingForm.requiresPosting ? postingForm.postingDate : null,
        }),
      "Posting handoff saved"
    );
  };

  const stepHint = () => {
    if (showWorkerStart) return "Step 1: Start work to open Revision 1.";
    if (showWorkerSubmit) return "Step 2: Add files, then submit for review.";
    if (showReviewActions) return "Step 3: Review the submission — request changes or approve (routes to QA).";
    if (showQaActions) return "Step 4: QA must pass before delivery.";
    if (showDeliver) return "Step 5: Mark delivered when the client receives the asset.";
    if (showPostingSubmit) return "Step 6: Submit live post URL(s).";
    if (showCloseOnly) return "Step 7: Close the task when complete.";
    if (showWorkerRework) return "Apply reviewer feedback, then submit again.";
    return "Use the Creative Workflow panel actions for this task.";
  };

  return (
    <div className="border rounded p-3 bg-light">
      <div className="d-flex justify-content-between align-items-center mb-2">
        <h6 className="mb-0">Creative Workflow</h6>
        <Button size="sm" variant="outline-secondary" onClick={loadRevisions} disabled={loading}>
          Refresh
        </Button>
      </div>

      <CreativeWorkflowStepper
        status={status}
        requiresPosting={Boolean(workItem.requiresPosting)}
      />

      <p className="small text-muted mb-2">
        Status: <strong>{status}</strong>
        {tip ? ` · Current revision: R${tip.revisionNumber}` : ""}
      </p>

      <p className="small text-muted mb-2">{stepHint()}</p>

      {missingRevisionBanner && (
        <Alert variant="warning" className="py-2 small mb-3">
          Revision not started — click <strong>Start / Revision 1</strong> before submitting work.
        </Alert>
      )}

      {changeRequestSummary.total > 0 && (
        <Alert variant="warning" className="py-2 small mb-3">
          <strong>Change requests on this task: {changeRequestSummary.total}</strong>
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
        </Alert>
      )}

      {loading && <Spinner animation="border" size="sm" className="mb-2" />}

      {showPostingHandoffEditor && (
        <div className="border rounded p-2 mb-3 bg-white">
          <div className="small fw-bold mb-2">Posting handoff (reviewer)</div>
          <Form.Check
            type="switch"
            id="requires-posting-switch"
            label="Requires Posting department"
            checked={postingForm.requiresPosting}
            onChange={(e) =>
              setPostingForm((prev) => ({
                ...prev,
                requiresPosting: e.target.checked,
              }))
            }
            className="mb-2"
          />
          {postingForm.requiresPosting && (
            <>
              <Form.Group className="mb-2">
                <Form.Label className="small mb-0">Posting assignee</Form.Label>
                <Form.Select
                  size="sm"
                  value={postingForm.postingAssignedTo}
                  onChange={(e) =>
                    setPostingForm((prev) => ({
                      ...prev,
                      postingAssignedTo: e.target.value,
                    }))
                  }
                >
                  <option value="">Select posting team member</option>
                  {postingUsers.map((u) => (
                    <option key={u._id} value={u._id}>
                      {u.name || u.email}
                    </option>
                  ))}
                </Form.Select>
              </Form.Group>
              <Form.Group className="mb-2">
                <Form.Label className="small mb-0">Posting date</Form.Label>
                <Form.Control
                  type="date"
                  size="sm"
                  value={postingForm.postingDate}
                  onChange={(e) =>
                    setPostingForm((prev) => ({
                      ...prev,
                      postingDate: e.target.value,
                    }))
                  }
                />
              </Form.Group>
            </>
          )}
          <Button size="sm" variant="outline-primary" disabled={loading} onClick={savePostingHandoff}>
            Save posting handoff
          </Button>
        </div>
      )}

      {(showReviewActions || showQaActions) && (
        <Form.Group className="mb-3">
          <Form.Label className="small fw-bold">
            {showQaActions ? "QA notes" : "Review notes"}
            {(showReviewActions || !showQaActions) && (
              <span className="text-muted fw-normal"> (required for change requests)</span>
            )}
            {showQaActions && (
              <span className="text-muted fw-normal"> (required for QA fail)</span>
            )}
          </Form.Label>
          <Form.Control
            as="textarea"
            rows={2}
            value={showQaActions ? qaNotes : reviewNotes}
            onChange={(e) =>
              showQaActions ? setQaNotes(e.target.value) : setReviewNotes(e.target.value)
            }
            placeholder={
              showQaActions
                ? "Notes for QA pass or fail"
                : "Describe what must change (required for minor/major change requests)"
            }
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
              onClick={() => runReviewDecision("minor", "Minor changes requested")}
            >
              Request Minor Changes
            </Button>
            <Button
              size="sm"
              variant="outline-danger"
              disabled={loading || !String(reviewNotes || "").trim()}
              onClick={() => runReviewDecision("major", "Major changes requested")}
            >
              Request Major Changes
            </Button>
            <Button
              size="sm"
              variant="success"
              disabled={loading}
              onClick={() => runReviewDecision("approve", "Sent to QA Review")}
            >
              Approve → QA
            </Button>
          </>
        )}
        {showQaActions && (
          <>
            <Button
              size="sm"
              variant="success"
              disabled={loading}
              onClick={() => runQaDecision(true)}
            >
              QA Pass
            </Button>
            <Button
              size="sm"
              variant="outline-danger"
              disabled={loading || !String(qaNotes || "").trim()}
              onClick={() => runQaDecision(false)}
            >
              QA Fail
            </Button>
          </>
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
                {
                  nextStatus: workItem.requiresPosting ? "Awaiting Posting" : "Delivered",
                }
              )
            }
          >
            Mark Delivered
          </Button>
        )}
        {showCloseOnly && (
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
          <div className="d-flex gap-2 align-items-center w-100 flex-wrap">
            <div className="flex-grow-1" style={{ minWidth: 120 }}>
              <Form.Control
                placeholder="File name"
                size="sm"
                value={fileName}
                onChange={(e) => setFileName(e.target.value)}
              />
            </div>
            <div className="flex-grow-1" style={{ minWidth: 160 }}>
              <Form.Control
                placeholder="https://..."
                size="sm"
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
                ).then(() => {
                  setFileUrl("");
                  setFileName("");
                })
              }
              disabled={!fileUrl || loading}
            >
              Add
            </Button>
          </div>
        </Form.Group>
      )}

      {showPostingSubmit && (
        <Alert variant="info" className="mb-3">
          <Form.Group className="mb-2">
            <Form.Label className="fw-bold small">Post URL(s) — one per line</Form.Label>
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
            disabled={loading}
            onClick={() =>
              runAction(
                () =>
                  creativeWorkflowApi.submitPostingDone(workItemId, {
                    postUrls: postUrlsText
                      .split("\n")
                      .map((u) => u.trim())
                      .filter(Boolean),
                  }),
                "Posting marked done",
                { nextStatus: "Posted" }
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
          {revisions.map((rev) => {
            const attachments = (rev.attachments || []).filter((a) => !a.softDeprecated);
            return (
              <ListGroup.Item key={rev._id}>
                <strong>Revision {rev.revisionNumber}</strong>
                {rev.isCurrentTip ? " (current)" : ""} — {rev.status}
                {rev.parentRevision?.revisionNumber
                  ? ` · based on R${rev.parentRevision.revisionNumber}`
                  : ""}
                <div className="small text-muted">{rev.reason}</div>
                {attachments.length > 0 && (
                  <ul className="small mb-0 ps-3 mt-1">
                    {attachments.map((att, idx) => (
                      <li key={att._id || `${rev._id}-att-${idx}`}>
                        <a href={att.url} target="_blank" rel="noopener noreferrer">
                          {att.name || att.url}
                        </a>
                      </li>
                    ))}
                  </ul>
                )}
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
            );
          })}
        </ListGroup>
      )}
    </div>
  );
};

export default CreativeWorkflowPanel;
