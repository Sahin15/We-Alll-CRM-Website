import ProcurementInvoice from '../models/procurementInvoiceModel.js';
import PurchaseOrder from '../models/purchaseOrderModel.js';

// POST /invoices — create invoice
export const createInvoice = async (req, res) => {
  try {
    const {
      purchaseOrder: poId,
      vendor,
      vendorInvoiceNumber,
      invoiceDate,
      dueDate,
      invoiceAmount,
      invoiceDocumentUrl,
      invoiceDocumentFileName,
    } = req.body;

    // Validate required fields
    const errors = [];
    if (!poId) errors.push('purchaseOrder: required');
    if (!vendor) errors.push('vendor: required');
    if (!vendorInvoiceNumber || !vendorInvoiceNumber.trim()) errors.push('vendorInvoiceNumber: required');
    if (!invoiceDate) errors.push('invoiceDate: required');
    if (!dueDate) errors.push('dueDate: required');
    if (invoiceAmount === undefined || invoiceAmount === null) errors.push('invoiceAmount: required');
    if (invoiceAmount !== undefined && invoiceAmount < 0) errors.push('invoiceAmount: must be >= 0');

    if (errors.length > 0) {
      return res.status(400).json({ message: 'Validation failed', errors });
    }

    // Fetch PO
    const po = await PurchaseOrder.findById(poId);
    if (!po) return res.status(404).json({ message: 'Purchase order not found' });

    // Validate invoice amount does not exceed remaining uninvoiced PO value
    const existingInvoices = await ProcurementInvoice.find({ purchaseOrder: poId });
    const totalInvoiced = existingInvoices.reduce((sum, inv) => sum + inv.invoiceAmount, 0);
    const remaining = po.totalValue - totalInvoiced;

    if (invoiceAmount > remaining) {
      return res.status(400).json({
        message: `Invoice amount (₹${invoiceAmount}) exceeds remaining uninvoiced PO value (₹${remaining})`,
        detail: {
          poTotalValue: po.totalValue,
          totalAlreadyInvoiced: totalInvoiced,
          remainingInvoiceable: remaining,
        },
      });
    }

    const invoice = await ProcurementInvoice.create({
      purchaseOrder: poId,
      vendor,
      vendorInvoiceNumber: vendorInvoiceNumber.trim(),
      invoiceDate,
      dueDate,
      invoiceAmount,
      paidAmount: 0,
      outstandingBalance: invoiceAmount,
      paymentStatus: 'unpaid',
      invoiceDocumentUrl,
      invoiceDocumentFileName,
      createdBy: req.user._id,
    });

    res.status(201).json({ message: 'Invoice created', invoice });
  } catch (error) {
    console.error('createInvoice error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// GET /invoices — list all invoices
export const listInvoices = async (req, res) => {
  try {
    const { purchaseOrder, vendor, paymentStatus } = req.query;
    const query = {};

    if (purchaseOrder) query.purchaseOrder = purchaseOrder;
    if (vendor) query.vendor = vendor;
    if (paymentStatus) query.paymentStatus = paymentStatus;

    const invoices = await ProcurementInvoice.find(query)
      .populate('purchaseOrder', 'poNumber status totalValue')
      .populate('vendor', 'name primaryContact')
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 });

    res.json({ success: true, message: 'Invoices retrieved', data: invoices });
  } catch (error) {
    console.error('listInvoices error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// GET /invoices/:id — get invoice detail
export const getInvoice = async (req, res) => {
  try {
    const invoice = await ProcurementInvoice.findById(req.params.id)
      .populate({
        path: 'purchaseOrder',
        populate: [
          { path: 'vendor', select: 'name primaryContact' },
          { path: 'department', select: 'name' },
          { path: 'createdBy', select: 'name email' },
        ],
      })
      .populate('vendor', 'name primaryContact address gstNumber panNumber')
      .populate('createdBy', 'name email');

    if (!invoice) {
      return res.status(404).json({ message: 'Invoice not found' });
    }

    res.json(invoice);
  } catch (error) {
    console.error('getInvoice error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};
