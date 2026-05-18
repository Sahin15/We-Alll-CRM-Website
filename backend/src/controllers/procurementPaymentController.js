import ProcurementPayment from '../models/procurementPaymentModel.js';
import ProcurementInvoice from '../models/procurementInvoiceModel.js';
import PurchaseOrder from '../models/purchaseOrderModel.js';
import Vendor from '../models/vendorModel.js';
import { checkBudget, recordSpend } from '../services/procurementBudgetService.js';

// POST /payments — record payment
export const recordPayment = async (req, res) => {
  try {
    const {
      invoice: invoiceId,
      vendor: vendorId,
      paymentDate,
      amount,
      paymentMethod,
      transactionReference,
      notes,
    } = req.body;

    // Validate required fields
    const errors = [];
    if (!invoiceId) errors.push('invoice: required');
    if (!vendorId) errors.push('vendor: required');
    if (!paymentDate) errors.push('paymentDate: required');
    if (amount === undefined || amount === null) errors.push('amount: required');
    if (amount !== undefined && amount <= 0) errors.push('amount: must be greater than 0');
    if (!paymentMethod) errors.push('paymentMethod: required');
    if (!transactionReference || !transactionReference.trim()) errors.push('transactionReference: required');

    if (errors.length > 0) {
      return res.status(400).json({ message: 'Validation failed', errors });
    }

    // Fetch invoice
    const invoice = await ProcurementInvoice.findById(invoiceId);
    if (!invoice) return res.status(404).json({ message: 'Invoice not found' });

    // Validate amount <= outstandingBalance
    if (amount > invoice.outstandingBalance) {
      return res.status(400).json({
        message: `Payment amount (₹${amount}) exceeds outstanding balance (₹${invoice.outstandingBalance})`,
        detail: {
          invoiceAmount: invoice.invoiceAmount,
          paidAmount: invoice.paidAmount,
          outstandingBalance: invoice.outstandingBalance,
        },
      });
    }

    // Create payment record
    const payment = await ProcurementPayment.create({
      invoice: invoiceId,
      vendor: vendorId,
      paymentDate,
      amount,
      paymentMethod,
      transactionReference: transactionReference.trim(),
      notes,
      recordedBy: req.user._id,
    });

    // Update invoice paid amount and outstanding balance
    invoice.paidAmount += amount;
    invoice.outstandingBalance -= amount;

    // Update payment status
    if (invoice.outstandingBalance === 0) {
      invoice.paymentStatus = 'paid';
    } else {
      invoice.paymentStatus = 'partially_paid';
    }

    await invoice.save();

    // If invoice is now fully paid, record spend in budget
    if (invoice.paymentStatus === 'paid') {
      const po = await PurchaseOrder.findById(invoice.purchaseOrder);
      if (po) {
        const budgetResult = await checkBudget(po.department, po.project, po.financialYear, 0);
        if (budgetResult.budget) {
          await recordSpend(budgetResult.budget._id, invoice.invoiceAmount);
        }

        // Check if all PO invoices are paid → set PO status to closed
        const allInvoices = await ProcurementInvoice.find({ purchaseOrder: po._id });
        const allPaid = allInvoices.length > 0 && allInvoices.every((inv) => inv.paymentStatus === 'paid');
        if (allPaid) {
          po.status = 'closed';
          await po.save();
        }
      }
    }

    // Update vendor total spend
    await Vendor.findByIdAndUpdate(vendorId, { $inc: { totalSpend: amount } });

    res.status(201).json({ message: 'Payment recorded', payment });
  } catch (error) {
    console.error('recordPayment error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// GET /payments — list all payments
export const listPayments = async (req, res) => {
  try {
    const { invoice, vendor } = req.query;
    const query = {};

    if (invoice) query.invoice = invoice;
    if (vendor) query.vendor = vendor;

    const payments = await ProcurementPayment.find(query)
      .populate('invoice', 'vendorInvoiceNumber invoiceAmount paidAmount outstandingBalance paymentStatus')
      .populate('vendor', 'name primaryContact')
      .populate('recordedBy', 'name email')
      .sort({ createdAt: -1 });

    res.json(payments);
  } catch (error) {
    console.error('listPayments error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// GET /payments/:id — get payment detail
export const getPayment = async (req, res) => {
  try {
    const payment = await ProcurementPayment.findById(req.params.id)
      .populate({
        path: 'invoice',
        populate: {
          path: 'purchaseOrder',
          populate: [
            { path: 'vendor', select: 'name primaryContact' },
            { path: 'department', select: 'name' },
          ],
        },
      })
      .populate('vendor', 'name primaryContact address gstNumber panNumber')
      .populate('recordedBy', 'name email');

    if (!payment) {
      return res.status(404).json({ message: 'Payment not found' });
    }

    res.json(payment);
  } catch (error) {
    console.error('getPayment error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};
