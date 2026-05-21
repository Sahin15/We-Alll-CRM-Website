import PurchaseRequest from '../models/purchaseRequestModel.js';
import { generateNumber } from '../services/procurementNumberService.js';
import { checkBudget, getFinancialYear } from '../services/procurementBudgetService.js';
import NotificationService from '../services/notificationService.js';
import User from '../models/userModel.js';
import Department from '../models/departmentModel.js';

// Helper: get current financial year string e.g. "2025-2026"
function currentFinancialYear() {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  return month >= 4 ? `${year}-${year + 1}` : `${year - 1}-${year}`;
}

// Helper: populate PR via query (Query.populate chains correctly; Document.populate returns a Promise)
async function fetchPopulatedPR(prId) {
  return PurchaseRequest.findById(prId)
    .populate('requestedBy', 'name email employeeId profilePicture')
    .populate('department', 'name')
    .populate('project', 'name');
}

async function safeSendNotification(fn) {
  try {
    await fn();
  } catch (error) {
    console.error('PR notification error:', error.message);
  }
}

// POST /purchase-requests — create draft PR
export const createPR = async (req, res) => {
  try {
    const { items, justification, department, project, title, description, priority, requiredByDate } = req.body;

    // Validate required fields
    const errors = [];
    if (!title) errors.push('title: required');
    if (!items || !Array.isArray(items) || items.length === 0) errors.push('items: at least one item is required');
    if (!justification) errors.push('justification: required');
    if (!department) errors.push('department: required');

    if (items) {
      items.forEach((item, i) => {
        if (!item.itemName) errors.push(`items[${i}].itemName: required`);
        if (!item.quantity || item.quantity < 1) errors.push(`items[${i}].quantity: must be >= 1`);
        if (item.estimatedUnitPrice === undefined || item.estimatedUnitPrice < 0) errors.push(`items[${i}].estimatedUnitPrice: required`);
        if (!item.category) errors.push(`items[${i}].category: required`);
      });
    }

    if (errors.length > 0) return res.status(400).json({ message: 'Validation failed', errors });

    const estimatedTotalCost = items.reduce((sum, item) => sum + (item.quantity * item.estimatedUnitPrice), 0);
    const prNumber = await generateNumber('PR');
    const financialYear = currentFinancialYear();

    const pr = await PurchaseRequest.create({
      prNumber,
      title,
      description: description || '',
      priority: priority || 'medium',
      requiredByDate: requiredByDate || null,
      requestedBy: req.user._id,
      department,
      project: project || null,
      items,
      estimatedTotalCost,
      justification,
      status: 'draft',
      financialYear,
      auditLog: [{
        previousStatus: null,
        newStatus: 'draft',
        changedBy: req.user._id,
        comments: 'PR created',
      }],
    });

    const populatedPR = await fetchPopulatedPR(pr._id);

    res.status(201).json({ 
      success: true,
      message: 'Purchase request created', 
      data: populatedPR 
    });
  } catch (error) {
    console.error('createPR error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error', 
      error: error.message 
    });
  }
};

// GET /purchase-requests — list (filtered by role)
export const listPRs = async (req, res) => {
  try {
    const { status, financialYear } = req.query;
    const query = {};

    if (status) query.status = status;
    if (financialYear) query.financialYear = financialYear;

    const role = req.user.role;
    if (role === 'employee' || role === 'hr' || role === 'manager') {
      // Employees see only their own PRs
      query.requestedBy = req.user._id;
    } else if (role === 'hod') {
      // HoD sees all PRs from their department
      const dept = await Department.findOne({ head: req.user._id });
      if (dept) {
        query.department = dept._id;
      } else {
        query.requestedBy = req.user._id;
      }
    }
    // admin, superadmin, accounts see all

    const prs = await PurchaseRequest.find(query)
      .populate('requestedBy', 'name email employeeId profilePicture')
      .populate('department', 'name')
      .populate('project', 'name')
      .sort({ createdAt: -1 });

    res.json({ 
      success: true,
      message: 'Purchase requests retrieved',
      data: prs 
    });
  } catch (error) {
    res.status(500).json({ 
      success: false,
      message: 'Server error', 
      error: error.message 
    });
  }
};

