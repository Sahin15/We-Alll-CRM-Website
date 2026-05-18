import Expense from "../models/expenseModel.js";
import User from "../models/userModel.js";
import Budget from "../models/budgetModel.js";
import XLSX from "xlsx";
import NotificationService from "../services/notificationService.js";
import { getCurrentFinancialYear, getFinancialYearForDate, getFinancialYearDateRange, getFinancialYears as getFinancialYearsUtil } from "../utils/financialYear.js";
import { formatDate, formatDateTime, formatCurrency, formatCurrencyWithSymbol } from "../utils/dateFormatter.js";
import { asyncHandler, sendSuccess, sendError, sendValidationError, sendPaginatedSuccess } from "../middleware/errorHandler.js";
import { validatePositiveAmount, validateNotFutureDate, validateRequiredFields, validatePendingStatus } from "../utils/validators.js";

// Create a new expense
export const createExpense = asyncHandler(async (req, res) => {
  const { expensePurpose, expenseType, amount, currency, date, description, merchant, project, client, paymentMethod, notes, tags, receiptUrl, receiptFileName } = req.body;

  // Validation
  const requiredValidation = validateRequiredFields(
    { expensePurpose, expenseType, amount, date, description, paymentMethod },
    ['expensePurpose', 'expenseType', 'amount', 'date', 'description', 'paymentMethod']
  );
  if (!requiredValidation.valid) {
    return sendValidationError(res, requiredValidation.message);
  }

  const amountValidation = validatePositiveAmount(amount);
  if (!amountValidation.valid) {
    return sendValidationError(res, amountValidation.message);
  }

  // Check if receipt is required for amounts >= 500
  if (amount >= 500 && !receiptUrl) {
    return sendValidationError(res, "Receipt is required for expenses of ₹500 or more");
  }

  const dateValidation = validateNotFutureDate(date);
  if (!dateValidation.valid) {
    return sendValidationError(res, dateValidation.message);
  }

  const expense = await Expense.create({
    employee: req.user._id,
    expensePurpose,
    expenseType,
    amount,
    currency: currency || "INR",
    date: new Date(date),
    description,
    merchant: merchant || null,
    project: project || null,
    client: client || null,
    paymentMethod,
    notes: notes || null,
    tags: tags || [],
    receiptUrl: receiptUrl || null,
    receiptFileName: receiptFileName || null,
  });

  // Populate references
  await expense.populate("employee", "name email");
  if (project) await expense.populate("project", "name");
  if (client) await expense.populate("client", "name");

  // Notify admins/hr that a new expense was submitted for review
  try {
    const submitter = await User.findById(req.user._id).select('name');
    const submitterName = submitter?.name || 'Employee';
    const reviewers = await User.find({ role: { $in: ['admin', 'hr', 'superadmin'] } }).select('_id');
    for (const reviewer of reviewers) {
      await NotificationService.sendToUser(
        reviewer._id,
        '🧾 Expense Submitted for Review',
        `${submitterName} submitted an expense of ${formatCurrencyWithSymbol(amount)} for review`,
        {
          type: 'expense_submitted',
          data: { expenseId: expense._id.toString(), amount, expensePurpose, expenseType },
          actionUrl: '/expenses/approvals',
          senderId: req.user._id,
        }
      );
    }
  } catch (notificationError) {
    // Silently fail notification
  }

  sendSuccess(res, expense, "Expense created successfully", 201);
});

// Get my expenses (employee's own expenses)
export const getMyExpenses = asyncHandler(async (req, res) => {
  const { status, expensePurpose, expenseType, startDate, endDate, page = 1, limit = 10 } = req.query;

  const query = { employee: req.user._id };

  if (status) query.status = status;
  if (expensePurpose) query.expensePurpose = expensePurpose;
  if (expenseType) query.expenseType = expenseType;

  if (startDate || endDate) {
    query.date = {};
    if (startDate) query.date.$gte = new Date(startDate);
    if (endDate) query.date.$lte = new Date(endDate);
  }

  const skip = (page - 1) * limit;

  const expenses = await Expense.find(query)
    .populate("employee", "name email")
    .populate("project", "name")
    .populate("client", "name")
    .populate("approvedBy", "name")
    .populate("rejectedBy", "name")
    .sort({ date: -1 })
    .skip(skip)
    .limit(parseInt(limit));

  const total = await Expense.countDocuments(query);

  sendPaginatedSuccess(res, expenses, {
    total,
    page: parseInt(page),
    limit: parseInt(limit),
    pages: Math.ceil(total / limit),
  });
});

// Get all expenses (admin/hr only)
export const getAllExpenses = asyncHandler(async (req, res) => {
  const { status, expensePurpose, expenseType, employee, startDate, endDate, page = 1, limit = 10 } = req.query;

  const query = {};

  if (status) query.status = status;
  if (expensePurpose) query.expensePurpose = expensePurpose;
  if (expenseType) query.expenseType = expenseType;
  if (employee) query.employee = employee;

  if (startDate || endDate) {
    query.date = {};
    if (startDate) query.date.$gte = new Date(startDate);
    if (endDate) query.date.$lte = new Date(endDate);
  }

  const skip = (page - 1) * limit;

  const expenses = await Expense.find(query)
    .populate("employee", "name email department")
    .populate("project", "name")
    .populate("client", "name")
    .populate("approvedBy", "name")
    .populate("rejectedBy", "name")
    .sort({ date: -1 })
    .skip(skip)
    .limit(parseInt(limit));

  const total = await Expense.countDocuments(query);

  sendPaginatedSuccess(res, expenses, {
    total,
    page: parseInt(page),
    limit: parseInt(limit),
    pages: Math.ceil(total / limit),
  });
});

// Get expense by ID
export const getExpenseById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const expense = await Expense.findById(id)
    .populate("employee", "name email department")
    .populate("project", "name")
    .populate("client", "name")
    .populate("approvedBy", "name")
    .populate("rejectedBy", "name")
    .populate("reimbursedBy", "name");

  if (!expense) {
    return sendError(res, "Expense not found", 404);
  }

  // Check authorization
  if (expense.employee._id.toString() !== req.user._id.toString() && req.user.role !== "admin" && req.user.role !== "hr" && req.user.role !== "superadmin") {
    return sendError(res, "Not authorized to view this expense", 403);
  }

  sendSuccess(res, expense);
});

