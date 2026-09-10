import React, { useMemo, useState } from "react";
import { Alert, Button, Form, ListGroup, Spinner } from "react-bootstrap";
import { toast } from "react-toastify";
import creativeWorkflowApi from "../../api/creativeWorkflowApi";
import userApi from "../../api/userApi";
import { isPostingDepartmentName } from "../../constants/departmentNames";
import CreativeWorkflowStepper from "./CreativeWorkflowStepper";
import CreativeStepTimeline from "./CreativeStepTimeline";
import {
  canHoldCreativeWork,
  canMarkCreativeDone,
  canResumeCreativeWork,
  canReviewCreativeWork,
  canSubmitPostingDone,
  isCreativeAssignee,
  isCreativeWorkflowItem,
  isPostingAssignee,
  resolveEntityId,
} from "../../utils/creativeWorkflowAccess";

/** @param {string} value */
const isLikelyUrl = (value) => /^https?:\/\//i.test(String(value || "").trim());

const POSTING_PLATFORMS = [
  "Instagram",
  "Facebook",
  "LinkedIn",
  "YouTube",
  "Twitter/X",
  "TikTok",
  "Pinterest",
  "WhatsApp",
  "Other",
];

/** @returns {{ platform: string, url: string }} */
const createEmptyPostLink = () => ({ platform: "Instagram", url: "" });

/**
 * @param {Array<string|{ platform?: string, url?: string }>} entries
 * @returns {{ platform: string, url: string }[]}
 */
const normalizePostLinksForDisplay = (entries = []) =>
  (Array.isArray(entries) ? entries : [])
    .map((entry) => {
      if (typeof entry === "string") {
        const url = entry.trim();
        return url ? { platform: "Other", url } : null;
      }
      if (entry && typeof entry === "object") {
        const url = String(entry.url || "").trim();
        const platform = String(entry.platform || "Other").trim() || "Other";
        return url ? { platform, url } : null;
      }
      return null;
    })
    .filter(Boolean);

/**
 * Fix swapped name/url fields (common when users paste the link in the first box).
 * @param {string} name
 * @param {string} url
 */
const normalizeAttachmentFields = (name, url) => {
  let label = String(name || "").trim();
  let link = String(url || "").trim();
  if (isLikelyUrl(label) && !isLikelyUrl(link)) {
    [label, link] = [link, label];
  }
  return {
    name: label || link || "attachment",
    url: link,
  };
};

/**
 * @param {{ name?: string, url?: string }} att
 * @returns {{ href: string|null, label: string, isLink: boolean }}
 */
const resolveAttachmentDisplay = (att) => {
  const normalized = normalizeAttachmentFields(att?.name, att?.url);
  if (isLikelyUrl(normalized.url)) {
    return {
      href: normalized.url,
      label: normalized.name || normalized.url,
      isLink: true,
    };
  }
  if (isLikelyUrl(normalized.name)) {
    return {
      href: normalized.name,
      label: normalized.url || normalized.name,
      isLink: true,
    };
  }
  return {
    href: null,
    label: normalized.name || normalized.url || "Invalid attachment",
    isLink: false,
  };
};

/**
 * @param {string} reason
 */
const parseRevisionReason = (reason) => {
  const text = String(reason || "").trim();
  if (!text) return { kind: "plain", prefix: null, body: "" };
  const changeMatch = /^(Changes requested \([^)]+\)) — ([\s\S]*)$/i.exec(text);
  if (changeMatch) {
    return { kind: "change", prefix: changeMatch[1], body: changeMatch[2] };
  }
  const rejectMatch = /^(Reject response) — ([\s\S]*)$/i.exec(text);
  if (rejectMatch) {
    return { kind: "reject", prefix: rejectMatch[1], body: rejectMatch[2] };
  }
  return { kind: "plain", prefix: null, body: text };
};

/**
 * Creative revision + posting actions panel for a work item.
 * Assignees execute work (start / submit / rework); reviewers approve, QA, deliver, close.
 *
 * @param {{
 *   workItem: object,
 *   project?: object,
 *   onUpdated?: () => void,
 *   currentUser?: object,
 *   revisions?: object[],
 *   revisionsLoading?: boolean,
 *   onRevisionsChange?: (revisions: object[]) => void,
 * }} props
 */
