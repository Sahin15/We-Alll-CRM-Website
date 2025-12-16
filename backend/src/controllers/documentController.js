import multer from 'multer';
import path from 'path';
import fs from 'fs';
import User from '../models/userModel.js';
import Document from '../models/documentModel.js';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(__dirname, '../../uploads/documents');
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|pdf|doc|docx/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);

  if (mimetype && extname) {
    return cb(null, true);
  } else {
    cb(new Error('Only images, PDFs, and documents are allowed'));
  }
};

const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: fileFilter
});

// Upload personal document (for employees)
const uploadDocument = async (req, res) => {
  try {
    const { category, description } = req.body;
    const userId = req.user._id;

    console.log('Upload request - User:', userId, 'Category:', category, 'File:', req.file?.originalname);

    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    // Check if one-time document already exists (employees can only upload once, HR/Admin can override)
    const oneTimeCategories = ['aadhaar', 'pan', 'bank', 'joining_letter', 'offer_letter'];
    if (oneTimeCategories.includes(category)) {
      const existingDoc = await Document.findOne({ userId, category });
      if (existingDoc) {
        // Only allow HR/Admin to replace existing one-time documents
        if (!['hr', 'admin', 'superadmin'].includes(req.user.role)) {
          // Delete uploaded file
          fs.unlinkSync(req.file.path);
          return res.status(400).json({ 
            message: 'Document already exists for this category. Only HR/Admin can replace it.',
            canReplace: false
          });
        } else {
          // HR/Admin can replace - delete the old document
          if (fs.existsSync(existingDoc.path)) {
            fs.unlinkSync(existingDoc.path);
          }
          await Document.findByIdAndDelete(existingDoc._id);
        }
      }
    }

    const document = new Document({
      userId,
      category,
      originalName: req.file.originalname,
      filename: req.file.filename,
      path: req.file.path,
      size: req.file.size,
      mimetype: req.file.mimetype,
      description,
      uploadedBy: userId,
      isOfficial: false
    });

    await document.save();

    res.status(201).json({
      message: 'Document uploaded successfully',
      document: {
        _id: document._id,
        category: document.category,
        originalName: document.originalName,
        description: document.description,
        uploadedAt: document.createdAt
      }
    });
  } catch (error) {
    console.error('Error uploading document:', error);
    if (req.file) {
      fs.unlinkSync(req.file.path);
    }
    res.status(500).json({ message: 'Failed to upload document', error: error.message });
  }
};

// Upload official document (for HR/Admin)
const uploadOfficialDocument = async (req, res) => {
  try {
    const { category, description, targetUserId, title } = req.body;
    const uploadedBy = req.user._id;

    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    // Check if user has permission to upload official documents
    if (!['hr', 'admin', 'superadmin'].includes(req.user.role)) {
      fs.unlinkSync(req.file.path);
      return res.status(403).json({ message: 'Insufficient permissions' });
    }

    const document = new Document({
      userId: req.targetUserId || targetUserId || req.user._id,
      category,
      originalName: req.file.originalname,
      filename: req.file.filename,
      path: req.file.path,
      size: req.file.size,
      mimetype: req.file.mimetype,
      description,
      title: title || req.file.originalname,
      uploadedBy,
      isOfficial: true
    });

    await document.save();

    res.status(201).json({
      message: 'Official document uploaded successfully',
      document: {
        _id: document._id,
        category: document.category,
        originalName: document.originalName,
        title: document.title,
        description: document.description,
        uploadedAt: document.createdAt
      }
    });
  } catch (error) {
    console.error('Error uploading official document:', error);
    if (req.file) {
      fs.unlinkSync(req.file.path);
    }
    res.status(500).json({ message: 'Failed to upload official document', error: error.message });
  }
};

