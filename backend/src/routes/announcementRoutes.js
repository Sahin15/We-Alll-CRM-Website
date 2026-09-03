import express from 'express';
import { protect, authorize } from '../middleware/authMiddleware.js';
import { requireModulePermission } from '../authz/authzMiddleware.js';
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

const ANNOUNCEMENT_MANAGE_ROLES = ['admin', 'superadmin', 'hr', 'manager'];

// All routes require authentication
router.use(protect);

// Get unread count (must be before /:id route)
router.get('/unread/count', requireModulePermission('company', 'company.announcement.view'), getUnreadCount);

// Get all announcements
router.get('/', requireModulePermission('company', 'company.announcement.view'), getAllAnnouncements);

// Get single announcement
router.get('/:id', requireModulePermission('company', 'company.announcement.view'), getAnnouncementById);

// Create announcement (Admin/HR/Manager only)
router.post(
  '/',
  requireModulePermission('company', 'company.announcement.manage', { legacyRoles: ANNOUNCEMENT_MANAGE_ROLES }),
  createAnnouncement
);

// Update announcement (Admin/HR/Manager only)
router.put(
  '/:id',
  requireModulePermission('company', 'company.announcement.manage', { legacyRoles: ANNOUNCEMENT_MANAGE_ROLES }),
  updateAnnouncement
);

// Delete announcement (Admin/HR/Manager only)
router.delete(
  '/:id',
  requireModulePermission('company', 'company.announcement.manage', { legacyRoles: ANNOUNCEMENT_MANAGE_ROLES }),
  deleteAnnouncement
);

// Mark announcement as read
router.post('/:id/read', requireModulePermission('company', 'company.announcement.view'), markAnnouncementAsRead);

export default router;