// Update expense (only pending expenses)
export const updateExpense = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { expensePurpose, expenseType, amount, currency, date, description, merchant, project, client, paymentMethod, notes, tags } = req.body;

  const expense = await Expense.findById(id);

  if (!expense) {
    return sendError(res, "Expense not found", 404);
  }

  // Check authorization
  if (expense.employee.toString() !== req.user._id.toString()) {
    return sendError(res, "Not authorized to update this expense", 403);
  }

  // Only allow updating pending expenses
  const statusValidation = validatePendingStatus(expense, "Expense");
  if (!statusValidation.valid) {
    return sendValidationError(res, statusValidation.message);
  }

  // Update fields
  if (expensePurpose) expense.expensePurpose = expensePurpose;
  if (expenseType) expense.expenseType = expenseType;
  if (amount) {
    const amountValidation = validatePositiveAmount(amount);
    if (!amountValidation.valid) {
      return sendValidationError(res, amountValidation.message);
    }
    expense.amount = amount;
  }
  if (currency) expense.currency = currency;
  if (date) {
    const dateValidation = validateNotFutureDate(date);
    if (!dateValidation.valid) {
      return sendValidationError(res, dateValidation.message);
    }
    expense.date = new Date(date);
  }
  if (description) expense.description = description;
  if (merchant) expense.merchant = merchant;
  if (project) expense.project = project;
  if (client) expense.client = client;
  if (paymentMethod) expense.paymentMethod = paymentMethod;
  if (notes) expense.notes = notes;
  if (tags) expense.tags = tags;

  await expense.save();

  await expense.populate("employee", "name email");
  if (project) await expense.populate("project", "name");
  if (client) await expense.populate("client", "name");

  sendSuccess(res, expense, "Expense updated successfully");
});

// Delete expense (only pending expenses)
export const deleteExpense = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const expense = await Expense.findById(id);

  if (!expense) {
    return sendError(res, "Expense not found", 404);
  }

  // Check authorization
  if (expense.employee.toString() !== req.user._id.toString()) {
    return sendError(res, "Not authorized to delete this expense", 403);
  }

  // Only allow deleting pending expenses
  const statusValidation = validatePendingStatus(expense, "Expense");
  if (!statusValidation.valid) {
    return sendValidationError(res, statusValidation.message);
  }

  await Expense.findByIdAndDelete(id);

  sendSuccess(res, null, "Expense deleted successfully");
});

// Get expense statistics
export const getExpenseStats = asyncHandler(async (req, res) => {
  const userId = req.user._id;

  // Always filter by user ID for personal stats
  const query = { employee: userId };

  const [total, pending, approved, rejected, reimbursed] = await Promise.all([
    Expense.countDocuments(query),
    Expense.countDocuments({ ...query, status: "pending" }),
    Expense.countDocuments({ ...query, status: "approved" }),
    Expense.countDocuments({ ...query, status: "rejected" }),
    Expense.countDocuments({ ...query, status: "reimbursed" }),
  ]);

  const totalAmount = await Expense.aggregate([
    { $match: query },
    { $group: { _id: null, total: { $sum: "$amount" } } },
  ]);

  const approvedAmount = await Expense.aggregate([
    { $match: { ...query, status: "approved" } },
    { $group: { _id: null, total: { $sum: "$amount" } } },
  ]);

  sendSuccess(res, {
    total,
    pending,
    approved,
    rejected,
    reimbursed,
    totalAmount: totalAmount[0]?.total || 0,
    approvedAmount: approvedAmount[0]?.total || 0,
  });
});

// Approve expense (admin/hr only)
export const approveExpense = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { comments } = req.body;

  // Check authorization
  if (req.user.role !== "admin" && req.user.role !== "hr" && req.user.role !== "superadmin") {
    return sendError(res, "Not authorized to approve expenses", 403);
  }

  const expense = await Expense.findById(id);

  if (!expense) {
    return sendError(res, "Expense not found", 404);
  }

  // Only allow approving pending expenses
  const statusValidation = validatePendingStatus(expense, "Expense");
  if (!statusValidation.valid) {
    return sendValidationError(res, statusValidation.message);
  }

  expense.status = "approved";
  expense.approvedBy = req.user._id;
  expense.approvalDate = new Date();
  if (comments) expense.approvalComments = comments;

  await expense.save();

  // Send notification to employee
  try {
    await NotificationService.sendToUser(
      expense.employee,
      '💰 Expense Approved',
      `Your expense of ${formatCurrencyWithSymbol(expense.amount)} has been approved`,
      {
        type: 'expense_approval',
        data: { expenseId: expense._id.toString(), amount: expense.amount },
        actionUrl: '/expenses/my-expenses',
        senderId: req.user._id,
      }
    );
  } catch (notificationError) {
    // Silently fail notification
  }

  await expense.populate("employee", "name email");
  await expense.populate("approvedBy", "name");
  if (expense.project) await expense.populate("project", "name");
  if (expense.client) await expense.populate("client", "name");

  sendSuccess(res, expense, "Expense approved successfully");
});

// Reject expense (admin/hr only)
export const rejectExpense = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { reason } = req.body;

  // Check authorization
  if (req.user.role !== "admin" && req.user.role !== "hr" && req.user.role !== "superadmin") {
    return sendError(res, "Not authorized to reject expenses", 403);
  }

  if (!reason) {
    return sendValidationError(res, "Please provide a rejection reason");
  }

  const expense = await Expense.findById(id);

  if (!expense) {
    return sendError(res, "Expense not found", 404);
  }

  // Only allow rejecting pending expenses
  const statusValidation = validatePendingStatus(expense, "Expense");
  if (!statusValidation.valid) {
    return sendValidationError(res, statusValidation.message);
  }

  expense.status = "rejected";
  expense.rejectedBy = req.user._id;
  expense.rejectionDate = new Date();
  expense.rejectionReason = reason;

  await expense.save();

  // Send notification to employee
  try {
    await NotificationService.sendToUser(
      expense.employee,
      '❌ Expense Rejected',
      `Your expense of ${formatCurrencyWithSymbol(expense.amount)} has been rejected`,
      {
        type: 'expense_rejection',
        data: { expenseId: expense._id.toString(), reason },
        actionUrl: '/expenses/my-expenses',
        senderId: req.user._id,
      }
    );
  } catch (notificationError) {
    // Silently fail notification
  }

  await expense.populate("employee", "name email");
  await expense.populate("rejectedBy", "name");
  if (expense.project) await expense.populate("project", "name");
  if (expense.client) await expense.populate("client", "name");

  sendSuccess(res, expense, "Expense rejected successfully");
});

