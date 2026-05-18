import PurchaseRequest from '../models/purchaseRequestModel.js';
import PurchaseOrder from '../models/purchaseOrderModel.js';
import ProcurementInvoice from '../models/procurementInvoiceModel.js';
import ProcurementPayment from '../models/procurementPaymentModel.js';
import Vendor from '../models/vendorModel.js';
import Budget from '../models/budgetModel.js';
import Department from '../models/departmentModel.js';

// GET /dashboard/summary
export const getSummary = async (req, res) => {
  try {
    const [openPRs, issuedPOs, pendingInvoices, outstandingPayments] = await Promise.all([
      PurchaseRequest.countDocuments({ status: { $in: ['pending_hod', 'pending_admin', 'approved'] } }),
      PurchaseOrder.countDocuments({ status: 'issued' }),
      ProcurementInvoice.countDocuments({ paymentStatus: { $in: ['unpaid', 'partially_paid'] } }),
      ProcurementInvoice.aggregate([
        { $match: { paymentStatus: { $in: ['unpaid', 'partially_paid'] } } },
        { $group: { _id: null, total: { $sum: '$outstandingBalance' } } },
      ]),
    ]);

    // Payment due alerts (due within 7 days)
    const sevenDaysFromNow = new Date();
    sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);
    const dueAlerts = await ProcurementInvoice.find({
      paymentStatus: { $in: ['unpaid', 'partially_paid'] },
      dueDate: { $lte: sevenDaysFromNow },
    })
      .populate('purchaseOrder', 'poNumber')
      .populate('vendor', 'name')
      .sort({ dueDate: 1 });

    res.json({
      openPRs,
      issuedPOs,
      pendingInvoices,
      outstandingPaymentTotal: outstandingPayments[0]?.total || 0,
      dueAlerts,
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// GET /dashboard/budget-utilisation
export const getBudgetUtilisation = async (req, res) => {
  try {
    const { financialYear } = req.query;
    const fy = financialYear || getCurrentFinancialYear();

    const budgets = await Budget.find({ financialYear: fy, isActive: true });

    const utilisation = budgets.map(b => ({
      financialYear: b.financialYear,
      totalBudget: b.limit || b.totalAmount || 0,
      procurementCommitted: b.procurementCommitted || 0,
      procurementSpent: b.procurementSpent || 0,
      available: (b.limit || b.totalAmount || 0) - (b.procurementCommitted || 0) - (b.procurementSpent || 0),
    }));

    res.json(utilisation);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

function getCurrentFinancialYear() {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  return month >= 4 ? `${year}-${year + 1}` : `${year - 1}-${year}`;
}

// GET /reports/spend-by-vendor
export const spendByVendor = async (req, res) => {
  try {
    const { startDate, endDate, year } = req.query;
    const match = {};

    if (startDate || endDate) {
      match.paymentDate = {};
      if (startDate) match.paymentDate.$gte = new Date(startDate);
      if (endDate) match.paymentDate.$lte = new Date(endDate);
    } else if (year) {
      const y = parseInt(year);
      match.paymentDate = { $gte: new Date(y, 0, 1), $lte: new Date(y, 11, 31, 23, 59, 59) };
    }

    // Payments already have a vendor field — group directly
    const result = await ProcurementPayment.aggregate([
      { $match: match },
      {
        $group: {
          _id: '$vendor',
          spend: { $sum: '$amount' },
          paymentCount: { $sum: 1 },
        },
      },
      {
        $lookup: {
          from: 'vendors',
          localField: '_id',
          foreignField: '_id',
          as: 'vendorInfo',
        },
      },
      { $unwind: { path: '$vendorInfo', preserveNullAndEmptyArrays: true } },
      { $project: { vendor: { $ifNull: ['$vendorInfo.name', 'Unknown'] }, spend: 1, paymentCount: 1 } },
      { $sort: { spend: -1 } },
    ]);

    res.json(result);
  } catch (error) {
    console.error('spendByVendor error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// GET /reports/spend-by-department
export const spendByDepartment = async (req, res) => {
  try {
    const { startDate, endDate, year } = req.query;
    const match = {};
    if (startDate || endDate) {
      match.createdAt = {};
      if (startDate) match.createdAt.$gte = new Date(startDate);
      if (endDate) match.createdAt.$lte = new Date(endDate);
    } else if (year) {
      const y = parseInt(year);
      match.createdAt = { $gte: new Date(y, 0, 1), $lte: new Date(y, 11, 31, 23, 59, 59) };
    }

    const result = await PurchaseOrder.aggregate([
      { $match: { status: { $in: ['issued', 'partially_received', 'fully_received', 'closed'] }, ...match } },
      { $group: { _id: '$department', totalCommitted: { $sum: '$totalValue' } } },
      { $lookup: { from: 'departments', localField: '_id', foreignField: '_id', as: 'deptInfo' } },
      { $unwind: { path: '$deptInfo', preserveNullAndEmptyArrays: true } },
      { $project: { departmentName: { $ifNull: ['$deptInfo.name', 'Unknown'] }, totalCommitted: 1 } },
      { $sort: { totalCommitted: -1 } },
    ]);

    res.json(result);
  } catch (error) {
    console.error('spendByDepartment error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// GET /reports/spend-by-category
export const spendByCategory = async (req, res) => {
  try {
    const { startDate, endDate, year } = req.query;
    const match = {};
    if (startDate || endDate) {
      match.createdAt = {};
      if (startDate) match.createdAt.$gte = new Date(startDate);
      if (endDate) match.createdAt.$lte = new Date(endDate);
    } else if (year) {
      const y = parseInt(year);
      match.createdAt = { $gte: new Date(y, 0, 1), $lte: new Date(y, 11, 31, 23, 59, 59) };
    }

    const result = await PurchaseOrder.aggregate([
      { $match: { status: { $in: ['issued', 'partially_received', 'fully_received', 'closed'] }, ...match } },
      { $unwind: { path: '$lineItems', preserveNullAndEmptyArrays: true } },
      { $group: { _id: { $ifNull: ['$lineItems.category', 'Uncategorized'] }, totalValue: { $sum: { $multiply: ['$lineItems.quantity', '$lineItems.unitPrice'] } } } },
      { $sort: { totalValue: -1 } },
    ]);

    res.json(result);
  } catch (error) {
    console.error('spendByCategory error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// GET /reports/monthly-trend
export const monthlyTrend = async (req, res) => {
  try {
    const { financialYear, year } = req.query;

    let startDate, endDate;
    if (financialYear && financialYear.includes('-')) {
      const [startYearStr] = financialYear.split('-');
      const startYear = parseInt(startYearStr);
      startDate = new Date(startYear, 3, 1);
      endDate = new Date(startYear + 1, 2, 31);
    } else {
      const y = parseInt(year || financialYear || new Date().getFullYear());
      startDate = new Date(y, 0, 1);
      endDate = new Date(y, 11, 31);
    }

    const result = await ProcurementPayment.aggregate([
      { $match: { paymentDate: { $gte: startDate, $lte: endDate } } },
      { $group: { _id: { year: { $year: '$paymentDate' }, month: { $month: '$paymentDate' } }, totalSpend: { $sum: '$amount' } } },
      { $sort: { '_id.year': 1, '_id.month': 1 } },
    ]);

    res.json(result);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// GET /reports/pr-status-summary
export const prStatusSummary = async (req, res) => {
  try {
    const { financialYear } = req.query;
    const fy = financialYear || getCurrentFinancialYear();

    const result = await PurchaseRequest.aggregate([
      { $match: { financialYear: fy } },
      { $group: { _id: '$status', count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]);

    res.json(result);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// GET /reports/top-vendors
export const topVendors = async (req, res) => {
  try {
    const { financialYear, year } = req.query;

    // Support both ?financialYear=2025-2026 and ?year=2026 formats
    let startDate, endDate;
    if (financialYear && financialYear.includes('-')) {
      const [startYearStr] = financialYear.split('-');
      const startYear = parseInt(startYearStr);
      startDate = new Date(startYear, 3, 1);
      endDate = new Date(startYear + 1, 2, 31);
    } else {
      const y = parseInt(year || financialYear || new Date().getFullYear());
      startDate = new Date(y, 0, 1);   // Jan 1
      endDate = new Date(y, 11, 31);   // Dec 31
    }

    const result = await ProcurementPayment.aggregate([
      { $match: { paymentDate: { $gte: startDate, $lte: endDate } } },
      { $group: { _id: '$vendor', totalSpend: { $sum: '$amount' }, paymentCount: { $sum: 1 } } },
      { $sort: { totalSpend: -1 } },
      { $limit: 10 },
      { $lookup: { from: 'vendors', localField: '_id', foreignField: '_id', as: 'vendorInfo' } },
      { $unwind: { path: '$vendorInfo', preserveNullAndEmptyArrays: true } },
      { $project: { vendorName: '$vendorInfo.name', totalSpend: 1, paymentCount: 1 } },
    ]);

    res.json(result);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// GET /reports/export — CSV export
export const exportCSV = async (req, res) => {
  try {
    const { type, startDate, endDate, financialYear } = req.query;
    const fy = financialYear || getCurrentFinancialYear();

    let data = [];
    let headers = [];
    let filename = 'procurement-report.csv';

    if (type === 'purchase-requests') {
      const prs = await PurchaseRequest.find({ financialYear: fy })
        .populate('requestedBy', 'name email')
        .populate('department', 'name')
        .lean();
      headers = ['PR Number', 'Requested By', 'Department', 'Status', 'Estimated Cost', 'Financial Year', 'Created At'];
      data = prs.map(pr => [
        pr.prNumber,
        pr.requestedBy?.name,
        pr.department?.name,
        pr.status,
        pr.estimatedTotalCost,
        pr.financialYear,
        new Date(pr.createdAt).toISOString().split('T')[0],
      ]);
      filename = 'purchase-requests.csv';
    } else if (type === 'purchase-orders') {
      const pos = await PurchaseOrder.find({ financialYear: fy })
        .populate('vendor', 'name')
        .populate('department', 'name')
        .lean();
      headers = ['PO Number', 'Vendor', 'Department', 'Status', 'Total Value', 'Financial Year', 'Issued At'];
      data = pos.map(po => [
        po.poNumber,
        po.vendor?.name,
        po.department?.name,
        po.status,
        po.totalValue,
        po.financialYear,
        po.issuedAt ? new Date(po.issuedAt).toISOString().split('T')[0] : '',
      ]);
      filename = 'purchase-orders.csv';
    } else {
      // Default: payments
      const match = {};
      if (startDate) match.paymentDate = { $gte: new Date(startDate) };
      if (endDate) match.paymentDate = { ...match.paymentDate, $lte: new Date(endDate) };
      const payments = await ProcurementPayment.find(match)
        .populate('vendor', 'name')
        .populate('invoice', 'vendorInvoiceNumber')
        .lean();
      headers = ['Payment Date', 'Vendor', 'Invoice Number', 'Amount', 'Method', 'Reference'];
      data = payments.map(p => [
        new Date(p.paymentDate).toISOString().split('T')[0],
        p.vendor?.name,
        p.invoice?.vendorInvoiceNumber,
        p.amount,
        p.paymentMethod,
        p.transactionReference,
      ]);
      filename = 'payments.csv';
    }

    const csvRows = [headers.join(','), ...data.map(row => row.map(v => `"${v ?? ''}"`).join(','))];
    const csv = csvRows.join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(csv);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};