// GET /purchase-requests/:id
export const getPR = async (req, res) => {
  try {
    const pr = await PurchaseRequest.findById(req.params.id)
      .populate('requestedBy', 'name email employeeId department profilePicture')
      .populate('department', 'name')
      .populate('project', 'name')
      .populate('hodApproval.approver', 'name email profilePicture')
      .populate('adminApproval.approver', 'name email profilePicture')
      .populate('auditLog.changedBy', 'name email profilePicture');

    if (!pr) return res.status(404).json({ 
      success: false,
      message: 'Purchase request not found' 
    });

    // Access control
    const role = req.user.role;
    const userId = req.user._id.toString();
    if (role === 'employee' || role === 'hr' || role === 'manager') {
      if (pr.requestedBy._id.toString() !== userId) {
        return res.status(403).json({ 
          success: false,
          message: 'Access denied' 
        });
      }
    } else if (role === 'hod') {
      const dept = await Department.findOne({ head: req.user._id });
      const prDeptId = pr.department._id?.toString() || pr.department.toString();
      if (!dept || dept._id.toString() !== prDeptId) {
        if (pr.requestedBy._id.toString() !== userId) {
          return res.status(403).json({ 
            success: false,
            message: 'Access denied' 
          });
        }
      }
    }

    res.json({ 
      success: true,
      message: 'Purchase request retrieved',
      data: pr 
    });
  } catch (error) {
    res.status(500).json({ 
      success: false,
      message: 'Server error', 
      error: error.message 
    });
  }
};

// PATCH /purchase-requests/:id — edit draft PR
export const updatePR = async (req, res) => {
  try {
    const pr = await PurchaseRequest.findById(req.params.id);
    if (!pr) return res.status(404).json({ 
      success: false,
      message: 'Purchase request not found' 
    });
    if (pr.requestedBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ 
        success: false,
        message: 'Only the requestor can edit this PR' 
      });
    }
    if (pr.status !== 'draft') {
      return res.status(403).json({ 
        success: false,
        message: 'Only draft PRs can be edited' 
      });
    }

    const { items, justification, department, project, title, description, priority, requiredByDate } = req.body;
    if (title) pr.title = title;
    if (description !== undefined) pr.description = description;
    if (priority) pr.priority = priority;
    if (requiredByDate !== undefined) pr.requiredByDate = requiredByDate || null;
    if (items) {
      pr.items = items;
      pr.estimatedTotalCost = items.reduce((sum, item) => sum + (item.quantity * item.estimatedUnitPrice), 0);
    }
    if (justification) pr.justification = justification;
    if (department) pr.department = department;
    if (project !== undefined) pr.project = project || null;

    await pr.save();
    const populatedPR = await fetchPopulatedPR(pr._id);

    res.json({ 
      success: true,
      message: 'Purchase request updated', 
      data: populatedPR 
    });
  } catch (error) {
    res.status(500).json({ 
      success: false,
      message: 'Server error', 
      error: error.message 
    });
  }
};

// DELETE /purchase-requests/:id — delete draft PR
export const deletePR = async (req, res) => {
  try {
    const pr = await PurchaseRequest.findById(req.params.id);
    if (!pr) return res.status(404).json({ 
      success: false,
      message: 'Purchase request not found' 
    });
    if (pr.requestedBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ 
        success: false,
        message: 'Only the requestor can delete this PR' 
      });
    }
    if (pr.status !== 'draft') {
      return res.status(403).json({ 
        success: false,
        message: 'Only draft PRs can be deleted' 
      });
    }
    await PurchaseRequest.findByIdAndDelete(req.params.id);
    res.json({ 
      success: true,
      message: 'Purchase request deleted' 
    });
  } catch (error) {
    res.status(500).json({ 
      success: false,
      message: 'Server error', 
      error: error.message 
    });
  }
};

