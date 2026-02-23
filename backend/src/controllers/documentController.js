import multer from 'multer';
import path from 'path';
import fs from 'fs';
import User from '../models/userModel.js';
import Document from '../models/documentModel.js';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Get the backend root directory (where package.json is)
const backendRoot = path.resolve(__dirname, '../..');
const uploadsDir = path.join(backendRoot, 'uploads', 'documents');

// Ensure uploads directory exists
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
  console.log('[DOCUMENT CONTROLLER] Created uploads directory:', uploadsDir);
}

console.log('[DOCUMENT CONTROLLER] Uploads directory:', uploadsDir);

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    console.log('[MULTER] Upload destination:', uploadsDir);
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const filename = file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname);
    console.log('[MULTER] Generated filename:', filename);
    cb(null, filename);
  }
});

const fileFilter = (req, file, cb) => {
  console.log('[MULTER] File filter check:', {
    originalname: file.originalname,
    mimetype: file.mimetype
  });
  
  const allowedTypes = /jpeg|jpg|png|pdf|doc|docx/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);

  if (mimetype && extname) {
    console.log('[MULTER] File accepted');
    return cb(null, true);
  } else {
    console.log('[MULTER] File rejected - invalid type');
    cb(new Error('Only images (JPEG, JPG, PNG), PDFs, and documents (DOC, DOCX) are allowed'));
  }
};

const upload = multer({
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit (increased from 5MB)
  fileFilter: fileFilter
});

// Upload personal document (for employees)
const uploadDocument = async (req, res) => {
  try {
    const { category, description } = req.body;
    const userId = req.user._id;

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

    const responseData = {
      message: 'Document uploaded successfully',
      document: {
        _id: document._id,
        userId: document.userId.toString(),
        category: document.category,
        originalName: document.originalName,
        filename: document.filename,
        size: document.size,
        mimetype: document.mimetype,
        description: document.description,
        uploadedAt: document.createdAt,
        createdAt: document.createdAt,
        url: `/api/users/documents/${document._id}/download`,
        fileUrl: `/api/users/documents/${document._id}/download`,
        documentUrl: `/api/users/documents/${document._id}/download`
      }
    };

    res.status(201).json(responseData);
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
    const userId = req.targetUserId || targetUserId || req.user._id;

    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    // Check if user has permission to upload official documents
    if (!['hr', 'admin', 'superadmin'].includes(req.user.role)) {
      fs.unlinkSync(req.file.path);
      return res.status(403).json({ message: 'Insufficient permissions' });
    }

    const document = new Document({
      userId: userId,
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

    const responseData = {
      message: 'Official document uploaded successfully',
      document: {
        _id: document._id,
        userId: document.userId.toString(),
        category: document.category,
        originalName: document.originalName,
        title: document.title,
        description: document.description,
        uploadedAt: document.createdAt,
        url: `/api/users/documents/${document._id}/download`,
        fileUrl: `/api/users/documents/${document._id}/download`,
        documentUrl: `/api/users/documents/${document._id}/download`
      }
    };

    res.status(201).json(responseData);
  } catch (error) {
    console.error('Error uploading official document:', error);
    
    if (req.file) {
      try {
        fs.unlinkSync(req.file.path);
      } catch (cleanupError) {
        console.error('Error cleaning up file:', cleanupError);
      }
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
    
    // Transform documents to include uploadedAt field and proper URL for frontend compatibility
    const transformedDocuments = documents.map(doc => {
      const docObj = doc.toObject();
      return {
        ...docObj,
        userId: docObj.userId.toString(), // Ensure userId is string for frontend comparison
        uploadedAt: docObj.createdAt,
        // Add URL for viewing/downloading
        url: `/api/users/documents/${docObj._id}/download`,
        fileUrl: `/api/users/documents/${docObj._id}/download`,
        documentUrl: `/api/users/documents/${docObj._id}/download`
      };
    });
    
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

    // Transform documents to include uploadedAt field and proper URL for frontend compatibility
    const transformedDocuments = documents.map(doc => {
      const docObj = doc.toObject();
      return {
        ...docObj,
        userId: docObj.userId.toString(),
        uploadedAt: docObj.createdAt,
        url: `/api/users/documents/${docObj._id}/download`,
        fileUrl: `/api/users/documents/${docObj._id}/download`,
        documentUrl: `/api/users/documents/${docObj._id}/download`
      };
    });

    res.json(transformedDocuments);
  } catch (error) {
    console.error('Error fetching official documents:', error);
    res.status(500).json({ message: 'Failed to fetch official documents' });
  }
};

// Download document
// Download document
const downloadDocument = async (req, res) => {
  try {
    console.log('[DOWNLOAD CONTROLLER] ========== START ==========');
    const { documentId } = req.params;
    const userId = req.user._id;
    console.log('[DOWNLOAD CONTROLLER] Document ID:', documentId);
    console.log('[DOWNLOAD CONTROLLER] User ID:', userId);
    console.log('[DOWNLOAD CONTROLLER] User role:', req.user.role);

    const document = await Document.findById(documentId);
    console.log('[DOWNLOAD CONTROLLER] Document found:', document ? 'YES' : 'NO');
    
    if (!document) {
      console.log('[DOWNLOAD CONTROLLER] ERROR: Document not found in database');
      return res.status(404).json({ message: 'Document not found' });
    }

    console.log('[DOWNLOAD CONTROLLER] Document details:', {
      _id: document._id,
      userId: document.userId,
      originalName: document.originalName,
      path: document.path
    });

    // Check if user has permission to download
    const isOwner = document.userId.toString() === userId.toString();
    const isAuthorized = ['hr', 'admin', 'superadmin'].includes(req.user.role);
    const canDownload = isOwner || isAuthorized;
    
    console.log('[DOWNLOAD CONTROLLER] Permission check:', { isOwner, isAuthorized, canDownload });
    
    if (!canDownload) {
      console.log('[DOWNLOAD CONTROLLER] ERROR: Access denied');
      return res.status(403).json({ message: 'Access denied. You can only download your own documents.' });
    }

    console.log('[DOWNLOAD CONTROLLER] Checking if file exists:', document.path);
    if (!fs.existsSync(document.path)) {
      console.log('[DOWNLOAD CONTROLLER] ERROR: File not found on filesystem');
      return res.status(404).json({ message: 'File not found on server' });
    }

    console.log('[DOWNLOAD CONTROLLER] File exists, streaming...');
    res.setHeader('Content-Disposition', `attachment; filename="${document.originalName}"`);
    res.setHeader('Content-Type', document.mimetype);
    
    const fileStream = fs.createReadStream(document.path);
    fileStream.pipe(res);
    console.log('[DOWNLOAD CONTROLLER] ========== SUCCESS ==========');
  } catch (error) {
    console.error('[DOWNLOAD CONTROLLER] ========== ERROR ==========');
    console.error('[DOWNLOAD CONTROLLER] Error:', error);
    console.error('[DOWNLOAD CONTROLLER] Error stack:', error.stack);
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