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
      reference,
    } = req.body;

    console.log("Creating lead with data:", req.body);
    console.log("Validation check - fullName:", fullName, "phone:", phone);

    // Validate required fields
    if (!fullName || !phone) {
      console.log("❌ Validation failed: Missing required fields");
      console.log("fullName provided:", !!fullName, "phone provided:", !!phone);
      return res.status(400).json({
        message: "Full name and phone number are required",
        details: {
          fullName: !fullName ? "Full name is required" : "OK",
          phone: !phone ? "Phone number is required" : "OK"
        }
      });
    }

    // Validate phone number
    const phoneNumber = Number(phone);
    console.log("Phone validation - original:", phone, "converted:", phoneNumber, "isNaN:", isNaN(phoneNumber));
    if (isNaN(phoneNumber) || phoneNumber <= 0) {
      console.log("❌ Validation failed: Invalid phone number");
      return res.status(400).json({
        message: "Please provide a valid phone number",
        details: {
          phone: phone,
          converted: phoneNumber,
          error: "Phone must be a valid positive number"
        }
      });
    }

    // Check if lead with same phone already exists
    // If email is provided, also check for email duplicates
    let existingLeadQuery;
    if (email && email.trim()) {
      existingLeadQuery = {
        $or: [{ email: email.trim() }, { phone: phoneNumber }]
      };
    } else {
      existingLeadQuery = { phone: phoneNumber };
    }

    console.log("Checking for existing lead with query:", existingLeadQuery);
    const existingLead = await Lead.findOne(existingLeadQuery);

    if (existingLead) {
      console.log("❌ Validation failed: Duplicate lead found");
      console.log("Existing lead:", { 
        id: existingLead._id, 
        phone: existingLead.phone, 
        email: existingLead.email,
        fullName: existingLead.fullName 
      });
      return res.status(400).json({
        message: "Lead with this email or phone number already exists",
        details: {
          duplicateField: existingLead.phone === phoneNumber ? "phone" : "email",
          existingLead: {
            id: existingLead._id,
            fullName: existingLead.fullName,
            phone: existingLead.phone,
            email: existingLead.email
          }
        }
      });
    }

    const leadData = {
      fullName,
      phone: phoneNumber,
      companyName,
      service: Array.isArray(service) ? service : (service ? [service] : []),
      budget,
      source: source || "Website",
      status: status || "New",
      assignedTo,
      notes: notes || reference, // Use reference as notes if provided
    };

    console.log("Prepared lead data:", leadData);

    // Only add createdBy if user is authenticated
    if (req.user && req.user._id) {
      leadData.createdBy = req.user._id;
      console.log("Added createdBy:", req.user._id);
    } else {
      console.log("No authenticated user, creating public lead");
    }

    // Only add email if provided (since it's not required for public forms)
    if (email) {
      leadData.email = email;
      console.log("Added email:", email);
    }

    const lead = new Lead(leadData);
    console.log("About to save lead...");
    await lead.save();

    console.log("✅ Lead created successfully:", lead._id);

    // Populate assigned user and creator details if they exist
    const populatedLead = await Lead.findById(lead._id)
      .populate("assignedTo", "name email")
      .populate("createdBy", "name email");

    return res.status(201).json({
      message: "Lead created successfully",
      lead: populatedLead,
    });
  } catch (error) {
    console.error("❌ Error in createLead:", error);
    console.error("Error name:", error.name);
    console.error("Error code:", error.code);
    console.error("Error stack:", error.stack);
    console.error("Request body:", req.body);
    
    // Handle mongoose validation errors
    if (error.name === 'ValidationError') {
      console.log("Mongoose validation error details:", error.errors);
      const validationErrors = Object.keys(error.errors).map(key => ({
        field: key,
        message: error.errors[key].message
      }));
      
      return res.status(400).json({ 
        message: "Validation failed",
        errors: validationErrors,
        details: error.errors
      });
    }
    
    // Handle duplicate key errors (unique constraint violations)
    if (error.code === 11000) {
      console.log("Duplicate key error:", error.keyPattern, error.keyValue);
      const duplicateField = Object.keys(error.keyPattern)[0];
      return res.status(400).json({
        message: `A lead with this ${duplicateField} already exists`,
        details: {
          duplicateField: duplicateField,
          value: error.keyValue[duplicateField],
          error: "Duplicate key constraint violation"
        }
      });
    }
    
    return res.status(500).json({ 
      message: "Server error",
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
      details: process.env.NODE_ENV === 'development' ? {
        name: error.name,
        code: error.code
      } : undefined
    });
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
        addedBy: req.user._id,
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
      createdBy: req.user._id,
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
    const { noteId } = req.params;
    const lead = await Lead.findById(req.params.id);

    if (!lead) {
      return res.status(404).json({ message: "Lead not found" });
    }

    // Find the note by its _id
    const noteIndex = lead.notesHistory.findIndex(
      note => note._id.toString() === noteId
    );

    if (noteIndex === -1) {
      return res.status(404).json({ message: "Note not found" });
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

// Get follow-up dashboard data
export const getFollowUpDashboard = async (req, res) => {
  try {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayEnd = new Date(todayStart);
    todayEnd.setDate(todayEnd.getDate() + 1);

    const next7Days = new Date(todayStart);
    next7Days.setDate(next7Days.getDate() + 7);

    // Find all leads with pending follow-ups
    const leads = await Lead.find({
      'followUps.status': 'Pending'
    })
      .populate('assignedTo', 'name email')
      .populate('createdBy', 'name email')
      .populate('followUps.createdBy', 'name email')
      .sort({ 'followUps.scheduledDate': 1 });

    // Categorize follow-ups
    const overdue = [];
    const today = [];
    const upcoming = [];

    leads.forEach(lead => {
      lead.followUps.forEach(followUp => {
        if (followUp.status === 'Pending') {
          const scheduledDate = new Date(followUp.scheduledDate);
          const followUpData = {
            _id: followUp._id,
            leadId: lead._id,
            leadName: lead.fullName,
            leadCompany: lead.companyName,
            leadPhone: lead.phone,
            leadEmail: lead.email,
            leadStatus: lead.status,
            leadTemperature: lead.temperature,
            followUpType: followUp.followUpType,
            scheduledDate: followUp.scheduledDate,
            notes: followUp.notes,
            createdBy: followUp.createdBy,
            assignedTo: lead.assignedTo
          };

          if (scheduledDate < todayStart) {
            overdue.push(followUpData);
          } else if (scheduledDate >= todayStart && scheduledDate < todayEnd) {
            today.push(followUpData);
          } else if (scheduledDate >= todayEnd && scheduledDate < next7Days) {
            upcoming.push(followUpData);
          }
        }
      });
    });

    // Sort by scheduled date
    overdue.sort((a, b) => new Date(a.scheduledDate) - new Date(b.scheduledDate));
    today.sort((a, b) => new Date(a.scheduledDate) - new Date(b.scheduledDate));
    upcoming.sort((a, b) => new Date(a.scheduledDate) - new Date(b.scheduledDate));

    return res.status(200).json({
      overdue,
      today,
      upcoming,
      summary: {
        overdueCount: overdue.length,
        todayCount: today.length,
        upcomingCount: upcoming.length,
        totalPending: overdue.length + today.length + upcoming.length
      }
    });
  } catch (error) {
    console.error('Error in getFollowUpDashboard:', error.message);
    return res.status(500).json({ message: 'Server error' });
  }
};