// Get user documents
const getUserDocuments = async (req, res) => {
  try {
    const userId = req.user._id;
    
    const documents = await Document.find({ userId, isOfficial: false })
      .populate('uploadedBy', 'name email')
      .sort({ createdAt: -1 });

    // Double-check: Filter out any documents that don't belong to the user (safety measure)
    const safeDocuments = documents.filter(doc => doc.userId.toString() === userId.toString());
    
    if (safeDocuments.length !== documents.length) {
      console.error(`SECURITY: Filtered out ${documents.length - safeDocuments.length} documents that didn't belong to user`);
    }
    
    // Transform documents to include uploadedAt field for frontend compatibility
    const transformedDocuments = safeDocuments.map(doc => ({
      ...doc.toObject(),
      uploadedAt: doc.createdAt
    }));
    
    res.json(transformedDocuments);
  } catch (error) {
    console.error('Error fetching documents:', error);
    res.status(500).json({ message: 'Failed to fetch documents' });
  }
};

// Get official documents for user
const getOfficialDocuments = async (req, res) => {
  try {
    const userId = req.user._id;
    const documents = await Document.find({ userId, isOfficial: true })
      .populate('uploadedBy', 'name email')
      .sort({ createdAt: -1 });

    // Transform documents to include uploadedAt field for frontend compatibility
    const transformedDocuments = documents.map(doc => ({
      ...doc.toObject(),
      uploadedAt: doc.createdAt
    }));

    res.json(transformedDocuments);
  } catch (error) {
    console.error('Error fetching official documents:', error);
    res.status(500).json({ message: 'Failed to fetch official documents' });
  }
};

// Download document
const downloadDocument = async (req, res) => {
  try {
    const { documentId } = req.params;
    const userId = req.user._id;

    const document = await Document.findById(documentId);
    if (!document) {
      return res.status(404).json({ message: 'Document not found' });
    }

    // Check if user has permission to download
    const isOwner = document.userId.toString() === userId.toString();
    const isAuthorized = ['hr', 'admin', 'superadmin'].includes(req.user.role);
    const canDownload = isOwner || isAuthorized;
    
    if (!canDownload) {
      console.log('Access denied for user:', userId, 'to document:', documentId);
      return res.status(403).json({ message: 'Access denied. You can only download your own documents.' });
    }

    if (!fs.existsSync(document.path)) {
      return res.status(404).json({ message: 'File not found on server' });
    }

    res.setHeader('Content-Disposition', `attachment; filename="${document.originalName}"`);
    res.setHeader('Content-Type', document.mimetype);
    
    const fileStream = fs.createReadStream(document.path);
    fileStream.pipe(res);
  } catch (error) {
    console.error('Error downloading document:', error);
    res.status(500).json({ message: 'Failed to download document' });
  }
};

// Delete document
const deleteDocument = async (req, res) => {
  try {
    const { documentId } = req.params;
    const userId = req.user._id;

    const document = await Document.findById(documentId);
    if (!document) {
      return res.status(404).json({ message: 'Document not found' });
    }

    // Only HR/Admin can delete documents (employees cannot delete their own documents)
    if (!['hr', 'admin', 'superadmin'].includes(req.user.role)) {
      return res.status(403).json({ message: 'Only HR/Admin can delete documents' });
    }

    // Delete file from filesystem
    if (fs.existsSync(document.path)) {
      fs.unlinkSync(document.path);
    }

    await Document.findByIdAndDelete(documentId);

    res.json({ message: 'Document deleted successfully' });
  } catch (error) {
    console.error('Error deleting document:', error);
    res.status(500).json({ message: 'Failed to delete document' });
  }
};

// Get all users' documents (for HR/Admin)
const getAllDocuments = async (req, res) => {
  try {
    if (!['hr', 'admin', 'superadmin'].includes(req.user.role)) {
      return res.status(403).json({ message: 'Insufficient permissions' });
    }

    const documents = await Document.find()
      .populate('userId', 'name email department')
      .populate('uploadedBy', 'name email')
      .sort({ createdAt: -1 });

    res.json(documents);
  } catch (error) {
    console.error('Error fetching all documents:', error);
    res.status(500).json({ message: 'Failed to fetch documents' });
  }
};

export {
  upload,
  uploadDocument,
  uploadOfficialDocument,
  getUserDocuments,
  getOfficialDocuments,
  downloadDocument,
  deleteDocument,
  getAllDocuments
};