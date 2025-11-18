import Lead from "../models/leadModel.js";
import User from "../models/userModel.js";

// Create new lead
export const createLead = async (req, res) => {
  try {
    const {
      fullName,
      phone,
      email,
      companyName,
      service,
      budget,
      source,
      status,
      assignedTo,
      notes,
    } = req.body;

    // Check if lead with same email or phone already exists
    const existingLead = await Lead.findOne({
      $or: [{ email }, { phone: Number(phone) }],
    });

    if (existingLead) {
      return res.status(400).json({
        message: "Lead with this email or phone number already exists",
      });
    }

    const lead = new Lead({
      fullName,
      phone: Number(phone),
      email,
      companyName,
      service,
      budget,
      source: source || "Website",
      status: status || "New",
      assignedTo,
      notes,
      createdBy: req.user.id,
    });

    await lead.save();

    // Populate assigned user and creator details
    const populatedLead = await Lead.findById(lead._id)
      .populate("assignedTo", "name email")
      .populate("createdBy", "name email");

    return res.status(201).json({
      message: "Lead created successfully",
      lead: populatedLead,
    });
  } catch (error) {
    console.error("Error in createLead:", error.message);
    return res.status(500).json({ message: "Server error" });
  }
};

// Get all leads
export const getAllLeads = async (req, res) => {
  try {
    const { status, assignedTo, source } = req.query;
    const filter = {};

    if (status) filter.status = status;
    if (assignedTo) filter.assignedTo = assignedTo;
    if (source) filter.source = source;

    const leads = await Lead.find(filter)
      .populate("assignedTo", "name email")
      .populate("createdBy", "name email")
      .sort({ createdAt: -1 });

    return res.status(200).json(leads);
  } catch (error) {
    console.error("Error in getAllLeads:", error.message);
    return res.status(500).json({ message: "Server error" });
  }
};

// Get lead by ID
export const getLeadById = async (req, res) => {
  try {
    const lead = await Lead.findById(req.params.id)
      .populate("assignedTo", "name email")
      .populate("createdBy", "name email")
      .populate("notesHistory.addedBy", "name email")
      .populate("followUps.createdBy", "name email");

    if (!lead) {
      return res.status(404).json({ message: "Lead not found" });
    }

    return res.status(200).json(lead);
  } catch (error) {
    console.error("Error in getLeadById:", error.message);
    return res.status(500).json({ message: "Server error" });
  }
};

// Update lead
export const updateLead = async (req, res) => {
  try {
    const lead = await Lead.findById(req.params.id);
    if (!lead) {
      return res.status(404).json({ message: "Lead not found" });
    }

    // Convert phone to number if provided
    if (req.body.phone) {
      req.body.phone = Number(req.body.phone);
    }

    // If notes are being updated, add to notes history
    if (req.body.notes && req.body.notes !== lead.notes) {
      lead.notesHistory.push({
        note: req.body.notes,
        addedBy: req.user.id,
        addedAt: new Date(),
      });
    }

    Object.keys(req.body || {}).forEach((key) => {
      lead[key] = req.body[key];
    });

    await lead.save();

    // Populate assigned user and creator details
    const populatedLead = await Lead.findById(lead._id)
      .populate("assignedTo", "name email")
      .populate("createdBy", "name email")
      .populate("notesHistory.addedBy", "name email");

    return res.status(200).json({
      message: "Lead updated successfully",
      lead: populatedLead,
    });
  } catch (error) {
    console.error("Error in updateLead:", error.message);
    return res.status(500).json({ message: "Server error" });
  }
};

// Delete lead
export const deleteLead = async (req, res) => {
  try {
    const lead = await Lead.findByIdAndDelete(req.params.id);
    if (!lead) {
      return res.status(404).json({ message: "Lead not found" });
    }

    return res.status(200).json({ message: "Lead deleted successfully" });
  } catch (error) {
    console.error("Error in deleteLead:", error.message);
    return res.status(500).json({ message: "Server error" });
  }
};

