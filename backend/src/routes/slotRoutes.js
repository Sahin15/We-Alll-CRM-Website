import express from 'express';
import {
  getAllSlots,
  getSlotsByProject,
  getMySlots,
  getSlotById,
  createSlot,
  updateSlot,
  updateSlotStatus as updateSlotStatusOld,
  addComment,
  uploadCreative,
  deleteSlot,
  getSlotStatistics,
  getMyCreatedSlots,
  getProjectSlots,
  getMyTasks,
  updateSlotStatus,
} from '../controllers/slotController.js';
import { protect } from '../middleware/authMiddleware.js';
import { 
  canCreateSlot, 
  canEditSlot, 
  canDeleteSlot,
  canViewSlot,
  canUpdateStatus,
  canUploadCreative
} from '../middleware/slotMiddleware.js';
import { uploadSlotFile, handleSlotUploadError } from '../middleware/slotUploadMiddleware.js';
import { canCreateSlots } from '../middleware/hopMiddleware.js';

const router = express.Router();

// Public routes (none - all require authentication)

// Protected routes
router.use(protect);

// Get all slots (with filters)
router.get('/', getAllSlots);

// Get my assigned slots
router.get('/my-slots', getMySlots);

// HoP Routes - Get slots created by me
router.get('/my-created', getMyCreatedSlots);

// Employee Routes - Get my assigned tasks
router.get('/my-tasks', getMyTasks);

// Get slots by project
router.get('/project/:projectId', getProjectSlots);

// Get slot statistics for a project
router.get('/stats/:projectId', getSlotStatistics);

// Get single slot
router.get('/:id', canViewSlot, getSlotById);

// Create new slot
router.post('/', canCreateSlot, createSlot);

// Update slot
router.put('/:id', canEditSlot, updateSlot);

// Update slot status (for employees)
router.patch('/:id/status', canUpdateStatus, updateSlotStatus);

// Add comment to slot
router.post('/:id/comments', canViewSlot, addComment);

// Upload creative
router.post('/:id/creatives', canUploadCreative, uploadSlotFile.single('file'), handleSlotUploadError, uploadCreative);

// Delete slot
router.delete('/:id', canDeleteSlot, deleteSlot);

export default router;