// PATCH /purchase-requests/:id/submit — submit for approval
export const submitPR = async (req, res) => {
  try {
    const { overrideAcknowledged } = req.body;
    const pr = await PurchaseRequest.findById(req.params.id).populate('department');
    if (!pr) return res.status(404).json({ 
      success: false,
      message: 'Purchase request not found' 
    });
    if (pr.requestedBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ 
        success: false,
        message: 'Only the requestor can submit this PR' 
      });
    }
    if (pr.status !== 'draft') {
      return res.status(400).json({ 
        success: false,
        message: 'Only draft PRs can be submitted' 
      });
    }

    // Budget check
    const fy = pr.financialYear;
    const budgetResult = await checkBudget(pr.department._id, pr.project, fy, pr.estimatedTotalCost);
    pr.budgetCheckResult = {
      availableBudget: budgetResult.available,
      estimatedCost: pr.estimatedTotalCost,
      exceeded: budgetResult.exceeded,
      overrideAcknowledged: !!overrideAcknowledged,
    };

    if (budgetResult.exceeded && !overrideAcknowledged) {
      await pr.save(); // save budget check result
      return res.status(200).json({
        success: false,
        budgetWarning: true,
        message: `Estimated cost (₹${pr.estimatedTotalCost}) exceeds available budget (₹${budgetResult.available}). Set overrideAcknowledged: true to proceed.`,
        availableBudget: budgetResult.available,
        estimatedCost: pr.estimatedTotalCost,
        noBudget: budgetResult.noBudget,
      });
    }

    // Find HoD of the department
    const dept = await Department.findById(pr.department._id || pr.department);
    const hodUser = dept?.head ? await User.findById(dept.head) : null;

    const previousStatus = pr.status;

    if (!hodUser) {
      // No HoD — route directly to admin
      pr.status = 'pending_admin';
      pr.auditLog.push({ previousStatus, newStatus: 'pending_admin', changedBy: req.user._id, comments: 'No HoD found — routed to admin' });
      await pr.save();

      // Notify admin/accounts
      const admins = await User.find({ role: { $in: ['admin', 'superadmin', 'accounts'] }, status: 'active' }).select('_id');
      if (admins.length > 0) {
        await safeSendNotification(() => NotificationService.sendToMultiple(
          admins.map(a => a._id),
          '📋 New Purchase Request (No HoD)',
          `${req.user.name} submitted PR ${pr.prNumber} — no HoD assigned, requires your approval`,
          { type: 'procurement_pr_submitted', data: { prId: pr._id.toString(), prNumber: pr.prNumber }, actionUrl: `/procurement/purchase-requests/${pr._id}`, senderId: req.user._id }
        ));
      }
    } else {
      pr.status = 'pending_hod';
      pr.auditLog.push({ previousStatus, newStatus: 'pending_hod', changedBy: req.user._id, comments: 'Submitted for HoD approval' });
      await pr.save();

      // Notify HoD
      await safeSendNotification(() => NotificationService.sendToUser(
        hodUser._id,
        '📋 Purchase Request Awaiting Your Approval',
        `${req.user.name} submitted PR ${pr.prNumber} for approval`,
        { type: 'procurement_pr_submitted', data: { prId: pr._id.toString(), prNumber: pr.prNumber }, actionUrl: `/procurement/purchase-requests/${pr._id}`, senderId: req.user._id }
      ));
    }

    const populatedPR = await fetchPopulatedPR(pr._id);

    res.json({ 
      success: true,
      message: 'Purchase request submitted for approval', 
      data: populatedPR 
    });
  } catch (error) {
    console.error('submitPR error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error', 
      error: error.message 
    });
  }
};

