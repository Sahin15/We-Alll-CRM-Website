import Meeting from "../models/meetingModel.js";
import Activity from "../models/activityModel.js";

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
    console.error("Error fetching all meetings:", error);
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
    console.error("Error fetching meetings:", error);
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
    console.error("Error fetching today's meetings:", error);
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

    const populatedMeeting = await Meeting.findById(meeting._id)
      .populate("organizer", "name email")
      .populate("attendees", "name email");

    res.status(201).json({
      message: "Meeting created successfully",
      meeting: populatedMeeting,
    });
  } catch (error) {
    console.error("Error creating meeting:", error);
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

    // Only organizer can update
    if (meeting.organizer.toString() !== req.user.id) {
      return res
        .status(403)
        .json({ message: "Only organizer can update the meeting" });
    }

    const updatedMeeting = await Meeting.findByIdAndUpdate(id, req.body, {
      new: true,
      runValidators: true,
    })
      .populate("organizer", "name email")
      .populate("attendees", "name email");

    res.json({
      message: "Meeting updated successfully",
      meeting: updatedMeeting,
    });
  } catch (error) {
    console.error("Error updating meeting:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Delete meeting
export const deleteMeeting = async (req, res) => {
  try {
    const { id } = req.params;
    const meeting = await Meeting.findById(id);

    if (!meeting) {
      return res.status(404).json({ message: "Meeting not found" });
    }

    // Only organizer can delete
    if (meeting.organizer.toString() !== req.user.id) {
      return res
        .status(403)
        .json({ message: "Only organizer can delete the meeting" });
    }

    await Meeting.findByIdAndDelete(id);

    res.json({ message: "Meeting deleted successfully" });
  } catch (error) {
    console.error("Error deleting meeting:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};