const CreativeWorkflowPanel = ({
  workItem,
  project,
  onUpdated,
  currentUser,
  revisions: revisionsProp,
  revisionsLoading: revisionsLoadingProp = false,
  onRevisionsChange,
}) => {
  const [revisionsLocal, setRevisionsLocal] = useState([]);
  const [revisionsLoadingLocal, setRevisionsLoadingLocal] = useState(false);
  const [loading, setLoading] = useState(false);

  const revisionsControlled = revisionsProp !== undefined;
  const revisions = revisionsControlled ? revisionsProp : revisionsLocal;
  const revisionsLoading = revisionsControlled
    ? revisionsLoadingProp
    : revisionsLoadingLocal;

  const setRevisions = (next) => {
    if (typeof next === 'function') {
      const updated = next(revisions);
      if (revisionsControlled) {
        onRevisionsChange?.(updated);
      } else {
        setRevisionsLocal(updated);
      }
      return updated;
    }
    if (revisionsControlled) {
      onRevisionsChange?.(next);
    } else {
      setRevisionsLocal(next);
    }
    return next;
  };
  const [reviewNotes, setReviewNotes] = useState("");
  const [qaNotes, setQaNotes] = useState("");
  const [postLinks, setPostLinks] = useState([createEmptyPostLink()]);
  const [postingSubmitNotes, setPostingSubmitNotes] = useState("");
  const [fileUrl, setFileUrl] = useState("");
  const [fileName, setFileName] = useState("");
  const [postingUsers, setPostingUsers] = useState([]);
  const [postingForm, setPostingForm] = useState({
    requiresPosting: false,
    postingAssignedTo: "",
    postingDate: "",
  });
  const [postingEditorOpen, setPostingEditorOpen] = useState(false);
  const [localStatus, setLocalStatus] = useState(workItem?.status || "");
  const [activeCreativeWork, setActiveCreativeWork] = useState(null);

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
  const isPostingUser = isPostingAssignee(currentUser, workItem);
  const canPostingSubmit = canSubmitPostingDone(currentUser, workItem);
  const canMarkDone = canMarkCreativeDone(currentUser, workItem, projectContext);

  const status = localStatus || workItem?.status || "";
  const awaitingReview = status === "Submitted for Review";
  const inQaReview = status === "QA Review";

  const otherActiveWork =
    activeCreativeWork &&
    String(activeCreativeWork._id) !== String(workItemId);

  const showWorkerStart =
    canWork &&
    !otherActiveWork &&
    (["To Do", "Assigned", "Backlog"].includes(status) ||
      (status === "In Progress" && revisions.length === 0));
  const showWorkerSubmit = canWork && ["In Progress", "Rework In Progress"].includes(status);
  const showWorkerHold = canHoldCreativeWork(currentUser, { ...workItem, status });
  const showWorkerResume = canResumeCreativeWork(currentUser, { ...workItem, status }) && !otherActiveWork;
  const showWorkerRework =
    canWork && !otherActiveWork && status === "Changes Requested";
  const showWorkerFiles =
    canWork &&
    ["In Progress", "Rework In Progress", "Changes Requested", "To Do", "Assigned"].includes(
      status
    );
  const showReviewActions = canReview && awaitingReview;
  const showQaActions = canReview && inQaReview;
  const showDeliver = canReview && status === "Approved";
  const showMarkDone =
    canMarkDone &&
    (workItem?.requiresPosting ? status === "Posted" : status === "Delivered");

  const postingHandoffLockedStatuses = [
    "Delivered",
    "Awaiting Posting",
    "Posted",
    "Closed",
    "Cancelled",
  ];

  const isPostingHandoffComplete = useMemo(() => {
    if (workItem?.requiresPosting) {
      return Boolean(
        resolveEntityId(workItem?.postingAssignedTo) && workItem?.postingDate
      );
    }
    return workItem?.postingStatus === "not_required";
  }, [
    workItem?.requiresPosting,
    workItem?.postingAssignedTo,
    workItem?.postingDate,
    workItem?.postingStatus,
  ]);

  const showPostingHandoffEditor =
    canReview &&
    !isPostingUser &&
    !postingHandoffLockedStatuses.includes(status) &&
    (!isPostingHandoffComplete || postingEditorOpen);

  const showPostingHandoffSummary =
    canReview &&
    !postingHandoffLockedStatuses.includes(status) &&
    isPostingHandoffComplete &&
    !postingEditorOpen;

  const showPostingSubmit =
    workItem?.requiresPosting && canPostingSubmit && status === "Awaiting Posting";

  const showPostingAssignmentInfo =
    workItem?.requiresPosting &&
    Boolean(resolveEntityId(workItem?.postingAssignedTo) || postingForm.postingAssignedTo);

  const missingRevisionBanner =
    status === "In Progress" && revisions.length === 0 && canWork;

  const loadRevisions = async ({ silent = false } = {}) => {
    if (!workItemId) return;
    if (!silent && !revisionsControlled) {
      setRevisionsLoadingLocal(true);
    }
    try {
      const res = await creativeWorkflowApi.listRevisions(workItemId);
      setRevisions(res.data || []);
    } catch (error) {
      if (!silent) {
        toast.error(error.response?.data?.error || "Failed to load revisions");
      }
    } finally {
      if (!revisionsControlled) {
        setRevisionsLoadingLocal(false);
      }
    }
  };

  const loadPostingUsers = async () => {
    try {
      const usersRes = await userApi.getAllUsers({ status: "active", limit: 1000 });
      const userList = usersRes?.data || usersRes?.users || usersRes || [];
      setPostingUsers(
        (Array.isArray(userList) ? userList : []).filter((u) =>
          isPostingDepartmentName(u.department?.name)
        )
      );
    } catch {
      setPostingUsers([]);
    }
  };

  React.useEffect(() => {
    if (isCreative && workItemId && !revisionsControlled) {
      loadRevisions();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workItemId, isCreative, revisionsControlled]);

  React.useEffect(() => {
    if (!canWork) {
      setActiveCreativeWork(null);
      return;
    }
    creativeWorkflowApi
      .getMyActiveCreativeWork()
      .then((res) => setActiveCreativeWork(res?.data || null))
      .catch(() => setActiveCreativeWork(null));
  }, [canWork, workItemId, status]);

  React.useEffect(() => {
    setPostingEditorOpen(false);
    setPostLinks([createEmptyPostLink()]);
    setPostingSubmitNotes("");
  }, [workItemId]);

  const submittedPostLinks = useMemo(
    () => normalizePostLinksForDisplay(workItem?.postUrls),
    [workItem?.postUrls]
  );

  React.useEffect(() => {
    if (showPostingHandoffEditor || showPostingHandoffSummary) {
      loadPostingUsers();
    }
  }, [showPostingHandoffEditor, showPostingHandoffSummary]);

  if (!isCreative) {
    return null;
  }

  /** @param {object} response */
  const extractWorkItemFromResponse = (response) => {
    const envelope = response?.data ?? response ?? {};
    const payload =
      envelope?.success !== undefined && envelope?.data ? envelope.data : envelope;
    if (payload?.workItem) return payload.workItem;
    if (payload?._id) return payload;
    return null;
  };

  const runAction = async (fn, successMessage, { nextStatus, expectedStatus } = {}) => {
    setLoading(true);
    try {
      const response = await fn();
      if (response?.success === false) {
        throw new Error(
          typeof response?.error === "string"
            ? response.error
            : response?.error?.message || "Action failed"
        );
      }
      const updatedWorkItem = extractWorkItemFromResponse(response);
      const resolvedStatus = updatedWorkItem?.status || nextStatus || "";
      if (
        expectedStatus &&
        resolvedStatus &&
        resolvedStatus !== expectedStatus
      ) {
        throw new Error(
          `Expected status "${expectedStatus}" but received "${resolvedStatus}". Please refresh and try again.`
        );
      }
      const payload = response?.data ?? response ?? {};
      const inner = payload?.data ?? payload;
      const timeSummary = inner?.timeSummary;
      if (timeSummary?.elapsedFormatted && /submitted|rework|held|resumed/i.test(successMessage)) {
        toast.success(`${successMessage} (${timeSummary.elapsedFormatted})`);
      } else {
        toast.success(successMessage);
      }
      if (updatedWorkItem?.status) {
        setLocalStatus(updatedWorkItem.status);
      } else if (nextStatus) {
        setLocalStatus(nextStatus);
      }
      const innerPayload = response?.data ?? response ?? {};
      const innerData = innerPayload?.data ?? innerPayload;
      if (innerData?.revision) {
        setRevisions((prev) => {
          const list = Array.isArray(prev) ? [...prev] : [];
          const idx = list.findIndex(
            (r) =>
              String(r._id) === String(innerData.revision._id) ||
              r.revisionNumber === innerData.revision.revisionNumber
          );
          const merged = {
            ...(idx >= 0 ? list[idx] : {}),
            ...innerData.revision,
            timeSummary: innerData.timeSummary || list[idx]?.timeSummary,
          };
          if (idx >= 0) {
            list[idx] = merged;
          } else {
            list.unshift(merged);
          }
          return list;
        });
      }

      if (!revisionsControlled) {
        await loadRevisions({ silent: true });
      }
      if (canWork) {
        creativeWorkflowApi
          .getMyActiveCreativeWork()
          .then((res) => setActiveCreativeWork(res?.data || null))
          .catch(() => setActiveCreativeWork(null));
      }
      if (typeof onUpdated === "function") {
        Promise.resolve(onUpdated({ workItem: updatedWorkItem })).catch((refreshError) => {
          console.error("Creative workflow refresh after action failed:", refreshError);
        });
      }
      return updatedWorkItem;
    } catch (error) {
      const apiError = error.response?.data?.error;
      const activeBlock = error.response?.data?.activeWorkItem;
      if (error.response?.status === 409 && activeBlock?.title) {
        toast.error(
          `You are working on "${activeBlock.title}". Hold it first to start this task.`
        );
      } else {
        toast.error(apiError || error.message || "Action failed");
      }
      return null;
    } finally {
      setLoading(false);
    }
  };

  const runReviewDecision = async (decision, successMessage) => {
    if (!awaitingReview) {
      toast.error("Review actions are only available after Submit for Review");
      return;
    }
    const normalizedDecision = String(decision || "").trim().toLowerCase();
    const needsNotes =
      normalizedDecision === "minor" ||
      normalizedDecision === "major" ||
      normalizedDecision === "reject";
    if (needsNotes && !String(reviewNotes || "").trim()) {
      toast.error("Review notes are required when requesting changes");
      return;
    }
    await runAction(
      () =>
        creativeWorkflowApi.recordReview(workItemId, {
          decision: normalizedDecision,
          notes: String(reviewNotes || "").trim(),
        }),
      successMessage,
      {
        nextStatus: normalizedDecision === "approve" ? "QA Review" : "Changes Requested",
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
          decision: passed ? "pass" : "fail",
          pass: passed,
          notes: String(qaNotes || "").trim(),
        }),
      passed ? "QA passed — approved for delivery" : "QA failed — changes requested",
      {
        nextStatus: passed ? "Approved" : "Changes Requested",
        expectedStatus: passed ? "Approved" : "Changes Requested",
      }
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
    const saved = await runAction(
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
    if (saved) {
      setPostingEditorOpen(false);
    }
  };

  const getPostingAssigneeLabel = () => {
    const assigned = workItem?.postingAssignedTo;
    if (assigned && typeof assigned === "object") {
      return assigned.name || assigned.email || "Posting assignee";
    }
    const id = resolveEntityId(assigned || postingForm.postingAssignedTo);
    const match = postingUsers.find((u) => String(u._id) === id);
    return match?.name || match?.email || "Posting assignee";
  };

  const stepHint = () => {
    if (showWorkerStart) return "Step 1: Start work to open Revision 1.";
    if (showWorkerSubmit) return "Step 2: Submit for review (optional: add file links below).";
    if (showReviewActions) return "Step 3: Review the submission — request changes or approve (routes to QA).";
    if (showQaActions) return "Step 4: QA must pass before delivery.";
    if (showDeliver) return "Step 5: Mark delivered when the client receives the asset.";
    if (showPostingSubmit) {
      return "Submit live post links by platform.";
    }
    if (showMarkDone) return "Mark done when posting is complete and the task can be closed.";
    if (showWorkerRework) return "Apply reviewer feedback, then submit again.";
    if (showWorkerHold) return "Hold this task to switch to higher-priority work.";
    if (showWorkerResume) return "Resume this held task when ready.";
    if (otherActiveWork) {
      return `Hold "${activeCreativeWork.title}" first to start this task.`;
    }

    const waitingHints = {
      "On Hold": canWork
        ? "This task is on hold. Click Resume when you are ready to continue."
        : "Assignee has paused this task.",
      "Submitted for Review": canReview
        ? "Review the submission using the actions below."
        : "Waiting for reviewer (assigner, project head, or HoD).",
      "QA Review": canReview
        ? "Complete QA using the actions below."
        : "Waiting for QA (assigner, project head, or HoD).",
      Approved: canReview
        ? "QA passed — mark delivered when the asset is ready."
        : "Approved — waiting for delivery.",
      Delivered: workItem?.requiresPosting
        ? "Delivered — posting handoff is in progress or pending."
        : "Delivered — assigner or leads can mark done when complete.",
      "Awaiting Posting": isPostingUser
        ? "You are the posting assignee — submit live post links below."
        : `Waiting for ${getPostingAssigneeLabel()} to submit live post links.`,
      Posted: canMarkDone
        ? "Posting complete — mark done to close this task."
        : "Posted — waiting for assignee or leads to mark done.",
      Closed: "This task is done.",
      Cancelled: "This task was cancelled.",
    };

    if (waitingHints[status]) {
      return waitingHints[status];
    }

    if (status === "Changes Requested" && canWork) {
      return "Reviewer requested changes — start rework when ready.";
    }
    if (status === "Changes Requested") {
      return "Waiting for assignee to start rework.";
    }

    return null;
  };

  const hintText = stepHint();

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

      {otherActiveWork && canWork && (
        <Alert variant="warning" className="py-2 small mb-2">
          You are actively working on <strong>{activeCreativeWork.title}</strong>.
          Hold it first before starting or resuming another task.
        </Alert>
      )}

      <CreativeStepTimeline
        revisions={revisions}
        workItem={workItem}
        loading={revisionsLoading}
      />

      <p className="small text-muted mb-2">
        Status: <strong>{status}</strong>
        {tip ? ` · Current revision: R${tip.revisionNumber}` : ""}
      </p>

      {hintText && <p className="small text-muted mb-2">{hintText}</p>}

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

      {showPostingAssignmentInfo && (
        <div className="border rounded p-2 mb-3 bg-white">
          <div className="small fw-bold mb-1">Posting assignment</div>
          <div className="small text-muted">
            <span className="badge bg-info me-1">Posting required</span>
            Assigned to: <strong>{getPostingAssigneeLabel()}</strong>
            {(workItem.postingDate || postingForm.postingDate) && (
              <>
                {" · Scheduled: "}
                {workItem.postingDate
                  ? new Date(workItem.postingDate).toLocaleDateString()
                  : postingForm.postingDate}
              </>
            )}
            {status === "Awaiting Posting" && isPostingUser && (
              <span className="d-block mt-1 text-primary">
                You are the posting assignee — submit live links below.
              </span>
            )}
            {status === "Awaiting Posting" && !isPostingUser && canReview && (
              <span className="d-block mt-1">
                Waiting for {getPostingAssigneeLabel()} to submit live post links.
              </span>
            )}
          </div>
        </div>
      )}

      {showPostingHandoffSummary && (
        <div className="border rounded p-2 mb-3 bg-white">
          <div className="d-flex justify-content-between align-items-start gap-2">
            <div>
              <div className="small fw-bold mb-1">Posting handoff</div>
              {workItem?.requiresPosting ? (
                <div className="small text-muted">
                  <span className="badge bg-info me-1">Posting required</span>
                  {getPostingAssigneeLabel()}
                  {" · "}
                  {workItem.postingDate
                    ? new Date(workItem.postingDate).toLocaleDateString()
                    : postingForm.postingDate}
                </div>
              ) : (
                <div className="small text-muted">Client posts directly (no Posting department)</div>
              )}
            </div>
            <Button
              size="sm"
              variant="outline-secondary"
              onClick={() => setPostingEditorOpen(true)}
              disabled={loading}
            >
              Edit
            </Button>
          </div>
        </div>
      )}

      {showPostingHandoffEditor && (
        <div className="border rounded p-2 mb-3 bg-white">
          <div className="d-flex justify-content-between align-items-center mb-2">
            <div className="small fw-bold">Posting handoff (reviewer)</div>
            {isPostingHandoffComplete && (
              <Button
                size="sm"
                variant="link"
                className="p-0 text-muted"
                onClick={() => setPostingEditorOpen(false)}
              >
                Cancel
              </Button>
            )}
          </div>
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

      {showReviewActions && (
        <Form.Group className="mb-3">
          <Form.Label className="small fw-bold">
            Change-request notes
            <span className="text-muted fw-normal"> (required for minor/major only)</span>
          </Form.Label>
          <Form.Control
            as="textarea"
            rows={2}
            value={reviewNotes}
            onChange={(e) => setReviewNotes(e.target.value)}
            placeholder="Describe what must change before resubmitting"
            disabled={loading}
          />
          <Form.Text className="text-muted">
            Optional for Approve → QA. Use Minor/Major only when sending work back for rework.
          </Form.Text>
        </Form.Group>
      )}

      {showQaActions && (
        <Form.Group className="mb-3">
          <Form.Label className="small fw-bold">
            QA notes
            <span className="text-muted fw-normal"> (required only if QA fails)</span>
          </Form.Label>
          <Form.Control
            as="textarea"
            rows={2}
            value={qaNotes}
            onChange={(e) => setQaNotes(e.target.value)}
            placeholder="Optional for QA Pass; required if QA Fail"
            disabled={loading}
          />
        </Form.Group>
      )}

      <div className="d-flex flex-wrap gap-2 mb-3">
        {showWorkerStart && (
          <Button
            size="sm"
            variant="success"
            disabled={loading || otherActiveWork}
            title={
              otherActiveWork
                ? `Hold "${activeCreativeWork?.title}" first`
                : undefined
            }
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
        {showWorkerHold && (
          <Button
            size="sm"
            variant="outline-warning"
            disabled={loading}
            onClick={() =>
              runAction(
                () => creativeWorkflowApi.holdWork(workItemId),
                "Work held",
                { nextStatus: "On Hold" }
              )
            }
          >
            Hold
          </Button>
        )}
        {showWorkerResume && (
          <Button
            size="sm"
            variant="warning"
            disabled={loading}
            onClick={() =>
              runAction(
                () => creativeWorkflowApi.resumeWork(workItemId),
                "Work resumed",
                { nextStatus: workItem?.holdPreviousStatus || "In Progress" }
              )
            }
          >
            Resume
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
              type="button"
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
              type="button"
              size="sm"
              variant="success"
              disabled={loading}
              onClick={() => runQaDecision(true)}
            >
              QA Pass
            </Button>
            <Button
              type="button"
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
        {showMarkDone && (
          <Button
            size="sm"
            variant="success"
            disabled={loading}
            onClick={() =>
              runAction(
                () => creativeWorkflowApi.closeTask(workItemId),
                "Marked done",
                { nextStatus: "Closed" }
              )
            }
          >
            Mark Done
          </Button>
        )}
      </div>

      {showWorkerFiles && (
        <Form.Group className="mb-3">
          <Form.Label className="small fw-bold">
            Add file link to current draft revision
            <span className="text-muted fw-normal"> (optional)</span>
          </Form.Label>
          <div className="d-flex gap-2 align-items-center w-100 flex-wrap">
            <div className="flex-grow-1" style={{ minWidth: 180 }}>
              <Form.Control
                placeholder="https://drive.google.com/... or Figma link"
                size="sm"
                value={fileUrl}
                onChange={(e) => setFileUrl(e.target.value)}
              />
            </div>
            <div className="flex-grow-1" style={{ minWidth: 120 }}>
              <Form.Control
                placeholder="Label (optional)"
                size="sm"
                value={fileName}
                onChange={(e) => setFileName(e.target.value)}
              />
            </div>
            <Button
              size="sm"
              className="flex-shrink-0 text-nowrap"
              onClick={() => {
                const normalized = normalizeAttachmentFields(fileName, fileUrl);
                if (!isLikelyUrl(normalized.url)) {
                  toast.error("Enter a valid URL starting with http:// or https://");
                  return;
                }
                return runAction(
                  () =>
                    creativeWorkflowApi.addRevisionAttachment(workItemId, {
                      name: normalized.name,
                      url: normalized.url,
                      type: "other",
                    }),
                  "Attachment added"
                ).then(() => {
                  setFileUrl("");
                  setFileName("");
                });
              }}
              disabled={(!fileUrl && !fileName) || loading}
            >
              Add
            </Button>
          </div>
          <Form.Text className="text-muted">
            File links are optional — you can submit for review without adding any. When you do add one, paste the full URL first; an optional label helps reviewers (e.g. &quot;Wallpaper v2&quot;).
          </Form.Text>
        </Form.Group>
      )}

      {submittedPostLinks.length > 0 && ["Posted", "Closed"].includes(status) && (
        <div className="border rounded p-2 mb-3 bg-white">
          <div className="small fw-bold mb-2">Live post links</div>
          <ul className="small mb-0 ps-3">
            {submittedPostLinks.map((link, idx) => (
              <li key={`${link.platform}-${link.url}-${idx}`}>
                <strong>{link.platform}:</strong>{" "}
                <a href={link.url} target="_blank" rel="noopener noreferrer">
                  {link.url}
                </a>
              </li>
            ))}
          </ul>
          {workItem?.postingNotes ? (
            <div className="small text-muted mt-2">{workItem.postingNotes}</div>
          ) : null}
        </div>
      )}

      {showPostingSubmit && (
        <Alert variant="info" className="mb-3">
          <Form.Label className="fw-bold small d-block mb-2">
            Submit live post links by platform
          </Form.Label>
          {postLinks.map((link, index) => (
            <div
              key={`post-link-row-${index}`}
              className="d-flex flex-wrap gap-2 align-items-center mb-2"
            >
              <Form.Select
                size="sm"
                style={{ minWidth: 140, maxWidth: 180 }}
                value={link.platform}
                onChange={(e) =>
                  setPostLinks((prev) =>
                    prev.map((row, i) =>
                      i === index ? { ...row, platform: e.target.value } : row
                    )
                  )
                }
              >
                {POSTING_PLATFORMS.map((platform) => (
                  <option key={platform} value={platform}>
                    {platform}
                  </option>
                ))}
              </Form.Select>
              <Form.Control
                size="sm"
                className="flex-grow-1"
                style={{ minWidth: 200 }}
                placeholder="https://instagram.com/p/..."
                value={link.url}
                onChange={(e) =>
                  setPostLinks((prev) =>
                    prev.map((row, i) =>
                      i === index ? { ...row, url: e.target.value } : row
                    )
                  )
                }
              />
              {postLinks.length > 1 ? (
                <Button
                  type="button"
                  size="sm"
                  variant="outline-danger"
                  onClick={() =>
                    setPostLinks((prev) => prev.filter((_, i) => i !== index))
                  }
                >
                  Remove
                </Button>
              ) : null}
            </div>
          ))}
          <Button
            type="button"
            size="sm"
            variant="outline-secondary"
            className="mb-2"
            onClick={() => setPostLinks((prev) => [...prev, createEmptyPostLink()])}
          >
            + Add another platform
          </Button>
          <Form.Group className="mb-2">
            <Form.Label className="small mb-0">Posting notes (optional)</Form.Label>
            <Form.Control
              as="textarea"
              rows={2}
              size="sm"
              value={postingSubmitNotes}
              onChange={(e) => setPostingSubmitNotes(e.target.value)}
              placeholder="Any notes about the live posts"
            />
          </Form.Group>
          <Button
            type="button"
            size="sm"
            variant="success"
            disabled={loading}
            onClick={() => {
              const payloadLinks = postLinks
                .map((row) => ({
                  platform: String(row.platform || "").trim(),
                  url: String(row.url || "").trim(),
                }))
                .filter((row) => row.platform && row.url);

              if (payloadLinks.length === 0) {
                toast.error("Add at least one platform with a post URL");
                return;
              }

              const invalid = payloadLinks.find((row) => !isLikelyUrl(row.url));
              if (invalid) {
                toast.error(`${invalid.platform}: enter a valid http(s) URL`);
                return;
              }

              return runAction(
                () =>
                  creativeWorkflowApi.submitPostingDone(workItemId, {
                    postUrls: payloadLinks,
                    postingNotes: String(postingSubmitNotes || "").trim(),
                  }),
                "Posting marked done",
                { nextStatus: "Posted" }
              );
            }}
          >
            Submit Posting
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
            const isApprovedRevision = rev.status === "approved";
            const reasonParts = isApprovedRevision
              ? { kind: "plain", prefix: null, body: "" }
              : parseRevisionReason(rev.reason);
            const feedbackText = isApprovedRevision
              ? rev.approvalNotes || rev.reviewNotes || rev.feedback || ""
              : rev.feedback || rev.reviewNotes || "";
            return (
              <ListGroup.Item key={rev._id} className="creative-revision-item">
                <div className="d-flex flex-wrap align-items-center gap-2 mb-1">
                  <strong>Revision {rev.revisionNumber}</strong>
                  {rev.isCurrentTip ? (
                    <span className="badge bg-primary">current</span>
                  ) : null}
                  {isApprovedRevision ? (
                    <span className="badge bg-success">Approved for QA</span>
                  ) : (
                    <span className="badge bg-light text-dark border">{rev.status}</span>
                  )}
                  {rev.parentRevision?.revisionNumber ? (
                    <span className="small text-muted">based on R{rev.parentRevision.revisionNumber}</span>
                  ) : null}
                </div>

                {reasonParts.kind !== "plain" && reasonParts.body ? (
                  <div className="creative-revision-feedback mb-2">
                    <div className="small fw-semibold text-warning-emphasis mb-1">
                      {reasonParts.prefix}
                    </div>
                    <div className="creative-revision-feedback-body">{reasonParts.body}</div>
                  </div>
                ) : reasonParts.body ? (
                  <div className="small text-muted creative-revision-reason mb-2">{reasonParts.body}</div>
                ) : null}

                {feedbackText &&
                  reasonParts.body !== feedbackText &&
                  !String(reasonParts.body || "").includes(feedbackText) && (
                  <div className="creative-revision-feedback mb-2">
                    <div className="small fw-semibold mb-1">
                      {isApprovedRevision ? "Approval notes" : "Reviewer feedback"}
                    </div>
                    <div className="creative-revision-feedback-body">{feedbackText}</div>
                  </div>
                )}

                {attachments.length > 0 && (
                  <ul className="small mb-0 ps-3 mt-1 creative-revision-attachments">
                    {attachments.map((att, idx) => {
                      const display = resolveAttachmentDisplay(att);
                      return (
                        <li key={att._id || `${rev._id}-att-${idx}`}>
                          {display.isLink ? (
                            <a
                              href={display.href}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="creative-revision-link"
                            >
                              {display.label}
                            </a>
                          ) : (
                            <span className="text-danger">{display.label} (invalid URL)</span>
                          )}
                        </li>
                      );
                    })}
                  </ul>
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
