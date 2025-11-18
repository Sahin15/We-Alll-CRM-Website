import Service from "../models/serviceModel.js";

// Create new service
export const createService = async (req, res) => {
  try {
    const {
      name,
      company,
      category,
      description,
      basePrice,
      allowedBillingCycles,
      features,
      specifications,
      tags,
      isPopular,
      displayOrder,
    } = req.body;

    if (!name || !company || !category || !basePrice) {
      return res.status(400).json({
        message: "Name, company, category, and base price are required",
      });
    }

    const service = await Service.create({
      name,
      company,
      category,
      description,
      basePrice,
      allowedBillingCycles: allowedBillingCycles || ["monthly"],
      features: features || [],
      specifications,
      tags: tags || [],
      isPopular: isPopular || false,
      displayOrder: displayOrder || 0,
      createdBy: req.user.id,
    });

    return res.status(201).json({
      message: "Service created successfully",
      service,
    });
  } catch (error) {
    console.error("Error creating service:", error.message);
    return res.status(500).json({ message: "Server error" });
  }
};

// Get all services
export const getAllServices = async (req, res) => {
  try {
    const { company, category, isActive, isPopular } = req.query;
    const filter = {};

    if (company) filter.company = company;
    if (category) filter.category = category;
    if (isActive !== undefined) filter.isActive = isActive === "true";
    if (isPopular !== undefined) filter.isPopular = isPopular === "true";

    const services = await Service.find(filter)
      .populate("createdBy", "name email")
      .sort({ displayOrder: 1, createdAt: -1 });

    return res.status(200).json(services);
  } catch (error) {
    console.error("Error fetching services:", error.message);
    return res.status(500).json({ message: "Server error" });
  }
};

// Get services grouped by category
export const getServicesByCategory = async (req, res) => {
  try {
    const { company } = req.query;
    const filter = { isActive: true };
    
    if (company) filter.company = company;

    const services = await Service.find(filter)
      .populate("createdBy", "name email")
      .sort({ category: 1, displayOrder: 1 });

    // Group by category
    const grouped = services.reduce((acc, service) => {
      const category = service.category;
      if (!acc[category]) {
        acc[category] = [];
      }
      acc[category].push(service);
      return acc;
    }, {});

    return res.status(200).json(grouped);
  } catch (error) {
    console.error("Error fetching services by category:", error.message);
    return res.status(500).json({ message: "Server error" });
  }
};

// Get single service
export const getServiceById = async (req, res) => {
  try {
    const { id } = req.params;

    const service = await Service.findById(id).populate("createdBy", "name email");

    if (!service) {
      return res.status(404).json({ message: "Service not found" });
    }

    return res.status(200).json(service);
  } catch (error) {
    console.error("Error fetching service:", error.message);
    return res.status(500).json({ message: "Server error" });
  }
};

// Update service
export const updateService = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const service = await Service.findByIdAndUpdate(
      id,
      { $set: updates },
      { new: true, runValidators: true }
    ).populate("createdBy", "name email");

    if (!service) {
      return res.status(404).json({ message: "Service not found" });
    }

    return res.status(200).json({
      message: "Service updated successfully",
      service,
    });
  } catch (error) {
    console.error("Error updating service:", error.message);
    return res.status(500).json({ message: "Server error" });
  }
};

// Delete service
export const deleteService = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if service is used in any plans
    const Plan = (await import("../models/planModel.js")).default;
    const plansUsingService = await Plan.countDocuments({
      "includedServices.service": id,
    });

    if (plansUsingService > 0) {
      return res.status(400).json({
        message: `Cannot delete service. It is used in ${plansUsingService} plan(s)`,
      });
    }

    const service = await Service.findByIdAndDelete(id);

    if (!service) {
      return res.status(404).json({ message: "Service not found" });
    }

    return res.status(200).json({
      message: "Service deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting service:", error.message);
    return res.status(500).json({ message: "Server error" });
  }
};

// Toggle service active status
export const toggleServiceStatus = async (req, res) => {
  try {
    const { id } = req.params;

    const service = await Service.findById(id);

    if (!service) {
      return res.status(404).json({ message: "Service not found" });
    }

    service.isActive = !service.isActive;
    await service.save();

    return res.status(200).json({
      message: `Service ${service.isActive ? "activated" : "deactivated"} successfully`,
      service,
    });
  } catch (error) {
    console.error("Error toggling service status:", error.message);
    return res.status(500).json({ message: "Server error" });
  }
};

// Get all categories
export const getCategories = async (req, res) => {
  try {
    const { company } = req.query;
    const filter = {};
    
    if (company) filter.company = company;

    const categories = await Service.distinct("category", filter);

    return res.status(200).json(categories);
  } catch (error) {
    console.error("Error fetching categories:", error.message);
    return res.status(500).json({ message: "Server error" });
  }
};

// Bulk update display order
export const updateDisplayOrder = async (req, res) => {
  try {
    const { services } = req.body; // Array of { id, displayOrder }

    if (!Array.isArray(services)) {
      return res.status(400).json({ message: "Services array is required" });
    }

    const updatePromises = services.map(({ id, displayOrder }) =>
      Service.findByIdAndUpdate(id, { displayOrder })
    );

    await Promise.all(updatePromises);

    return res.status(200).json({
      message: "Display order updated successfully",
    });
  } catch (error) {
    console.error("Error updating display order:", error.message);
    return res.status(500).json({ message: "Server error" });
  }
};