// Mark expense as reimbursed (admin/hr only)
export const markAsReimbursed = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { reimbursementDate, method } = req.body;

  // Check authorization
  if (req.user.role !== "admin" && req.user.role !== "hr" && req.user.role !== "superadmin") {
    return sendError(res, "Not authorized to mark expenses as reimbursed", 403);
  }

  const expense = await Expense.findById(id);

  if (!expense) {
    return sendError(res, "Expense not found", 404);
  }

  // Only allow marking approved expenses as reimbursed
  if (expense.status !== "approved") {
    return sendValidationError(res, "Can only mark approved expenses as reimbursed");
  }

  expense.status = "reimbursed";
  expense.reimbursedBy = req.user._id;
  expense.reimbursementDate = reimbursementDate ? new Date(reimbursementDate) : new Date();
  if (method) expense.reimbursementMethod = method;

  await expense.save();

  // Notify employee that their expense has been reimbursed
  try {
    await NotificationService.sendToUser(
      expense.employee,
      '💸 Expense Reimbursed',
      `Your expense of ${formatCurrencyWithSymbol(expense.amount)} has been reimbursed`,
      {
        type: 'expense_reimbursed',
        data: { expenseId: expense._id.toString(), amount: expense.amount },
        actionUrl: '/expenses/my-expenses',
        senderId: req.user._id,
      }
    );
  } catch (notificationError) {
    // Silently fail notification
  }

  await expense.populate("employee", "name email");
  await expense.populate("reimbursedBy", "name");
  if (expense.project) await expense.populate("project", "name");
  if (expense.client) await expense.populate("client", "name");

  sendSuccess(res, expense, "Expense marked as reimbursed successfully");
});

// Get reimbursement tracking (admin/hr only)
export const getReimbursementTracking = asyncHandler(async (req, res) => {
  const { startDate, endDate, employee, page = 1, limit = 10 } = req.query;

  if (req.user.role !== "admin" && req.user.role !== "hr" && req.user.role !== "superadmin") {
    return sendError(res, "Not authorized", 403);
  }

  const query = { status: "reimbursed" };

  if (employee) query.employee = employee;

  if (startDate || endDate) {
    query.reimbursementDate = {};
    if (startDate) query.reimbursementDate.$gte = new Date(startDate);
    if (endDate) query.reimbursementDate.$lte = new Date(endDate);
  }

  const skip = (page - 1) * limit;

  const expenses = await Expense.find(query)
    .populate("employee", "name email department")
    .populate("reimbursedBy", "name")
    .sort({ reimbursementDate: -1 })
    .skip(skip)
    .limit(parseInt(limit));

  const total = await Expense.countDocuments(query);

  const totalReimbursed = await Expense.aggregate([
    { $match: query },
    { $group: { _id: null, total: { $sum: "$amount" } } },
  ]);
  sendPaginatedSuccess(res, expenses, {
    total,
    page: parseInt(page),
    limit: parseInt(limit),
    pages: Math.ceil(total / limit),
    totalReimbursed: totalReimbursed[0]?.total || 0,
  });
});

// Search expenses (advanced search)
export const searchExpenses = asyncHandler(async (req, res) => {
  const { query, filters = {}, page = 1, limit = 10 } = req.body;
  const userId = req.user._id;
  const isAdmin = req.user.role === "admin" || req.user.role === "hr" || req.user.role === "superadmin" || req.user.role === "manager";

  // Build the search query with proper $and logic
  const andConditions = [];
  
  // Add role-based filter
  if (!isAdmin) {
    andConditions.push({ employee: userId });
  }

  // Text search - if query is provided, search in multiple fields
  if (query && query.trim()) {
    // First, try to find employees matching the search query
    const matchingUsers = await User.find({
      $or: [
        { name: { $regex: query, $options: "i" } },
        { email: { $regex: query, $options: "i" } }
      ]
    }).select("_id name email");
    
    const matchingUserIds = matchingUsers.map(user => user._id);

    // Search in expense fields AND employee names
    const textSearchConditions = [
      { description: { $regex: query, $options: "i" } },
      { merchant: { $regex: query, $options: "i" } },
      { notes: { $regex: query, $options: "i" } },
    ];

    // Add employee ID match if we found matching users
    if (matchingUserIds.length > 0) {
      textSearchConditions.push({ employee: { $in: matchingUserIds } });
    }

    andConditions.push({ $or: textSearchConditions });
  }

  // Apply filters
  if (filters && Object.keys(filters).length > 0) {
    if (filters.status) andConditions.push({ status: filters.status });
    if (filters.expensePurpose) andConditions.push({ expensePurpose: filters.expensePurpose });
    if (filters.expenseType) andConditions.push({ expenseType: filters.expenseType });
    
    if (filters.minAmount || filters.maxAmount) {
      const amountCondition = {};
      if (filters.minAmount) amountCondition.$gte = filters.minAmount;
      if (filters.maxAmount) amountCondition.$lte = filters.maxAmount;
      andConditions.push({ amount: amountCondition });
    }
    
    if (filters.startDate || filters.endDate) {
      const dateCondition = {};
      if (filters.startDate) dateCondition.$gte = new Date(filters.startDate);
      if (filters.endDate) dateCondition.$lte = new Date(filters.endDate);
      andConditions.push({ date: dateCondition });
    }
    
    if (filters.paymentMethod) andConditions.push({ paymentMethod: filters.paymentMethod });
  }

  // Build final query
  const searchQuery = andConditions.length > 0 ? { $and: andConditions } : {};

  const skip = (page - 1) * limit;

  const expenses = await Expense.find(searchQuery)
    .populate("employee", "name email")
    .populate("project", "name")
    .populate("client", "name")
    .sort({ date: -1 })
    .skip(skip)
    .limit(parseInt(limit));

  const total = await Expense.countDocuments(searchQuery);

  sendPaginatedSuccess(res, expenses, {
    total,
    page: parseInt(page),
    limit: parseInt(limit),
    pages: Math.ceil(total / limit),
  });
});

// Export expenses (admin/hr only)
export const exportExpenses = asyncHandler(async (req, res) => {
  const { format, filters } = req.body;

  if (req.user.role !== "admin" && req.user.role !== "hr" && req.user.role !== "superadmin" && req.user.role !== "manager") {
    return sendError(res, "Not authorized", 403);
  }

  const query = {};

  if (filters) {
    if (filters.status) query.status = filters.status;
    if (filters.expensePurpose) query.expensePurpose = filters.expensePurpose;
    if (filters.expenseType) query.expenseType = filters.expenseType;
    if (filters.startDate || filters.endDate) {
      query.date = {};
      if (filters.startDate) query.date.$gte = new Date(filters.startDate);
      if (filters.endDate) query.date.$lte = new Date(filters.endDate);
    }
    if (filters.employee) query.employee = filters.employee;
  }

  const expenses = await Expense.find(query)
    .populate("employee", "name email department")
    .populate("project", "name")
    .populate("client", "name")
    .populate("approvedBy", "name")
    .populate("rejectedBy", "name")
    .populate("reimbursedBy", "name")
    .sort({ date: -1 });

  // Get report type from filters
  const reportType = filters?.reportType || "detailed";

  // Transform data based on report type
  let transformedData = expenses;
  if (reportType === "summary") {
    transformedData = generateSummaryReport(expenses);
  } else if (reportType === "detailed") {
    transformedData = generateDetailedReport(expenses);
  } else if (reportType === "category") {
    transformedData = generateCategoryReport(expenses);
  } else if (reportType === "status") {
    transformedData = generateStatusReport(expenses);
  } else if (reportType === "employee") {
    transformedData = generateEmployeeReport(expenses);
  }

  if (format === "json") {
    sendSuccess(res, {
      data: transformedData,
      reportType: reportType,
      exportDate: new Date(),
      totalRecords: transformedData.length,
      filters: filters || {},
    });
  } else if (format === "csv") {
    // Use XLSX for professional Excel export
    const workbook = generateExcelWorkbook(expenses, filters);
    
    // Generate buffer
    const buffer = XLSX.write(workbook, { bookType: "xlsx", type: "buffer" });
    
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", `attachment; filename=expense_report_${new Date().getTime()}.xlsx`);
    res.send(buffer);
  } else {
    sendValidationError(res, "Invalid export format");
  }
});

