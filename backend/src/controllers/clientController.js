import Client from "../models/clientModel.js";
import Project from "../models/projectModel.js";
import Bill from "../models/billModel.js";
import Payment from "../models/paymentModel.js";
import Notification from "../models/notificationModel.js";
import User from "../models/userModel.js";

// Add new client
export const createClient = async (req, res) => {
  try {
    const {
      name,
      email,
      phone,
      company,
      address,
      whatsappnumber,
      ownername,
      industry,
      website,
      targetAudience,
      audienceGender,
      previousChallenges,
      legalGuidelines,
      yearlyTurnover,
      expectations,
    } = req.body;

    if (!name || !email) {
      return res.status(400).json({ message: "Name and email are required" });
    }

    const existingClient = await Client.findOne({ email });
    if (existingClient) {
      return res.status(400).json({ message: "Client already exists" });
    }

    const client = await Client.create({
      name,
      email,
      phone,
      whatsappnumber,
      company,
      ownername,
      address,
      industry,
      website,
      targetAudience,
      audienceGender,
      previousChallenges,
      legalGuidelines,
      yearlyTurnover,
      expectations,
      createdBy: req.user.id,                  
    });

    res.status(201).json({
      message: "Client added successfully",
      client,
    });
  } catch (error) {
    console.error("Error creating client:", error.message);
    res.status(500).json({ message: "Server error" });
  }
};

// Get all clients
export const getClients = async (req, res) => {
  try {
    const clients = await Client.find().populate("createdBy", "name email");
    res.status(200).json(clients);
  } catch (error) {
    console.error("Error fetching clients:", error.message);
    res.status(500).json({ message: "Server error" });
  }
};

// Get single client by ID
export const getClientById = async (req, res) => {
  try {
    const client = await Client.findById(req.params.id).populate(
      "createdBy",
      "name email"
    );
    if (!client) return res.status(404).json({ message: "Client not found" });
    res.status(200).json(client);
  } catch (error) {
    console.error("Error fetching client:", error.message);
    res.status(500).json({ message: "Server error" });
  }
};

// Update client
export const updateClient = async (req, res) => {
  try {
    // Convert phone numbers to Number type if provided
    if (req.body.phone) {
      req.body.phone = Number(req.body.phone);
    }
    if (req.body.whatsappnumber) {
      req.body.whatsappnumber = Number(req.body.whatsappnumber);
    }
    if (req.body.yearlyTurnover) {
      req.body.yearlyTurnover = Number(req.body.yearlyTurnover);
    }

    const client = await Client.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
    });
    if (!client) return res.status(404).json({ message: "Client not found" });
    res.status(200).json({ message: "Client updated", client });
  } catch (error) {
    console.error("Error updating client:", error.message);
    res.status(500).json({ message: "Server error" });
  }
};

// Delete client
export const deleteClient = async (req, res) => {
  try {
    const client = await Client.findByIdAndDelete(req.params.id);
    if (!client) return res.status(404).json({ message: "Client not found" });
    res.status(200).json({ message: "Client deleted" });
  } catch (error) {
    console.error("Error deleting client:", error.message);
    res.status(500).json({ message: "Server error" });
  }
};

