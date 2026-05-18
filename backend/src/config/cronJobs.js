import cron from "node-cron";
import Bill from "../models/billModel.js";
import Payment from "../models/paymentModel.js";
import Client from "../models/clientModel.js";
import User from "../models/userModel.js";
import Project from "../models/projectModel.js";
import Notification from "../models/notificationModel.js";
import Slot from "../models/slotModel.js";
import Attendance from "../models/attendanceModel.js";
import Meeting from "../models/meetingModel.js";
import ProcurementInvoice from "../models/procurementInvoiceModel.js";
import { notifySlotDeadlineApproaching, notifySlotOverdue } from "../utils/slotNotifications.js";
import NotificationService from "../services/notificationService.js";

// Helper: create notification for a user
const createNotificationForUser = async (
  userId,
  type,
  title,
  message,
  link,
  metadata,
  priority = "normal"
) => {
  try {
    // Map legacy priority values to model enum values
    const priorityMap = { urgent: "high", medium: "normal" };
    const mappedPriority = priorityMap[priority] || priority;

    await NotificationService.sendToUser(userId, title, message, {
      type,
      data: metadata || {},
      actionUrl: link || null,
      priority: mappedPriority,
    });
  } catch (error) {
    
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

    
  } catch (error) {
    
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

    
  } catch (error) {
    
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

    
  } catch (error) {
    
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

    
  } catch (error) {
    
  }
};

// Cron job: Auto clock-out employees who forgot to clock out (runs at 10 PM)
const autoClockOutForgottenEmployees = async () => {
  try {
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
      return;
    }

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
      }
    }

    
  } catch (error) {
    
  }
};

// Cron job: Send meeting reminders (15 minutes and 1 hour before)
const sendMeetingReminders = async () => {
  try {
    const now = new Date();
    
    // Calculate times for reminders
    const fifteenMinutesLater = new Date(now.getTime() + 15 * 60 * 1000); // 15 minutes from now
    const oneHourLater = new Date(now.getTime() + 60 * 60 * 1000); // 1 hour from now
    
    // Find meetings starting in 15 minutes
    const meetings15Min = await Meeting.find({
      status: 'scheduled',
      date: { 
        $gte: new Date(now.getFullYear(), now.getMonth(), now.getDate()),
        $lt: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1)
      },
      startTime: {
        $gte: new Date(fifteenMinutesLater.getTime() - 60000), // 1 minute buffer
        $lt: new Date(fifteenMinutesLater.getTime() + 60000) // 1 minute window
      }
    }).populate('attendees', '_id').populate('organizer', 'name');

    // Find meetings starting in 1 hour
    const meetings1Hour = await Meeting.find({
      status: 'scheduled',
      date: { 
        $gte: new Date(now.getFullYear(), now.getMonth(), now.getDate()),
        $lt: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1)
      },
      startTime: {
        $gte: new Date(oneHourLater.getTime() - 60000), // 1 minute buffer
        $lt: new Date(oneHourLater.getTime() + 60000) // 1 minute window
      }
    }).populate('attendees', '_id').populate('organizer', 'name');

    let reminderCount = 0;

    // Send 15-minute reminders
    for (const meeting of meetings15Min) {
      const attendees = meeting.attendees.map(attendee => attendee._id.toString());
      const organizerName = meeting.organizer?.name || 'Organizer';
      
      if (attendees.length > 0) {
        await NotificationService.sendToMultiple(
          attendees,
          '⏰ Meeting in 15 Minutes',
          `"${meeting.title}" starts in 15 minutes. Location: ${meeting.location || 'Online'}`,
          {
            type: 'meeting_reminder_15min',
            data: {
              meetingId: meeting._id.toString(),
              meetingTitle: meeting.title,
              startTime: meeting.startTime,
              location: meeting.location || 'Online',
              meetingLink: meeting.meetingLink,
              organizerName: organizerName
            },
            actionUrl: meeting.meetingLink || '/meetings',
            senderId: meeting.organizer?._id
          }
        );
        reminderCount += attendees.length;
      }
    }

    // Send 1-hour reminders
    for (const meeting of meetings1Hour) {
      const attendees = meeting.attendees.map(attendee => attendee._id.toString());
      const organizerName = meeting.organizer?.name || 'Organizer';
      
      if (attendees.length > 0) {
        await NotificationService.sendToMultiple(
          attendees,
          '📅 Meeting in 1 Hour',
          `"${meeting.title}" starts in 1 hour. Location: ${meeting.location || 'Online'}`,
          {
            type: 'meeting_reminder_1hour',
            data: {
              meetingId: meeting._id.toString(),
              meetingTitle: meeting.title,
              startTime: meeting.startTime,
              location: meeting.location || 'Online',
              meetingLink: meeting.meetingLink,
              organizerName: organizerName
            },
            actionUrl: meeting.meetingLink || '/meetings',
            senderId: meeting.organizer?._id
          }
        );
        reminderCount += attendees.length;
      }
    }

    
  } catch (error) {
    
  }
};

