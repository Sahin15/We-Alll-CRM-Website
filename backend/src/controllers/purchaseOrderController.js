import PurchaseOrder from '../models/purchaseOrderModel.js';
import PurchaseRequest from '../models/purchaseRequestModel.js';
import Vendor from '../models/vendorModel.js';
import { generateNumber } from '../services/procurementNumberService.js';
import { checkBudget, commitBudget, releaseBudget, getFinancialYear } from '../services/procurementBudgetService.js';
import NotificationService from '../services/notificationService.js';
import User from '../models/userModel.js';
import PDFDocument from 'pdfkit';

// Helper: get current financial year string e.g. "2025-2026"
function currentFinancialYear() {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  return month >= 4 ? `${year}-${year + 1}` : `${year - 1}-${year}`;
}

// POST /purchase-orders — create PO
export const createPO = async (req, res) => {
  try {
    const {
      linkedPRs,
      vendor: vendorId,
      lineItems,
      deliveryAddress,
      expectedDeliveryDate,
      paymentTerms,
      department,
      project,
    } = req.body;

    // Validate at least one linked PR
    if (!linkedPRs || !Array.isArray(linkedPRs) || linkedPRs.length === 0) {
      return res.status(400).json({ message: 'At least one linked purchase request is required' });
    }

    // Validate vendor
    if (!vendorId) {
      return res.status(400).json({ message: 'Vendor is required' });
    }

    // Check vendor exists and is active
    const vendor = await Vendor.findById(vendorId);
    if (!vendor) {
      return res.status(404).json({ message: 'Vendor not found' });
    }
    if (!vendor.isActive) {
      return res.status(422).json({ message: 'Cannot create PO with a deactivated vendor' });
    }

    // Validate linked PRs are all approved
    const prs = await PurchaseRequest.find({ _id: { $in: linkedPRs }, status: 'approved' });
    if (prs.length !== linkedPRs.length) {
      return res.status(400).json({ message: 'All linked purchase requests must be in approved status' });
    }

    // Validate line items
    if (!lineItems || !Array.isArray(lineItems) || lineItems.length === 0) {
      return res.status(400).json({ message: 'At least one line item is required' });
    }

    const errors = [];
    lineItems.forEach((item, i) => {
      if (!item.itemName) errors.push(`lineItems[${i}].itemName: required`);
      if (!item.quantity || item.quantity < 1) errors.push(`lineItems[${i}].quantity: must be >= 1`);
      if (item.unitPrice === undefined || item.unitPrice < 0) errors.push(`lineItems[${i}].unitPrice: required`);
    });
    if (errors.length > 0) {
      return res.status(400).json({ message: 'Validation failed', errors });
    }

    if (!deliveryAddress) return res.status(400).json({ message: 'deliveryAddress is required' });
    if (!expectedDeliveryDate) return res.status(400).json({ message: 'expectedDeliveryDate is required' });
    if (!paymentTerms) return res.status(400).json({ message: 'paymentTerms is required' });
    if (!department) return res.status(400).json({ message: 'department is required' });

    // Compute total value
    const totalValue = lineItems.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);

    const poNumber = await generateNumber('PO');
    const financialYear = currentFinancialYear();

    const po = await PurchaseOrder.create({
      poNumber,
      vendor: vendorId,
      linkedPRs,
      lineItems,
      totalValue,
      deliveryAddress,
      expectedDeliveryDate,
      paymentTerms,
      department,
      project: project || null,
      status: 'draft',
      createdBy: req.user._id,
      financialYear,
    });

    // Set linked PRs to po_created
    await PurchaseRequest.updateMany(
      { _id: { $in: linkedPRs } },
      { $set: { status: 'po_created' } }
    );

    res.status(201).json({ message: 'Purchase order created', po });
  } catch (error) {
    console.error('createPO error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// GET /purchase-orders — list all POs
export const listPOs = async (req, res) => {
  try {
    const { status, financialYear, vendor } = req.query;
    const query = {};

    if (status) query.status = status;
    if (financialYear) query.financialYear = financialYear;
    if (vendor) query.vendor = vendor;

    const pos = await PurchaseOrder.find(query)
      .populate('vendor', 'name primaryContact isActive')
      .populate('linkedPRs', 'prNumber status requestedBy')
      .populate('department', 'name')
      .populate('project', 'name')
      .populate('createdBy', 'name email')
      .populate('issuedBy', 'name email')
      .sort({ createdAt: -1 });

    res.json({ success: true, message: 'Purchase orders retrieved', data: pos });
  } catch (error) {
    console.error('listPOs error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// GET /purchase-orders/:id — get PO detail
export const getPO = async (req, res) => {
  try {
    const po = await PurchaseOrder.findById(req.params.id)
      .populate('vendor', 'name primaryContact address gstNumber panNumber isActive')
      .populate({
        path: 'linkedPRs',
        populate: { path: 'requestedBy', select: 'name email' },
      })
      .populate('department', 'name')
      .populate('project', 'name')
      .populate('createdBy', 'name email')
      .populate('issuedBy', 'name email')
      .populate('cancelledBy', 'name email');

    if (!po) {
      return res.status(404).json({ message: 'Purchase order not found' });
    }

    res.json(po);
  } catch (error) {
    console.error('getPO error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// PATCH /purchase-orders/:id — update draft PO
export const updatePO = async (req, res) => {
  try {
    const po = await PurchaseOrder.findById(req.params.id);
    if (!po) return res.status(404).json({ message: 'Purchase order not found' });

    if (po.status !== 'draft') {
      return res.status(403).json({ message: 'Only draft purchase orders can be edited' });
    }

    const allowedFields = [
      'lineItems', 'deliveryAddress', 'expectedDeliveryDate',
      'paymentTerms', 'department', 'project',
    ];

    allowedFields.forEach((field) => {
      if (req.body[field] !== undefined) {
        po[field] = req.body[field];
      }
    });

    // Recompute total value if lineItems changed
    if (req.body.lineItems) {
      po.totalValue = po.lineItems.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
    }

    await po.save();
    res.json({ message: 'Purchase order updated', po });
  } catch (error) {
    console.error('updatePO error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// PATCH /purchase-orders/:id/issue — issue PO
export const issuePO = async (req, res) => {
  try {
    const po = await PurchaseOrder.findById(req.params.id).populate('linkedPRs');
    if (!po) return res.status(404).json({ message: 'Purchase order not found' });

    if (po.status !== 'draft') {
      return res.status(403).json({ message: 'Only draft purchase orders can be issued' });
    }

    // Final budget check — no override at PO stage
    const fy = po.financialYear;
    const budgetResult = await checkBudget(po.department, po.project, fy, po.totalValue);

    if (budgetResult.exceeded) {
      return res.status(422).json({
        message: 'Cannot issue PO: budget exceeded',
        detail: {
          poTotal: po.totalValue,
          availableBudget: budgetResult.available,
          shortfall: po.totalValue - budgetResult.available,
        },
      });
    }

    // Commit budget
    if (budgetResult.budget) {
      await commitBudget(budgetResult.budget._id, po.totalValue);
    }

    po.status = 'issued';
    po.issuedAt = new Date();
    po.issuedBy = req.user._id;
    po.budgetCommitted = true;
    po.committedAmount = po.totalValue;

    await po.save();

    // Notify requestors of linked PRs
    const requestorIds = [
      ...new Set(
        po.linkedPRs
          .map((pr) => (pr.requestedBy ? pr.requestedBy.toString() : null))
          .filter(Boolean)
      ),
    ];

    if (requestorIds.length > 0) {
      await NotificationService.sendToMultiple(
        requestorIds,
        '📦 Purchase Order Issued',
        `Purchase Order ${po.poNumber} has been issued for your request(s)`,
        {
          type: 'procurement_po_issued',
          data: { poId: po._id.toString(), poNumber: po.poNumber },
          actionUrl: `/procurement/purchase-orders/${po._id}`,
          senderId: req.user._id,
        }
      );
    }

    res.json({ message: 'Purchase order issued', po });
  } catch (error) {
    console.error('issuePO error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// PATCH /purchase-orders/:id/cancel — cancel PO
export const cancelPO = async (req, res) => {
  try {
    const { cancellationReason, reason } = req.body;
    const cancelNote = cancellationReason || reason;
    const po = await PurchaseOrder.findById(req.params.id);
    if (!po) return res.status(404).json({ message: 'Purchase order not found' });

    if (!['draft', 'issued'].includes(po.status)) {
      return res.status(403).json({ message: 'Only draft or issued purchase orders can be cancelled' });
    }

    // Release committed budget if applicable
    if (po.budgetCommitted && po.committedAmount > 0) {
      const fy = po.financialYear;
      const budgetResult = await checkBudget(po.department, po.project, fy, 0);
      if (budgetResult.budget) {
        await releaseBudget(budgetResult.budget._id, po.committedAmount);
      }
    }

    // Revert linked PRs to approved
    if (po.linkedPRs && po.linkedPRs.length > 0) {
      await PurchaseRequest.updateMany(
        { _id: { $in: po.linkedPRs } },
        { $set: { status: 'approved' } }
      );
    }

    po.status = 'cancelled';
    po.cancelledAt = new Date();
    po.cancelledBy = req.user._id;
    if (cancelNote) po.cancellationReason = cancelNote;

    await po.save();

    res.json({ message: 'Purchase order cancelled', po });
  } catch (error) {
    console.error('cancelPO error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// GET /purchase-orders/:id/pdf — generate and stream PO as PDF
export const getPOPdf = async (req, res) => {
  try {
    const po = await PurchaseOrder.findById(req.params.id)
      .populate('vendor', 'name primaryContact address gstNumber panNumber')
      .populate('department', 'name')
      .populate('project', 'name')
      .populate('issuedBy', 'name');

    if (!po) {
      return res.status(404).json({ message: 'Purchase order not found' });
    }

    // Format helpers
    const fmt = (n) =>
      new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(n || 0);
    const fmtDate = (d) => (d ? new Date(d).toLocaleDateString('en-IN') : '—');

    // Build vendor address string
    const addr = po.vendor?.address || {};
    const vendorAddress = [addr.street, addr.city, addr.state, addr.pincode, addr.country]
      .filter(Boolean)
      .join(', ');

    // Compute subtotal (same as totalValue but recalculated for display)
    const subtotal = po.lineItems.reduce(
      (sum, item) => sum + item.quantity * item.unitPrice,
      0
    );
    const grandTotal = subtotal; // No separate tax field in model; extend if needed

    // ── PDF generation ──────────────────────────────────────────────────────
    const doc = new PDFDocument({ margin: 50, size: 'A4' });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="PO-${po.poNumber}.pdf"`
    );
    doc.pipe(res);

    // ── Company header ───────────────────────────────────────────────────────
    doc
      .fontSize(20)
      .font('Helvetica-Bold')
      .text('We Alll Office', { align: 'center' });
    doc
      .fontSize(10)
      .font('Helvetica')
      .text('Purchase Order', { align: 'center' });
    doc.moveDown(0.5);

    // Horizontal rule
    doc
      .moveTo(50, doc.y)
      .lineTo(545, doc.y)
      .strokeColor('#cccccc')
      .stroke();
    doc.moveDown(0.5);

    // ── PO meta block ────────────────────────────────────────────────────────
    const metaTop = doc.y;
    // Left column
    doc
      .fontSize(10)
      .font('Helvetica-Bold')
      .text('PO Number:', 50, metaTop)
      .font('Helvetica')
      .text(po.poNumber, 150, metaTop);

    doc
      .font('Helvetica-Bold')
      .text('Date Issued:', 50, metaTop + 16)
      .font('Helvetica')
      .text(fmtDate(po.issuedAt || po.createdAt), 150, metaTop + 16);

    doc
      .font('Helvetica-Bold')
      .text('Status:', 50, metaTop + 32)
      .font('Helvetica')
      .text(po.status.replace(/_/g, ' ').toUpperCase(), 150, metaTop + 32);

    doc
      .font('Helvetica-Bold')
      .text('Payment Terms:', 50, metaTop + 48)
      .font('Helvetica')
      .text(po.paymentTerms, 150, metaTop + 48);

    // Right column
    doc
      .font('Helvetica-Bold')
      .text('Expected Delivery:', 320, metaTop)
      .font('Helvetica')
      .text(fmtDate(po.expectedDeliveryDate), 450, metaTop);

    doc
      .font('Helvetica-Bold')
      .text('Department:', 320, metaTop + 16)
      .font('Helvetica')
      .text(po.department?.name || '—', 450, metaTop + 16);

    if (po.project?.name) {
      doc
        .font('Helvetica-Bold')
        .text('Project:', 320, metaTop + 32)
        .font('Helvetica')
        .text(po.project.name, 450, metaTop + 32);
    }

    doc.moveDown(4);

    // ── Vendor details ───────────────────────────────────────────────────────
    doc
      .fontSize(11)
      .font('Helvetica-Bold')
      .text('Vendor Details', 50, doc.y);
    doc
      .moveTo(50, doc.y + 2)
      .lineTo(545, doc.y + 2)
      .strokeColor('#cccccc')
      .stroke();
    doc.moveDown(0.4);

    doc
      .fontSize(10)
      .font('Helvetica-Bold')
      .text('Name: ', 50, doc.y, { continued: true })
      .font('Helvetica')
      .text(po.vendor?.name || '—');

    if (po.vendor?.primaryContact?.name) {
      doc
        .font('Helvetica-Bold')
        .text('Contact: ', 50, doc.y, { continued: true })
        .font('Helvetica')
        .text(
          `${po.vendor.primaryContact.name} | ${po.vendor.primaryContact.email} | ${po.vendor.primaryContact.phone}`
        );
    }

    if (vendorAddress) {
      doc
        .font('Helvetica-Bold')
        .text('Address: ', 50, doc.y, { continued: true })
        .font('Helvetica')
        .text(vendorAddress);
    }

    if (po.vendor?.gstNumber) {
      doc
        .font('Helvetica-Bold')
        .text('GST No: ', 50, doc.y, { continued: true })
        .font('Helvetica')
        .text(po.vendor.gstNumber);
    }

    doc.moveDown(0.8);

    // ── Delivery address ─────────────────────────────────────────────────────
    doc
      .fontSize(11)
      .font('Helvetica-Bold')
      .text('Delivery Address', 50, doc.y);
    doc
      .moveTo(50, doc.y + 2)
      .lineTo(545, doc.y + 2)
      .strokeColor('#cccccc')
      .stroke();
    doc.moveDown(0.4);
    doc.fontSize(10).font('Helvetica').text(po.deliveryAddress, 50, doc.y);
    doc.moveDown(0.8);

    // ── Line items table ─────────────────────────────────────────────────────
    doc
      .fontSize(11)
      .font('Helvetica-Bold')
      .text('Line Items', 50, doc.y);
    doc
      .moveTo(50, doc.y + 2)
      .lineTo(545, doc.y + 2)
      .strokeColor('#cccccc')
      .stroke();
    doc.moveDown(0.4);

    // Table header
    const colX = { no: 50, desc: 75, qty: 310, unit: 370, total: 460 };
    const rowH = 18;
    let tableY = doc.y;

    doc
      .fontSize(9)
      .font('Helvetica-Bold')
      .fillColor('#333333')
      .text('#', colX.no, tableY)
      .text('Description', colX.desc, tableY)
      .text('Qty', colX.qty, tableY)
      .text('Unit Price', colX.unit, tableY)
      .text('Total', colX.total, tableY);

    tableY += rowH;
    doc
      .moveTo(50, tableY)
      .lineTo(545, tableY)
      .strokeColor('#cccccc')
      .stroke();
    tableY += 4;

    // Table rows
    doc.font('Helvetica').fillColor('#000000');
    po.lineItems.forEach((item, idx) => {
      // Page break guard
      if (tableY > 720) {
        doc.addPage();
        tableY = 50;
      }
      const lineTotal = item.quantity * item.unitPrice;
      const descText = item.itemName + (item.description ? `\n${item.description}` : '');
      const descHeight = item.description ? rowH * 2 : rowH;

      doc
        .fontSize(9)
        .text(String(idx + 1), colX.no, tableY)
        .text(descText, colX.desc, tableY, { width: 225 })
        .text(String(item.quantity), colX.qty, tableY)
        .text(fmt(item.unitPrice), colX.unit, tableY, { width: 85 })
        .text(fmt(lineTotal), colX.total, tableY, { width: 80 });

      tableY += descHeight + 4;
    });

    // Bottom rule
    doc
      .moveTo(50, tableY)
      .lineTo(545, tableY)
      .strokeColor('#cccccc')
      .stroke();
    tableY += 8;

    // ── Totals ───────────────────────────────────────────────────────────────
    doc
      .fontSize(10)
      .font('Helvetica-Bold')
      .text('Subtotal:', 380, tableY)
      .font('Helvetica')
      .text(fmt(subtotal), colX.total, tableY, { width: 80 });

    tableY += rowH;
    doc
      .font('Helvetica-Bold')
      .text('Grand Total:', 380, tableY)
      .font('Helvetica')
      .text(fmt(grandTotal), colX.total, tableY, { width: 80 });

    doc.moveDown(3);

    // ── Terms and conditions ─────────────────────────────────────────────────
    // Ensure we have space; add page if needed
    if (doc.y > 650) doc.addPage();

    doc
      .fontSize(11)
      .font('Helvetica-Bold')
      .text('Terms & Conditions', 50, doc.y);
    doc
      .moveTo(50, doc.y + 2)
      .lineTo(545, doc.y + 2)
      .strokeColor('#cccccc')
      .stroke();
    doc.moveDown(0.4);

    const terms = [
      `1. Payment terms: ${po.paymentTerms}.`,
      '2. Goods must be delivered to the address specified above by the expected delivery date.',
      '3. All items must match the specifications in this purchase order.',
      '4. Invoice must reference this PO number for payment processing.',
      '5. Any discrepancies must be reported within 3 business days of delivery.',
      '6. We Alll Office reserves the right to reject non-conforming goods.',
    ];

    doc.fontSize(9).font('Helvetica');
    terms.forEach((t) => {
      doc.text(t, 50, doc.y, { width: 495 });
      doc.moveDown(0.3);
    });

    doc.moveDown(1);

    // ── Signature block ──────────────────────────────────────────────────────
    if (doc.y > 680) doc.addPage();

    const sigY = doc.y + 10;
    // Left signature
    doc
      .moveTo(50, sigY + 40)
      .lineTo(200, sigY + 40)
      .strokeColor('#000000')
      .stroke();
    doc
      .fontSize(9)
      .font('Helvetica-Bold')
      .text('Authorised Signatory', 50, sigY + 44)
      .font('Helvetica')
      .text('We Alll Office', 50, sigY + 56);

    // Right signature
    doc
      .moveTo(350, sigY + 40)
      .lineTo(545, sigY + 40)
      .strokeColor('#000000')
      .stroke();
    doc
      .fontSize(9)
      .font('Helvetica-Bold')
      .text('Vendor Acknowledgement', 350, sigY + 44)
      .font('Helvetica')
      .text(po.vendor?.name || '', 350, sigY + 56);

    // Footer
    doc
      .fontSize(8)
      .fillColor('#888888')
      .text(
        `Generated on ${new Date().toLocaleString('en-IN')} | PO ${po.poNumber}`,
        50,
        sigY + 80,
        { align: 'center', width: 495 }
      );

    doc.end();
  } catch (error) {
    console.error('getPOPdf error:', error);
    if (!res.headersSent) {
      res.status(500).json({ message: 'Server error', error: error.message });
    }
  }
};
