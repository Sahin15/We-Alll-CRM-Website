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
  
}



// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const filename = file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname);
    
    cb(null, filename);
  }
});

const fileFilter = (req, file, cb) => {
  
  
  // Check file extension
  const ext = path.extname(file.originalname).toLowerCase();
  const allowedExtensions = ['.jpeg', '.jpg', '.png', '.pdf', '.doc', '.docx'];
  
  // Check mimetype - be more permissive with image types
  const allowedMimetypes = [
    'image/jpeg',
    'image/jpg', 
    'image/png',
    'image/pjpeg', // Progressive JPEG
    'image/x-png', // Alternative PNG mimetype
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ];

  const isValidExtension = allowedExtensions.includes(ext);
  const isValidMimetype = allowedMimetypes.includes(file.mimetype);

  if (isValidExtension && isValidMimetype) {
    
    return cb(null, true);
  } else {
    
    cb(new Error(`Invalid file type. Allowed: JPEG, JPG, PNG, PDF, DOC, DOCX. Got: ${ext} (${file.mimetype})`));
  }
};

const upload = multer({
  storage: storage,
  limits: { 
    fileSize: 15 * 1024 * 1024, // 15MB limit (increased for high-res photos)
    files: 1 // Only one file at a time
  },
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
    
    
    if (req.file) {
      try {
        fs.unlinkSync(req.file.path);
      } catch (cleanupError) {
        
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
    
    res.status(500).json({ message: 'Failed to fetch official documents' });
  }
};

// Download document
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