// Cron job: Create monthly slots for all projects on the 1st of each month
const createMonthlySlotsForAllProjects = async () => {
  try {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;

    // Get all projects with slot system enabled
    const projects = await Project.find({
      'slotConfiguration.enableSlotSystem': true
    }).select('_id name projectHead createdBy');

    if (projects.length === 0) {
      return;
    }

    const slotManagementService = (await import('../services/slotManagementService.js')).default;
    let successCount = 0;
    let failureCount = 0;

    for (const project of projects) {
      try {
        // Check if slots already exist for this month
        const existingSlots = await Slot.countDocuments({
          project: project._id,
          period: {
            year,
            month
          }
        });

        if (existingSlots > 0) {
          // Slots already created for this month
          continue;
        }

        // Create slots for this month
        const result = await slotManagementService.createMonthlySlotsForProject(
          project._id,
          year,
          month,
          {
            count: 20, // Fixed 20 slots per month
            createdBy: project.projectHead || project.createdBy
          }
        );

        successCount++;
      } catch (error) {
        failureCount++;
      }
    }

  } catch (error) {
    
  }
};

// Cron job: Send project deadline approaching reminders
const sendProjectDeadlineReminders = async () => {
  try {
    const now = new Date();
    
    // Calculate times for reminders (7 days and 3 days before deadline)
    const sevenDaysLater = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const threeDaysLater = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
    
    // Find projects with endDate in 7 days
    const projects7Days = await Project.find({
      status: { $in: ['In Progress', 'Active', 'Pending'] },
      endDate: {
        $gte: new Date(sevenDaysLater.setHours(0, 0, 0, 0)),
        $lte: new Date(sevenDaysLater.setHours(23, 59, 59, 999))
      }
    }).populate('assignedUsers', '_id').populate('projectHead', 'name');

    // Find projects with endDate in 3 days
    const projects3Days = await Project.find({
      status: { $in: ['In Progress', 'Active', 'Pending'] },
      endDate: {
        $gte: new Date(threeDaysLater.setHours(0, 0, 0, 0)),
        $lte: new Date(threeDaysLater.setHours(23, 59, 59, 999))
      }
    }).populate('assignedUsers', '_id').populate('projectHead', 'name');

    let reminderCount = 0;

    // Send 7-day reminders
    for (const project of projects7Days) {
      const teamMembers = [
        project.projectHead?._id?.toString(),
        ...(project.assignedUsers?.map(user => user._id?.toString() || user.toString()) || [])
      ].filter(Boolean);
      
      if (teamMembers.length > 0) {
        await NotificationService.sendToMultiple(
          teamMembers,
          '📅 Project Deadline in 7 Days',
          `Project "${project.name}" ends in 7 days (${project.endDate.toISOString().split('T')[0]})`,
          {
            type: 'project_deadline_7days',
            data: {
              projectId: project._id.toString(),
              projectName: project.name,
              endDate: project.endDate,
              daysLeft: 7,
            },
            actionUrl: `/projects/${project._id}`,
            senderId: project.projectHead?._id,
          }
        );
        reminderCount += teamMembers.length;
      }
    }

    // Send 3-day reminders
    for (const project of projects3Days) {
      const teamMembers = [
        project.projectHead?._id?.toString(),
        ...(project.assignedUsers?.map(user => user._id?.toString() || user.toString()) || [])
      ].filter(Boolean);
      
      if (teamMembers.length > 0) {
        await NotificationService.sendToMultiple(
          teamMembers,
          '⏰ Project Deadline in 3 Days',
          `Project "${project.name}" ends in 3 days (${project.endDate.toISOString().split('T')[0]})`,
          {
            type: 'project_deadline_3days',
            data: {
              projectId: project._id.toString(),
              projectName: project.name,
              endDate: project.endDate,
              daysLeft: 3,
            },
            actionUrl: `/projects/${project._id}`,
            senderId: project.projectHead?._id,
          }
        );
        reminderCount += teamMembers.length;
      }
    }

    
  } catch (error) {
    
  }
};