// Bulk approve expenses (admin/hr only)
export const bulkApproveExpenses = asyncHandler(async (req, res) => {
  const { expenseIds, comments } = req.body;

  if (req.user.role !== "admin" && req.user.role !== "hr" && req.user.role !== "superadmin") {
    return sendError(res, "Not authorized", 403);
  }

  if (!expenseIds || !Array.isArray(expenseIds) || expenseIds.length === 0) {
    return sendValidationError(res, "Please provide expense IDs");
  }

  const result = await Expense.updateMany(
    { _id: { $in: expenseIds }, status: "pending" },
    {
      $set: {
        status: "approved",
        approvedBy: req.user._id,
        approvalDate: new Date(),
        approvalComments: comments || null,
      },
    }
  );

  sendSuccess(res, { modifiedCount: result.modifiedCount }, `${result.modifiedCount} expenses approved successfully`);
});

// Bulk reject expenses (admin/hr only)
export const bulkRejectExpenses = asyncHandler(async (req, res) => {
  const { expenseIds, reason } = req.body;

  if (req.user.role !== "admin" && req.user.role !== "hr" && req.user.role !== "superadmin") {
    return sendError(res, "Not authorized", 403);
  }

  if (!expenseIds || !Array.isArray(expenseIds) || expenseIds.length === 0) {
    return sendValidationError(res, "Please provide expense IDs");
  }

  if (!reason) {
    return sendValidationError(res, "Please provide a rejection reason");
  }

  const result = await Expense.updateMany(
    { _id: { $in: expenseIds }, status: "pending" },
    {
      $set: {
        status: "rejected",
        rejectedBy: req.user._id,
        rejectionDate: new Date(),
        rejectionReason: reason,
      },
    }
  );

  sendSuccess(res, { modifiedCount: result.modifiedCount }, `${result.modifiedCount} expenses rejected successfully`);
});

// Helper function to convert expenses to CSV
// Generate professional Excel workbook
function generateExcelWorkbook(expenses, filters) {
  const reportType = filters?.reportType || "detailed";

  let data = [];
  let sheetName = "Expenses";

  // Transform data based on report type
  if (reportType === "summary") {
    data = generateSummaryReport(expenses);
    sheetName = "Summary Report";
  } else if (reportType === "detailed") {
    data = generateDetailedReport(expenses);
    sheetName = "Detailed Report";
  } else if (reportType === "category") {
    data = generateCategoryReport(expenses);
    sheetName = "Category Breakdown";
  } else if (reportType === "status") {
    data = generateStatusReport(expenses);
    sheetName = "Status Analysis";
  } else if (reportType === "employee") {
    data = generateEmployeeReport(expenses);
    sheetName = "Employee Summary";
  } else {
    data = generateDetailedReport(expenses);
  }

  // Create workbook
  const workbook = XLSX.utils.book_new();

  // Create main data sheet
  const worksheet = XLSX.utils.json_to_sheet(data);

  // Set column widths based on report type
  let columnWidths = [];
  if (reportType === "summary") {
    columnWidths = [{ wch: 25 }, { wch: 15 }, { wch: 15 }, { wch: 15 }];
  } else if (reportType === "category") {
    columnWidths = [{ wch: 20 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 12 }];
  } else if (reportType === "status") {
    columnWidths = [{ wch: 15 }, { wch: 12 }, { wch: 12 }, { wch: 12 }];
  } else if (reportType === "employee") {
    columnWidths = [{ wch: 20 }, { wch: 15 }, { wch: 12 }, { wch: 12 }, { wch: 12 }];
  } else {
    columnWidths = [
      { wch: 18 }, { wch: 25 }, { wch: 15 }, { wch: 18 }, { wch: 12 }, { wch: 12 },
      { wch: 30 }, { wch: 20 }, { wch: 15 }, { wch: 12 }, { wch: 15 }, { wch: 12 },
      { wch: 25 }, { wch: 15 }, { wch: 15 }, { wch: 12 }, { wch: 25 },
    ];
  }
  worksheet["!cols"] = columnWidths;

  // Style header row
  const headerStyle = {
    font: { bold: true, color: { rgb: "FFFFFF" }, size: 11 },
    fill: { fgColor: { rgb: "1F4E78" } },
    alignment: { horizontal: "center", vertical: "center", wrapText: true },
    border: {
      top: { style: "thin", color: { rgb: "000000" } },
      bottom: { style: "thin", color: { rgb: "000000" } },
      left: { style: "thin", color: { rgb: "000000" } },
      right: { style: "thin", color: { rgb: "000000" } },
    },
  };

  // Apply header styling
  const range = XLSX.utils.decode_range(worksheet["!ref"]);
  for (let col = range.s.c; col <= range.e.c; col++) {
    const cellAddress = XLSX.utils.encode_cell({ r: 0, c: col });
    if (worksheet[cellAddress]) {
      worksheet[cellAddress].s = headerStyle;
    }
  }

  // Apply data row styling
  const dataStyle = {
    alignment: { horizontal: "left", vertical: "center", wrapText: true },
    border: {
      top: { style: "thin", color: { rgb: "D3D3D3" } },
      bottom: { style: "thin", color: { rgb: "D3D3D3" } },
      left: { style: "thin", color: { rgb: "D3D3D3" } },
      right: { style: "thin", color: { rgb: "D3D3D3" } },
    },
  };

  // Apply alternating row colors
  for (let row = 1; row <= range.e.r; row++) {
    for (let col = range.s.c; col <= range.e.c; col++) {
      const cellAddress = XLSX.utils.encode_cell({ r: row, c: col });
      if (worksheet[cellAddress]) {
        worksheet[cellAddress].s = {
          ...dataStyle,
          fill: row % 2 === 0 ? { fgColor: { rgb: "F2F2F2" } } : { fgColor: { rgb: "FFFFFF" } },
        };
      }
    }
  }

  // Set row height for header
  worksheet["!rows"] = [{ hpx: 25 }];

  // Add summary sheet
  const summaryData = [
    ["EXPENSE REPORT SUMMARY"],
    [],
    ["Report Type:", reportType.toUpperCase()],
    ["Report Generated:", new Date().toLocaleString("en-IN")],
    ["Total Records:", data.length - 1], // Exclude header
    [],
    ["Filters Applied:"],
    ["Status:", filters?.status || "All"],
    ["Category:", filters?.category || "All"],
    ["Start Date:", filters?.startDate || "N/A"],
    ["End Date:", filters?.endDate || "N/A"],
    [],
    ["SUMMARY STATISTICS:"],
    ["Total Amount (₹):", calculateTotalAmount(expenses).toFixed(2)],
    ["Approved Count:", expenses.filter(e => e.status === "approved").length],
    ["Pending Count:", expenses.filter(e => e.status === "pending").length],
    ["Rejected Count:", expenses.filter(e => e.status === "rejected").length],
    ["Reimbursed Count:", expenses.filter(e => e.status === "reimbursed").length],
  ];

  const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
  summarySheet["!cols"] = [{ wch: 25 }, { wch: 30 }];

  // Add sheets to workbook
  XLSX.utils.book_append_sheet(workbook, summarySheet, "Summary");
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);

  return workbook;
}