// Client Overview (aggregated data for client portal)
export const getClientOverview = async (req, res) => {
  try {
    const { id } = req.params;
    const user = req.user;

    // If the requester is a client, enforce access to their own client record only
    if (user.role === "client") {
      const clientByEmail = await Client.findOne({ email: user.email }).select(
        "_id name email"
      );
      if (!clientByEmail || clientByEmail._id.toString() !== id) {
        return res.status(403).json({ message: "Access denied" });
      }
    }

    const clientId = id;

    // Projects and assigned team members
    const projects = await Project.find({ client: clientId })
      .select(
        "name status progress priority startDate endDate assignedUsers milestones tasks deliverables services"
      )
      .populate("assignedUsers", "name email role");

    const memberMap = new Map();
    projects.forEach((p) => {
      (p.assignedUsers || []).forEach((u) => {
        memberMap.set(u._id.toString(), u);
      });
    });
    const teamMembers = Array.from(memberMap.values());

    // Bills and payments
    const bills = await Bill.find({ client: clientId })
      .select(
        "billNumber totalAmount paidAmount balanceAmount status dueDate issueDate"
      )
      .sort({ issueDate: -1 });
    const payments = await Payment.find({ client: clientId })
      .select(
        "amount paidAmount balanceAmount status paymentDate paymentMethod bill"
      )
      .sort({ paymentDate: -1 });

    // Billing summary
    const totalBilled = bills.reduce((sum, b) => sum + (b.totalAmount || 0), 0);
    const totalPaid = bills.reduce((sum, b) => sum + (b.paidAmount || 0), 0);
    const totalDue = bills.reduce((sum, b) => sum + (b.balanceAmount || 0), 0);
    const prepaidBalance = payments
      .filter((p) => !p.bill && p.status === "paid")
      .reduce((sum, p) => sum + (p.paidAmount || p.amount || 0), 0);

    // Bill categories
    const today = new Date();
    const isUpcoming = (due) =>
      due && due > today && (due - today) / (1000 * 60 * 60 * 24) <= 7;
    const isDue = (b) =>
      ["sent", "partial", "draft"].includes(b.status) &&
      b.balanceAmount > 0 &&
      b.dueDate &&
      b.dueDate >= today;

    const paidBills = bills.filter((b) => b.status === "paid");
    const overdueBills = bills.filter((b) => b.status === "overdue");
    const upcomingBills = bills.filter(
      (b) =>
        ["sent", "partial", "draft"].includes(b.status) && isUpcoming(b.dueDate)
    );
    const dueBills = bills.filter(isDue);

    // Notifications (recent for the requester)
    const notifications = await Notification.find({ user: user.id })
      .sort({ createdAt: -1 })
      .limit(10);
    const unreadCount = await Notification.countDocuments({
      user: user.id,
      isRead: false,
    });

    return res.status(200).json({
      projects,
      teamMembers,
      billingSummary: { totalBilled, totalPaid, totalDue, prepaidBalance },
      bills: {
        paid: paidBills,
        due: dueBills,
        overdue: overdueBills,
        upcoming: upcomingBills,
      },
      payments,
      notifications: { unreadCount, items: notifications },
    });
  } catch (error) {
    console.error("Error in getClientOverview:", error.message);
    res.status(500).json({ message: "Server error" });
  }
};

// Client Onboarding - Initiate onboarding
export const initiateOnboarding = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      planType,
      planStartDate,
      planEndDate,
      billingCycle,
      monthlyBudget,
      servicesSubscribed,
      paymentTerms,
      accountManager,
    } = req.body;

    const client = await Client.findById(id);
    if (!client) return res.status(404).json({ message: "Client not found" });

    client.onboardingStatus = "in_progress";
    client.onboardingDate = new Date();
    if (planType) client.planType = planType;
    if (planStartDate) client.planStartDate = new Date(planStartDate);
    if (planEndDate) client.planEndDate = new Date(planEndDate);
    if (billingCycle) client.billingCycle = billingCycle;
    if (typeof monthlyBudget === "number") client.monthlyBudget = monthlyBudget;
    if (Array.isArray(servicesSubscribed))
      client.servicesSubscribed = servicesSubscribed;
    if (paymentTerms) client.paymentTerms = paymentTerms;
    if (accountManager) client.accountManager = accountManager;

    await client.save();

    return res.status(200).json({ message: "Onboarding initiated", client });
  } catch (error) {
    console.error("Error in initiateOnboarding:", error.message);
    return res.status(500).json({ message: "Server error" });
  }
};

// Update onboarding status
export const updateOnboardingStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { onboardingStatus } = req.body;

    if (
      !onboardingStatus ||
      !["pending", "in_progress", "completed"].includes(onboardingStatus)
    ) {
      return res.status(400).json({ message: "Invalid onboarding status" });
    }

    const client = await Client.findById(id);
    if (!client) return res.status(404).json({ message: "Client not found" });

    client.onboardingStatus = onboardingStatus;
    await client.save();

    return res
      .status(200)
      .json({ message: "Onboarding status updated", client });
  } catch (error) {
    console.error("Error in updateOnboardingStatus:", error.message);
    return res.status(500).json({ message: "Server error" });
  }
};

