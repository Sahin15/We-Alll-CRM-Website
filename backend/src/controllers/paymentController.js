import mongoose from "mongoose";
import Payment from "../models/paymentModel.js";
import Bill from "../models/billModel.js";
import Client from "../models/clientModel.js";

// Utility: If requester is a client, resolve their clientId and enforce ownership
const resolveClientAccess = async (req) => {
  if (req.user?.role !== "client") return null; // non-client callers unmanaged here
  const client = await Client.findOne({ email: req.user.email }).select("_id");
  return client?._id?.toString() || null;
};

// Utility: Recalculate bill totals from payments referencing the bill
const recalcBillFromPayments = async (billId) => {
  const payments = await Payment.find({
    bill: billId,
    status: { $ne: "cancelled" },
  });
  const totalPaid = payments.reduce((sum, p) => sum + (p.paidAmount || 0), 0);

  const bill = await Bill.findById(billId);
  if (!bill) return;

  bill.paidAmount = totalPaid;
  bill.balanceAmount = Math.max(0, (bill.totalAmount || 0) - totalPaid);

  if (bill.paidAmount >= (bill.totalAmount || 0)) {
    bill.status = "paid";
    bill.balanceAmount = 0;
    if (!bill.paidAt) bill.paidAt = new Date();
  } else if (bill.paidAmount > 0) {
    bill.status = "partial";
  } else {
    // leave sent/draft as-is, do not force pending here
  }

  if (
    bill.status !== "paid" &&
    bill.status !== "cancelled" &&
    bill.dueDate &&
    new Date() > bill.dueDate
  ) {
    bill.status = "overdue";
  }

  await bill.save();
};

// Create payment (admin/accounts)
export const createPayment = async (req, res) => {
  try {
    const {
      client,
      bill,
      amount,
      paidAmount = 0,
      paymentDate,
      dueDate,
      status,
      paymentMethod,
      transactionId,
      notes,
    } = req.body;

    if (!client || !amount || !dueDate) {
      return res
        .status(400)
        .json({ message: "client, amount and dueDate are required" });
    }

    const payment = await Payment.create({
      client,
      bill,
      amount,
      paidAmount,
      paymentDate,
      dueDate,
      status, // optional, pre-save hook will normalize
      paymentMethod,
      transactionId,
      notes,
      createdBy: req.user.id,
    });

    if (bill) await recalcBillFromPayments(bill);

    return res.status(201).json({ message: "Payment created", payment });
  } catch (error) {
    console.error("Error in createPayment:", error.message);
    return res.status(500).json({ message: "Server error" });
  }
};

// Get all payments (admin/accounts) with filters
export const getAllPayments = async (req, res) => {
  try {
    const { status, clientId, startDate, endDate } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (clientId) filter.client = clientId;
    if (startDate || endDate) {
      filter.paymentDate = {};
      if (startDate) filter.paymentDate.$gte = new Date(startDate);
      if (endDate) filter.paymentDate.$lte = new Date(endDate);
    }

    const payments = await Payment.find(filter)
      .populate("client", "name email company")
      .populate("bill", "billNumber totalAmount status")
      .sort({ paymentDate: -1, createdAt: -1 });

    return res.status(200).json(payments);
  } catch (error) {
    console.error("Error in getAllPayments:", error.message);
    return res.status(500).json({ message: "Server error" });
  }
};

// Get single payment (admin/accounts or client restricted)
export const getPaymentById = async (req, res) => {
  try {
    const payment = await Payment.findById(req.params.id)
      .populate("client", "_id name email")
      .populate("bill", "billNumber totalAmount status");
    if (!payment) return res.status(404).json({ message: "Payment not found" });

    // If requester is client, enforce ownership
    const clientIdForUser = await resolveClientAccess(req);
    if (
      clientIdForUser &&
      payment.client?._id?.toString() !== clientIdForUser
    ) {
      return res.status(403).json({ message: "Access denied" });
    }

    return res.status(200).json(payment);
  } catch (error) {
    console.error("Error in getPaymentById:", error.message);
    return res.status(500).json({ message: "Server error" });
  }
};

