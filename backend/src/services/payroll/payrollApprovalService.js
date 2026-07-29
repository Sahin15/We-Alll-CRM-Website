import mongoose from "mongoose";
import ApprovalWorkflow from "../../models/approvalWorkflowModel.js";
import SalarySlip from "../../models/salarySlipModel.js";
import User from "../../models/userModel.js";
import {
  assertApprovalAction,
  assertCanActOnCurrentStage,
  assertWorkflowType,
  buildStandardStages,
} from "./payrollApprovalHelpers.js";

/**
 * Resolve default stage approvers by role, or use explicit IDs.
 * @param {{ hr?: string, finance?: string, management?: string }} [explicit]
 */
export async function resolveStageApprovers(explicit = {}) {
  if (explicit.hr && explicit.finance && explicit.management) {
    return {
      hr: explicit.hr,
      finance: explicit.finance,
      management: explicit.management,
    };
  }

  const [hr, finance, management] = await Promise.all([
    User.findOne({ role: "hr", status: "active" }).select("_id"),
    User.findOne({
      role: { $in: ["accounts", "admin"] },
      status: "active",
    }).select("_id"),
    User.findOne({
      role: { $in: ["admin", "superadmin"] },
      status: "active",
    }).select("_id"),
  ]);

  if (!hr || !finance || !management) {
    throw new Error(
      "Required approvers not found (need active hr, accounts/admin, admin/superadmin). Pass approvers explicitly."
    );
  }

  return {
    hr: explicit.hr || hr._id,
    finance: explicit.finance || finance._id,
    management: explicit.management || management._id,
  };
}

/**
 * Create a payroll approval workflow for one or more salary slips.
 */
export async function initiatePayrollApproval({
  salarySlipIds,
  initiatedBy,
  type = "salary_approval",
  approvers: explicitApprovers,
  bulkCriteria,
}) {
  assertWorkflowType(type);

  if (!Array.isArray(salarySlipIds) || salarySlipIds.length === 0) {
    throw new Error("salarySlipIds must be a non-empty array");
  }

  const validIds = salarySlipIds.filter((id) =>
    mongoose.Types.ObjectId.isValid(id)
  );
  if (validIds.length !== salarySlipIds.length) {
    throw new Error("One or more salarySlipIds are invalid");
  }

  const slips = await SalarySlip.find({ _id: { $in: validIds } }).select(
    "_id status approvalWorkflowId"
  );
  if (slips.length !== validIds.length) {
    throw new Error("One or more salary slips were not found");
  }

  const alreadyLinked = slips.filter((s) => s.approvalWorkflowId);
  if (alreadyLinked.length > 0) {
    throw new Error(
      `${alreadyLinked.length} salary slip(s) already have an approval workflow`
    );
  }

  const approvers = await resolveStageApprovers(explicitApprovers || {});
  const stages = buildStandardStages(approvers);

  const workflow = new ApprovalWorkflow({
    type,
    salarySlips: validIds,
    stages,
    initiatedBy,
    overallStatus: "in_progress",
    bulkCriteria: bulkCriteria || undefined,
    auditTrail: [
      {
        action: "workflow_initiated",
        performedBy: initiatedBy,
        details: {
          salarySlipCount: validIds.length,
          type,
        },
      },
    ],
  });

  await workflow.save();

  await SalarySlip.updateMany(
    { _id: { $in: validIds } },
    { approvalWorkflowId: workflow._id }
  );

  return workflow;
}

/**
 * Approve or reject the current stage.
 */
export async function actOnPayrollApproval({
  workflowId,
  userId,
  action,
  comments = "",
}) {
  assertApprovalAction(action);

  const workflow = await ApprovalWorkflow.findById(workflowId);
  if (!workflow) {
    throw new Error("Approval workflow not found");
  }

  // Pre-validate (clearer API errors); model method also enforces
  assertCanActOnCurrentStage(workflow, userId);

  return workflow.processApproval(userId, action, comments);
}

/**
 * Bulk-approve remaining stages (privileged shortcut).
 */
export async function bulkApprovePayrollWorkflow({
  workflowId,
  userId,
  comments = "Bulk approved",
}) {
  const workflow = await ApprovalWorkflow.findById(workflowId);
  if (!workflow) {
    throw new Error("Approval workflow not found");
  }
  if (workflow.overallStatus !== "in_progress") {
    throw new Error("Workflow is not in progress");
  }
  return workflow.bulkApprove(userId, comments);
}
