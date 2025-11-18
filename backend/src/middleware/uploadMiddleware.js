import multer from "multer";
import { AWS_CONFIG } from "../config/awsConfig.js";

// Configure multer for memory storage (we'll upload to S3 manually)
const storage = multer.memoryStorage();

// File filter
const fileFilter = (req, file, cb) => {
  if (AWS_CONFIG.allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(
      new Error(
        `Invalid file type. Allowed types: ${AWS_CONFIG.allowedMimeTypes.join(", ")}`
      ),
      false
    );
  }
};

// Multer upload configuration
export const upload = multer({
  storage: storage,
  limits: {
    fileSize: AWS_CONFIG.maxFileSize,
  },
  fileFilter: fileFilter,
});

// Error handling middleware for multer
export const handleMulterError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({
        message: `File size exceeds maximum allowed size of ${AWS_CONFIG.maxFileSize / (1024 * 1024)}MB`,
      });
    }
    return res.status(400).json({ message: err.message });
  } else if (err) {
    return res.status(400).json({ message: err.message });
  }
  next();
};
