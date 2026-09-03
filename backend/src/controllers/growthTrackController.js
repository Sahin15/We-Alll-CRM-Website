import GrowthTrack from "../models/growthTrackModel.js";
import User from "../models/userModel.js";
import NotificationService from "../services/notificationService.js";

// Fetch current user's active Growth Track
export const getMyActiveTrack = async (req, res) => {
  try {
    const employeeId = req.user._id;
    
    const activeTrack = await GrowthTrack.findOne({
      employee: employeeId,
      status: { $in: ["active", "extended"] },
    })
      .populate("employee", "name email designation department profilePicture employeeId")
      .populate("manager", "name email designation profilePicture")
      .populate("notices.issuedBy", "name email")
      .populate("reviewMeetings.reviewedBy", "name email")
      .populate("history.changedBy", "name email");

    res.status(200).json(activeTrack);
  } catch (error) {
    res.status(500).json({
      message: "Server error retrieving active Growth Track",
      error: error.message,
    });
  }
};

// Initiate or escalate Growth Track for an employee (Manager / HR only)
export const initiateGrowthTrack = async (req, res) => {
  try {
    const { employeeId, stage, problemCategory, description, deadline } = req.body;

    if (!employeeId || !stage || !problemCategory || !description || !deadline) {
      return res.status(400).json({
        message: "Employee ID, stage, problem category, description, and deadline are required",
      });
    }

    const employee = await User.findById(employeeId);
    if (!employee) {
      return res.status(404).json({ message: "Employee not found" });
    }

    // Determine reporting manager
    const managerId = employee.reportingManager || req.user._id;

    // Check if there is already an active track
    let track = await GrowthTrack.findOne({
      employee: employeeId,
      status: { $in: ["active", "extended"] },
    });

    const noticeData = {
      stage,
      problemCategory,
      description,
      deadline: new Date(deadline),
      issuedBy: req.user._id,
      issuedAt: new Date(),
      acknowledged: false,
    };

    let isNew = false;
    if (track) {
      // Escalation of existing track
      track.stage = stage;
      track.notices.push(noticeData);
      
      // Update end date if moving to critical review stage
      if (stage === "critical") {
        track.endDate = new Date(deadline);
      }
      
      track.history.push({
        stage,
        status: track.status,
        changedBy: req.user._id,
        note: `Escalated to ${stage} stage. Notice details: ${description.substring(0, 100)}...`,
      });
      
      await track.save();
    } else {
      // Create new track
      isNew = true;
      track = await GrowthTrack.create({
        employee: employeeId,
        manager: managerId,
        stage,
        status: "active",
        notices: [noticeData],
        endDate: stage === "critical" ? new Date(deadline) : undefined,
        history: [
          {
            stage,
            status: "active",
            changedBy: req.user._id,
            note: `Initiated Growth Track at ${stage} stage. Notice details: ${description.substring(0, 100)}...`,
          },
        ],
      });
    }

    // Send in-app notification to employee
    try {
      const stageLabels = {
        concern: "Concern Stage (Level 1)",
        improvement: "Improvement Stage (Level 2)",
        critical: "Critical Review Stage (Level 3 - Growth Track)",
      };
      
      const title = `Growth Track Update: ${stageLabels[stage]}`;
      const body = `Your performance track has been updated. Please check your dashboard for details and acknowledge the notice.`;
      
      await NotificationService.sendToUser(employeeId, title, body, {
        type: "growth_track",
        actionUrl: "/growth-track",
        senderId: req.user._id,
      });
    } catch (notifError) {
      console.error("Failed to send notification:", notifError.message);
    }

    res.status(200).json({
      message: isNew ? "Growth Track initiated successfully" : "Growth Track stage updated successfully",
      track,
    });
  } catch (error) {
    res.status(500).json({
      message: "Server error initiating Growth Track",
      error: error.message,
    });
  }
};

// Add weekly target to active Growth Track (Manager only)
export const addWeeklyTarget = async (req, res) => {
  try {
    const { trackId } = req.params;
    const { weekNumber, title, expectedValue } = req.body;

    if (!weekNumber || !title || !expectedValue) {
      return res.status(400).json({
        message: "Week number, title, and expected value are required",
      });
    }

    const track = await GrowthTrack.findById(trackId);
    if (!track) {
      return res.status(404).json({ message: "Growth Track not found" });
    }

    // Verify user is manager of the track or HR
    const isManager = track.manager.toString() === req.user._id.toString();
    const isHR = ["hr", "admin", "superadmin"].includes(req.user.role);
    if (!isManager && !isHR) {
      return res.status(403).json({ message: "Unauthorized to add targets" });
    }

    track.weeklyTargets.push({
      weekNumber,
      title,
      expectedValue,
      achievedValue: "0",
      pendingValue: expectedValue,
    });

    await track.save();

    // Notify employee about new target
    try {
      await NotificationService.sendToUser(
        track.employee,
        "New Target Assigned",
        `A new weekly target has been assigned for Week ${weekNumber}: ${title}`,
        {
          type: "growth_track",
          actionUrl: "/growth-track",
          senderId: req.user._id,
        }
      );
    } catch (notifError) {
      console.error("Failed to send target notification:", notifError.message);
    }

    res.status(200).json({
      message: "Weekly target added successfully",
      targets: track.weeklyTargets,
    });
  } catch (error) {
    res.status(500).json({
      message: "Server error adding weekly target",
      error: error.message,
    });
  }
};

