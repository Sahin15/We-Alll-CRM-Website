import express from 'express';
import { protect, authorize } from '../middleware/authMiddleware.js';
import {
  getAllAnnouncements,
  getAnnouncementById,
  createAnnouncement,
  updateAnnouncement,
  deleteAnnouncement,
  markAnnouncementAsRead,
  getUnreadCount,
} from '../controllers/announcementController.js';

const router = express.Router();

// All routes require authentication
router.use(protect);

// Get unread count (must be before /:id route)
router.get('/unread/count', getUnreadCount);

// Get all announcements
router.get('/', getAllAnnouncements);

// Get single announcement
router.get('/:id', getAnnouncementById);

// Create announcement (Admin/HR only)
router.post('/', authorize('admin', 'superadmin', 'hr'), createAnnouncement);

// Update announcement (Admin/HR only)
router.put('/:id', authorize('admin', 'superadmin', 'hr'), updateAnnouncement);

// Delete announcement (Admin/HR only)
router.delete('/:id', authorize('admin', 'superadmin', 'hr'), deleteAnnouncement);

// Mark announcement as read
router.post('/:id/read', markAnnouncementAsRead);

export default router;
