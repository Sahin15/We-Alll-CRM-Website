import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
import {
  getEffectivePermissions,
  checkPermission,
  getPermissionCatalog,
} from '../controllers/authzController.js';

const router = express.Router();

router.get('/effective', protect, getEffectivePermissions);
router.post('/check', protect, checkPermission);
router.get('/catalog', protect, getPermissionCatalog);

export default router;