// Assign lead to user
export const assignLead = async (req, res) => {
  try {
    const { assignedTo } = req.body;
    const lead = await Lead.findById(req.params.id);

    if (!lead) {
      return res.status(404).json({ message: "Lead not found" });
    }

    // Check if user exists
    const user = await User.findById(assignedTo);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    lead.assignedTo = assignedTo;
    await lead.save();

    const populatedLead = await Lead.findById(lead._id)
      .populate("assignedTo", "name email")
      .populate("createdBy", "name email");

    return res.status(200).json({
      message: "Lead assigned successfully",
      lead: populatedLead,
    });
  } catch (error) {
    console.error("Error in assignLead:", error.message);
    return res.status(500).json({ message: "Server error" });
  }
};

// Update lead status
export const updateLeadStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const lead = await Lead.findById(req.params.id);

    if (!lead) {
      return res.status(404).json({ message: "Lead not found" });
    }

    lead.status = status;
    await lead.save();

    const populatedLead = await Lead.findById(lead._id)
      .populate("assignedTo", "name email")
      .populate("createdBy", "name email");

    return res.status(200).json({
      message: "Lead status updated successfully",
      lead: populatedLead,
    });
  } catch (error) {
    console.error("Error in updateLeadStatus:", error.message);
    return res.status(500).json({ message: "Server error" });
  }
};

// Update lead temperature (when marking as qualified)
export const updateLeadTemperature = async (req, res) => {
  try {
    const { temperature } = req.body;
    console.log("Updating temperature for lead:", req.params.id, "to:", temperature);
    
    const lead = await Lead.findById(req.params.id);

    if (!lead) {
      console.log("Lead not found:", req.params.id);
      return res.status(404).json({ message: "Lead not found" });
    }

    if (!["Cold", "Warm", "Hot"].includes(temperature)) {
      console.log("Invalid temperature value:", temperature);
      return res.status(400).json({ message: "Invalid temperature value" });
    }

    lead.temperature = temperature;
    lead.status = "Qualified"; // Auto-set status to Qualified
    await lead.save();
    console.log("Lead temperature updated successfully");

    const populatedLead = await Lead.findById(lead._id)
      .populate("assignedTo", "name email")
      .populate("createdBy", "name email")
      .populate("followUps.createdBy", "name email");

    return res.status(200).json({
      message: `Lead marked as ${temperature} and Qualified`,
      lead: populatedLead,
    });
  } catch (error) {
    console.error("Error in updateLeadTemperature:", error);
    return res.status(500).json({ 
      message: "Server error", 
      error: error.message 
    });
  }
};

// Schedule a follow-up
export const scheduleFollowUp = async (req, res) => {
  try {
    const { type, scheduledDate, notes } = req.body;
    const lead = await Lead.findById(req.params.id);

    if (!lead) {
      return res.status(404).json({ message: "Lead not found" });
    }

    if (!type || !scheduledDate) {
      return res
        .status(400)
        .json({ message: "Type and scheduled date are required" });
    }

    const followUp = {
      followUpType: type,
      scheduledDate: new Date(scheduledDate),
      notes,
      status: "Pending",
      createdBy: req.user.id,
    };

    lead.followUps.push(followUp);

    // Update next follow-up date if this is the earliest pending follow-up
    const pendingFollowUps = lead.followUps
      .filter((f) => f.status === "Pending")
      .sort((a, b) => new Date(a.scheduledDate) - new Date(b.scheduledDate));

    if (pendingFollowUps.length > 0) {
      lead.nextFollowUpDate = pendingFollowUps[0].scheduledDate;
    }

    await lead.save();

    const populatedLead = await Lead.findById(lead._id)
      .populate("assignedTo", "name email")
      .populate("createdBy", "name email")
      .populate("followUps.createdBy", "name email");

    return res.status(200).json({
      message: "Follow-up scheduled successfully",
      lead: populatedLead,
    });
  } catch (error) {
    console.error("Error in scheduleFollowUp:", error.message);
    return res.status(500).json({ message: "Server error" });
  }
};

