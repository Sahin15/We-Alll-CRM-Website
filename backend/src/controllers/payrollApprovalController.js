import ApprovalWorkflow from "../models/approvalWorkflowModel.js";
import {
  initiatePayrollApproval,
  actOnPayrollApproval,
  bulkApprovePayrollWorkflow,
  getPayrollApprovalCapabilities,
} from "../services/payroll/payrollApprovalService.js";
import { BulkApproveForbiddenError } from "../services/payroll/bulkApproveGuard.js";

/**
 * GET /api/payroll/approvals/capabilities
 */
export const getApprovalCapabilities = async (req, res) => {
  try {
    return res.status(200).json({
      success: true,
      data: getPayrollApprovalCapabilities(req.user),
    });
  } catch (error) {
    console.error("Error in getApprovalCapabilities:", error);
    return res.status(500).json({
      success: false,
      message: "Server error loading approval capabilities",
    });
  }
};

/**
 * POST /api/payroll/approvals
 * Body: { salarySlipIds, type?, approvers?: { hr, finance, management }, bulkCriteria? }
 */
export const createPayrollApproval = async (req, res) => {
  try {
    const workflow = await initiatePayrollApproval({
      salarySlipIds: req.body.salarySlipIds,
      initiatedBy: req.user._id,
      type: req.body.type || "salary_approval",
      approvers: req.body.approvers,
      bulkCriteria: req.body.bulkCriteria,
    });

    await workflow.populate([
      { path: "salarySlips", select: "employee month year netSalary status" },
      { path: "initiatedBy", select: "name email" },
      { path: "stages.approver", select: "name email role" },
    ]);

    return res.status(201).json({
      success: true,
      message: "Payroll approval workflow created",
      data: workflow,
    });
  } catch (error) {
    console.error("Error in createPayrollApproval:", error);
    const status = /not found|invalid|already|required|empty/i.test(error.message)
      ? 400
      : 500;
    return res.status(status).json({
      success: false,
      message: error.message || "Server error creating approval workflow",
    });
  }
};

/**
 * GET /api/payroll/approvals
 */
export const listPayrollApprovals = async (req, res) => {
  try {
    const filter = {};
    if (req.query.status) {
      filter.overallStatus = req.query.status;
    }
    if (req.query.type) {
      filter.type = req.query.type;
    }

    const workflows = await ApprovalWorkflow.find(filter)
      .sort({ createdAt: -1 })
      .limit(Math.min(Number(req.query.limit) || 50, 200))
      .populate("salarySlips", "employee month year netSalary status")
      .populate("initiatedBy", "name email")
      .populate("stages.approver", "name email role")
      .lean({ virtuals: true });

    return res.status(200).json({ success: true, data: workflows });
  } catch (error) {
    console.error("Error in listPayrollApprovals:", error);
    return res.status(500).json({
      success: false,
      message: "Server error listing approval workflows",
    });
  }
};

/**
 * GET /api/payroll/approvals/pending/mine
 */
export const listMyPendingApprovals = async (req, res) => {
  try {
    const workflows = await ApprovalWorkflow.getPendingApprovals(req.user._id);
    return res.status(200).json({ success: true, data: workflows });
  } catch (error) {
    console.error("Error in listMyPendingApprovals:", error);
    return res.status(500).json({
      success: false,
      message: "Server error fetching pending approvals",
    });
  }
};

/**
 * GET /api/payroll/approvals/:id
 */
export const getPayrollApprovalById = async (req, res) => {
  try {
    const workflow = await ApprovalWorkflow.findById(req.params.id)
      .populate("salarySlips")
      .populate("initiatedBy", "name email")
      .populate("stages.approver", "name email role");

    if (!workflow) {
      return res.status(404).json({
        success: false,
        message: "Approval workflow not found",
      });
    }

    return res.status(200).json({ success: true, data: workflow });
  } catch (error) {
    console.error("Error in getPayrollApprovalById:", error);
    return res.status(500).json({
      success: false,
      message: "Server error fetching approval workflow",
    });
  }
};

/**
 * POST /api/payroll/approvals/:id/act
 * Body: { action: "approved"|"rejected", comments? }
 */
export const actOnApproval = async (req, res) => {
  try {
    const workflow = await actOnPayrollApproval({
      workflowId: req.params.id,
      userId: req.user._id,
      action: req.body.action,
      comments: req.body.comments || "",
    });

    await workflow.populate([
      { path: "salarySlips", select: "employee month year netSalary status" },
      { path: "stages.approver", select: "name email role" },
    ]);

    return res.status(200).json({
      success: true,
      message: `Stage ${req.body.action}`,
      data: workflow,
    });
  } catch (error) {
    console.error("Error in actOnApproval:", error);
    const status = /Unauthorized|not found|already|awaiting|Invalid/i.test(
      error.message
    )
      ? 400
      : 500;
    return res.status(status).json({
      success: false,
      message: error.message || "Server error processing approval",
    });
  }
};

/**
 * POST /api/payroll/approvals/:id/bulk-approve
 * Body: { comments, confirmBypass: true } — PH-13 restricted bypass
 */
export const bulkApproveApproval = async (req, res) => {
  try {
    const workflow = await bulkApprovePayrollWorkflow({
      workflowId: req.params.id,
      userId: req.user._id,
      user: req.user,
      comments: req.body.comments || "",
      confirmBypass: req.body.confirmBypass === true,
    });

    return res.status(200).json({
      success: true,
      message: "Workflow bulk-approved",
      data: workflow,
    });
  } catch (error) {
    if (error instanceof BulkApproveForbiddenError || error?.code?.startsWith?.("BULK_APPROVE")) {
      return res.status(error.httpStatus || 403).json({
        success: false,
        message: error.message,
        code: error.code || "BULK_APPROVE_FORBIDDEN",
        details: error.details || {},
      });
    }
    console.error("Error in bulkApproveApproval:", error);
    const status = /not found|not in progress/i.test(error.message) ? 400 : 500;
    return res.status(status).json({
      success: false,
      message: error.message || "Server error bulk-approving workflow",
    });
  }
};