// Update payment (admin/accounts)
export const updatePayment = async (req, res) => {
  try {
    const { id } = req.params;
    const prev = await Payment.findById(id);
    if (!prev) return res.status(404).json({ message: "Payment not found" });

    const payment = await Payment.findByIdAndUpdate(id, req.body, {
      new: true,
    });
    if (!payment) return res.status(404).json({ message: "Payment not found" });

    // If bill ref exists (or changed), recalc bill
    const billId = payment.bill || prev.bill;
    if (billId) await recalcBillFromPayments(billId);

    return res.status(200).json({ message: "Payment updated", payment });
  } catch (error) {
    console.error("Error in updatePayment:", error.message);
    return res.status(500).json({ message: "Server error" });
  }
};

// Delete payment (admin/accounts)
export const deletePayment = async (req, res) => {
  try {
    const { id } = req.params;
    const payment = await Payment.findByIdAndDelete(id);
    if (!payment) return res.status(404).json({ message: "Payment not found" });

    if (payment.bill) await recalcBillFromPayments(payment.bill);

    return res.status(200).json({ message: "Payment deleted" });
  } catch (error) {
    console.error("Error in deletePayment:", error.message);
    return res.status(500).json({ message: "Server error" });
  }
};

// Record partial payment (admin/accounts)
export const recordPartialPayment = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      amountPaid,
      paymentDate = new Date(),
      paymentMethod,
      transactionId,
      notes,
    } = req.body;

    if (!amountPaid || amountPaid <= 0) {
      return res.status(400).json({ message: "amountPaid must be > 0" });
    }

    const payment = await Payment.findById(id);
    if (!payment) return res.status(404).json({ message: "Payment not found" });

    payment.paidAmount = (payment.paidAmount || 0) + amountPaid;
    payment.paymentDate = paymentDate;
    if (paymentMethod) payment.paymentMethod = paymentMethod;
    if (transactionId) payment.transactionId = transactionId;
    if (notes) payment.notes = notes;
    await payment.save(); // pre-save recalculates status/balance

    if (payment.bill) await recalcBillFromPayments(payment.bill);

    return res
      .status(200)
      .json({ message: "Partial payment recorded", payment });
  } catch (error) {
    console.error("Error in recordPartialPayment:", error.message);
    return res.status(500).json({ message: "Server error" });
  }
};

// Get logged-in client's own payments
export const getMyPayments = async (req, res) => {
  try {
    // Get client ID from logged-in user
    const client = await Client.findOne({ email: req.user.email });
    if (!client) {
      return res.status(404).json({ message: "Client not found" });
    }

    const payments = await Payment.find({ client: client._id })
      .populate("subscription", "subscriptionNumber")
      .populate("bill", "billNumber totalAmount status dueDate")
      .populate("verifiedBy", "name email")
      .populate("rejectedBy", "name email")
      .sort({ createdAt: -1 });

    return res.status(200).json(payments);
  } catch (error) {
    console.error("Error fetching my payments:", error.message);
    return res.status(500).json({ message: "Server error" });
  }
};

// Get client payments (admin/accounts or client restricted)
export const getClientPayments = async (req, res) => {
  try {
    const { clientId } = req.params;

    const clientIdForUser = await resolveClientAccess(req);
    if (clientIdForUser && clientIdForUser !== clientId) {
      return res.status(403).json({ message: "Access denied" });
    }

    const payments = await Payment.find({ client: clientId })
      .populate("bill", "billNumber totalAmount status dueDate")
      .sort({ paymentDate: -1, createdAt: -1 });

    return res.status(200).json(payments);
  } catch (error) {
    console.error("Error in getClientPayments:", error.message);
    return res.status(500).json({ message: "Server error" });
  }
};