// Complete a follow-up
export const completeFollowUp = async (req, res) => {
  try {
    const { followUpId } = req.params;
    const lead = await Lead.findById(req.params.id);

    if (!lead) {
      return res.status(404).json({ message: "Lead not found" });
    }

    const followUp = lead.followUps.id(followUpId);
    if (!followUp) {
      return res.status(404).json({ message: "Follow-up not found" });
    }

    followUp.status = "Completed";
    followUp.completedAt = new Date();
    lead.lastFollowUpDate = new Date();

    // Update next follow-up date
    const pendingFollowUps = lead.followUps
      .filter((f) => f.status === "Pending")
      .sort((a, b) => new Date(a.scheduledDate) - new Date(b.scheduledDate));

    lead.nextFollowUpDate =
      pendingFollowUps.length > 0 ? pendingFollowUps[0].scheduledDate : null;

    await lead.save();

    const populatedLead = await Lead.findById(lead._id)
      .populate("assignedTo", "name email")
      .populate("createdBy", "name email")
      .populate("followUps.createdBy", "name email");

    return res.status(200).json({
      message: "Follow-up marked as completed",
      lead: populatedLead,
    });
  } catch (error) {
    console.error("Error in completeFollowUp:", error.message);
    return res.status(500).json({ message: "Server error" });
  }
};

// Cancel a follow-up
export const cancelFollowUp = async (req, res) => {
  try {
    const { followUpId } = req.params;
    const lead = await Lead.findById(req.params.id);

    if (!lead) {
      return res.status(404).json({ message: "Lead not found" });
    }

    const followUp = lead.followUps.id(followUpId);
    if (!followUp) {
      return res.status(404).json({ message: "Follow-up not found" });
    }

    followUp.status = "Cancelled";

    // Update next follow-up date
    const pendingFollowUps = lead.followUps
      .filter((f) => f.status === "Pending")
      .sort((a, b) => new Date(a.scheduledDate) - new Date(b.scheduledDate));

    lead.nextFollowUpDate =
      pendingFollowUps.length > 0 ? pendingFollowUps[0].scheduledDate : null;

    await lead.save();

    const populatedLead = await Lead.findById(lead._id)
      .populate("assignedTo", "name email")
      .populate("createdBy", "name email")
      .populate("followUps.createdBy", "name email");

    return res.status(200).json({
      message: "Follow-up cancelled",
      lead: populatedLead,
    });
  } catch (error) {
    console.error("Error in cancelFollowUp:", error.message);
    return res.status(500).json({ message: "Server error" });
  }
};

// Get all follow-ups for a lead
export const getLeadFollowUps = async (req, res) => {
  try {
    const lead = await Lead.findById(req.params.id)
      .populate("followUps.createdBy", "name email")
      .select("followUps");

    if (!lead) {
      return res.status(404).json({ message: "Lead not found" });
    }

    return res.status(200).json(lead.followUps);
  } catch (error) {
    console.error("Error in getLeadFollowUps:", error.message);
    return res.status(500).json({ message: "Server error" });
  }
};

// Delete a note from notes history
export const deleteNote = async (req, res) => {
  try {
    const { noteIndex } = req.params;
    const lead = await Lead.findById(req.params.id);

    if (!lead) {
      return res.status(404).json({ message: "Lead not found" });
    }

    if (noteIndex < 0 || noteIndex >= lead.notesHistory.length) {
      return res.status(400).json({ message: "Invalid note index" });
    }

    // Remove the note at the specified index
    lead.notesHistory.splice(noteIndex, 1);
    await lead.save();

    const populatedLead = await Lead.findById(lead._id)
      .populate("assignedTo", "name email")
      .populate("createdBy", "name email")
      .populate("notesHistory.addedBy", "name email")
      .populate("followUps.createdBy", "name email");

    return res.status(200).json({
      message: "Note deleted successfully",
      lead: populatedLead,
    });
  } catch (error) {
    console.error("Error in deleteNote:", error.message);
    return res.status(500).json({ message: "Server error" });
  }
};
