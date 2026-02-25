import cron from "node-cron";
import Bill from "../models/billModel.js";
import Payment from "../models/paymentModel.js";
import Client from "../models/clientModel.js";
import User from "../models/userModel.js";
import Notification from "../models/notificationModel.js";
import Slot from "../models/slotModel.js";
import Attendance from "../models/attendanceModel.js";
import { notifySlotDeadlineApproaching, notifySlotOverdue } from "../utils/slotNotifications.js";

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

// Cron job: Check slot deadlines and send reminders
const checkSlotDeadlines = async () => {
  try {
    const now = new Date();
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const threeDaysLater = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);

    // Find slots with design deadline tomorrow (1 day reminder)
    const slotsDueTomorrow = await Slot.find({
      designDeadline: {
        $gte: new Date(tomorrow.setHours(0, 0, 0, 0)),
        $lte: new Date(tomorrow.setHours(23, 59, 59, 999)),
      },
      designStatus: { $nin: ['Approved', 'Posted'] },
      postingStatus: { $ne: 'Posted' }
    }).populate('assignedTo', 'name email');

    for (const slot of slotsDueTomorrow) {
      if (slot.assignedTo) {
        await notifySlotDeadlineApproaching(slot, slot.assignedTo);
      }
    }

    // Find slots with design deadline in 3 days
    const slotsDueIn3Days = await Slot.find({
      designDeadline: {
        $gte: new Date(threeDaysLater.setHours(0, 0, 0, 0)),
        $lte: new Date(threeDaysLater.setHours(23, 59, 59, 999)),
      },
      designStatus: { $nin: ['Approved', 'Posted'] },
      postingStatus: { $ne: 'Posted' }
    }).populate('assignedTo', 'name email');

    for (const slot of slotsDueIn3Days) {
      if (slot.assignedTo) {
        await notifySlotDeadlineApproaching(slot, slot.assignedTo);
      }
    }

    // Find overdue slots (past design deadline and not approved/posted)
    const overdueSlots = await Slot.find({
      designDeadline: { $lt: now },
      designStatus: { $nin: ['Approved', 'Posted'] },
      postingStatus: { $ne: 'Posted' }
    }).populate('assignedTo', 'name email');

    for (const slot of overdueSlots) {
      if (slot.assignedTo) {
        await notifySlotOverdue(slot, slot.assignedTo);
      }
    }

    console.log(
      `✅ Slot deadline checks completed: ${slotsDueTomorrow.length} due tomorrow, ${slotsDueIn3Days.length} due in 3 days, ${overdueSlots.length} overdue`
    );
  } catch (error) {
    console.error("Error in checkSlotDeadlines:", error.message);
  }
};

// Cron job: Auto clock-out employees who forgot to clock out (runs at 10 PM)
const autoClockOutForgottenEmployees = async () => {
  try {
    console.log("⏰ Running auto clock-out for forgotten employees...");
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Find all attendance records for today that are clocked in but not clocked out
    // Exclude employees who are absent or on leave
    const forgottenClockOuts = await Attendance.find({
      date: {
        $gte: today,
        $lt: tomorrow,
      },
      clockIn: { $exists: true },
      clockOut: { $exists: false },
      status: { $nin: ['absent', 'on-leave'] } // Don't auto clock-out employees who are absent or on leave
    }).populate("employee", "name email");

    if (forgottenClockOuts.length === 0) {
      console.log("✅ No forgotten clock-outs found");
      return;
    }

    console.log(`📋 Found ${forgottenClockOuts.length} employees who forgot to clock out`);

    // Auto clock-out at 10 PM
    const clockOutTime = new Date();
    clockOutTime.setHours(22, 0, 0, 0); // 10:00 PM

    let autoClockOutCount = 0;

    for (const attendance of forgottenClockOuts) {
      // Set clock out time to 10 PM
      attendance.clockOut = clockOutTime;
      attendance.notes = attendance.notes 
        ? `${attendance.notes}\n⚠️ Auto clocked-out at 10:00 PM - You forgot to clock out!`
        : "⚠️ Auto clocked-out at 10:00 PM - You forgot to clock out!";
      
      await attendance.save();
      autoClockOutCount++;

      // Create notification for the employee
      if (attendance.employee && attendance.employee._id) {
        await createNotificationForUser(
          attendance.employee._id,
          "attendance_auto_clockout",
          "⚠️ Auto Clock-Out",
          `You forgot to clock out today! System automatically clocked you out at 10:00 PM. Please remember to clock out on time.`,
          `/attendance`,
          {
            attendanceId: attendance._id,
            autoClockOutTime: clockOutTime,
            date: attendance.date,
          },
          "high"
        );

        console.log(`   ✓ Auto clocked-out: ${attendance.employee.name} at 10:00 PM`);
      }
    }

    console.log(
      `✅ Auto clock-out completed: ${autoClockOutCount} employees clocked out automatically`
    );
  } catch (error) {
    console.error("Error in autoClockOutForgottenEmployees:", error.message);
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

  // Run daily at 7 AM: Check slot deadlines and send reminders
  cron.schedule("0 7 * * *", () => {
    console.log("⏰ Running scheduled job: checkSlotDeadlines");
    checkSlotDeadlines();
  });

  // Run daily at 10 PM: Auto clock-out employees who forgot to clock out
  cron.schedule("0 22 * * *", () => {
    console.log("⏰ Running scheduled job: autoClockOutForgottenEmployees");
    autoClockOutForgottenEmployees();
  });

  console.log(
    "✅ Cron jobs initialized: Bill reminders, Overdue checks, Plan renewals, Slot deadlines, Auto clock-out"
  );
};
