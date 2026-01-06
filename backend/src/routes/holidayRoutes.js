import express from 'express';
import { protect, authorize } from '../middleware/authMiddleware.js';
import {
  getHolidays,
  getUpcomingHolidays,
  createHoliday,
  updateHoliday,
  deleteHoliday
} from '../controllers/holidayController.js';

const router = express.Router();

// Public routes (all authenticated users can view holidays)
router.get('/', protect, getHolidays);
router.get('/upcoming', protect, getUpcomingHolidays);

// Protected routes (HR/Admin only can manage holidays)
router.post('/', protect, authorize('admin', 'superadmin', 'hr'), createHoliday);
router.put('/:id', protect, authorize('admin', 'superadmin', 'hr'), updateHoliday);
router.delete('/:id', protect, authorize('admin', 'superadmin', 'hr'), deleteHoliday);

export default router;