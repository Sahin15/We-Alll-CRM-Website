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

    // === OPTIMIZED: Use aggregation pipeline instead of multiple queries ===
    
    // Get all revenue data in one query using aggregation
    const revenueData = await Payment.aggregate([
      {
        $match: {
          ...filter,
          status: "verified"
        }
      },
      {
        $facet: {
          currentMonth: [
            {
              $match: {
                verifiedAt: { $gte: currentMonthStart, $lte: currentMonthEnd }
              }
            },
            {
              $group: {
                _id: null,
                total: { $sum: "$amount" }
              }
            }
          ],
          previousMonth: [
            {
              $match: {
                verifiedAt: { $gte: previousMonthStart, $lte: previousMonthEnd }
              }
            },
            {
              $group: {
                _id: null,
                total: { $sum: "$amount" }
              }
            }
          ],
          yearToDate: [
            {
              $match: {
                verifiedAt: { $gte: yearStart }
              }
            },
            {
              $group: {
                _id: null,
                total: { $sum: "$amount" }
              }
            }
          ],
          monthlyTrend: [
            {
              $match: {
                verifiedAt: { $gte: new Date(now.getFullYear() - 1, now.getMonth(), 1) }
              }
            },
            {
              $group: {
                _id: {
                  year: { $year: "$verifiedAt" },
                  month: { $month: "$verifiedAt" }
                },
                total: { $sum: "$amount" }
              }
            },
            {
              $sort: { "_id.year": 1, "_id.month": 1 }
            }
          ]
        }
      }
    ]);

    const currentMonthRevenue = revenueData[0]?.currentMonth[0]?.total || 0;
    const previousMonthRevenue = revenueData[0]?.previousMonth[0]?.total || 0;
    const ytdRevenue = revenueData[0]?.yearToDate[0]?.total || 0;

    // Format revenue trend
    const revenueTrend = revenueData[0]?.monthlyTrend.map(item => {
      const date = new Date(item._id.year, item._id.month - 1);
      return {
        month: date.toLocaleString("default", { month: "short", year: "numeric" }),
        revenue: item.total
      };
    }) || [];

    // === QUICK STATS - Use countDocuments for simple counts ===
    const [activeSubscriptions, pendingPayments, overdueInvoices] = await Promise.all([
      Subscription.countDocuments({ ...filter, status: "active" }),
      Payment.countDocuments({ ...filter, status: "pending" }),
      Invoice.countDocuments({ ...filter, status: "overdue" })
    ]);

    // === POPULAR SERVICES & PLANS - Optimized with aggregation ===
    const subscriptions = await Subscription.find(filter)
      .populate("plan", "services planType totalPrice name")
      .select("plan")
      .lean(); // Use lean() for read-only queries

    // Count service occurrences
    const serviceCount = {};
    const planCount = {};
    
    for (const sub of subscriptions) {
      if (sub.plan) {
        const planId = sub.plan._id.toString();
        planCount[planId] = (planCount[planId] || 0) + 1;
        
        if (sub.plan.services) {
          for (const service of sub.plan.services) {
            const serviceId = service.service?.toString();
            if (serviceId) {
              serviceCount[serviceId] = (serviceCount[serviceId] || 0) + 1;
            }
          }
        }
      }
    }

    // Get top 5 services and plans in parallel
    const [topServiceIds, topPlanIds] = [
      Object.entries(serviceCount)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5)
        .map(([id]) => id),
      Object.entries(planCount)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5)
        .map(([id]) => id)
    ];

    const [popularServices, popularPlans] = await Promise.all([
      Service.find({ _id: { $in: topServiceIds } })
        .select("name category basePrice")
        .lean(),
      Plan.find({ _id: { $in: topPlanIds } })
        .select("name planType totalPrice")
        .lean()
    ]);

    const popularServicesWithCount = popularServices.map((service) => ({
      _id: service._id,
      name: service.name,
      category: service.category,
      basePrice: service.basePrice,
      subscriptionCount: serviceCount[service._id.toString()],
    }));

    const popularPlansWithCount = popularPlans.map((plan) => ({
      _id: plan._id,
      name: plan.name,
      planType: plan.planType,
      totalPrice: plan.totalPrice,
      subscriptionCount: planCount[plan._id.toString()],
    }));

    // === RECENT ACTIVITY - Optimized with parallel queries ===
    const [recentPayments, recentInvoices] = await Promise.all([
      Payment.find(filter)
        .populate("client", "name email")
        .populate("subscription", "subscriptionNumber")
        .sort({ createdAt: -1 })
        .limit(5)
        .lean(),
      Invoice.find(filter)
        .populate("client", "name email")
        .sort({ createdAt: -1 })
        .limit(5)
        .lean()
    ]);

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
    
    return res.status(500).json({ message: "Server error" });
  }
};
