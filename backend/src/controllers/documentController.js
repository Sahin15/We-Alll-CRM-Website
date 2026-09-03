import multer from 'multer';
import path from 'path';
import fs from 'fs';
import User from '../models/userModel.js';
import Document from '../models/documentModel.js';
import { uploadDocumentToS3, deleteDocumentFromS3 } from '../utils/documentUpload.js';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configure multer for memory storage (we'll upload to S3)
const storage = multer.memoryStorage();

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
  const isGenericBinary =
    file.mimetype === 'application/octet-stream' ||
    file.mimetype === 'binary/octet-stream';

  if (isValidExtension && (isValidMimetype || isGenericBinary)) {
    return cb(null, true);
  }

  cb(new Error(`Invalid file type. Allowed: JPEG, JPG, PNG, PDF, DOC, DOCX. Got: ${ext} (${file.mimetype})`));
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
        // Allow employees to replace pending/rejected documents, HR/Admin can always replace
        const isEmployee = !['hr', 'admin', 'superadmin'].includes(req.user.role);
        const canReplace = !isEmployee || ['pending', 'rejected'].includes(existingDoc.verificationStatus);
        
        if (!canReplace) {
          return res.status(400).json({ 
            message: 'Document already exists for this category. Only HR/Admin can replace it.',
            canReplace: false
          });
        } else {
          // Delete the old document from S3
          if (existingDoc.path && existingDoc.path.startsWith('https://')) {
            try {
              await deleteDocumentFromS3(existingDoc.path);
            } catch (deleteError) {
              console.error('Error deleting old document from S3:', deleteError);
            }
          }
          await Document.findByIdAndDelete(existingDoc._id);
        }
      }
    }

    // Upload to S3
    const documentUrl = await uploadDocumentToS3(
      req.file.buffer,
      req.file.originalname,
      req.file.mimetype,
      'documents'
    );

    const document = new Document({
      userId,
      category,
      originalName: req.file.originalname,
      filename: req.file.originalname,
      path: documentUrl, // Store S3 URL
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
        url: documentUrl,
        fileUrl: documentUrl,
        documentUrl: documentUrl
      }
    };

    res.status(201).json(responseData);
  } catch (error) {
    console.error('Error uploading document:', error);
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
      return res.status(403).json({ message: 'Insufficient permissions' });
    }

    // Upload to S3
    const documentUrl = await uploadDocumentToS3(
      req.file.buffer,
      req.file.originalname,
      req.file.mimetype,
      'documents'
    );

    const document = new Document({
      userId: userId,
      category,
      originalName: req.file.originalname,
      filename: req.file.originalname,
      path: documentUrl, // Store S3 URL
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
        url: documentUrl,
        fileUrl: documentUrl,
        documentUrl: documentUrl
      }
    };

    res.status(201).json(responseData);
  } catch (error) {
    console.error('Error uploading official document:', error);
    res.status(500).json({ message: 'Failed to upload official document', error: error.message });
  }
};

