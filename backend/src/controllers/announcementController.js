import Announcement from "../models/announcementModel.js";
import Notification from "../models/notificationModel.js";
import User from "../models/userModel.js";
import NotificationService from "../services/notificationService.js";
import { mergeExcludePastMembersFilter } from "../utils/employeeQueryUtils.js";

const ANNOUNCEMENT_TYPES = [
  "general",
  "urgent",
  "event",
  "policy",
  "holiday",
  "important",
];
const ANNOUNCEMENT_PRIORITIES = ["low", "normal", "high"];

/**
 * @param {unknown} value
 * @returns {string}
 */
function sanitizePriority(value) {
  const priority = String(value || "normal").trim().toLowerCase();
  return ANNOUNCEMENT_PRIORITIES.includes(priority) ? priority : "normal";
}

/**
 * @param {unknown} value
 * @returns {string}
 */
function sanitizeType(value) {
  const type = String(value || "general").trim().toLowerCase();
  return ANNOUNCEMENT_TYPES.includes(type) ? type : "general";
}

/**
 * Build announcement visibility query for the current user.
 * @param {{ role?: string }} user
 */
function buildAnnouncementVisibilityQuery(user) {
  const userRole = user?.role;

  return {
    $and: [
      {
        $or: [{ targetRoles: { $size: 0 } }, { targetRoles: userRole }],
      },
      {
        $or: [{ expiresAt: null }, { expiresAt: { $gt: new Date() } }],
      },
    ],
  };
}

// @desc    Get all announcements
// @route   GET /api/announcements
// @access  Private
export const getAllAnnouncements = async (req, res) => {
  try {
    const userId = req.user.id;
    const query = buildAnnouncementVisibilityQuery(req.user);

    const announcements = await Announcement.find(query)
      .populate("createdBy", "name email")
      .sort({ isPinned: -1, createdAt: -1 })
      .lean();

    // Add isRead flag for each announcement
    const announcementsWithReadStatus = announcements.map((announcement) => ({
      ...announcement,
      isRead: announcement.readBy?.some(
        (read) => read.user && read.user.toString() === userId
      ) ?? false,
    }));

    res.status(200).json(announcementsWithReadStatus);
  } catch (error) {
    
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
      .populate("createdBy", "name email");

    if (!announcement) {
      return res.status(404).json({ message: "Announcement not found" });
    }

    // Mark as read
    await announcement.markAsRead(userId);

    res.status(200).json(announcement);
  } catch (error) {
    
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
      targetRoles,
      expiresAt,
      attachments,
    } = req.body;

    const announcement = await Announcement.create({
      title,
      content,
      type: sanitizeType(type),
      priority: sanitizePriority(priority),
      isPinned: Boolean(isPinned),
      department: null,
      targetRoles: Array.isArray(targetRoles) ? targetRoles : [],
      expiresAt: expiresAt || null,
      attachments: attachments || [],
      createdBy: req.user.id,
    });

    await announcement.populate("createdBy", "name email");

    // Create notifications for all relevant users
    await createAnnouncementNotifications(announcement, req.user);

    res.status(201).json(announcement);
  } catch (error) {
    console.error("[announcements] createAnnouncement failed:", error);
    if (error.name === "ValidationError") {
      return res.status(400).json({ message: error.message, error: error.message });
    }
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
    if (type) announcement.type = sanitizeType(type);
    if (priority) announcement.priority = sanitizePriority(priority);
    if (isPinned !== undefined) announcement.isPinned = Boolean(isPinned);
    if (targetRoles) announcement.targetRoles = targetRoles;
    if (expiresAt !== undefined) announcement.expiresAt = expiresAt;
    if (attachments) announcement.attachments = attachments;

    await announcement.save();
    await announcement.populate("createdBy", "name email");

    res.status(200).json(announcement);
  } catch (error) {
    
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

    

    res.status(200).json({ 
      message: "Announcement and related notifications deleted successfully",
      deletedNotifications: deletedNotifications.deletedCount
    });
  } catch (error) {
    
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
    
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// @desc    Get unread announcements count
// @route   GET /api/announcements/unread/count
// @access  Private
export const getUnreadCount = async (req, res) => {
  try {
    const userId = req.user.id;
    const query = {
      ...buildAnnouncementVisibilityQuery(req.user),
      "readBy.user": { $ne: userId },
    };

    const count = await Announcement.countDocuments(query);

    res.status(200).json({ count });
  } catch (error) {
    
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Helper function to create notifications for announcement
async function createAnnouncementNotifications(announcement, creator) {
  try {
    // Determine target users
    let userQuery = {};

    // Filter by roles if specified
    if (announcement.targetRoles && announcement.targetRoles.length > 0) {
      userQuery.role = { $in: announcement.targetRoles };
    }

    // Get all target users (exclude the creator)
    const targetUsers = await User.find(
      mergeExcludePastMembersFilter({
        ...userQuery,
        _id: { $ne: creator._id },
      })
    ).select("_id name");

    if (targetUsers.length > 0) {
      // Send push notifications using our notification service
      const userIds = targetUsers.map(user => user._id);
      await NotificationService.sendToMultiple(
        userIds,
        `📢 ${announcement.title}`,
        announcement.content.substring(0, 100) + (announcement.content.length > 100 ? "..." : ""),
        {
          type: "announcement",
          data: { announcementId: announcement._id.toString() },
          actionUrl: "/employee/announcements",
          senderId: creator._id,
        }
      );
    }
  } catch (error) {
    console.error("[announcements] createAnnouncementNotifications failed:", error.message);
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
