import Client from "../models/clientModel.js";
import Subscription from "../models/subscriptionModel.js";
import Invoice from "../models/invoiceModel.js";
import Payment from "../models/paymentModel.js";

// Get client dashboard statistics
export const getClientDashboardStats = async (req, res) => {
  try {
    // Get client ID from logged-in user
    const client = await Client.findOne({ email: req.user.email });
    if (!client) {
      return res.status(404).json({ message: "Client not found" });
    }

    // Get active subscriptions count
    const activeSubscriptions = await Subscription.countDocuments({
      client: client._id,
      status: "active",
    });

    // Get pending subscriptions count
    const pendingSubscriptions = await Subscription.countDocuments({
      client: client._id,
      status: "pending",
    });

    // Get pending payments count and total
    const pendingPayments = await Payment.find({
      client: client._id,
      status: "pending",
    });
    const pendingPaymentsCount = pendingPayments.length;
    const pendingPaymentsTotal = pendingPayments.reduce(
      (sum, payment) => sum + (payment.amount || 0),
      0
    );

    // Get unpaid invoices
    const unpaidInvoices = await Invoice.find({
      client: client._id,
      status: { $in: ["sent", "overdue"] },
    });
    const totalDue = unpaidInvoices.reduce(
      (sum, invoice) => sum + (invoice.totalAmount || 0),
      0
    );

    // Get next payment due date
    const nextInvoice = await Invoice.findOne({
      client: client._id,
      status: { $in: ["sent", "overdue"] },
    }).sort({ dueDate: 1 });

    // Get recent activity (last 5 payments and invoices)
    const recentPayments = await Payment.find({ client: client._id })
      .populate("subscription", "subscriptionNumber")
      .sort({ createdAt: -1 })
      .limit(5);

    const recentInvoices = await Invoice.find({ client: client._id })
      .populate("subscription", "subscriptionNumber")
      .sort({ createdAt: -1 })
      .limit(5);

    // Combine and sort recent activity
    const recentActivity = [
      ...recentPayments.map((p) => ({
        type: "payment",
        id: p._id,
        date: p.createdAt,
        amount: p.amount,
        status: p.status,
        subscription: p.subscription?.subscriptionNumber,
      })),
      ...recentInvoices.map((i) => ({
        type: "invoice",
        id: i._id,
        date: i.createdAt,
        amount: i.totalAmount,
        status: i.status,
        invoiceNumber: i.invoiceNumber,
      })),
    ]
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .slice(0, 5);

    return res.status(200).json({
      activeSubscriptions,
      pendingSubscriptions,
      pendingPaymentsCount,
      pendingPaymentsTotal,
      totalDue,
      nextPaymentDue: nextInvoice?.dueDate || null,
      recentActivity,
    });
  } catch (error) {
    console.error("Error fetching client dashboard stats:", error.message);
    return res.status(500).json({ message: "Server error" });
  }
};

// Get client dashboard stats for specific client (admin view)
export const getClientDashboardStatsById = async (req, res) => {
  try {
    const { clientId } = req.params;

    // Get active subscriptions count
    const activeSubscriptions = await Subscription.countDocuments({
      client: clientId,
      status: "active",
    });

    // Get pending subscriptions count
    const pendingSubscriptions = await Subscription.countDocuments({
      client: clientId,
      status: "pending",
    });

    // Get pending payments count and total
    const pendingPayments = await Payment.find({
      client: clientId,
      status: "pending",
    });
    const pendingPaymentsCount = pendingPayments.length;
    const pendingPaymentsTotal = pendingPayments.reduce(
      (sum, payment) => sum + (payment.amount || 0),
      0
    );

    // Get unpaid invoices
    const unpaidInvoices = await Invoice.find({
      client: clientId,
      status: { $in: ["sent", "overdue"] },
    });
    const totalDue = unpaidInvoices.reduce(
      (sum, invoice) => sum + (invoice.totalAmount || 0),
      0
    );

    // Get next payment due date
    const nextInvoice = await Invoice.findOne({
      client: clientId,
      status: { $in: ["sent", "overdue"] },
    }).sort({ dueDate: 1 });

    // Get recent activity
    const recentPayments = await Payment.find({ client: clientId })
      .populate("subscription", "subscriptionNumber")
      .sort({ createdAt: -1 })
      .limit(5);

    const recentInvoices = await Invoice.find({ client: clientId })
      .populate("subscription", "subscriptionNumber")
      .sort({ createdAt: -1 })
      .limit(5);

    const recentActivity = [
      ...recentPayments.map((p) => ({
        type: "payment",
        id: p._id,
        date: p.createdAt,
        amount: p.amount,
        status: p.status,
        subscription: p.subscription?.subscriptionNumber,
      })),
      ...recentInvoices.map((i) => ({
        type: "invoice",
        id: i._id,
        date: i.createdAt,
        amount: i.totalAmount,
        status: i.status,
        invoiceNumber: i.invoiceNumber,
      })),
    ]
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .slice(0, 5);

    return res.status(200).json({
      activeSubscriptions,
      pendingSubscriptions,
      pendingPaymentsCount,
      pendingPaymentsTotal,
      totalDue,
      nextPaymentDue: nextInvoice?.dueDate || null,
      recentActivity,
    });
  } catch (error) {
    console.error("Error fetching client dashboard stats:", error.message);
    return res.status(500).json({ message: "Server error" });
  }
};
