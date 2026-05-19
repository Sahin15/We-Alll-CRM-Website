import GoodsReceipt from '../models/goodsReceiptModel.js';
import PurchaseOrder from '../models/purchaseOrderModel.js';
import { generateNumber } from '../services/procurementNumberService.js';
import NotificationService from '../services/notificationService.js';

// POST /goods-receipts — create GR
export const createGR = async (req, res) => {
  try {
    const { purchaseOrder: poId, receivedDate, lineItems, notes, deliveryNoteUrl, deliveryNoteFileName } = req.body;

    if (!poId) return res.status(400).json({ message: 'purchaseOrder is required' });
    if (!receivedDate) return res.status(400).json({ message: 'receivedDate is required' });
    if (!lineItems || !Array.isArray(lineItems) || lineItems.length === 0) {
      return res.status(400).json({ message: 'At least one line item is required' });
    }

    // Fetch the PO
    const po = await PurchaseOrder.findById(poId);
    if (!po) return res.status(404).json({ message: 'Purchase order not found' });

    if (po.status === 'cancelled') {
      return res.status(422).json({ message: 'Cannot receive goods against a cancelled purchase order' });
    }

    if (!['issued', 'partially_received'].includes(po.status)) {
      return res.status(400).json({ message: 'Goods can only be received against issued or partially received purchase orders' });
    }

    // Validate each line item: receivedQuantity <= orderedQty - previouslyReceived
    const errors = [];
    for (const grItem of lineItems) {
      if (!grItem.poLineItemId) {
        errors.push(`poLineItemId is required for each line item`);
        continue;
      }

      const poLineItem = po.lineItems.id(grItem.poLineItemId);
      if (!poLineItem) {
        errors.push(`PO line item ${grItem.poLineItemId} not found`);
        continue;
      }

      const remaining = poLineItem.quantity - (poLineItem.receivedQuantity || 0);
      if (grItem.receivedQuantity <= 0) {
        errors.push(`receivedQuantity for item "${poLineItem.itemName}" must be greater than 0`);
      } else if (grItem.receivedQuantity > remaining) {
        errors.push(
          `receivedQuantity (${grItem.receivedQuantity}) for item "${poLineItem.itemName}" exceeds remaining quantity (${remaining})`
        );
      }
    }

    if (errors.length > 0) {
      return res.status(400).json({ message: 'Validation failed', errors });
    }

    // Generate GR number
    const grNumber = await generateNumber('GR');

    // Build GR line items with full details from PO
    const grLineItems = lineItems.map((grItem) => {
      const poLineItem = po.lineItems.id(grItem.poLineItemId);
      return {
        poLineItemId: grItem.poLineItemId,
        itemName: poLineItem.itemName,
        orderedQuantity: poLineItem.quantity,
        receivedQuantity: grItem.receivedQuantity,
        unitPrice: poLineItem.unitPrice,
        category: poLineItem.category,
        notes: grItem.notes || '',
      };
    });

    // Create GR
    const gr = await GoodsReceipt.create({
      grNumber,
      purchaseOrder: poId,
      receivedBy: req.user._id,
      receivedDate,
      lineItems: grLineItems,
      deliveryNoteUrl,
      deliveryNoteFileName,
      notes,
      createdBy: req.user._id,
    });

    // Update PO line item received quantities
    for (const grItem of lineItems) {
      const poLineItem = po.lineItems.id(grItem.poLineItemId);
      if (poLineItem) {
        poLineItem.receivedQuantity = (poLineItem.receivedQuantity || 0) + grItem.receivedQuantity;
      }
    }

    // Determine new PO status
    const allFullyReceived = po.lineItems.every(
      (item) => (item.receivedQuantity || 0) >= item.quantity
    );
    const anyReceived = po.lineItems.some((item) => (item.receivedQuantity || 0) > 0);

    if (allFullyReceived) {
      po.status = 'fully_received';
    } else if (anyReceived) {
      po.status = 'partially_received';
    }

    await po.save();

    // Notify PO creator
    if (po.createdBy) {
      await NotificationService.sendToUser(
        po.createdBy,
        '📦 Goods Receipt Recorded',
        `Goods receipt ${grNumber} has been recorded for PO ${po.poNumber}`,
        {
          type: 'procurement_gr_recorded',
          data: { grId: gr._id.toString(), grNumber, poId: po._id.toString(), poNumber: po.poNumber },
          actionUrl: `/procurement/goods-receipts/${gr._id}`,
          senderId: req.user._id,
        }
      );
    }

    res.status(201).json({ message: 'Goods receipt created', gr });
  } catch (error) {
    console.error('createGR error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// GET /goods-receipts — list all GRs
export const listGRs = async (req, res) => {
  try {
    const { purchaseOrder } = req.query;
    const query = {};

    if (purchaseOrder) query.purchaseOrder = purchaseOrder;

    const grs = await GoodsReceipt.find(query)
      .populate('purchaseOrder', 'poNumber status vendor')
      .populate('receivedBy', 'name email')
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 });

    res.json({ success: true, message: 'Goods receipts retrieved', data: grs });
  } catch (error) {
    console.error('listGRs error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// GET /goods-receipts/:id — get GR detail
export const getGR = async (req, res) => {
  try {
    const gr = await GoodsReceipt.findById(req.params.id)
      .populate({
        path: 'purchaseOrder',
        populate: [
          { path: 'vendor', select: 'name primaryContact' },
          { path: 'department', select: 'name' },
          { path: 'createdBy', select: 'name email' },
        ],
      })
      .populate('receivedBy', 'name email')
      .populate('createdBy', 'name email')
      .populate('createdAssets');

    if (!gr) {
      return res.status(404).json({ message: 'Goods receipt not found' });
    }

    res.json(gr);
  } catch (error) {
    console.error('getGR error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};
