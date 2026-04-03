import Subscription from "../models/subscriptionModel.js";
import Plan from "../models/planModel.js";
import AddOn from "../models/addOnModel.js";
import Client from "../models/clientModel.js";

// Create new subscription
export const createSubscription = async (req, res) => {
  try {
    const { 
      clientId, 
      planId, 
      addOnIds, 
      billingCycle, 
      discount, 
      notes,
      startDate: userStartDate,
      endDate: userEndDate,
      autoRenew,
      status
    } = req.body;

    if (!clientId || !planId || !billingCycle) {
      return res.status(400).json({
        message: "Client, plan, and billing cycle are required",
      });
    }

    // Fetch plan details
    const plan = await Plan.findById(planId);
    if (!plan || !plan.isActive) {
      return res.status(404).json({ message: "Plan not found or inactive" });
    }

    // Fetch client details
    const client = await Client.findById(clientId);
    if (!client) {
      return res.status(404).json({ message: "Client not found" });
    }

    // Validate billing cycle is allowed for this plan
    if (!plan.allowedBillingCycles.includes(billingCycle)) {
      return res.status(400).json({
        message: `Billing cycle '${billingCycle}' is not available for this plan. Available cycles: ${plan.allowedBillingCycles.join(", ")}`,
      });
    }

    // Calculate plan amount
    let planAmount = plan.finalPrice || 0;

    // Fetch and calculate add-ons
    let addOnsAmount = 0;
    const addOnsData = [];

    if (addOnIds && addOnIds.length > 0) {
      const addOns = await AddOn.find({
        _id: { $in: addOnIds },
        isActive: true,
      });

      for (const addOn of addOns) {
        addOnsAmount += addOn.price;
        addOnsData.push({
          addOn: addOn._id,
          name: addOn.name,
          price: addOn.price,
          billingType: addOn.billingType,
        });
      }
    }

    // Calculate totals
    const subtotal = planAmount + addOnsAmount - (discount || 0);
    const taxPercentage = 18; // GST
    const taxAmount = (subtotal * taxPercentage) / 100;
    const totalAmount = subtotal + taxAmount;

    // Calculate dates
    const startDate = userStartDate ? new Date(userStartDate) : new Date();
    let endDate = userEndDate ? new Date(userEndDate) : null;
    let nextBillingDate = new Date(startDate);

    // Calculate end date and next billing date if not provided
    if (!endDate && billingCycle !== "one-time") {
      endDate = new Date(startDate);
      switch (billingCycle) {
        case "monthly":
          endDate.setMonth(endDate.getMonth() + 1);
          nextBillingDate.setMonth(nextBillingDate.getMonth() + 1);
          break;
        case "quarterly":
          endDate.setMonth(endDate.getMonth() + 3);
          nextBillingDate.setMonth(nextBillingDate.getMonth() + 3);
          break;
        case "half-yearly":
          endDate.setMonth(endDate.getMonth() + 6);
          nextBillingDate.setMonth(nextBillingDate.getMonth() + 6);
          break;
        case "yearly":
          endDate.setFullYear(endDate.getFullYear() + 1);
          nextBillingDate.setFullYear(nextBillingDate.getFullYear() + 1);
          break;
      }
    } else if (billingCycle === "one-time") {
      endDate = null;
      nextBillingDate = null;
    }

    // Collect all features from plan's included services
    const allFeatures = [];
    if (plan.includedServices && plan.includedServices.length > 0) {
      plan.includedServices.forEach(service => {
        if (service.features && service.features.length > 0) {
          allFeatures.push(...service.features);
        }
      });
    }
    if (plan.additionalFeatures && plan.additionalFeatures.length > 0) {
      allFeatures.push(...plan.additionalFeatures);
    }

    // Create subscription
    const subscription = await Subscription.create({
      client: clientId,
      plan: planId,
      planSnapshot: {
        name: plan.name,
        price: plan.finalPrice,
        billingCycle: billingCycle,
        features: allFeatures,
      },
      addOns: addOnsData,
      company: plan.company,
      status: status || "pending",
      billingCycle,
      startDate,
      endDate,
      nextBillingDate,
      autoRenew: autoRenew !== undefined ? autoRenew : false,
      planAmount,
      addOnsAmount,
      subtotal,
      taxPercentage,
      taxAmount,
      totalAmount,
      discount: discount || 0,
      notes,
      createdBy: req.user.id,
    });

    const populatedSubscription = await Subscription.findById(subscription._id)
      .populate("client", "name email phone company")
      .populate("plan", "name category")
      .populate("addOns.addOn", "name")
      .populate("createdBy", "name email");

    return res.status(201).json({
      message: "Subscription created successfully",
      subscription: populatedSubscription,
    });
  } catch (error) {
    
    return res.status(500).json({ 
      message: "Server error",
      error: error.message,
      stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
    });
  }
};