// Update weekly target values (Manager only)
export const updateTargetProgress = async (req, res) => {
  try {
    const { trackId, targetId } = req.params;
    const { achievedValue, pendingValue } = req.body;

    const track = await GrowthTrack.findById(trackId);
    if (!track) {
      return res.status(404).json({ message: "Growth Track not found" });
    }

    // Verify authorization
    const isManager = track.manager.toString() === req.user._id.toString();
    const isHR = ["hr", "admin", "superadmin"].includes(req.user.role);
    if (!isManager && !isHR) {
      return res.status(403).json({ message: "Unauthorized to update targets" });
    }

    const target = track.weeklyTargets.id(targetId);
    if (!target) {
      return res.status(404).json({ message: "Weekly target not found" });
    }

    if (achievedValue !== undefined) target.achievedValue = String(achievedValue);
    if (pendingValue !== undefined) target.pendingValue = String(pendingValue);

    await track.save();

    res.status(200).json({
      message: "Weekly target progress updated successfully",
      targets: track.weeklyTargets,
    });
  } catch (error) {
    res.status(500).json({
      message: "Server error updating target progress",
      error: error.message,
    });
  }
};

// Acknowledge notice by employee
export const acknowledgeNotice = async (req, res) => {
  try {
    const { trackId, noticeId } = req.params;

    const track = await GrowthTrack.findById(trackId);
    if (!track) {
      return res.status(404).json({ message: "Growth Track not found" });
    }

    // Check if the current user is the owner of the track
    if (track.employee.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Unauthorized. You can only acknowledge your own notices." });
    }

    const notice = track.notices.id(noticeId);
    if (!notice) {
      return res.status(404).json({ message: "Notice not found" });
    }

    if (notice.acknowledged) {
      return res.status(400).json({ message: "Notice is already acknowledged" });
    }

    notice.acknowledged = true;
    notice.acknowledgedAt = new Date();

    track.history.push({
      stage: track.stage,
      status: track.status,
      changedBy: req.user._id,
      note: `Notice for ${notice.stage} stage acknowledged by employee.`,
    });

    await track.save();

    // Notify manager that employee acknowledged
    try {
      await NotificationService.sendToUser(
        track.manager,
        "Notice Acknowledged",
        `${req.user.name} has acknowledged the ${notice.stage} notice.`,
        {
          type: "growth_track",
          actionUrl: `/growth-track`,
          senderId: req.user._id,
        }
      );
    } catch (notifError) {
      console.error("Failed to send notice notification:", notifError.message);
    }

    res.status(200).json({
      message: "Notice acknowledged successfully",
      track,
    });
  } catch (error) {
    res.status(500).json({
      message: "Server error acknowledging notice",
      error: error.message,
    });
  }
};

// Log weekly review meeting details (Manager only)
export const logReviewMeeting = async (req, res) => {
  try {
    const { trackId } = req.params;
    const { reviewDate, notes, progressStatus } = req.body;

    if (!reviewDate || !notes || !progressStatus) {
      return res.status(400).json({
        message: "Review date, notes, and progress status are required",
      });
    }

    const track = await GrowthTrack.findById(trackId);
    if (!track) {
      return res.status(404).json({ message: "Growth Track not found" });
    }

    // Verify authorization
    const isManager = track.manager.toString() === req.user._id.toString();
    const isHR = ["hr", "admin", "superadmin"].includes(req.user.role);
    if (!isManager && !isHR) {
      return res.status(403).json({ message: "Unauthorized to log review meetings" });
    }

    track.reviewMeetings.push({
      reviewDate: new Date(reviewDate),
      notes,
      progressStatus,
      reviewedBy: req.user._id,
    });

    await track.save();

    // Notify employee about review meeting
    try {
      await NotificationService.sendToUser(
        track.employee,
        "Performance Review Logged",
        `Your manager logged a review meeting with status: ${progressStatus}`,
        {
          type: "growth_track",
          actionUrl: "/growth-track",
          senderId: req.user._id,
        }
      );
    } catch (notifError) {
      console.error("Failed to send review notification:", notifError.message);
    }

    res.status(200).json({
      message: "Review meeting logged successfully",
      reviews: track.reviewMeetings,
    });
  } catch (error) {
    res.status(500).json({
      message: "Server error logging review meeting",
      error: error.message,
    });
  }
};

