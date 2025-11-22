import Policy from "../models/policyModel.js";

// Get all active policies
export const getPolicies = async (req, res) => {
  try {
    const { category, priority, limit = 10, page = 1 } = req.query;
    
    let query = { status: "active" };
    
    if (category) query.category = category;
    if (priority) query.priority = priority;
    
    const now = new Date();
    query.$or = [
      { expiryDate: { $exists: false } },
      { expiryDate: null },
      { expiryDate: { $gte: now } }
    ];
    
    const policies = await Policy.find(query)
      .populate("createdBy", "name email")
      .populate("lastUpdatedBy", "name email")
      .sort({ priority: -1, effectiveDate: -1 })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit));
    
    const total = await Policy.countDocuments(query);
    
    res.json({
      policies,
      pagination: {
        current: parseInt(page),
        pages: Math.ceil(total / parseInt(limit)),
        total
      }
    });
  } catch (error) {
    console.error("Error fetching policies:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Get policy by ID
export const getPolicyById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const policy = await Policy.findById(id)
      .populate("createdBy", "name email")
      .populate("lastUpdatedBy", "name email");
    
    if (!policy) {
      return res.status(404).json({ message: "Policy not found" });
    }
    
    res.json(policy);
  } catch (error) {
    console.error("Error fetching policy:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Create policy (Admin/HR/Manager only)
export const createPolicy = async (req, res) => {
  try {
    const {
      title,
      description,
      content,
      category,
      priority,
      effectiveDate,
      expiryDate,
      version,
      tags,
      isPublic
    } = req.body;
    
    const policy = await Policy.create({
      title,
      description,
      content,
      category,
      priority,
      effectiveDate,
      expiryDate,
      version,
      tags,
      isPublic,
      createdBy: req.user._id,
      status: "active"
    });
    
    const populatedPolicy = await Policy.findById(policy._id)
      .populate("createdBy", "name email");
    
    res.status(201).json({
      message: "Policy created successfully",
      policy: populatedPolicy
    });
  } catch (error) {
    console.error("Error creating policy:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Update policy (Admin/HR/Manager only)
export const updatePolicy = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    
    const policy = await Policy.findById(id);
    
    if (!policy) {
      return res.status(404).json({ message: "Policy not found" });
    }
    
    Object.keys(updates).forEach(key => {
      if (updates[key] !== undefined) {
        policy[key] = updates[key];
      }
    });
    
    policy.lastUpdatedBy = req.user._id;
    await policy.save();
    
    const updatedPolicy = await Policy.findById(id)
      .populate("createdBy", "name email")
      .populate("lastUpdatedBy", "name email");
    
    res.json({
      message: "Policy updated successfully",
      policy: updatedPolicy
    });
  } catch (error) {
    console.error("Error updating policy:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Delete policy (Admin only)
export const deletePolicy = async (req, res) => {
  try {
    const { id } = req.params;
    
    const policy = await Policy.findById(id);
    
    if (!policy) {
      return res.status(404).json({ message: "Policy not found" });
    }
    
    await Policy.findByIdAndDelete(id);
    
    res.json({ message: "Policy deleted successfully" });
  } catch (error) {
    console.error("Error deleting policy:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Get recent policies for dashboard
export const getRecentPolicies = async (req, res) => {
  try {
    const { limit = 3 } = req.query;
    
    const policies = await Policy.find({
      status: "active",
      $or: [
        { expiryDate: { $exists: false } },
        { expiryDate: null },
        { expiryDate: { $gte: new Date() } }
      ]
    })
      .populate("createdBy", "name email")
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .select("title description category priority effectiveDate createdBy createdAt");
    
    res.json(policies);
  } catch (error) {
    console.error("Error fetching recent policies:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Get policy categories
export const getPolicyCategories = async (req, res) => {
  try {
    const categories = await Policy.distinct("category", { status: "active" });
    res.json(categories);
  } catch (error) {
    console.error("Error fetching policy categories:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};