// Overdue payments (admin/accounts)
export const getOverduePayments = async (req, res) => {
  try {
    const overdue = await Payment.find({ status: "overdue" })
      .populate("client", "name email")
      .populate("bill", "billNumber totalAmount dueDate")
      .sort({ dueDate: 1 });
    return res.status(200).json(overdue);
  } catch (error) {
    console.error("Error in getOverduePayments:", error.message);
    return res.status(500).json({ message: "Server error" });
  }
};

// Payment stats (admin/accounts) with optional filters
export const getPaymentStats = async (req, res) => {
  try {
    const { clientId, startDate, endDate } = req.query;
    const match = {};
    if (clientId) match.client = new mongoose.Types.ObjectId(clientId);
    if (startDate || endDate) {
      match.paymentDate = {};
      if (startDate) match.paymentDate.$gte = new Date(startDate);
      if (endDate) match.paymentDate.$lte = new Date(endDate);
    }

    const agg = await Payment.aggregate([
      { $match: match },
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
          amountSum: { $sum: { $ifNull: ["$amount", 0] } },
          paidSum: { $sum: { $ifNull: ["$paidAmount", 0] } },
          balanceSum: { $sum: { $ifNull: ["$balanceAmount", 0] } },
        },
      },
    ]);

    const summary = agg.reduce(
      (acc, cur) => {
        acc.counts[cur._id] = cur.count;
        acc.totals.amount += cur.amountSum;
        acc.totals.paid += cur.paidSum;
        acc.totals.balance += cur.balanceSum;
        return acc;
      },
      { counts: {}, totals: { amount: 0, paid: 0, balance: 0 } }
    );

    return res.status(200).json(summary);
  } catch (error) {
    console.error("Error in getPaymentStats:", error.message);
    return res.status(500).json({ message: "Server error" });
  }
};

// Payment history (admin/accounts or client restricted)
export const getPaymentHistory = async (req, res) => {
  try {
    const { clientId, startDate, endDate } = req.query;

    const clientIdForUser = await resolveClientAccess(req);
    if (clientIdForUser && clientId && clientIdForUser !== clientId) {
      return res.status(403).json({ message: "Access denied" });
    }

    const filter = {};
    if (clientId) filter.client = clientId;
    if (startDate || endDate) {
      filter.paymentDate = {};
      if (startDate) filter.paymentDate.$gte = new Date(startDate);
      if (endDate) filter.paymentDate.$lte = new Date(endDate);
    }

    const payments = await Payment.find(filter)
      .populate("bill", "billNumber totalAmount status")
      .sort({ paymentDate: -1, createdAt: -1 });

    return res.status(200).json(payments);
  } catch (error) {
    console.error("Error in getPaymentHistory:", error.message);
    return res.status(500).json({ message: "Server error" });
  }
};

// Submit payment for verification (client or admin)
export const submitPaymentForVerification = async (req, res) => {
  try {
    const {
      subscriptionId,
      amount,
      paymentMethod,
      upiDetails,
      paymentProof,
      notes,
    } = req.body;

    if (!subscriptionId || !amount) {
      return res
        .status(400)
        .json({ message: "Subscription and amount are required" });
    }

    // Get client ID from subscription or user
    let clientId;
    if (req.user.role === "client") {
      const client = await Client.findOne({ email: req.user.email });
      clientId = client._id;
    } else {
      const Subscription = mongoose.model("Subscription");
      const subscription = await Subscription.findById(subscriptionId);
      clientId = subscription.client;
    }

    const payment = await Payment.create({
      client: clientId,
      subscription: subscriptionId,
      amount,
      paidAmount: 0,
      balanceAmount: amount,
      paymentMethod: paymentMethod || "upi",
      upiDetails,
      paymentProof,
      status: "pending",
      paymentDate: new Date(),
      dueDate: new Date(),
      notes,
      createdBy: req.user.id,
    });

    const populatedPayment = await Payment.findById(payment._id)
      .populate("client", "name email phone")
      .populate("subscription", "subscriptionNumber");

    return res.status(201).json({
      message: "Payment submitted for verification",
      payment: populatedPayment,
    });
  } catch (error) {
    console.error("Error submitting payment:", error.message);
    return res.status(500).json({ message: "Server error" });
  }
};

