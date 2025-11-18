import cron from "node-cron";
import Bill from "../models/billModel.js";
import Payment from "../models/paymentModel.js";
import Client from "../models/clientModel.js";
import User from "../models/userModel.js";
import Notification from "../models/notificationModel.js";

// Helper: create notification for a user
const createNotificationForUser = async (
  userId,
  type,
  title,
  message,
  link,
  metadata,
  priority = "medium"
) => {
  try {
    await Notification.create({
      user: userId,
      type,
      title,
      message,
      link,
      metadata,
      priority,
      icon: type.includes("payment")
        ? "💰"
        : type.includes("plan")
        ? "📅"
        : "🔔",
      color:
        priority === "urgent" ? "red" : priority === "high" ? "orange" : "blue",
    });
  } catch (error) {
    console.error("Error creating notification:", error.message);
  }
};

// Cron job: Check bills due in 7 days and 3 days, send notifications to clients
const checkBillsDueSoon = async () => {
  try {
    const now = new Date();
    const sevenDaysLater = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const threeDaysLater = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);

    // Bills due in 7 days
    const bills7Days = await Bill.find({
      status: { $in: ["sent", "partial", "draft"] },
      balanceAmount: { $gt: 0 },
      dueDate: {
        $gte: new Date(sevenDaysLater.setHours(0, 0, 0, 0)),
        $lte: new Date(sevenDaysLater.setHours(23, 59, 59, 999)),
      },
    }).populate("client", "email");

    for (const bill of bills7Days) {
      const clientUser = await User.findOne({
        email: bill.client.email,
        role: "client",
      });
      if (clientUser) {
        await createNotificationForUser(
          clientUser._id,
          "payment_due",
          "Payment Due in 7 Days",
          `Your invoice ${bill.billNumber} of ${
            bill.totalAmount
          } is due on ${bill.dueDate.toISOString().slice(0, 10)}.`,
          `/bills/${bill._id}`,
          {
            billId: bill._id,
            billNumber: bill.billNumber,
            amount: bill.totalAmount,
          },
          "medium"
        );
      }
    }

    // Bills due in 3 days
    const bills3Days = await Bill.find({
      status: { $in: ["sent", "partial", "draft"] },
      balanceAmount: { $gt: 0 },
      dueDate: {
        $gte: new Date(threeDaysLater.setHours(0, 0, 0, 0)),
        $lte: new Date(threeDaysLater.setHours(23, 59, 59, 999)),
      },
    }).populate("client", "email");

    for (const bill of bills3Days) {
      const clientUser = await User.findOne({
        email: bill.client.email,
        role: "client",
      });
      if (clientUser) {
        await createNotificationForUser(
          clientUser._id,
          "payment_due",
          "Payment Due in 3 Days",
          `Urgent: Your invoice ${bill.billNumber} of ${
            bill.totalAmount
          } is due on ${bill.dueDate.toISOString().slice(0, 10)}.`,
          `/bills/${bill._id}`,
          {
            billId: bill._id,
            billNumber: bill.billNumber,
            amount: bill.totalAmount,
          },
          "high"
        );
      }
    }

    console.log(
      `✅ Bill due reminders sent: ${
        bills7Days.length + bills3Days.length
      } notifications`
    );
  } catch (error) {
    console.error("Error in checkBillsDueSoon:", error.message);
  }
};

// Cron job: Mark overdue bills and payments, send overdue notifications
const markOverdueAndNotify = async () => {
  try {
    const now = new Date();

    // Mark overdue bills
    const overdueBills = await Bill.find({
      status: { $in: ["sent", "partial", "draft"] },
      balanceAmount: { $gt: 0 },
      dueDate: { $lt: now },
    }).populate("client", "email");

    for (const bill of overdueBills) {
      bill.status = "overdue";
      await bill.save();

      const clientUser = await User.findOne({
        email: bill.client.email,
        role: "client",
      });
      if (clientUser) {
        await createNotificationForUser(
          clientUser._id,
          "payment_overdue",
          "Payment Overdue",
          `Your invoice ${bill.billNumber} of ${bill.totalAmount} is now overdue. Please pay immediately.`,
          `/bills/${bill._id}`,
          {
            billId: bill._id,
            billNumber: bill.billNumber,
            amount: bill.totalAmount,
          },
          "urgent"
        );
      }
    }

    // Mark overdue payments
    const overduePayments = await Payment.find({
      status: { $in: ["pending", "partial"] },
      balanceAmount: { $gt: 0 },
      dueDate: { $lt: now },
    }).populate("client", "email");

    for (const payment of overduePayments) {
      payment.status = "overdue";
      await payment.save();

      const clientUser = await User.findOne({
        email: payment.client.email,
        role: "client",
      });
      if (clientUser) {
        await createNotificationForUser(
          clientUser._id,
          "payment_overdue",
          "Payment Overdue",
          `Your payment of ${payment.amount} is now overdue. Please settle immediately.`,
          `/payments/${payment._id}`,
          { paymentId: payment._id, amount: payment.amount },
          "urgent"
        );
      }
    }

    console.log(
      `✅ Overdue checks completed: ${overdueBills.length} bills, ${overduePayments.length} payments marked overdue`
    );
  } catch (error) {
    console.error("Error in markOverdueAndNotify:", error.message);
  }
};

