import { PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import s3Client, { AWS_CONFIG } from "../config/awsConfig.js";
import sharp from "sharp";
import { v4 as uuidv4 } from "uuid";

/**
 * Upload image to AWS S3
 * @param {Buffer} fileBuffer - Image file buffer
 * @param {string} originalName - Original filename
 * @param {string} mimeType - File MIME type
 * @param {string} folder - S3 folder (default: payment-proofs)
 * @param {Object} options - Resize options
 * @returns {Promise<string>} - S3 URL of uploaded image
 */
export const uploadImageToS3 = async (
  fileBuffer,
  originalName,
  mimeType,
  folder = "payment-proofs",
  options = {}
) => {
  try {
    // Validate file type
    if (!AWS_CONFIG.allowedMimeTypes.includes(mimeType)) {
      throw new Error(
        `Invalid file type. Allowed types: ${AWS_CONFIG.allowedMimeTypes.join(", ")}`
      );
    }

    // Default resize options
    const {
      width = 1200,
      height = 1200,
      fit = "inside",
      quality = 85,
      skipResize = false,
    } = options;

    let optimizedBuffer;
    
    if (skipResize) {
      // For pre-cropped images (like profile pictures), use the original buffer
      // Only convert to JPEG if it's not already JPEG
      if (mimeType === 'image/jpeg') {
        optimizedBuffer = fileBuffer; // Use original buffer without any processing
      } else {
        // Convert to JPEG with high quality but no resizing
        optimizedBuffer = await sharp(fileBuffer)
          .jpeg({ quality })
          .toBuffer();
      }
    } else {
      // Compress and optimize image with resizing
      optimizedBuffer = await sharp(fileBuffer)
        .resize(width, height, {
          fit,
          withoutEnlargement: true,
        })
        .jpeg({ quality })
        .toBuffer();
    }

    // Generate unique filename
    const fileExtension = originalName.split(".").pop();
    const fileName = `${folder}/${Date.now()}-${uuidv4()}.${fileExtension}`;

    // Upload to S3
    const uploadParams = {
      Bucket: AWS_CONFIG.bucketName,
      Key: fileName,
      Body: optimizedBuffer,
      ContentType: mimeType,
    };

    const command = new PutObjectCommand(uploadParams);
    await s3Client.send(command);

    // Return S3 URL
    const s3Url = `https://${AWS_CONFIG.bucketName}.s3.${AWS_CONFIG.region}.amazonaws.com/${fileName}`;
    return s3Url;
  } catch (error) {
    console.error("Error uploading image to S3:", error);
    throw new Error(`Failed to upload image: ${error.message}`);
  }
};

/**
 * Upload raw image to AWS S3 without any processing
 * @param {Buffer} fileBuffer - Image file buffer
 * @param {string} originalName - Original filename
 * @param {string} mimeType - File MIME type
 * @param {string} folder - S3 folder (default: images)
 * @returns {Promise<string>} - S3 URL of uploaded image
 */
export const uploadRawImageToS3 = async (
  fileBuffer,
  originalName,
  mimeType,
  folder = "images"
) => {
  try {
    // Validate file type
    if (!AWS_CONFIG.allowedMimeTypes.includes(mimeType)) {
      throw new Error(
        `Invalid file type. Allowed types: ${AWS_CONFIG.allowedMimeTypes.join(", ")}`
      );
    }

    // Generate unique filename
    const fileExtension = originalName.split(".").pop();
    const fileName = `${folder}/${Date.now()}-${uuidv4()}.${fileExtension}`;

    // Upload to S3 without any processing
    const uploadParams = {
      Bucket: AWS_CONFIG.bucketName,
      Key: fileName,
      Body: fileBuffer,
      ContentType: mimeType,
    };

    const command = new PutObjectCommand(uploadParams);
    const result = await s3Client.send(command);

    // Return S3 URL
    const s3Url = `https://${AWS_CONFIG.bucketName}.s3.${AWS_CONFIG.region}.amazonaws.com/${fileName}`;
    // console.log("[S3] Raw image uploaded successfully:", s3Url);
    // console.log("[S3] Upload result ETag:", result.ETag);
    
    return s3Url;
  } catch (error) {
    console.error("Error uploading raw image to S3:", error);
    throw new Error(`Failed to upload image: ${error.message}`);
  }
};

/**
 * Delete image from AWS S3
 * @param {string} imageUrl - S3 URL of image to delete
 * @returns {Promise<boolean>} - Success status
 */
export const deleteImageFromS3 = async (imageUrl) => {
  try {
    const { extractProfilePictureKey } = await import("./s3ProxyUrl.js");
    const { extractS3KeyFromUrl } = await import("./s3KeyUtils.js");
    let key = extractProfilePictureKey(imageUrl) || extractS3KeyFromUrl(imageUrl);

    if (!key) {
      throw new Error("Invalid S3 URL");
    }

    const deleteParams = {
      Bucket: AWS_CONFIG.bucketName,
      Key: key,
    };

    const command = new DeleteObjectCommand(deleteParams);
    await s3Client.send(command);

    return true;
  } catch (error) {
    console.error("Error deleting image from S3:", error);
    throw new Error(`Failed to delete image: ${error.message}`);
  }
};

/**
 * Validate image file
 * @param {Object} file - Multer file object
 * @returns {boolean} - Validation result
 */
export const validateImageFile = (file) => {
  // Check file size
  if (file.size > AWS_CONFIG.maxFileSize) {
    throw new Error(
      `File size exceeds maximum allowed size of ${AWS_CONFIG.maxFileSize / (1024 * 1024)}MB`
    );
  }

  // Check file type
  if (!AWS_CONFIG.allowedMimeTypes.includes(file.mimetype)) {
    throw new Error(
      `Invalid file type. Allowed types: ${AWS_CONFIG.allowedMimeTypes.join(", ")}`
    );
  }

  return true;
};
