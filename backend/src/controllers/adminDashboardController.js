import Subscription from "../models/subscriptionModel.js";
import Invoice from "../models/invoiceModel.js";
import Payment from "../models/paymentModel.js";
import Service from "../models/serviceModel.js";
import Plan from "../models/planModel.js";

// Get admin dashboard statistics
export const getAdminDashboardStats = async (req, res) => {
  try {
    const { company } = req.query;

    // Build filter based on company
    const filter = company ? { company } : {};

    // Current month dates
    const now = new Date();
    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const currentMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    // Previous month dates
    const previousMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const previousMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);

    // Year-to-date
    const yearStart = new Date(now.getFullYear(), 0, 1);

    // === REVENUE CALCULATIONS ===
    
    // Current month revenue (verified payments)
    const currentMonthPayments = await Payment.find({
      ...filter,
      status: "verified",
      verifiedAt: { $gte: currentMonthStart, $lte: currentMonthEnd },
    });
    const currentMonthRevenue = currentMonthPayments.reduce(
      (sum, payment) => sum + (payment.amount || 0),
      0
    );

    // Previous month revenue
    const previousMonthPayments = await Payment.find({
      ...filter,
      status: "verified",
      verifiedAt: { $gte: previousMonthStart, $lte: previousMonthEnd },
    });
    const previousMonthRevenue = previousMonthPayments.reduce(
      (sum, payment) => sum + (payment.amount || 0),
      0
    );

    // Year-to-date revenue
    const ytdPayments = await Payment.find({
      ...filter,
      status: "verified",
      verifiedAt: { $gte: yearStart },
    });
    const ytdRevenue = ytdPayments.reduce(
      (sum, payment) => sum + (payment.amount || 0),
      0
    );

    // === QUICK STATS ===
    
    // Active subscriptions
    const activeSubscriptions = await Subscription.countDocuments({
      ...filter,
      status: "active",
    });

    // Pending payments (awaiting verification)
    const pendingPayments = await Payment.countDocuments({
      ...filter,
      status: "pending",
    });

    // Overdue invoices
    const overdueInvoices = await Invoice.countDocuments({
      ...filter,
      status: "overdue",
    });

    // === REVENUE TREND (Last 12 months) ===
    const revenueTrend = [];
    for (let i = 11; i >= 0; i--) {
      const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59);
      
      const monthPayments = await Payment.find({
        ...filter,
        status: "verified",
        verifiedAt: { $gte: monthStart, $lte: monthEnd },
      });
      
      const monthRevenue = monthPayments.reduce(
        (sum, payment) => sum + (payment.amount || 0),
        0
      );

      revenueTrend.push({
        month: monthStart.toLocaleString("default", { month: "short", year: "numeric" }),
        revenue: monthRevenue,
      });
    }

    // === POPULAR SERVICES (Top 5) ===
    const subscriptions = await Subscription.find(filter)
      .populate("plan")
      .select("plan");

    // Count service occurrences across all subscriptions
    const serviceCount = {};
    for (const sub of subscriptions) {
      if (sub.plan && sub.plan.services) {
        for (const service of sub.plan.services) {
          const serviceId = service.service?.toString();
          if (serviceId) {
            serviceCount[serviceId] = (serviceCount[serviceId] || 0) + 1;
          }
        }
      }
    }

    // Get top 5 services
    const topServiceIds = Object.entries(serviceCount)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([id]) => id);

    const popularServices = await Service.find({
      _id: { $in: topServiceIds },
    }).select("name category basePrice");

    const popularServicesWithCount = popularServices.map((service) => ({
      _id: service._id,
      name: service.name,
      category: service.category,
      basePrice: service.basePrice,
      subscriptionCount: serviceCount[service._id.toString()],
    }));

    // === POPULAR PLANS (Top 5) ===
    const planCount = {};
    for (const sub of subscriptions) {
      if (sub.plan && sub.plan._id) {
        const planId = sub.plan._id.toString();
        planCount[planId] = (planCount[planId] || 0) + 1;
      }
    }

    const topPlanIds = Object.entries(planCount)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([id]) => id);

    const popularPlans = await Plan.find({
      _id: { $in: topPlanIds },
    }).select("name planType totalPrice");

    const popularPlansWithCount = popularPlans.map((plan) => ({
      _id: plan._id,
      name: plan.name,
      planType: plan.planType,
      totalPrice: plan.totalPrice,
      subscriptionCount: planCount[plan._id.toString()],
    }));

    // === RECENT ACTIVITY (Last 10 items) ===
    const recentPayments = await Payment.find(filter)
      .populate("client", "name email")
      .populate("subscription", "subscriptionNumber")
      .sort({ createdAt: -1 })
      .limit(5);

    const recentInvoices = await Invoice.find(filter)
      .populate("client", "name email")
      .sort({ createdAt: -1 })
      .limit(5);

    const recentActivity = [
      ...recentPayments.map((p) => ({
        type: "payment",
        id: p._id,
        date: p.createdAt,
        amount: p.amount,
        status: p.status,
        client: p.client?.name,
        subscription: p.subscription?.subscriptionNumber,
      })),
      ...recentInvoices.map((i) => ({
        type: "invoice",
        id: i._id,
        date: i.createdAt,
        amount: i.totalAmount,
        status: i.status,
        client: i.client?.name,
        invoiceNumber: i.invoiceNumber,
      })),
    ]
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .slice(0, 10);

    return res.status(200).json({
      revenue: {
        currentMonth: currentMonthRevenue,
        previousMonth: previousMonthRevenue,
        ytd: ytdRevenue,
        percentageChange:
          previousMonthRevenue > 0
            ? ((currentMonthRevenue - previousMonthRevenue) / previousMonthRevenue) * 100
            : 0,
      },
      quickStats: {
        activeSubscriptions,
        pendingPayments,
        overdueInvoices,
      },
      revenueTrend,
      popularServices: popularServicesWithCount,
      popularPlans: popularPlansWithCount,
      recentActivity,
    });
  } catch (error) {
    console.error("Error fetching admin dashboard stats:", error.message);
    return res.status(500).json({ message: "Server error" });
  }
};
