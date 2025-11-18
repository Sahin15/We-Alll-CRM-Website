import Plan from "../models/planModel.js";
import Service from "../models/serviceModel.js";

// Create new plan with services
export const createPlan = async (req, res) => {
  try {
    const {
      name,
      company,
      description,
      serviceIds, // Array of service IDs
      customPrices, // Optional: { serviceId: customPrice }
      overridePrice,
      additionalFeatures,
      planType,
      discount,
      discountType,
      displayOrder,
    } = req.body;

    if (!name || !company || !serviceIds || serviceIds.length === 0) {
      return res.status(400).json({
        message: "Name, company, and at least one service are required",
      });
    }

    // Fetch all services
    const services = await Service.find({
      _id: { $in: serviceIds },
      company,
      isActive: true,
    });

    if (services.length !== serviceIds.length) {
      return res.status(400).json({
        message: "One or more services not found or inactive",
      });
    }

    // Build includedServices array with snapshots
    const includedServices = services.map((service) => ({
      service: service._id,
      name: service.name,
      basePrice: service.basePrice,
      customPrice: customPrices?.[service._id] || null,
      features: service.features,
    }));

    // Create plan
    const plan = new Plan({
      name,
      company,
      description,
      includedServices,
      overridePrice,
      additionalFeatures: additionalFeatures || [],
      planType: planType || "standard",
      discount: discount || 0,
      discountType: discountType || "fixed",
      displayOrder: displayOrder || 0,
      createdBy: req.user.id,
    });

    // Calculate allowed billing cycles
    await plan.calculateAllowedBillingCycles();
    
    // Save (pre-save hook will calculate prices)
    await plan.save();

    await plan.populate("includedServices.service createdBy", "name email");

    return res.status(201).json({
      message: "Plan created successfully",
      plan,
    });
  } catch (error) {
    console.error("Error creating plan:", error);
    return res.status(500).json({ 
      message: "Server error", 
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};

// Get all plans
export const getAllPlans = async (req, res) => {
  try {
    const { company, planType, isActive, isPopular } = req.query;
    const filter = {};

    if (company) filter.company = company;
    if (planType) filter.planType = planType;
    if (isActive !== undefined) filter.isActive = isActive === "true";
    if (isPopular !== undefined) filter.isPopular = isPopular === "true";

    const plans = await Plan.find(filter)
      .populate("includedServices.service", "name category")
      .populate("createdBy", "name email")
      .sort({ displayOrder: 1, createdAt: -1 });

    return res.status(200).json(plans);
  } catch (error) {
    console.error("Error fetching plans:", error.message);
    return res.status(500).json({ message: "Server error" });
  }
};

// Get plan by ID
export const getPlanById = async (req, res) => {
  try {
    const plan = await Plan.findById(req.params.id)
      .populate("includedServices.service")
      .populate("createdBy", "name email");

    if (!plan) {
      return res.status(404).json({ message: "Plan not found" });
    }

    return res.status(200).json(plan);
  } catch (error) {
    console.error("Error fetching plan:", error.message);
    return res.status(500).json({ message: "Server error" });
  }
};

// Update plan
export const updatePlan = async (req, res) => {
  try {
    const {
      name,
      description,
      serviceIds,
      customPrices,
      overridePrice,
      additionalFeatures,
      planType,
      discount,
      discountType,
      displayOrder,
      isActive,
      isPopular,
    } = req.body;

    const plan = await Plan.findById(req.params.id);

    if (!plan) {
      return res.status(404).json({ message: "Plan not found" });
    }

    // Update basic fields
    if (name) plan.name = name;
    if (description !== undefined) plan.description = description;
    if (planType) plan.planType = planType;
    if (discount !== undefined) plan.discount = discount;
    if (discountType) plan.discountType = discountType;
    if (displayOrder !== undefined) plan.displayOrder = displayOrder;
    if (isActive !== undefined) plan.isActive = isActive;
    if (isPopular !== undefined) plan.isPopular = isPopular;
    if (additionalFeatures) plan.additionalFeatures = additionalFeatures;
    if (overridePrice !== undefined) plan.overridePrice = overridePrice;

    // Update services if provided
    if (serviceIds && serviceIds.length > 0) {
      const services = await Service.find({
        _id: { $in: serviceIds },
        company: plan.company,
        isActive: true,
      });

      if (services.length !== serviceIds.length) {
        return res.status(400).json({
          message: "One or more services not found or inactive",
        });
      }

      plan.includedServices = services.map((service) => ({
        service: service._id,
        name: service.name,
        basePrice: service.basePrice,
        customPrice: customPrices?.[service._id] || null,
        features: service.features,
      }));

      await plan.calculateAllowedBillingCycles();
    }

    await plan.save();
    await plan.populate("includedServices.service createdBy", "name email");

    return res.status(200).json({
      message: "Plan updated successfully",
      plan,
    });
  } catch (error) {
    console.error("Error updating plan:", error.message);
    return res.status(500).json({ message: "Server error" });
  }
};

// Delete plan
export const deletePlan = async (req, res) => {
  try {
    // Check if plan is used in any subscriptions
    const Subscription = (await import("../models/subscriptionModel.js")).default;
    const subscriptionsUsingPlan = await Subscription.countDocuments({
      plan: req.params.id,
    });

    if (subscriptionsUsingPlan > 0) {
      return res.status(400).json({
        message: `Cannot delete plan. It is used in ${subscriptionsUsingPlan} subscription(s)`,
      });
    }

    const plan = await Plan.findByIdAndDelete(req.params.id);

    if (!plan) {
      return res.status(404).json({ message: "Plan not found" });
    }

    return res.status(200).json({ message: "Plan deleted successfully" });
  } catch (error) {
    console.error("Error deleting plan:", error.message);
    return res.status(500).json({ message: "Server error" });
  }
};

// Toggle plan active status
export const togglePlanStatus = async (req, res) => {
  try {
    const plan = await Plan.findById(req.params.id);

    if (!plan) {
      return res.status(404).json({ message: "Plan not found" });
    }

    plan.isActive = !plan.isActive;
    await plan.save();

    return res.status(200).json({
      message: `Plan ${plan.isActive ? "activated" : "deactivated"} successfully`,
      plan,
    });
  } catch (error) {
    console.error("Error toggling plan status:", error.message);
    return res.status(500).json({ message: "Server error" });
  }
};

// Add service to existing plan
export const addServiceToPlan = async (req, res) => {
  try {
    const { id } = req.params;
    const { serviceId, customPrice } = req.body;

    const plan = await Plan.findById(id);
    if (!plan) {
      return res.status(404).json({ message: "Plan not found" });
    }

    // Check if service already exists in plan
    const serviceExists = plan.includedServices.some(
      (item) => item.service.toString() === serviceId
    );

    if (serviceExists) {
      return res.status(400).json({
        message: "Service already exists in this plan",
      });
    }

    // Fetch service
    const service = await Service.findOne({
      _id: serviceId,
      company: plan.company,
      isActive: true,
    });

    if (!service) {
      return res.status(404).json({
        message: "Service not found or inactive",
      });
    }

    // Add service to plan
    plan.includedServices.push({
      service: service._id,
      name: service.name,
      basePrice: service.basePrice,
      customPrice: customPrice || null,
      features: service.features,
    });

    await plan.calculateAllowedBillingCycles();
    await plan.save();
    await plan.populate("includedServices.service");

    return res.status(200).json({
      message: "Service added to plan successfully",
      plan,
    });
  } catch (error) {
    console.error("Error adding service to plan:", error.message);
    return res.status(500).json({ message: "Server error" });
  }
};

// Remove service from plan
export const removeServiceFromPlan = async (req, res) => {
  try {
    const { id, serviceId } = req.params;

    const plan = await Plan.findById(id);
    if (!plan) {
      return res.status(404).json({ message: "Plan not found" });
    }

    // Remove service
    plan.includedServices = plan.includedServices.filter(
      (item) => item.service.toString() !== serviceId
    );

    if (plan.includedServices.length === 0) {
      return res.status(400).json({
        message: "Cannot remove last service from plan",
      });
    }

    await plan.calculateAllowedBillingCycles();
    await plan.save();
    await plan.populate("includedServices.service");

    return res.status(200).json({
      message: "Service removed from plan successfully",
      plan,
    });
  } catch (error) {
    console.error("Error removing service from plan:", error.message);
    return res.status(500).json({ message: "Server error" });
  }
};

// Update service custom price in plan
export const updateServicePrice = async (req, res) => {
  try {
    const { id, serviceId } = req.params;
    const { customPrice } = req.body;

    const plan = await Plan.findById(id);
    if (!plan) {
      return res.status(404).json({ message: "Plan not found" });
    }

    const serviceItem = plan.includedServices.find(
      (item) => item.service.toString() === serviceId
    );

    if (!serviceItem) {
      return res.status(404).json({
        message: "Service not found in this plan",
      });
    }

    serviceItem.customPrice = customPrice;
    await plan.save();
    await plan.populate("includedServices.service");

    return res.status(200).json({
      message: "Service price updated successfully",
      plan,
    });
  } catch (error) {
    console.error("Error updating service price:", error.message);
    return res.status(500).json({ message: "Server error" });
  }
};

// Get plan comparison (for client view)
export const getPlansForComparison = async (req, res) => {
  try {
    const { company } = req.query;

    if (!company) {
      return res.status(400).json({ message: "Company is required" });
    }

    const plans = await Plan.find({
      company,
      isActive: true,
    })
      .populate("includedServices.service", "name category features")
      .sort({ displayOrder: 1, finalPrice: 1 });

    // Format for comparison view
    const comparison = plans.map((plan) => ({
      id: plan._id,
      name: plan.name,
      description: plan.description,
      planType: plan.planType,
      finalPrice: plan.finalPrice,
      allowedBillingCycles: plan.allowedBillingCycles,
      isPopular: plan.isPopular,
      services: plan.includedServices.map((item) => ({
        name: item.name,
        features: item.features,
      })),
      additionalFeatures: plan.additionalFeatures,
    }));

    return res.status(200).json(comparison);
  } catch (error) {
    console.error("Error fetching plans for comparison:", error.message);
    return res.status(500).json({ message: "Server error" });
  }
};