// Generate Summary Report - High level overview
function generateSummaryReport(expenses) {
  const purposeTotals = {};
  const typeTotals = {};
  const statusTotals = {};

  expenses.forEach(expense => {
    const purpose = expense.expensePurpose || 'N/A';
    const type = expense.expenseType || 'N/A';
    const status = formatStatus(expense.status);

    purposeTotals[purpose] = (purposeTotals[purpose] || 0) + expense.amount;
    typeTotals[type] = (typeTotals[type] || 0) + expense.amount;
    statusTotals[status] = (statusTotals[status] || 0) + expense.amount;
  });

  const data = [
    {
      "Category": "PURPOSE BREAKDOWN",
      "Total Amount (₹)": "",
      "Count": "",
      "Average (₹)": "",
    },
  ];

  Object.entries(purposeTotals).forEach(([purpose, total]) => {
    const count = expenses.filter(e => (e.expensePurpose || 'N/A') === purpose).length;
    data.push({
      "Category": purpose,
      "Total Amount (₹)": total.toFixed(2),
      "Count": count,
      "Average (₹)": (total / count).toFixed(2),
    });
  });

  data.push({ "Category": "", "Total Amount (₹)": "", "Count": "", "Average (₹)": "" });
  data.push({
    "Category": "TYPE BREAKDOWN",
    "Total Amount (₹)": "",
    "Count": "",
    "Average (₹)": "",
  });

  Object.entries(typeTotals).forEach(([type, total]) => {
    const count = expenses.filter(e => (e.expenseType || 'N/A') === type).length;
    data.push({
      "Category": type,
      "Total Amount (₹)": total.toFixed(2),
      "Count": count,
      "Average (₹)": (total / count).toFixed(2),
    });
  });

  data.push({ "Category": "", "Total Amount (₹)": "", "Count": "", "Average (₹)": "" });
  data.push({
    "Category": "STATUS BREAKDOWN",
    "Total Amount (₹)": "",
    "Count": "",
    "Average (₹)": "",
  });

  Object.entries(statusTotals).forEach(([status, total]) => {
    const count = expenses.filter(e => formatStatus(e.status) === status).length;
    data.push({
      "Category": status,
      "Total Amount (₹)": total.toFixed(2),
      "Count": count,
      "Average (₹)": (total / count).toFixed(2),
    });
  });

  return data;
}

// Generate Detailed Report - All expense information
function generateDetailedReport(expenses) {
  return expenses.map((expense) => ({
    "Employee Name": expense.employee?.name || "N/A",
    "Email": expense.employee?.email || "N/A",
    "Department": expense.employee?.department || "N/A",
    "Expense Purpose": expense.expensePurpose || "N/A",
    "Expense Type": expense.expenseType || "N/A",
    "Amount (₹)": expense.amount,
    "Expense Date": formatDate(expense.date),
    "Description": expense.description || "",
    "Merchant": expense.merchant || "",
    "Payment Method": formatPaymentMethod(expense.paymentMethod),
    "Status": formatStatus(expense.status),
    "Approved By": expense.approvedBy?.name || "",
    "Approval Date": expense.approvalDate ? formatDate(expense.approvalDate) : "",
    "Rejection Reason": expense.rejectionReason || "",
    "Reimbursed By": expense.reimbursedBy?.name || "",
    "Reimbursement Date": expense.reimbursementDate ? formatDate(expense.reimbursementDate) : "",
    "Submission Date": formatDate(expense.createdAt),
    "Notes": expense.notes || "",
  }));
}

// Generate Category Report - Breakdown by purpose and type
function generateCategoryReport(expenses) {
  const categoryMap = {};

  expenses.forEach(expense => {
    const key = `${expense.expensePurpose || 'N/A'} - ${expense.expenseType || 'N/A'}`;
    if (!categoryMap[key]) {
      categoryMap[key] = [];
    }
    categoryMap[key].push(expense);
  });

  const data = [];
  Object.entries(categoryMap).forEach(([category, items]) => {
    const total = items.reduce((sum, e) => sum + e.amount, 0);
    const approved = items.filter(e => e.status === "approved").reduce((sum, e) => sum + e.amount, 0);
    const pending = items.filter(e => e.status === "pending").reduce((sum, e) => sum + e.amount, 0);

    data.push({
      "Purpose - Type": category,
      "Total Amount (₹)": total.toFixed(2),
      "Approved (₹)": approved.toFixed(2),
      "Pending (₹)": pending.toFixed(2),
      "Count": items.length,
    });
  });

  // Add total row
  const grandTotal = expenses.reduce((sum, e) => sum + e.amount, 0);
  const grandApproved = expenses.filter(e => e.status === "approved").reduce((sum, e) => sum + e.amount, 0);
  const grandPending = expenses.filter(e => e.status === "pending").reduce((sum, e) => sum + e.amount, 0);

  data.push({
    "Purpose - Type": "TOTAL",
    "Total Amount (₹)": grandTotal.toFixed(2),
    "Approved (₹)": grandApproved.toFixed(2),
    "Pending (₹)": grandPending.toFixed(2),
    "Count": expenses.length,
  });

  return data;
}

// Generate Status Report - Analysis by status
function generateStatusReport(expenses) {
  const statusMap = {};

  expenses.forEach(expense => {
    const status = formatStatus(expense.status);
    if (!statusMap[status]) {
      statusMap[status] = [];
    }
    statusMap[status].push(expense);
  });

  const data = [];
  Object.entries(statusMap).forEach(([status, items]) => {
    const total = items.reduce((sum, e) => sum + e.amount, 0);
    const average = total / items.length;

    data.push({
      "Status": status,
      "Total Amount (₹)": total.toFixed(2),
      "Average (₹)": average.toFixed(2),
      "Count": items.length,
    });
  });

  return data;
}