// Get all subscriptions
export const getAllSubscriptions = async (req, res) => {
  try {
    const { client, status, company } = req.query;
    const filter = {};

    if (client) filter.client = client;
    if (status) filter.status = status;
    if (company) filter.company = company;

    // Permission check
    const isAdminRole = ['admin', 'superadmin', 'hr', 'manager', 'hod'].includes(req.user.role);
    
    
    if (!isAdminRole && client) {
      // For employees, check if they're assigned to any project for this client
      const Project = (await import('../models/projectModel.js')).default;
      
      
      
      const assignedProject = await Project.findOne({
        client: client,
        $or: [
          { projectHead: req.user.id },
          { assignedUsers: req.user.id },
          { 'teamMembers.user': req.user.id }
        ]
      });

      

      if (!assignedProject) {
        
        return res.status(403).json({ 
          message: "Access denied. You must be assigned to a project for this client to view their subscriptions." 
        });
      }
      
      
    } else if (!isAdminRole && !client) {
      // If no client filter and not admin, deny access
      
      return res.status(403).json({ 
        message: "Access denied. Employees can only view subscriptions for clients they're assigned to." 
      });
    }

    const subscriptions = await Subscription.find(filter)
      .populate("client", "name email phone company")
      .populate("plan", "name category")
      .populate("addOns.addOn", "name")
      .populate("createdBy", "name email")
      .sort({ createdAt: -1 });

    
    return res.status(200).json(subscriptions);
  } catch (error) {
    
    return res.status(500).json({ message: "Server error" });
  }
};

// Get subscription by ID
export const getSubscriptionById = async (req, res) => {
  try {
    const subscription = await Subscription.findById(req.params.id)
      .populate("client", "name email phone company address")
      .populate("plan", "name category description features")
      .populate("addOns.addOn", "name description")
      .populate("createdBy", "name email")
      .populate("activatedBy", "name email")
      .populate("cancelledBy", "name email");

    if (!subscription) {
      return res.status(404).json({ message: "Subscription not found" });
    }

    return res.status(200).json(subscription);
  } catch (error) {
    
    return res.status(500).json({ message: "Server error" });
  }
};


// Activate subscription (after payment verification)
export const activateSubscription = async (req, res) => {
  try {
    const subscription = await Subscription.findById(req.params.id);

    if (!subscription) {
      return res.status(404).json({ message: "Subscription not found" });
    }

    if (subscription.status === "active") {
      return res.status(400).json({ message: "Subscription is already active" });
    }

    subscription.status = "active";
    subscription.activatedBy = req.user.id;
    subscription.activatedAt = new Date();

    await subscription.save();

    const populatedSubscription = await Subscription.findById(subscription._id)
      .populate("client", "name email")
      .populate("plan", "name")
      .populate("activatedBy", "name email");

    return res.status(200).json({
      message: "Subscription activated successfully",
      subscription: populatedSubscription,
    });
  } catch (error) {
    
    return res.status(500).json({ message: "Server error" });
  }
};

// Cancel subscription
export const cancelSubscription = async (req, res) => {
  try {
    const { reason } = req.body;
    const subscription = await Subscription.findById(req.params.id);

    if (!subscription) {
      return res.status(404).json({ message: "Subscription not found" });
    }

    if (subscription.status === "cancelled") {
      return res.status(400).json({ message: "Subscription is already cancelled" });
    }

    subscription.status = "cancelled";
    subscription.cancelledBy = req.user.id;
    subscription.cancelledAt = new Date();
    subscription.cancellationReason = reason;

    await subscription.save();

    return res.status(200).json({
      message: "Subscription cancelled successfully",
      subscription,
    });
  } catch (error) {
    
    return res.status(500).json({ message: "Server error" });
  }
};

// Get logged-in client's own subscriptions
export const getMySubscriptions = async (req, res) => {
  try {
    // Get client ID from logged-in user
    const client = await Client.findOne({ email: req.user.email });
    if (!client) {
      return res.status(404).json({ message: "Client not found" });
    }

    const subscriptions = await Subscription.find({ client: client._id })
      .populate("plan", "name description company")
      .populate("addOns.addOn", "name price")
      .sort({ createdAt: -1 });

    return res.status(200).json(subscriptions);
  } catch (error) {
    
    return res.status(500).json({ message: "Server error" });
  }
};

// Get client subscriptions (admin or specific client)
export const getClientSubscriptions = async (req, res) => {
  try {
    const { clientId } = req.params;

    const subscriptions = await Subscription.find({ client: clientId })
      .populate("plan", "name category")
      .populate("addOns.addOn", "name")
      .sort({ createdAt: -1 });

    return res.status(200).json(subscriptions);
  } catch (error) {
    
    return res.status(500).json({ message: "Server error" });
  }
};

// Update subscription
export const updateSubscription = async (req, res) => {
  try {
    const subscription = await Subscription.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!subscription) {
      return res.status(404).json({ message: "Subscription not found" });
    }

    return res.status(200).json({
      message: "Subscription updated successfully",
      subscription,
    });
  } catch (error) {
    
    return res.status(500).json({ message: "Server error" });
  }
};

// Delete subscription
export const deleteSubscription = async (req, res) => {
  try {
    const subscription = await Subscription.findByIdAndDelete(req.params.id);

    if (!subscription) {
      return res.status(404).json({ message: "Subscription not found" });
    }

    return res.status(200).json({
      message: "Subscription deleted successfully",
    });
  } catch (error) {
    
    return res.status(500).json({ 
      message: "Server error",
      error: error.message,
    });
  }
};
