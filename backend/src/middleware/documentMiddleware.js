import multer from "multer";
import path from "path";
import { DOCUMENT_MIME_TYPES, MAX_DOCUMENT_SIZE } from "../utils/documentUpload.js";

const ALLOWED_DOCUMENT_EXTENSIONS = [".jpeg", ".jpg", ".png", ".pdf", ".doc", ".docx"];

// Configure multer for memory storage (we'll upload to S3 manually)
const storage = multer.memoryStorage();

// File filter for documents
const documentFilter = (req, file, cb) => {
  if (DOCUMENT_MIME_TYPES.includes(file.mimetype)) {
    cb(null, true);
    return;
  }

  const ext = path.extname(file.originalname).toLowerCase();
  const isGenericBinary =
    file.mimetype === "application/octet-stream" ||
    file.mimetype === "binary/octet-stream";

  if (isGenericBinary && ALLOWED_DOCUMENT_EXTENSIONS.includes(ext)) {
    cb(null, true);
    return;
  }

  cb(
    new Error("Invalid file type. Allowed types: PDF, JPG, PNG, DOC, DOCX"),
    false
  );
};

// Multer upload configuration for documents
export const uploadDocument = multer({
  storage: storage,
  limits: {
    fileSize: MAX_DOCUMENT_SIZE,
  },
  fileFilter: documentFilter,
});

// Error handling middleware for multer
export const handleDocumentUploadError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({
        message: `File size exceeds maximum allowed size of ${MAX_DOCUMENT_SIZE / (1024 * 1024)}MB`,
      });
    }
    return res.status(400).json({ message: err.message });
  } else if (err) {
    return res.status(400).json({ message: err.message });
  }
  next();
};