// PATCH /purchase-requests/:id/approve
export const approvePR = async (req, res) => {
  try {
    const { comments } = req.body;
    const pr = await PurchaseRequest.findById(req.params.id).populate('requestedBy', 'name email _id').populate('department');
    if (!pr) return res.status(404).json({ 
      success: false,
      message: 'Purchase request not found' 
    });

    const role = req.user.role;
    const previousStatus = pr.status;

    if (pr.status === 'pending_hod' && role === 'hod') {
      pr.hodApproval = { approver: req.user._id, action: 'approved', comments, timestamp: new Date() };
      pr.status = 'pending_admin';
      pr.auditLog.push({ previousStatus, newStatus: 'pending_admin', changedBy: req.user._id, comments });
      await pr.save();

      // Notify admin/accounts
      const admins = await User.find({ role: { $in: ['admin', 'superadmin', 'accounts'] }, status: 'active' }).select('_id');
      if (admins.length > 0) {
        await safeSendNotification(() => NotificationService.sendToMultiple(
          admins.map(a => a._id),
          '📋 Purchase Request Approved by HoD',
          `PR ${pr.prNumber} approved by HoD — awaiting your final approval`,
          { type: 'procurement_pr_hod_approved', data: { prId: pr._id.toString(), prNumber: pr.prNumber }, actionUrl: `/procurement/purchase-requests/${pr._id}`, senderId: req.user._id }
        ));
      }
      const populatedPR = await fetchPopulatedPR(pr._id);
      return res.json({ 
        success: true,
        message: 'PR approved by HoD, forwarded to Admin', 
        data: populatedPR 
      });
    }

    if (pr.status === 'pending_admin' && ['admin', 'superadmin', 'accounts'].includes(role)) {
      pr.adminApproval = { approver: req.user._id, action: 'approved', comments, timestamp: new Date() };
      pr.status = 'approved';
      pr.auditLog.push({ previousStatus, newStatus: 'approved', changedBy: req.user._id, comments });
      await pr.save();

      // Notify requestor
      await safeSendNotification(() => NotificationService.sendToUser(
        pr.requestedBy._id,
        '✅ Purchase Request Approved',
        `Your PR ${pr.prNumber} has been approved`,
        { type: 'procurement_pr_approved', data: { prId: pr._id.toString(), prNumber: pr.prNumber }, actionUrl: `/procurement/purchase-requests/${pr._id}`, senderId: req.user._id }
      ));
      const populatedPR = await fetchPopulatedPR(pr._id);
      return res.json({ 
        success: true,
        message: 'PR fully approved', 
        data: populatedPR 
      });
    }

    return res.status(403).json({ 
      success: false,
      message: 'You are not authorised to approve this PR in its current status' 
    });
  } catch (error) {
    res.status(500).json({ 
      success: false,
      message: 'Server error', 
      error: error.message 
    });
  }
};

// PATCH /purchase-requests/:id/reject
export const rejectPR = async (req, res) => {
  try {
    const { comments } = req.body;
    if (!comments || !comments.trim()) {
      return res.status(400).json({ 
        success: false,
        message: 'Rejection reason (comments) is required' 
      });
    }

    const pr = await PurchaseRequest.findById(req.params.id).populate('requestedBy', 'name email _id');
    if (!pr) return res.status(404).json({ 
      success: false,
      message: 'Purchase request not found' 
    });

    const role = req.user.role;
    const previousStatus = pr.status;

    const canReject =
      (pr.status === 'pending_hod' && role === 'hod') ||
      (pr.status === 'pending_admin' && ['admin', 'superadmin', 'accounts'].includes(role));

    if (!canReject) {
      return res.status(403).json({ 
        success: false,
        message: 'You are not authorised to reject this PR in its current status' 
      });
    }

    if (pr.status === 'pending_hod') {
      pr.hodApproval = { approver: req.user._id, action: 'rejected', comments, timestamp: new Date() };
    } else {
      pr.adminApproval = { approver: req.user._id, action: 'rejected', comments, timestamp: new Date() };
    }

    pr.status = 'rejected';
    pr.auditLog.push({ previousStatus, newStatus: 'rejected', changedBy: req.user._id, comments });
    await pr.save();

    // Notify requestor
    await safeSendNotification(() => NotificationService.sendToUser(
      pr.requestedBy._id,
      '❌ Purchase Request Rejected',
      `Your PR ${pr.prNumber} has been rejected: ${comments}`,
      { type: 'procurement_pr_rejected', data: { prId: pr._id.toString(), prNumber: pr.prNumber, reason: comments }, actionUrl: `/procurement/purchase-requests/${pr._id}`, senderId: req.user._id }
    ));

    const populatedPR = await fetchPopulatedPR(pr._id);

    res.json({ 
      success: true,
      message: 'Purchase request rejected', 
      data: populatedPR 
    });
  } catch (error) {
    res.status(500).json({ 
      success: false,
      message: 'Server error', 
      error: error.message 
    });
  }
};