// Get pending payments for verification (admin/accounts)
export const getPendingPayments = async (req, res) => {
  try {
    console.log("📋 Fetching pending payments...");
    const payments = await Payment.find({ status: "pending" })
      .populate("client", "name email phone company")
      .populate("subscription", "subscriptionNumber company totalAmount")
      .populate("createdBy", "name email")
      .sort({ createdAt: -1 });

    console.log(`✅ Found ${payments.length} pending payments`);
    return res.status(200).json(payments);
  } catch (error) {
    console.error("❌ Error fetching pending payments:", error.message);
    console.error("Error stack:", error.stack);
    return res.status(500).json({ 
      message: "Server error", 
      error: error.message,
      details: process.env.NODE_ENV === "development" ? error.stack : undefined
    });
  }
};

// Verify/Approve payment (admin/accounts)
export const verifyPayment = async (req, res) => {
  try {
    const { id } = req.params;
    const payment = await Payment.findById(id).populate("subscription");

    if (!payment) {
      return res.status(404).json({ message: "Payment not found" });
    }

    if (payment.status !== "pending") {
      return res
        .status(400)
        .json({ message: "Payment is not in pending status" });
    }

    // Update payment status
    payment.status = "verified";
    payment.paidAmount = payment.amount;
    payment.balanceAmount = 0;
    payment.verifiedBy = req.user.id;
    payment.verifiedAt = new Date();
    await payment.save();

    // Activate subscription
    if (payment.subscription) {
      const Subscription = mongoose.model("Subscription");
      const subscription = await Subscription.findById(payment.subscription);
      if (subscription && subscription.status === "pending") {
        subscription.status = "active";
        subscription.activatedBy = req.user.id;
        subscription.activatedAt = new Date();
        await subscription.save();
      }

      // Create invoice
      const Invoice = mongoose.model("Invoice");
      const invoiceExists = await Invoice.findOne({
        subscription: payment.subscription,
        payment: payment._id,
      });

      if (!invoiceExists) {
        // Auto-create invoice (you can call createInvoice function here)
        // For now, we'll just mark it as needing invoice generation
      }
    }

    const populatedPayment = await Payment.findById(payment._id)
      .populate("client", "name email")
      .populate("subscription", "subscriptionNumber")
      .populate("verifiedBy", "name email");

    return res.status(200).json({
      message: "Payment verified successfully",
      payment: populatedPayment,
    });
  } catch (error) {
    console.error("Error verifying payment:", error.message);
    return res.status(500).json({ message: "Server error" });
  }
};

// Reject payment (admin/accounts)
export const rejectPayment = async (req, res) => {
  try {
    const { id } = req.params;
    const { rejectionReason } = req.body;

    if (!rejectionReason) {
      return res.status(400).json({ message: "Rejection reason is required" });
    }

    const payment = await Payment.findById(id);

    if (!payment) {
      return res.status(404).json({ message: "Payment not found" });
    }

    if (payment.status !== "pending") {
      return res
        .status(400)
        .json({ message: "Payment is not in pending status" });
    }

    payment.status = "rejected";
    payment.rejectionReason = rejectionReason;
    payment.rejectedBy = req.user.id;
    payment.rejectedAt = new Date();
    await payment.save();

    const populatedPayment = await Payment.findById(payment._id)
      .populate("client", "name email")
      .populate("subscription", "subscriptionNumber")
      .populate("rejectedBy", "name email");

    return res.status(200).json({
      message: "Payment rejected",
      payment: populatedPayment,
    });
  } catch (error) {
    console.error("Error rejecting payment:", error.message);
    return res.status(500).json({ message: "Server error" });
  }
};
