import Announcement from "../models/announcementModel.js";
import Notification from "../models/notificationModel.js";
import User from "../models/userModel.js";

// @desc    Get all announcements
// @route   GET /api/announcements
// @access  Private
export const getAllAnnouncements = async (req, res) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.role;
    const userDepartment = req.user.department;

    // Build query based on user role and department
    let query = {
      $or: [
        { department: null }, // Announcements for all departments
        { department: userDepartment }, // Department-specific announcements
      ],
    };

    // Filter by target roles if specified
    query.$and = [
      {
        $or: [
          { targetRoles: { $size: 0 } }, // No specific roles (for everyone)
          { targetRoles: userRole }, // Includes user's role
        ],
      },
    ];

    // Exclude expired announcements
    query.$or.push({ expiresAt: null }, { expiresAt: { $gt: new Date() } });

    const announcements = await Announcement.find(query)
      .populate("createdBy", "name email")
      .populate("department", "name")
      .sort({ isPinned: -1, createdAt: -1 })
      .lean();

    // Add isRead flag for each announcement
    const announcementsWithReadStatus = announcements.map((announcement) => ({
      ...announcement,
      isRead: announcement.readBy?.some(
        (read) => read.user.toString() === userId
      ),
    }));

    res.status(200).json(announcementsWithReadStatus);
  } catch (error) {
    console.error("Error in getAllAnnouncements:", error.message);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// @desc    Get single announcement
// @route   GET /api/announcements/:id
// @access  Private
export const getAnnouncementById = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const announcement = await Announcement.findById(id)
      .populate("createdBy", "name email")
      .populate("department", "name");

    if (!announcement) {
      return res.status(404).json({ message: "Announcement not found" });
    }

    // Mark as read
    await announcement.markAsRead(userId);

    res.status(200).json(announcement);
  } catch (error) {
    console.error("Error in getAnnouncementById:", error.message);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// @desc    Create announcement
// @route   POST /api/announcements
// @access  Private (Admin/HR only)
export const createAnnouncement = async (req, res) => {
  try {
    const {
      title,
      content,
      type,
      priority,
      isPinned,
      department,
      targetRoles,
      expiresAt,
      attachments,
    } = req.body;

    const announcement = await Announcement.create({
      title,
      content,
      type: type || "general",
      priority: priority || "normal",
      isPinned: isPinned || false,
      department: department || null,
      targetRoles: targetRoles || [],
      expiresAt: expiresAt || null,
      attachments: attachments || [],
      createdBy: req.user.id,
    });

    // Populate creator info
    await announcement.populate("createdBy", "name email");
    if (department) {
      await announcement.populate("department", "name");
    }

    // Create notifications for all relevant users
    await createAnnouncementNotifications(announcement, req.user);

    res.status(201).json(announcement);
  } catch (error) {
    console.error("Error in createAnnouncement:", error.message);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// @desc    Update announcement
// @route   PUT /api/announcements/:id
// @access  Private (Admin/HR only)
export const updateAnnouncement = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      title,
      content,
      type,
      priority,
      isPinned,
      department,
      targetRoles,
      expiresAt,
      attachments,
    } = req.body;

    const announcement = await Announcement.findById(id);

    if (!announcement) {
      return res.status(404).json({ message: "Announcement not found" });
    }

    // Update fields
    if (title) announcement.title = title;
    if (content) announcement.content = content;
    if (type) announcement.type = type;
    if (priority) announcement.priority = priority;
    if (isPinned !== undefined) announcement.isPinned = isPinned;
    if (department !== undefined) announcement.department = department;
    if (targetRoles) announcement.targetRoles = targetRoles;
    if (expiresAt !== undefined) announcement.expiresAt = expiresAt;
    if (attachments) announcement.attachments = attachments;

    await announcement.save();
    await announcement.populate("createdBy", "name email");
    if (announcement.department) {
      await announcement.populate("department", "name");
    }

    res.status(200).json(announcement);
  } catch (error) {
    console.error("Error in updateAnnouncement:", error.message);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// @desc    Delete announcement
// @route   DELETE /api/announcements/:id
// @access  Private (Admin/HR only)
export const deleteAnnouncement = async (req, res) => {
  try {
    const { id } = req.params;

    const announcement = await Announcement.findById(id);

    if (!announcement) {
      return res.status(404).json({ message: "Announcement not found" });
    }

    // Delete the announcement
    await announcement.deleteOne();

    // Also delete all related notifications
    const deletedNotifications = await Notification.deleteMany({
      'data.announcementId': id
    });

    console.log(`Deleted announcement "${announcement.title}" and ${deletedNotifications.deletedCount} related notifications`);

    res.status(200).json({ 
      message: "Announcement and related notifications deleted successfully",
      deletedNotifications: deletedNotifications.deletedCount
    });
  } catch (error) {
    console.error("Error in deleteAnnouncement:", error.message);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// @desc    Mark announcement as read
// @route   POST /api/announcements/:id/read
// @access  Private
export const markAnnouncementAsRead = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const announcement = await Announcement.findById(id);

    if (!announcement) {
      return res.status(404).json({ message: "Announcement not found" });
    }

    await announcement.markAsRead(userId);

    res.status(200).json({ message: "Announcement marked as read" });
  } catch (error) {
    console.error("Error in markAnnouncementAsRead:", error.message);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// @desc    Get unread announcements count
// @route   GET /api/announcements/unread/count
// @access  Private
export const getUnreadCount = async (req, res) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.role;
    const userDepartment = req.user.department;

    // Build query
    let query = {
      $or: [
        { department: null },
        { department: userDepartment },
      ],
      $and: [
        {
          $or: [
            { targetRoles: { $size: 0 } },
            { targetRoles: userRole },
          ],
        },
        {
          $or: [
            { expiresAt: null },
            { expiresAt: { $gt: new Date() } },
          ],
        },
      ],
      "readBy.user": { $ne: userId }, // Not read by this user
    };

    const count = await Announcement.countDocuments(query);

    res.status(200).json({ count });
  } catch (error) {
    console.error("Error in getUnreadCount:", error.message);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Helper function to create notifications for announcement
async function createAnnouncementNotifications(announcement, creator) {
  try {
    // Determine target users
    let userQuery = {};

    // Filter by department if specified
    if (announcement.department) {
      userQuery.department = announcement.department;
    }

    // Filter by roles if specified
    if (announcement.targetRoles && announcement.targetRoles.length > 0) {
      userQuery.role = { $in: announcement.targetRoles };
    }

    // Get all target users (exclude the creator)
    const targetUsers = await User.find({
      ...userQuery,
      _id: { $ne: creator._id },
    }).select("_id");

    // Create notifications for all target users
    const notifications = targetUsers.map((user) => ({
      recipient: user._id,  // Changed from 'user' to 'recipient'
      recipientType: "employee",
      type: "general",  // Use 'general' type which exists in the enum
      title: `New Announcement: ${announcement.title}`,
      message: announcement.content.substring(0, 200) + (announcement.content.length > 200 ? "..." : ""),
      link: `/employee/announcements`,
      data: {
        announcementId: announcement._id,
        announcementType: announcement.type,  // Store actual announcement type in data
      },
    }));

    if (notifications.length > 0) {
      await Notification.insertMany(notifications);
      console.log(`Created ${notifications.length} notifications for announcement: ${announcement.title}`);
    }
  } catch (error) {
    console.error("Error creating announcement notifications:", error);
    // Don't throw error - notification creation failure shouldn't block announcement creation
  }
}

export default {
  getAllAnnouncements,
  getAnnouncementById,
  createAnnouncement,
  updateAnnouncement,
  deleteAnnouncement,
  markAnnouncementAsRead,
  getUnreadCount,
};
