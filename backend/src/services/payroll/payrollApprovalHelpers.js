/**
 * Payroll approval helpers (Milestone 6).
 * Pure validation for stage actions — no DB.
 */

export const APPROVAL_STAGES = Object.freeze([
  "hr_review",
  "finance_approval",
  "management_signoff",
]);

export const APPROVAL_ACTIONS = Object.freeze(["approved", "rejected"]);

export const WORKFLOW_TYPES = Object.freeze([
  "salary_approval",
  "bulk_approval",
  "individual_review",
]);

/**
 * @param {string} action
 * @throws {Error}
 */
export function assertApprovalAction(action) {
  if (!APPROVAL_ACTIONS.includes(action)) {
    throw new Error(
      `Invalid approval action (expected one of: ${APPROVAL_ACTIONS.join(", ")})`
    );
  }
}

/**
 * Validate that a user may act on the current stage of a workflow-like object.
 *
 * @param {object} workflow
 * @param {string} userId
 * @returns {{ stage: object, stageIndex: number }}
 */
export function assertCanActOnCurrentStage(workflow, userId) {
  if (!workflow || workflow.overallStatus !== "in_progress") {
    throw new Error("Workflow is not awaiting approval");
  }

  const stageIndex = Number(workflow.currentStage) || 0;
  const stage = workflow.stages?.[stageIndex];
  if (!stage) {
    throw new Error("No current stage to approve");
  }

  if (stage.status !== "pending") {
    throw new Error("Stage already processed");
  }

  const approverId =
    stage.approver?._id?.toString?.() || stage.approver?.toString?.() || "";
  if (!approverId || approverId !== String(userId)) {
    throw new Error("Unauthorized to approve this stage");
  }

  return { stage, stageIndex };
}

/**
 * Build the three default stages from explicit approver user IDs.
 *
 * @param {{ hr: string, finance: string, management: string }} approvers
 * @param {Date} [now]
 * @returns {Array<object>}
 */
export function buildStandardStages(approvers, now = new Date()) {
  if (!approvers?.hr || !approvers?.finance || !approvers?.management) {
    throw new Error("hr, finance, and management approver IDs are required");
  }

  const dayMs = 2 * 24 * 60 * 60 * 1000;
  const hrDeadline = new Date(now.getTime() + dayMs);
  const financeDeadline = new Date(hrDeadline.getTime() + dayMs);
  const managementDeadline = new Date(financeDeadline.getTime() + dayMs);

  return [
    {
      stage: "hr_review",
      approver: approvers.hr,
      order: 0,
      deadline: hrDeadline,
      status: "pending",
    },
    {
      stage: "finance_approval",
      approver: approvers.finance,
      order: 1,
      deadline: financeDeadline,
      status: "pending",
    },
    {
      stage: "management_signoff",
      approver: approvers.management,
      order: 2,
      deadline: managementDeadline,
      status: "pending",
    },
  ];
}

/**
 * @param {string} type
 */
export function assertWorkflowType(type) {
  if (!WORKFLOW_TYPES.includes(type)) {
    throw new Error(
      `Invalid workflow type (expected one of: ${WORKFLOW_TYPES.join(", ")})`
    );
  }
}