// Cron job: Notify admins/accounts of procurement invoices due within 7 days
const checkProcurementInvoicesDueSoon = async () => {
  try {
    const now = new Date();
    now.setHours(0, 0, 0, 0);

    const sevenDaysLater = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    sevenDaysLater.setHours(23, 59, 59, 999);

    // Find invoices due within the next 7 days that are not yet paid
    const dueInvoices = await ProcurementInvoice.find({
      dueDate: { $gte: now, $lte: sevenDaysLater },
      paymentStatus: { $ne: 'paid' },
    })
      .populate('vendor', 'name')
      .populate('purchaseOrder', 'poNumber');

    if (dueInvoices.length === 0) {
      return;
    }

    // Find all users with admin, superadmin, or accounts roles
    const recipients = await User.find({
      role: { $in: ['admin', 'superadmin', 'accounts'] },
      status: 'active',
    }).select('_id');

    if (recipients.length === 0) {
      return;
    }

    const recipientIds = recipients.map((u) => u._id.toString());

    for (const invoice of dueInvoices) {
      const daysUntilDue = Math.ceil(
        (new Date(invoice.dueDate) - new Date()) / (1000 * 60 * 60 * 24)
      );
      const vendorName = invoice.vendor?.name || 'Unknown Vendor';
      const poNumber = invoice.purchaseOrder?.poNumber || '—';
      const dueDateStr = new Date(invoice.dueDate).toLocaleDateString('en-IN');

      const title = `⚠️ Procurement Invoice Due in ${daysUntilDue} Day${daysUntilDue !== 1 ? 's' : ''}`;
      const body = `Invoice ${invoice.vendorInvoiceNumber} from ${vendorName} (PO: ${poNumber}) — ₹${invoice.outstandingBalance?.toLocaleString('en-IN') ?? invoice.invoiceAmount?.toLocaleString('en-IN')} outstanding — due on ${dueDateStr}.`;

      await NotificationService.sendToMultiple(recipientIds, title, body, {
        type: 'procurement_invoice_due',
        data: {
          invoiceId: invoice._id.toString(),
          vendorInvoiceNumber: invoice.vendorInvoiceNumber,
          vendorName,
          poNumber,
          dueDate: invoice.dueDate,
          outstandingBalance: invoice.outstandingBalance,
          paymentStatus: invoice.paymentStatus,
        },
        actionUrl: `/procurement/invoices/${invoice._id}`,
        priority: daysUntilDue <= 2 ? 'high' : 'normal',
      });
    }

    console.log(
      `[CronJob] checkProcurementInvoicesDueSoon: notified ${recipients.length} user(s) about ${dueInvoices.length} invoice(s) due within 7 days.`
    );
  } catch (error) {
    console.error('[CronJob] checkProcurementInvoicesDueSoon error:', error.message);
  }
};

// Schedule cron jobs
export const initializeCronJobs = () => {
  // Run daily at 9 AM: Check bills due soon (7 days and 3 days)
  cron.schedule("0 9 * * *", () => {
    checkBillsDueSoon();
  });

  // Run daily at 9 AM: Check procurement invoices due within 7 days
  cron.schedule("0 9 * * *", () => {
    checkProcurementInvoicesDueSoon();
  });

  // Run daily at 10 AM: Mark overdue bills/payments and notify
  cron.schedule("0 10 * * *", () => {
    markOverdueAndNotify();
  });

  // Run daily at 8 AM: Check plan renewals (30 days, 7 days, expired)
  cron.schedule("0 8 * * *", () => {
    checkPlanRenewals();
  });

  // Run daily at 7 AM: Check slot deadlines and send reminders
  cron.schedule("0 7 * * *", () => {
    checkSlotDeadlines();
  });

  // Run daily at 10 PM: Auto clock-out employees who forgot to clock out
  cron.schedule("0 22 * * *", () => {
    autoClockOutForgottenEmployees();
  });

  // Run every 5 minutes: Send meeting reminders (15 min and 1 hour before)
  cron.schedule("*/5 * * * *", () => {
    sendMeetingReminders();
  });

  // Run daily at 9 AM: Send project deadline reminders (7 days and 3 days before)
  cron.schedule("0 9 * * *", () => {
    sendProjectDeadlineReminders();
  });

  // Run on the 1st of every month at 12:01 AM: Create monthly slots for all projects
  cron.schedule("1 0 1 * *", () => {
    createMonthlySlotsForAllProjects();
  });

  // Run daily at 1 AM: Auto-reactivate inactive employees whose reactivation date has passed
  cron.schedule("0 1 * * *", () => {
    checkReactivationDates();
  });

  
};

// Cron job: Auto-reactivate inactive employees whose reactivation date has passed
const checkReactivationDates = async () => {
  try {
    const now = new Date();
    const eligibleUsers = await User.find({
      status: "inactive",
      reactivationDate: { $lte: now, $ne: null },
    });

    for (const user of eligibleUsers) {
      try {
        user.status = "active";
        user.reactivationDate = null;
        user.statusChangedAt = now;
        user.statusChangedBy = null; // system action
        await user.save();

        // Notify the reactivated employee
        await NotificationService.sendToUser(
          user._id,
          "✅ Account Reactivated",
          "Your account has been automatically reactivated. You can now log in.",
          {
            type: "general",
            data: {},
            actionUrl: "/dashboard",
          }
        );

        // Notify all HR/Admin users
        const hrAdmins = await User.find({
          role: { $in: ["hr", "admin", "superadmin"] },
          status: "active",
        }).select("_id");

        for (const admin of hrAdmins) {
          await NotificationService.sendToUser(
            admin._id,
            "👤 Employee Reactivated",
            `${user.name} (${user.employeeId || user.email}) has been automatically reactivated.`,
            {
              type: "general",
              data: { userId: user._id.toString() },
              actionUrl: `/employees/${user._id}/profile`,
            }
          );
        }
      } catch (err) {
        console.error(`checkReactivationDates: failed to reactivate user ${user._id}: ${err.message}`);
      }
    }
  } catch (err) {
    console.error(`checkReactivationDates: error querying users: ${err.message}`);
  }
};