// Finalize/Close the Growth Track (Manager/HR only)
export const finalizeGrowthTrack = async (req, res) => {
  try {
    const { trackId } = req.params;
    const { outcome, note } = req.body; // outcome: "improved" | "partially_improved" | "no_improvement"

    if (!outcome) {
      return res.status(400).json({ message: "Final outcome is required" });
    }

    const track = await GrowthTrack.findById(trackId);
    if (!track) {
      return res.status(404).json({ message: "Growth Track not found" });
    }

    // Verify authorization
    const isManager = track.manager.toString() === req.user._id.toString();
    const isHR = ["hr", "admin", "superadmin"].includes(req.user.role);
    if (!isManager && !isHR) {
      return res.status(403).json({ message: "Unauthorized to finalize track" });
    }

    let nextStatus = "completed";
    let messageText = "";

    if (outcome === "improved") {
      nextStatus = "completed";
      messageText = "Congratulations! You have successfully completed the Growth Track. Your dashboard has returned to normal.";
    } else if (outcome === "partially_improved") {
      nextStatus = "extended";
      messageText = "Your Growth Track review cycle has been extended. Please continue to focus on your targets.";
      // Set new endDate (extend by 30 days by default if not provided)
      const currentEnd = track.endDate || new Date();
      track.endDate = new Date(currentEnd.getTime() + 30 * 24 * 60 * 60 * 1000);
    } else if (outcome === "no_improvement") {
      nextStatus = "hr_action";
      messageText = "Your Growth Track cycle has concluded without improvement. Your case has been escalated to HR.";
    }

    track.status = nextStatus;
    track.history.push({
      stage: track.stage,
      status: nextStatus,
      changedBy: req.user._id,
      note: note || `Growth Track finalized with outcome: ${outcome}`,
    });

    await track.save();

    // Send notifications
    try {
      // 1. Notify Employee
      await NotificationService.sendToUser(track.employee, "Growth Track Finalized", messageText, {
        type: "growth_track",
        actionUrl: "/growth-track",
        senderId: req.user._id,
      });

      // 2. Notify HR if outcome is "no_improvement"
      if (nextStatus === "hr_action") {
        const hrUsers = await User.find({ role: "hr" }).select("_id");
        const employeeObj = await User.findById(track.employee).select("name");
        
        for (const hr of hrUsers) {
          await NotificationService.sendToUser(
            hr._id,
            "Critical: Growth Track Escalation",
            `Employee ${employeeObj.name} has finished their Growth Track with 'No Improvement'. Case is escalated for further action.`,
            {
              type: "growth_track",
              actionUrl: `/growth-track`,
              senderId: req.user._id,
            }
          );
        }
      }
    } catch (notifError) {
      console.error("Failed to send finalization notifications:", notifError.message);
    }

    res.status(200).json({
      message: `Growth Track finalized as ${nextStatus} successfully`,
      track,
    });
  } catch (error) {
    res.status(500).json({
      message: "Server error finalising Growth Track",
      error: error.message,
    });
  }
};

// Get all Growth Tracks (HR and Admins only)
export const getAllGrowthTracks = async (req, res) => {
  try {
    const tracks = await GrowthTrack.find()
      .populate("employee", "name email designation department profilePicture employeeId")
      .populate("manager", "name email designation profilePicture")
      .populate("notices.issuedBy", "name email")
      .sort({ updatedAt: -1 });

    res.status(200).json(tracks);
  } catch (error) {
    res.status(500).json({
      message: "Server error fetching growth tracks",
      error: error.message,
    });
  }
};

// Get reporting employees' growth tracks (Manager only)
export const getManagerGrowthTracks = async (req, res) => {
  try {
    const managerId = req.user._id;

    // Find employees who report to this manager
    const reportingEmployees = await User.find({ reportingManager: managerId }).select("_id");
    const employeeIds = reportingEmployees.map((e) => e._id);

    // Get tracks where manager is listed as manager OR employee reports to them
    const tracks = await GrowthTrack.find({
      $or: [
        { manager: managerId },
        { employee: { $in: employeeIds } },
      ],
    })
      .populate("employee", "name email designation department profilePicture employeeId")
      .populate("manager", "name email designation profilePicture")
      .populate("notices.issuedBy", "name email")
      .sort({ updatedAt: -1 });

    res.status(200).json(tracks);
  } catch (error) {
    res.status(500).json({
      message: "Server error fetching manager growth tracks",
      error: error.message,
    });
  }
};