// Get user documents
const getUserDocuments = async (req, res) => {
  try {
    const userId = req.user._id;
    
    const documents = await Document.find({ userId, isOfficial: false })
      .populate('uploadedBy', 'name email')
      .populate('verifiedBy', 'name email')
      .sort({ createdAt: -1 });
    
    // Transform documents to include uploadedAt field and proper URL for frontend compatibility
    const transformedDocuments = documents.map(doc => {
      const docObj = doc.toObject();
      const isS3 = docObj.path?.startsWith("https://");
      return {
        ...docObj,
        userId: docObj.userId.toString(),
        uploadedAt: docObj.createdAt,
        url: isS3 ? docObj.path : `/api/users/documents/${docObj._id}/download`,
        fileUrl: isS3 ? docObj.path : `/api/users/documents/${docObj._id}/download`,
        documentUrl: isS3 ? docObj.path : `/api/users/documents/${docObj._id}/download`,
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
      .populate('verifiedBy', 'name email')
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
      return res.status(404).json({ 
        message: 'Document not found in database',
        details: 'The document record has been deleted or does not exist. Please ask the employee to re-upload this document.'
      });
    }

    // Check if user has permission to download
    const isOwner = document.userId.toString() === userId.toString();
    const isAuthorized = ['hr', 'admin', 'superadmin'].includes(req.user.role);
    const canDownload = isOwner || isAuthorized;
    
    if (!canDownload) {
      return res.status(403).json({ message: 'Access denied. You can only download your own documents.' });
    }

    // S3 objects are publicly readable via URL; IAM may deny GetObject but HTTP works
    if (document.path && document.path.startsWith('https://')) {
      return res.redirect(document.path);
    }

    // If path is empty or invalid, return error
    if (!document.path) {
      return res.status(404).json({ 
        message: 'Document file path not found',
        details: 'The document record exists but has no file path. This may indicate a corrupted record. Please ask the employee to re-upload this document.'
      });
    }

    // Otherwise, try to serve from local file system
    if (!fs.existsSync(document.path)) {
      return res.status(404).json({ 
        message: 'Document file not found on server',
        details: 'The file exists in our database but is not available on this server. This may happen if the document was uploaded on a different machine or has been deleted. Please ask the employee to re-upload this document.',
        path: document.path
      });
    }

    res.setHeader('Content-Disposition', `attachment; filename="${document.originalName}"`);
    res.setHeader('Content-Type', document.mimetype);
    
    const fileStream = fs.createReadStream(document.path);
    fileStream.pipe(res);
    
  } catch (error) {
    console.error('Error downloading document:', error);
    res.status(500).json({ message: 'Failed to download document', error: error.message });
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

    // Check permissions:
    // - HR/Admin can delete any document
    // - Employees can only delete their own pending/rejected documents
    const isHROrAdmin = ['hr', 'admin', 'superadmin'].includes(req.user.role);
    const isOwner = document.userId.toString() === userId.toString();
    const isPendingOrRejected = ['pending', 'rejected'].includes(document.verificationStatus);
    
    const canDelete = isHROrAdmin || (isOwner && isPendingOrRejected);
    
    if (!canDelete) {
      return res.status(403).json({ 
        message: 'You can only delete your own pending or rejected documents. Approved documents can only be deleted by HR/Admin.' 
      });
    }

    // Delete from S3 if it's an S3 URL
    if (document.path && document.path.startsWith('https://')) {
      try {
        await deleteDocumentFromS3(document.path);
      } catch (s3Error) {
        console.error('Error deleting document from S3:', s3Error);
        // Continue with database deletion even if S3 deletion fails
      }
    } else if (fs.existsSync(document.path)) {
      // Delete from local filesystem for backward compatibility with old documents
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
    
    res.status(500).json({ message: 'Failed to fetch documents' });
  }
};

// Get documents pending verification (for HR/Admin)
const getDocumentsForVerification = async (req, res) => {
  try {
    if (!['hr', 'admin', 'superadmin'].includes(req.user.role)) {
      return res.status(403).json({ message: 'Insufficient permissions' });
    }

    const documents = await Document.find({ verificationStatus: 'pending' })
      .populate('userId', 'name email department employeeId')
      .populate('uploadedBy', 'name email')
      .sort({ createdAt: -1 });

    res.json(documents);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch documents for verification' });
  }
};

// Approve document (for HR/Admin)
const approveDocument = async (req, res) => {
  try {
    if (!['hr', 'admin', 'superadmin'].includes(req.user.role)) {
      return res.status(403).json({ message: 'Insufficient permissions' });
    }

    const { documentId } = req.params;

    // Update the document
    await Document.findByIdAndUpdate(
      documentId,
      {
        verificationStatus: 'approved',
        verifiedBy: req.user._id,
        verificationDate: new Date(),
        rejectionReason: null
      },
      { new: true }
    );

    // Fetch the updated document with populated fields
    const document = await Document.findById(documentId)
      .populate('userId', 'name email')
      .populate('uploadedBy', 'name email')
      .populate('verifiedBy', 'name email');

    if (!document) {
      return res.status(404).json({ message: 'Document not found' });
    }

    res.json({
      message: 'Document approved successfully',
      document
    });
  } catch (error) {
    res.status(500).json({ message: 'Failed to approve document', error: error.message });
  }
};

// Reject document (for HR/Admin)
const rejectDocument = async (req, res) => {
  try {
    if (!['hr', 'admin', 'superadmin'].includes(req.user.role)) {
      return res.status(403).json({ message: 'Insufficient permissions' });
    }

    const { documentId } = req.params;
    const { reason } = req.body;

    if (!reason || reason.trim().length === 0) {
      return res.status(400).json({ message: 'Rejection reason is required' });
    }

    // Update the document
    await Document.findByIdAndUpdate(
      documentId,
      {
        verificationStatus: 'rejected',
        verifiedBy: req.user._id,
        verificationDate: new Date(),
        rejectionReason: reason
      },
      { new: true }
    );

    // Fetch the updated document with populated fields
    const document = await Document.findById(documentId)
      .populate('userId', 'name email')
      .populate('uploadedBy', 'name email')
      .populate('verifiedBy', 'name email');

    if (!document) {
      return res.status(404).json({ message: 'Document not found' });
    }

    res.json({
      message: 'Document rejected successfully',
      document
    });
  } catch (error) {
    res.status(500).json({ message: 'Failed to reject document', error: error.message });
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
  getAllDocuments,
  approveDocument,
  rejectDocument,
  getDocumentsForVerification
};