import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
import {
  upload,
  uploadDocument,
  uploadOfficialDocument,
  getUserDocuments,
  getOfficialDocuments,
  downloadDocument,
  deleteDocument,
  getAllDocuments,
  approveDocument,
  rejectDocument,
  getDocumentsForVerification
} from '../controllers/documentController.js';

const router = express.Router();

// Personal document routes (for employees)
router.post('/upload', protect, upload.single('document'), uploadDocument);
router.get('/', protect, getUserDocuments);

// Official document routes
router.post('/official', protect, upload.single('document'), uploadOfficialDocument);
router.get('/official', protect, getOfficialDocuments);

// Download and delete routes
router.get('/:documentId/download', protect, downloadDocument);
router.get('/official/:documentId/download', protect, downloadDocument);
router.delete('/:documentId', protect, deleteDocument);

// Admin routes
router.get('/all', protect, getAllDocuments);

// Document verification routes (for HR/Admin)
router.get('/verification/pending', protect, getDocumentsForVerification);
router.put('/:documentId/approve', protect, approveDocument);
router.put('/:documentId/reject', protect, rejectDocument);

export default router;