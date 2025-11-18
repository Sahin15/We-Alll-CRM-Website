import AddOn from "../models/addOnModel.js";

// Create new add-on
export const createAddOn = async (req, res) => {
  try {
    const {
      name,
      company,
      category,
      description,
      price,
      billingType,
      applicablePlans,
    } = req.body;

    if (!name || !company || !category || !price || !billingType) {
      return res.status(400).json({
        message:
          "Name, company, category, price, and billing type are required",
      });
    }

    const addOn = await AddOn.create({
      name,
      company,
      category,
      description,
      price,
      billingType,
      applicablePlans: applicablePlans || [],
      createdBy: req.user.id,
    });

    return res.status(201).json({
      message: "Add-on created successfully",
      addOn,
    });
  } catch (error) {
    console.error("Error creating add-on:", error.message);
    return res.status(500).json({ message: "Server error" });
  }
};

// Get all add-ons
export const getAllAddOns = async (req, res) => {
  try {
    const { company, category, isActive } = req.query;
    const filter = {};

    if (company) filter.company = company;
    if (category) filter.category = category;
    if (isActive !== undefined) filter.isActive = isActive === "true";

    const addOns = await AddOn.find(filter)
      .populate("createdBy", "name email")
      .populate("applicablePlans", "name")
      .sort({ createdAt: -1 });

    return res.status(200).json(addOns);
  } catch (error) {
    console.error("Error fetching add-ons:", error.message);  
    return res.status(500).json({ message: "Server error" });
  }
};

// Get add-on by ID
export const getAddOnById = async (req, res) => {
  try {
    const addOn = await AddOn.findById(req.params.id)
      .populate("createdBy", "name email")
      .populate("applicablePlans", "name");

    if (!addOn) {
      return res.status(404).json({ message: "Add-on not found" });
    }

    return res.status(200).json(addOn);
  } catch (error) {
    console.error("Error fetching add-on:", error.message);
    return res.status(500).json({ message: "Server error" });
  }
};

// Update add-on
export const updateAddOn = async (req, res) => {
  try {
    const addOn = await AddOn.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    if (!addOn) {
      return res.status(404).json({ message: "Add-on not found" });
    }

    return res.status(200).json({
      message: "Add-on updated successfully",
      addOn,
    });
  } catch (error) {
    console.error("Error updating add-on:", error.message);
    return res.status(500).json({ message: "Server error" });
  }
};

// Delete add-on
export const deleteAddOn = async (req, res) => {
  try {
    const addOn = await AddOn.findByIdAndDelete(req.params.id);

    if (!addOn) {
      return res.status(404).json({ message: "Add-on not found" });
    }

    return res.status(200).json({ message: "Add-on deleted successfully" });
  } catch (error) {
    console.error("Error deleting add-on:", error.message);
    return res.status(500).json({ message: "Server error" });
  }
};

// Toggle add-on active status
export const toggleAddOnStatus = async (req, res) => {
  try {
    const addOn = await AddOn.findById(req.params.id);

    if (!addOn) {
      return res.status(404).json({ message: "Add-on not found" });
    }

    addOn.isActive = !addOn.isActive;
    await addOn.save();

    return res.status(200).json({
      message: `Add-on ${addOn.isActive ? "activated" : "deactivated"} successfully`,
      addOn,
    });
  } catch (error) {
    console.error("Error toggling add-on status:", error.message);
    return res.status(500).json({ message: "Server error" });
  }
};
