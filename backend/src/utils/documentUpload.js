import { PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import s3Client, { AWS_CONFIG } from "../config/awsConfig.js";
import { v4 as uuidv4 } from "uuid";

// Extended allowed MIME types for documents
const DOCUMENT_MIME_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "application/msword", // .doc
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document", // .docx
];

const MAX_DOCUMENT_SIZE = 10 * 1024 * 1024; // 10MB for documents

/**
 * Upload document to AWS S3
 * @param {Buffer} fileBuffer - Document file buffer
 * @param {string} originalName - Original filename
 * @param {string} mimeType - File MIME type
 * @param {string} folder - S3 folder (default: documents)
 * @returns {Promise<string>} - S3 URL of uploaded document
 */
export const uploadDocumentToS3 = async (
  fileBuffer,
  originalName,
  mimeType,
  folder = "documents"
) => {
  try {
    // Validate file type
    if (!DOCUMENT_MIME_TYPES.includes(mimeType)) {
      throw new Error(
        `Invalid file type. Allowed types: PDF, JPG, PNG, DOC, DOCX`
      );
    }

    // Validate file size
    if (fileBuffer.length > MAX_DOCUMENT_SIZE) {
      throw new Error(
        `File size exceeds maximum allowed size of ${MAX_DOCUMENT_SIZE / (1024 * 1024)}MB`
      );
    }

    // Generate unique filename
    const fileExtension = originalName.split(".").pop();
    const sanitizedName = originalName
      .replace(/[^a-zA-Z0-9.-]/g, "_")
      .substring(0, 50);
    const fileName = `${folder}/${Date.now()}-${uuidv4()}-${sanitizedName}`;

    // Upload to S3
    const uploadParams = {
      Bucket: AWS_CONFIG.bucketName,
      Key: fileName,
      Body: fileBuffer,
      ContentType: mimeType,
      ACL: "public-read", // Make file publicly accessible
      Metadata: {
        originalName: originalName,
        uploadedAt: new Date().toISOString(),
      },
    };

    const command = new PutObjectCommand(uploadParams);
    await s3Client.send(command);

    // Return S3 URL
    const s3Url = `https://${AWS_CONFIG.bucketName}.s3.${AWS_CONFIG.region}.amazonaws.com/${fileName}`;
    return s3Url;
  } catch (error) {
    console.error("Error uploading document to S3:", error);
    throw new Error(`Failed to upload document: ${error.message}`);
  }
};

/**
 * Delete document from AWS S3
 * @param {string} documentUrl - S3 URL of document to delete
 * @returns {Promise<boolean>} - Success status
 */
export const deleteDocumentFromS3 = async (documentUrl) => {
  try {
    // Extract key from URL
    const urlParts = documentUrl.split(".amazonaws.com/");
    if (urlParts.length < 2) {
      throw new Error("Invalid S3 URL");
    }
    const key = urlParts[1];

    const deleteParams = {
      Bucket: AWS_CONFIG.bucketName,
      Key: key,
    };

    const command = new DeleteObjectCommand(deleteParams);
    await s3Client.send(command);

    return true;
  } catch (error) {
    console.error("Error deleting document from S3:", error);
    throw new Error(`Failed to delete document: ${error.message}`);
  }
};

/**
 * Validate document file
 * @param {Object} file - Multer file object
 * @returns {boolean} - Validation result
 */
export const validateDocumentFile = (file) => {
  // Check file size
  if (file.size > MAX_DOCUMENT_SIZE) {
    throw new Error(
      `File size exceeds maximum allowed size of ${MAX_DOCUMENT_SIZE / (1024 * 1024)}MB`
    );
  }

  // Check file type
  if (!DOCUMENT_MIME_TYPES.includes(file.mimetype)) {
    throw new Error(
      `Invalid file type. Allowed types: PDF, JPG, PNG, DOC, DOCX`
    );
  }

  return true;
};

/**
 * Get file extension from MIME type
 * @param {string} mimeType - File MIME type
 * @returns {string} - File extension
 */
export const getFileExtension = (mimeType) => {
  const mimeToExt = {
    "application/pdf": "pdf",
    "image/jpeg": "jpg",
    "image/jpg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "application/msword": "doc",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
  };
  return mimeToExt[mimeType] || "bin";
};

export { DOCUMENT_MIME_TYPES, MAX_DOCUMENT_SIZE };