// Complete onboarding
export const completeOnboarding = async (req, res) => {
  try {
    const { id } = req.params;

    const client = await Client.findById(id);
    if (!client) return res.status(404).json({ message: "Client not found" });

    client.onboardingStatus = "completed";
    client.status = "active";
    await client.save();

    // Create notification for client user
    const clientUser = await User.findOne({
      email: client.email,
      role: "client",
    });
    if (clientUser) {
      await Notification.create({
        user: clientUser._id,
        type: "onboarding_completed",
        title: "Welcome! Onboarding Complete",
        message: `Your onboarding is complete. Your ${client.planType} plan is now active.`,
        link: `/clients/${client._id}`,
        metadata: { clientId: client._id, planType: client.planType },
        priority: "medium",
      });
    }

    return res.status(200).json({ message: "Onboarding completed", client });
  } catch (error) {
    console.error("Error in completeOnboarding:", error.message);
    return res.status(500).json({ message: "Server error" });
  }
};

// Get onboarding details
export const getOnboardingDetails = async (req, res) => {
  try {
    const { id } = req.params;

    // Enforce client access
    if (req.user.role === "client") {
      const clientByEmail = await Client.findOne({
        email: req.user.email,
      }).select("_id");
      if (!clientByEmail || clientByEmail._id.toString() !== id) {
        return res.status(403).json({ message: "Access denied" });
      }
    }

    const client = await Client.findById(id)
      .populate("accountManager", "name email")
      .select(
        "onboardingStatus onboardingDate planType planStartDate planEndDate billingCycle monthlyBudget servicesSubscribed paymentTerms accountManager status"
      );

    if (!client) return res.status(404).json({ message: "Client not found" });

    return res.status(200).json(client);
  } catch (error) {
    console.error("Error in getOnboardingDetails:", error.message);
    return res.status(500).json({ message: "Server error" });
  }
};

// Assign account manager
export const assignAccountManager = async (req, res) => {
  try {
    const { id } = req.params;
    const { accountManager } = req.body;

    if (!accountManager) {
      return res.status(400).json({ message: "accountManager is required" });
    }

    const client = await Client.findById(id);
    if (!client) return res.status(404).json({ message: "Client not found" });

    client.accountManager = accountManager;
    await client.save();

    return res
      .status(200)
      .json({ message: "Account manager assigned", client });
  } catch (error) {
    console.error("Error in assignAccountManager:", error.message);
    return res.status(500).json({ message: "Server error" });
  }
};

// Update client plan
export const updateClientPlan = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      planType,
      planStartDate,
      planEndDate,
      billingCycle,
      monthlyBudget,
      servicesSubscribed,
    } = req.body;

    const client = await Client.findById(id);
    if (!client) return res.status(404).json({ message: "Client not found" });

    if (planType) client.planType = planType;
    if (planStartDate) client.planStartDate = new Date(planStartDate);
    if (planEndDate) client.planEndDate = new Date(planEndDate);
    if (billingCycle) client.billingCycle = billingCycle;
    if (typeof monthlyBudget === "number") client.monthlyBudget = monthlyBudget;
    if (Array.isArray(servicesSubscribed))
      client.servicesSubscribed = servicesSubscribed;

    await client.save();

    return res.status(200).json({ message: "Client plan updated", client });
  } catch (error) {
    console.error("Error in updateClientPlan:", error.message);
    return res.status(500).json({ message: "Server error" });
  }
};

// Renew client plan
export const renewClientPlan = async (req, res) => {
  try {
    const { id } = req.params;
    const { planEndDate } = req.body;

    const client = await Client.findById(id);
    if (!client) return res.status(404).json({ message: "Client not found" });

    if (planEndDate) {
      client.planEndDate = new Date(planEndDate);
      client.status = "active";
      await client.save();
    }

    return res.status(200).json({ message: "Plan renewed", client });
  } catch (error) {
    console.error("Error in renewClientPlan:", error.message);
    return res.status(500).json({ message: "Server error" });
  }
};