// Generate Employee Report - Summary by employee
function generateEmployeeReport(expenses) {
  const employeeMap = {};

  expenses.forEach(expense => {
    const employeeName = expense.employee?.name || "Unknown";
    if (!employeeMap[employeeName]) {
      employeeMap[employeeName] = [];
    }
    employeeMap[employeeName].push(expense);
  });

  const data = [];
  Object.entries(employeeMap).forEach(([employeeName, items]) => {
    const total = items.reduce((sum, e) => sum + e.amount, 0);
    const approved = items.filter(e => e.status === "approved").reduce((sum, e) => sum + e.amount, 0);
    const pending = items.filter(e => e.status === "pending").reduce((sum, e) => sum + e.amount, 0);

    data.push({
      "Employee Name": employeeName,
      "Department": items[0]?.employee?.department || "N/A",
      "Total Amount (₹)": total.toFixed(2),
      "Approved (₹)": approved.toFixed(2),
      "Pending (₹)": pending.toFixed(2),
    });
  });

  return data;
}

// Helper function to calculate total amount
function calculateTotalAmount(expenses) {
  return expenses.reduce((sum, e) => sum + e.amount, 0);
}

// Helper function to format category names
function formatCategoryName(category) {
  const categoryMap = {
    travel: "Travel",
    food: "Food & Meals",
    accommodation: "Accommodation",
    office_supplies: "Office Supplies",
    client_meeting: "Client Meeting",
    training: "Training",
    other: "Other",
  };
  return categoryMap[category] || category;
}

// Helper function to format payment method
function formatPaymentMethod(method) {
  const methodMap = {
    cash: "Cash",
    credit_card: "Credit Card",
    debit_card: "Debit Card",
    bank_transfer: "Bank Transfer",
    upi: "UPI",
    other: "Other",
  };
  return methodMap[method] || method;
}

// Helper function to format status
function formatStatus(status) {
  const statusMap = {
    pending: "Pending",
    approved: "Approved",
    rejected: "Rejected",
    reimbursed: "Reimbursed",
  };
  return statusMap[status] || status;
}

