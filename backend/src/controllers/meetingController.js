import Meeting from "../models/meetingModel.js";
import Activity from "../models/activityModel.js";
import NotificationService from "../services/notificationService.js";

// Get all meetings (Admin/HR/Manager only)
export const getAllMeetings = async (req, res) => {
  try {
    const { status, type, date } = req.query;

    let query = {};

    if (status) query.status = status;
    if (type) query.type = type;
    
    // Filter by date if provided
    if (date) {
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);
      query.date = { $gte: startOfDay, $lte: endOfDay };
    }

    const meetings = await Meeting.find(query)
      .populate("organizer", "name email")
      .populate("attendees", "name email department")
      .sort({ date: -1, startTime: 1 });

    res.json(meetings);
  } catch (error) {
    
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Get my meetings (where I'm an attendee or organizer)
export const getMyMeetings = async (req, res) => {
  try {
    const userId = req.user.id;
    const { date } = req.query;

    let query = {
      $or: [{ organizer: userId }, { attendees: userId }],
    };

    // Filter by date if provided
    if (date) {
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);
      query.date = { $gte: startOfDay, $lte: endOfDay };
    }

    const meetings = await Meeting.find(query)
      .populate("organizer", "name email")
      .populate("attendees", "name email")
      .sort({ date: 1, startTime: 1 });

    res.json(meetings);
  } catch (error) {
    
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Get today's meetings
export const getTodaysMeetings = async (req, res) => {
  try {
    const userId = req.user.id;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const meetings = await Meeting.find({
      $or: [{ organizer: userId }, { attendees: userId }],
      date: { $gte: today, $lt: tomorrow },
      status: { $ne: "cancelled" },
    })
      .populate("organizer", "name email")
      .populate("attendees", "name email")
      .sort({ startTime: 1 });

    res.json(meetings);
  } catch (error) {
    
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Create a meeting
export const createMeeting = async (req, res) => {
  try {
    const {
      title,
      description,
      date,
      startTime,
      endTime,
      location,
      meetingLink,
      attendees,
      type,
    } = req.body;

    const meeting = await Meeting.create({
      title,
      description,
      date,
      startTime,
      endTime,
      location,
      meetingLink,
      organizer: req.user.id,
      attendees,
      type,
    });

    // Create activity for each attendee
    const activityPromises = attendees.map((attendeeId) =>
      Activity.create({
        user: attendeeId,
        type: "meeting_scheduled",
        title: "Meeting Scheduled",
        description: `You have been invited to "${title}"`,
        relatedId: meeting._id,
        relatedModel: "Meeting",
        icon: "calendar",
        color: "info",
      })
    );

    await Promise.all(activityPromises);

    // Send notifications to all attendees
    try {
      await NotificationService.sendToMultiple(
        attendees,
        '📅 Meeting Scheduled',
        `You have been invited to: ${title}`,
        {
          type: 'meeting_scheduled',
          data: { meetingId: meeting._id.toString(), title },
          actionUrl: '/meetings',
          senderId: req.user.id,
        }
      );
    } catch (notificationError) {
      
    }

    const populatedMeeting = await Meeting.findById(meeting._id)
      .populate("organizer", "name email")
      .populate("attendees", "name email");

    res.status(201).json({
      message: "Meeting created successfully",
      meeting: populatedMeeting,
    });
  } catch (error) {
    
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Update meeting
export const updateMeeting = async (req, res) => {
  try {
    const { id } = req.params;
    const meeting = await Meeting.findById(id);

    if (!meeting) {
      return res.status(404).json({ message: "Meeting not found" });
    }

    // Organizer or HR/admin can update
    if (!canModifyMeetingAttendees(meeting, req.user)) {
      return res
        .status(403)
        .json({ message: "Only the organizer or HR/admin can update the meeting" });
    }

    // Get old attendees before update
    const oldAttendees = meeting.attendees.map(attendee => attendee.toString());
    
    const updatedMeeting = await Meeting.findByIdAndUpdate(id, req.body, {
      new: true,
      runValidators: true,
    })
      .populate("organizer", "name email")
      .populate("attendees", "name email");

    // Get new attendees after update
    const newAttendees = updatedMeeting.attendees.map(attendee => attendee._id.toString());
    
    // Send notifications to all attendees about the update
    try {
      const organizer = await import('../models/userModel.js').then(mod => mod.default.findById(req.user.id).select('name'));
      const organizerName = organizer?.name || 'Organizer';
      
      // Notify all attendees (both old and new to cover changes)
      const allAttendees = [...new Set([...oldAttendees, ...newAttendees])];
      
      if (allAttendees.length > 0) {
        await NotificationService.sendToMultiple(
          allAttendees,
          '📝 Meeting Updated',
          `${organizerName} updated the meeting: "${updatedMeeting.title}"`,
          {
            type: 'meeting_updated',
            data: {
              meetingId: updatedMeeting._id.toString(),
              meetingTitle: updatedMeeting.title,
              organizerName,
              changes: Object.keys(req.body),
            },
            actionUrl: '/meetings',
            senderId: req.user.id,
          }
        );
      }
      
      
    } catch (notificationError) {
      
    }

    res.json({
      message: "Meeting updated successfully",
      meeting: updatedMeeting,
    });
  } catch (error) {
    
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Delete meeting
export const deleteMeeting = async (req, res) => {
  try {
    const { id } = req.params;
    const meeting = await Meeting.findById(id).populate("attendees", "_id name");

    if (!meeting) {
      return res.status(404).json({ message: "Meeting not found" });
    }

    // Only organizer can delete
    if (meeting.organizer.toString() !== req.user.id) {
      return res
        .status(403)
        .json({ message: "Only organizer can delete the meeting" });
    }

    // Send notifications to all attendees before deleting
    try {
      const organizer = await import('../models/userModel.js').then(mod => mod.default.findById(req.user.id).select('name'));
      const organizerName = organizer?.name || 'Organizer';
      const attendees = meeting.attendees.map(attendee => attendee._id.toString());
      
      if (attendees.length > 0) {
        await NotificationService.sendToMultiple(
          attendees,
          '❌ Meeting Cancelled',
          `${organizerName} cancelled the meeting: "${meeting.title}"`,
          {
            type: 'meeting_cancelled',
            data: {
              meetingId: meeting._id.toString(),
              meetingTitle: meeting.title,
              organizerName,
              date: meeting.date,
              startTime: meeting.startTime,
            },
            actionUrl: '/meetings',
            senderId: req.user.id,
          }
        );
      }
      
      
    } catch (notificationError) {
      
    }

    await Meeting.findByIdAndDelete(id);

    res.json({ message: "Meeting deleted successfully" });
  } catch (error) {
    
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

/**
 * Whether the requester may modify meeting attendees.
 *
 * @param {object} meeting
 * @param {object} user
 * @returns {boolean}
 */
function canModifyMeetingAttendees(meeting, user) {
  if (!meeting || !user?.id) return false;

  const manageRoles = ['admin', 'superadmin', 'hr', 'manager'];
  if (manageRoles.includes(user.role)) {
    return true;
  }

  return meeting.organizer.toString() === String(user.id);
}

// Add attendees to a scheduled meeting
export const addMeetingAttendees = async (req, res) => {
  try {
    const { id } = req.params;
    const { attendeeIds } = req.body;

    if (!Array.isArray(attendeeIds) || attendeeIds.length === 0) {
      return res.status(400).json({ message: 'attendeeIds must be a non-empty array' });
    }

    const meeting = await Meeting.findById(id);
    if (!meeting) {
      return res.status(404).json({ message: 'Meeting not found' });
    }

    if (!canModifyMeetingAttendees(meeting, req.user)) {
      return res.status(403).json({
        message: 'Only the organizer or HR/admin can add attendees to this meeting',
      });
    }

    if (!['scheduled', 'ongoing'].includes(meeting.status)) {
      return res.status(400).json({
        message: 'Attendees can only be added to scheduled or ongoing meetings',
      });
    }

    const existingIds = new Set(meeting.attendees.map((attendee) => attendee.toString()));
    const organizerId = meeting.organizer.toString();
    const newAttendeeIds = attendeeIds
      .map((attendeeId) => String(attendeeId))
      .filter((attendeeId) => attendeeId !== organizerId && !existingIds.has(attendeeId));

    if (newAttendeeIds.length === 0) {
      return res.status(400).json({ message: 'All selected users are already attendees' });
    }

    meeting.attendees.push(...newAttendeeIds);
    await meeting.save();

    const activityPromises = newAttendeeIds.map((attendeeId) =>
      Activity.create({
        user: attendeeId,
        type: 'meeting_scheduled',
        title: 'Meeting Scheduled',
        description: `You have been invited to "${meeting.title}"`,
        relatedId: meeting._id,
        relatedModel: 'Meeting',
        icon: 'calendar',
        color: 'info',
      })
    );
    await Promise.all(activityPromises);

    try {
      await NotificationService.sendToMultiple(
        newAttendeeIds,
        '📅 Meeting Invitation',
        `You have been added to: ${meeting.title}`,
        {
          type: 'meeting_scheduled',
          data: { meetingId: meeting._id.toString(), title: meeting.title },
          actionUrl: '/meetings',
          senderId: req.user.id,
        }
      );
    } catch (notificationError) {
      console.error('Failed to notify new meeting attendees:', notificationError);
    }

    const populatedMeeting = await Meeting.findById(meeting._id)
      .populate('organizer', 'name email')
      .populate('attendees', 'name email department');

    res.json({
      message: `${newAttendeeIds.length} attendee(s) added successfully`,
      meeting: populatedMeeting,
      addedCount: newAttendeeIds.length,
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Complete meeting
export const completeMeeting = async (req, res) => {
  try {
    const { id } = req.params;
    const meeting = await Meeting.findById(id);

    if (!meeting) {
      return res.status(404).json({ message: "Meeting not found" });
    }

    // Only organizer can complete
    if (meeting.organizer.toString() !== req.user.id) {
      return res
        .status(403)
        .json({ message: "Only organizer can complete the meeting" });
    }

    // Only scheduled meetings can be completed
    if (meeting.status !== "scheduled") {
      return res.status(400).json({ 
        message: `Only scheduled meetings can be marked as completed. Current status: ${meeting.status}` 
      });
    }

    meeting.status = "completed";
    await meeting.save();

    const populatedMeeting = await Meeting.findById(meeting._id)
      .populate("organizer", "name email")
      .populate("attendees", "name email");

    res.json({
      message: "Meeting marked as completed",
      meeting: populatedMeeting,
    });
  } catch (error) {
    
    res.status(500).json({ message: "Server error", error: error.message });
  }
};
