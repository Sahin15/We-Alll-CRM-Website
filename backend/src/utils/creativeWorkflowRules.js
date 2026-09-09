/**
 * Creative workflow transition rules — single source of truth for guards.
 * @see docs/WORKFLOW/CREATIVE_STATE_MACHINE.md
 */

export const START_WORK_STATUSES = ["To Do", "Assigned", "Backlog"];

export const SUBMIT_REVIEW_STATUSES = ["In Progress", "Rework In Progress"];

export const REVIEW_STATUSES = ["Submitted for Review"];

export const QA_STATUSES = ["QA Review"];

export const REWORK_STATUSES = ["Changes Requested"];

export const DELIVER_STATUSES = ["Approved"];

/** @typedef {"approve"|"reject"|"minor"|"major"|"send_back"} ReviewDecisionKey */

/** @type {Record<string, ReviewDecisionKey>} */
export const REVIEW_DECISION_ALIASES = {
  approve: "approve",
  approved: "approve",
  approve_to_qa: "approve",
  approve_qa: "approve",
  reject: "reject",
  rejected: "reject",
  minor: "minor",
  request_minor_changes: "minor",
  major: "major",
  request_major_rework: "major",
  send_back: "send_back",
  send_back_with_comments: "send_back",
};

/**
 * Normalize API/UI review decision strings to a canonical key.
 * @param {string} decision
 * @returns {ReviewDecisionKey|null}
 */
export function resolveReviewDecision(decision) {
  const normalized = String(decision || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_");
  return REVIEW_DECISION_ALIASES[normalized] || null;
}

/** @typedef {"pass"|"fail"} QaDecisionKey */

/** @type {Record<string, QaDecisionKey>} */
export const QA_DECISION_ALIASES = {
  pass: "pass",
  passed: "pass",
  approve: "pass",
  approved: "pass",
  qa_pass: "pass",
  fail: "fail",
  failed: "fail",
  reject: "fail",
  rejected: "fail",
  qa_fail: "fail",
};

/**
 * Parse QA pass/fail from API body ({ decision, pass, passed }).
 * @param {object} body
 * @returns {boolean|null} true = pass, false = fail, null = unrecognized
 */
export function resolveQaPassFromBody(body = {}) {
  const decisionKey = QA_DECISION_ALIASES[
    String(body.decision || "")
      .trim()
      .toLowerCase()
      .replace(/\s+/g, "_")
  ];
  if (decisionKey === "pass") return true;
  if (decisionKey === "fail") return false;

  const passFlag = body.pass ?? body.passed ?? body.qaPass;
  if (passFlag === true || passFlag === 1) return true;
  if (passFlag === false || passFlag === 0) return false;

  const normalized = String(passFlag ?? "")
    .trim()
    .toLowerCase();
  if (normalized === "true" || normalized === "1" || normalized === "yes") return true;
  if (normalized === "false" || normalized === "0" || normalized === "no") return false;

  return null;
}

export const POSTING_SUBMIT_STATUSES = ["Delivered", "Awaiting Posting"];

/**
 * @param {string} status
 * @param {string[]} allowed
 * @param {string} actionLabel
 */
export function assertStatusIn(status, allowed, actionLabel) {
  if (!allowed.includes(status)) {
    const err = new Error(
      `${actionLabel} is not allowed when status is "${status}". Expected: ${allowed.join(", ")}`
    );
    err.statusCode = 400;
    throw err;
  }
}

/**
 * Statuses that cannot be set via generic PATCH for creative work items.
 * Cancelled is allowed separately with reason validation.
 */
export const CREATIVE_PATCH_BLOCKED_STATUSES = [
  "To Do",
  "Assigned",
  "Backlog",
  "In Progress",
  "Submitted for Review",
  "Changes Requested",
  "Rework In Progress",
  "QA Review",
  "Approved",
  "Delivered",
  "Awaiting Posting",
  "Posted",
  "Closed",
  "Done",
  "Review",
];

/**
 * Block backward transition from terminal delivery states when slotted.
 * @param {object} workItem
 * @param {string} newStatus
 */
export function assertNoBackwardFromDelivered(workItem, newStatus) {
  const from = workItem.status;
  const deliveredLike = ["Delivered", "Done", "Awaiting Posting", "Posted", "Closed"];
  if (!deliveredLike.includes(from)) return;
  if (from === newStatus) return;

  const hasSlot = Boolean(workItem.slotAssignment?.slotId);
  if (hasSlot) {
    const err = new Error(
      "Cannot change status after delivery for slotted creative work items. Use Creative Workflow actions."
    );
    err.statusCode = 400;
    throw err;
  }
}