// Cron job: Check plan renewals (30 days and 7 days before planEndDate)
const checkPlanRenewals = async () => {
  try {
    const now = new Date();
    const thirtyDaysLater = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    const sevenDaysLater = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    // Plans expiring in 30 days
    const clients30Days = await Client.find({
      planEndDate: {
        $gte: new Date(thirtyDaysLater.setHours(0, 0, 0, 0)),
        $lte: new Date(thirtyDaysLater.setHours(23, 59, 59, 999)),
      },
      status: "active",
    });

    for (const client of clients30Days) {
      const clientUser = await User.findOne({
        email: client.email,
        role: "client",
      });
      if (clientUser) {
        await createNotificationForUser(
          clientUser._id,
          "plan_renewal_reminder",
          "Plan Renewal Reminder",
          `Your ${client.planType} plan will expire on ${client.planEndDate
            .toISOString()
            .slice(0, 10)}. Please renew to avoid service interruption.`,
          `/clients/${client._id}`,
          {
            clientId: client._id,
            planType: client.planType,
            planEndDate: client.planEndDate,
          },
          "medium"
        );
      }
    }

    // Plans expiring in 7 days
    const clients7Days = await Client.find({
      planEndDate: {
        $gte: new Date(sevenDaysLater.setHours(0, 0, 0, 0)),
        $lte: new Date(sevenDaysLater.setHours(23, 59, 59, 999)),
      },
      status: "active",
    });

    for (const client of clients7Days) {
      const clientUser = await User.findOne({
        email: client.email,
        role: "client",
      });
      if (clientUser) {
        await createNotificationForUser(
          clientUser._id,
          "plan_expiring",
          "Plan Expiring Soon",
          `Urgent: Your ${
            client.planType
          } plan expires in 7 days on ${client.planEndDate
            .toISOString()
            .slice(0, 10)}. Renew now!`,
          `/clients/${client._id}`,
          {
            clientId: client._id,
            planType: client.planType,
            planEndDate: client.planEndDate,
          },
          "high"
        );
      }
    }

    // Plans already expired
    const expiredClients = await Client.find({
      planEndDate: { $lt: now },
      status: "active",
    });

    for (const client of expiredClients) {
      const clientUser = await User.findOne({
        email: client.email,
        role: "client",
      });
      if (clientUser) {
        await createNotificationForUser(
          clientUser._id,
          "plan_expired",
          "Plan Expired",
          `Your ${client.planType} plan has expired. Please renew immediately to restore services.`,
          `/clients/${client._id}`,
          {
            clientId: client._id,
            planType: client.planType,
            planEndDate: client.planEndDate,
          },
          "urgent"
        );
      }
    }

    console.log(
      `✅ Plan renewal reminders sent: ${
        clients30Days.length + clients7Days.length + expiredClients.length
      } notifications`
    );
  } catch (error) {
    console.error("Error in checkPlanRenewals:", error.message);
  }
};

// Schedule cron jobs
export const initializeCronJobs = () => {
  // Run daily at 9 AM: Check bills due soon (7 days and 3 days)
  cron.schedule("0 9 * * *", () => {
    console.log("⏰ Running scheduled job: checkBillsDueSoon");
    checkBillsDueSoon();
  });

  // Run daily at 10 AM: Mark overdue bills/payments and notify
  cron.schedule("0 10 * * *", () => {
    console.log("⏰ Running scheduled job: markOverdueAndNotify");
    markOverdueAndNotify();
  });

  // Run daily at 8 AM: Check plan renewals (30 days, 7 days, expired)
  cron.schedule("0 8 * * *", () => {
    console.log("⏰ Running scheduled job: checkPlanRenewals");
    checkPlanRenewals();
  });

  console.log(
    "✅ Cron jobs initialized: Bill reminders, Overdue checks, Plan renewals"
  );
};