// Get expense analytics (admin/hr only)
export const getExpenseAnalytics = async (req, res) => {
  try {
    const { startDate, endDate, groupBy = "expensePurpose" } = req.query;

    
    
    

    if (req.user.role !== "admin" && req.user.role !== "hr" && req.user.role !== "superadmin" && req.user.role !== "manager") {
      
      return res.status(403).json({
        success: false,
        message: "Not authorized",
      });
    }

    const query = {};

    if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = new Date(startDate);
      if (endDate) query.date.$lte = new Date(endDate);
    }

    let groupField;
    if (groupBy === "expensePurpose") {
      groupField = "$expensePurpose";
    } else if (groupBy === "expenseType") {
      groupField = "$expenseType";
    } else if (groupBy === "status") {
      groupField = "$status";
    } else if (groupBy === "employee") {
      groupField = "$employee";
    } else if (groupBy === "department") {
      // For department, we need to lookup the employee's department
      const analytics = await Expense.aggregate([
        { $match: query },
        {
          $lookup: {
            from: "users",
            localField: "employee",
            foreignField: "_id",
            as: "employeeData"
          }
        },
        { $unwind: "$employeeData" },
        {
          $lookup: {
            from: "departments",
            localField: "employeeData.department",
            foreignField: "_id",
            as: "departmentData"
          }
        },
        { $unwind: { path: "$departmentData", preserveNullAndEmptyArrays: true } },
        {
          $group: {
            _id: "$departmentData._id",
            departmentName: { $first: "$departmentData.name" },
            count: { $sum: 1 },
            total: { $sum: "$amount" },
            average: { $avg: "$amount" },
            min: { $min: "$amount" },
            max: { $max: "$amount" },
          },
        },
        { $sort: { total: -1 } },
      ]);

      // Filter out null departments and ensure we have department names
      const filteredAnalytics = analytics
        .filter(item => item._id !== null && item.departmentName)
        .map(item => ({
          ...item,
          departmentName: item.departmentName || 'Unknown Department'
        }));
      

      return res.status(200).json({
        success: true,
        analytics: filteredAnalytics,
        groupBy,
      });
    } else {
      groupField = "$expensePurpose";
    }
    
    

    const analytics = await Expense.aggregate([
      { $match: query },
      {
        $group: {
          _id: groupField,
          count: { $sum: 1 },
          total: { $sum: "$amount" },
          average: { $avg: "$amount" },
          min: { $min: "$amount" },
          max: { $max: "$amount" },
        },
      },
      { $sort: { total: -1 } },
    ]);

    // Filter out null _id values and map category to type for backward compatibility
    const filteredAnalytics = analytics
      .filter(item => item._id !== null && item._id !== undefined)
      .map(item => {
        // If groupBy is expenseType but _id is null, try to use category field
        if ((groupBy === "expenseType" || groupBy === "expensePurpose") && !item._id) {
          return null;
        }
        return item;
      })
      .filter(item => item !== null);

    // Populate employee names if grouped by employee
    if (groupBy === "employee") {
      for (let item of filteredAnalytics) {
        const employee = await User.findById(item._id, "name email");
        item.employeeName = employee?.name || "Unknown";
        item.employeeEmail = employee?.email || "";
      }
    }

    res.status(200).json({
      success: true,
      analytics: filteredAnalytics,
      groupBy,
    });
  } catch (error) {
    
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

// Get monthly expense trends
export const getMonthlyTrends = async (req, res) => {
  try {
    const { months = 12 } = req.query;
    const userId = req.user._id;
    const isAdmin = req.user.role === "admin" || req.user.role === "hr" || req.user.role === "superadmin" || req.user.role === "manager";

    const query = isAdmin ? {} : { employee: userId };

    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - parseInt(months));

    query.date = { $gte: startDate };

    const trends = await Expense.aggregate([
      { $match: query },
      {
        $group: {
          _id: {
            year: { $year: "$date" },
            month: { $month: "$date" },
          },
          total: { $sum: "$amount" },
          count: { $sum: 1 },
          approved: {
            $sum: { $cond: [{ $eq: ["$status", "approved"] }, "$amount", 0] },
          },
          pending: {
            $sum: { $cond: [{ $eq: ["$status", "pending"] }, "$amount", 0] },
          },
          rejected: {
            $sum: { $cond: [{ $eq: ["$status", "rejected"] }, "$amount", 0] },
          },
        },
      },
      { $sort: { "_id.year": 1, "_id.month": 1 } },
    ]);

    res.status(200).json({
      success: true,
      trends,
    });
  } catch (error) {
    
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

// Get budget tracking (now by Purpose and Type)
export const getBudgetTracking = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    if (req.user.role !== "admin" && req.user.role !== "hr" && req.user.role !== "superadmin" && req.user.role !== "manager") {
      return res.status(403).json({
        success: false,
        message: "Not authorized",
      });
    }

    const query = {};

    if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = new Date(startDate);
      if (endDate) query.date.$lte = new Date(endDate);
    }

    const categoryBudgets = await Expense.aggregate([
      { $match: query },
      {
        $group: {
          _id: {
            purpose: "$expensePurpose",
            type: "$expenseType"
          },
          spent: { $sum: "$amount" },
          count: { $sum: 1 },
          approved: {
            $sum: { $cond: [{ $eq: ["$status", "approved"] }, "$amount", 0] },
          },
          pending: {
            $sum: { $cond: [{ $eq: ["$status", "pending"] }, "$amount", 0] },
          },
        },
      },
      { $sort: { spent: -1 } },
    ]);

    const totalSpent = categoryBudgets.reduce((sum, cat) => sum + cat.spent, 0);

    res.status(200).json({
      success: true,
      categoryBudgets,
      totalSpent,
    });
  } catch (error) {
    
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

// Get category statistics (now returns Purpose and Type stats)
export const getCategoryStats = async (req, res) => {
  try {
    const userId = req.user._id;
    const isAdmin = req.user.role === "admin" || req.user.role === "hr" || req.user.role === "superadmin" || req.user.role === "manager";
    const { financialYear, startDate, endDate } = req.query;

    let query = isAdmin ? {} : { employee: userId };

    // Apply date range filter
    if (startDate || endDate || financialYear) {
      query.date = {};
      
      if (startDate && endDate) {
        // Use provided date range
        query.date.$gte = new Date(startDate);
        query.date.$lte = new Date(endDate);
      } else if (financialYear) {
        // Use financial year date range
        const { startDate: fyStart, endDate: fyEnd } = getFinancialYearDateRange(financialYear);
        query.date.$gte = fyStart;
        query.date.$lte = fyEnd;
      }
    }

    // Get stats grouped by Purpose and Type combination
    const categoryStats = await Expense.aggregate([
      { $match: query },
      {
        $group: {
          _id: {
            purpose: "$expensePurpose",
            type: "$expenseType"
          },
          total: { $sum: "$amount" },
          count: { $sum: 1 },
          average: { $avg: "$amount" },
          statuses: {
            $push: "$status",
          },
        },
      },
      { $sort: { total: -1 } },
    ]);

    const enrichedStats = categoryStats.map((stat) => ({
      ...stat,
      pending: stat.statuses.filter((s) => s === "pending").length,
      approved: stat.statuses.filter((s) => s === "approved").length,
      rejected: stat.statuses.filter((s) => s === "rejected").length,
      reimbursed: stat.statuses.filter((s) => s === "reimbursed").length,
    }));

    res.status(200).json({
      success: true,
      categoryStats: enrichedStats,
    });
  } catch (error) {
    
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};


// Get all budgets
export const getAllBudgets = async (req, res) => {
  try {
    if (req.user.role !== "admin" && req.user.role !== "superadmin") {
      return res.status(403).json({
        success: false,
        message: "Not authorized. Only admin and superadmin can access budget management.",
      });
    }

    const { financialYear } = req.query;
    const currentFY = financialYear || getCurrentFinancialYear();

    const budgets = await Budget.find({ isActive: true, financialYear: currentFY })
      .populate("updatedBy", "name email")
      .sort({ category: 1 });

    res.status(200).json({
      success: true,
      budgets,
      financialYear: currentFY,
    });
  } catch (error) {
    
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

// Get budget by category
export const getBudgetByCategory = async (req, res) => {
  try {
    const { category } = req.params;

    const budget = await Budget.findOne({ category, isActive: true })
      .populate("updatedBy", "name email");

    if (!budget) {
      return res.status(404).json({
        success: false,
        message: "Budget not found for this category",
      });
    }

    res.status(200).json({
      success: true,
      budget,
    });
  } catch (error) {
    
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

// Create or update budget (admin only)
export const setBudget = async (req, res) => {
  try {
    const { category, limit, description, financialYear } = req.body;

    if (req.user.role !== "admin" && req.user.role !== "superadmin") {
      return res.status(403).json({
        success: false,
        message: "Only admins can set budgets",
      });
    }

    if (!category || limit === undefined) {
      return res.status(400).json({
        success: false,
        message: "Category and limit are required",
      });
    }

    if (limit < 0) {
      return res.status(400).json({
        success: false,
        message: "Budget limit cannot be negative",
      });
    }

    const currentFY = financialYear || getCurrentFinancialYear();

    let budget = await Budget.findOne({ category, financialYear: currentFY });

    if (budget) {
      // Update existing budget
      budget.limit = limit;
      budget.description = description || budget.description;
      budget.updatedBy = req.user._id;
    } else {
      // Create new budget
      budget = new Budget({
        category,
        financialYear: currentFY,
        limit,
        description: description || "",
        updatedBy: req.user._id,
      });
    }

    await budget.save();
    await budget.populate("updatedBy", "name email");

    res.status(200).json({
      success: true,
      message: `Budget for ${category} set successfully`,
      budget,
    });
  } catch (error) {
    
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

// Bulk set budgets (admin only)
export const setBulkBudgets = async (req, res) => {
  try {
    const { budgets } = req.body;

    if (req.user.role !== "admin" && req.user.role !== "superadmin") {
      return res.status(403).json({
        success: false,
        message: "Only admins can set budgets",
      });
    }

    if (!Array.isArray(budgets) || budgets.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Please provide an array of budgets",
      });
    }

    const results = [];

    for (const { category, limit, description } of budgets) {
      if (!category || limit === undefined) continue;

      let budget = await Budget.findOne({ category });

      if (budget) {
        budget.limit = limit;
        budget.description = description || budget.description;
        budget.updatedBy = req.user._id;
      } else {
        budget = new Budget({
          category,
          limit,
          description: description || "",
          updatedBy: req.user._id,
        });
      }

      await budget.save();
      results.push(budget);
    }

    res.status(200).json({
      success: true,
      message: `${results.length} budget(s) updated successfully`,
      budgets: results,
    });
  } catch (error) {
    
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

// Get budget tracking with actual budgets (now by Purpose and Type)
export const getBudgetTrackingWithLimits = async (req, res) => {
  try {
    const { startDate, endDate, financialYear } = req.query;

    if (req.user.role !== "admin" && req.user.role !== "hr" && req.user.role !== "superadmin" && req.user.role !== "manager") {
      return res.status(403).json({
        success: false,
        message: "Not authorized",
      });
    }

    // Determine the financial year and date range
    let currentFY = financialYear || getCurrentFinancialYear();
    let query = {};

    if (startDate || endDate) {
      // Use provided date range
      query.date = {};
      if (startDate) query.date.$gte = new Date(startDate);
      if (endDate) query.date.$lte = new Date(endDate);
      
      // If dates are provided, determine the financial year from the start date
      if (startDate) {
        currentFY = getFinancialYearForDate(new Date(startDate));
      }
    } else {
      // Use financial year date range
      const { startDate: fyStart, endDate: fyEnd } = getFinancialYearDateRange(currentFY);
      query.date = {
        $gte: fyStart,
        $lte: fyEnd
      };
    }

    // Get budgets for the current financial year
    const allBudgets = await Budget.find({ isActive: true, financialYear: currentFY });
    const budgetMap = {};
    allBudgets.forEach(b => {
      // Support both old category format and new Purpose/Type format
      if (b.expensePurpose && b.expenseType) {
        const key = `${b.expensePurpose}|${b.expenseType}`;
        budgetMap[key] = b.limit;
      } else if (b.category) {
        budgetMap[b.category] = b.limit;
      }
    });

    // Get spending by Purpose and Type
    const categorySpending = await Expense.aggregate([
      { $match: query },
      {
        $group: {
          _id: {
            purpose: "$expensePurpose",
            type: "$expenseType"
          },
          spent: { $sum: "$amount" },
          count: { $sum: 1 },
          approved: {
            $sum: { 
              $cond: [
                { $in: ["$status", ["approved", "reimbursed"]] }, 
                "$amount", 
                0
              ] 
            },
          },
          pending: {
            $sum: { $cond: [{ $eq: ["$status", "pending"] }, "$amount", 0] },
          },
          rejected: {
            $sum: { $cond: [{ $eq: ["$status", "rejected"] }, "$amount", 0] },
          },
          reimbursed: {
            $sum: { $cond: [{ $eq: ["$status", "reimbursed"] }, "$amount", 0] },
          },
        },
      },
    ]);

    // Create a map of spending by Purpose-Type combination
    const spendingMap = {};
    categorySpending.forEach(cat => {
      const key = `${cat._id.purpose}|${cat._id.type}`;
      spendingMap[key] = cat;
    });

    // Create enriched budgets for ALL Purpose-Type combinations that have budgets set
    const enrichedBudgets = [];
    
    // Add all combinations that have budgets (even if no spending)
    Object.keys(budgetMap).forEach(key => {
      const spending = spendingMap[key] || {
        _id: { purpose: key.split('|')[0], type: key.split('|')[1] },
        spent: 0,
        count: 0,
        approved: 0,
        pending: 0,
        rejected: 0,
        reimbursed: 0,
      };
      
      enrichedBudgets.push({
        ...spending,
        limit: budgetMap[key],
        isOverBudget: spending.spent > budgetMap[key],
      });
    });

    // Add combinations with spending but no budget (if any)
    categorySpending.forEach(cat => {
      const key = `${cat._id.purpose}|${cat._id.type}`;
      if (!budgetMap[key]) {
        enrichedBudgets.push({
          ...cat,
          limit: 0,
          isOverBudget: false,
        });
      }
    });

    // Sort by spent amount (descending)
    enrichedBudgets.sort((a, b) => b.spent - a.spent);

    const totalSpent = categorySpending.reduce((sum, cat) => sum + cat.spent, 0);
    const totalBudget = Object.values(budgetMap).reduce((sum, val) => sum + val, 0);

    res.status(200).json({
      success: true,
      categoryBudgets: enrichedBudgets,
      totalSpent,
      totalBudget,
      budgetMap,
      financialYear: currentFY,
      hasBudgets: Object.keys(budgetMap).length > 0,
      budgetCount: Object.keys(budgetMap).length,
    });
  } catch (error) {
    
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

// Get available financial years
export const getFinancialYears = async (req, res) => {
  try {
    const years = getFinancialYearsUtil(2024); // Start from 2024 (company founded January 2024)
    
    res.status(200).json({
      success: true,
      financialYears: years,
      currentFinancialYear: getCurrentFinancialYear(),
    });
  } catch (error) {
    
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};


// Get available expense purposes
export const getExpensePurposes = async (req, res) => {
  try {
    const purposes = [
      { value: "internal_office", label: "Internal Office" },
      { value: "existing_client", label: "Existing Client" },
      { value: "prospective_client", label: "Prospective Client" },
      { value: "seminar", label: "Seminar" },
      { value: "expo", label: "Expo" },
      { value: "vendor_meeting", label: "Vendor Meeting" },
      { value: "recruitment", label: "Recruitment" },
      { value: "training", label: "Training" },
      { value: "marketing_activity", label: "Marketing Activity" },
      { value: "team_activity", label: "Team Activity" },
      { value: "travel_visit", label: "Travel Visit" },
    ];

    res.status(200).json({
      success: true,
      purposes,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

// Get available expense types
export const getExpenseTypes = async (req, res) => {
  try {
    const types = [
      { value: "food", label: "Food" },
      { value: "travel", label: "Travel" },
      { value: "hotel", label: "Hotel" },
      { value: "transport", label: "Transport" },
      { value: "materials", label: "Materials" },
      { value: "entry_fee", label: "Entry Fee" },
      { value: "gift", label: "Gift" },
      { value: "printing", label: "Printing" },
      { value: "miscellaneous", label: "Miscellaneous" },
    ];

    res.status(200).json({
      success: true,
      types,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

// Get Purpose-Type matrix analytics
export const getPurposeTypeMatrix = async (req, res) => {
  try {
    const { startDate, endDate, financialYear } = req.query;

    if (req.user.role !== "admin" && req.user.role !== "hr" && req.user.role !== "superadmin" && req.user.role !== "manager") {
      return res.status(403).json({
        success: false,
        message: "Not authorized",
      });
    }

    let query = {};

    if (startDate || endDate || financialYear) {
      query.date = {};
      
      if (startDate && endDate) {
        query.date.$gte = new Date(startDate);
        query.date.$lte = new Date(endDate);
      } else if (financialYear) {
        const { startDate: fyStart, endDate: fyEnd } = getFinancialYearDateRange(financialYear);
        query.date.$gte = fyStart;
        query.date.$lte = fyEnd;
      }
    }

    // Get all Purpose-Type combinations with spending
    const matrix = await Expense.aggregate([
      { $match: query },
      {
        $group: {
          _id: {
            purpose: "$expensePurpose",
            type: "$expenseType"
          },
          total: { $sum: "$amount" },
          count: { $sum: 1 },
          average: { $avg: "$amount" },
        },
      },
      { $sort: { total: -1 } },
    ]);

    res.status(200).json({
      success: true,
      matrix,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};
