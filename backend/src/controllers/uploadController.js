import { GetObjectCommand } from "@aws-sdk/client-s3";
import s3Client, { AWS_CONFIG } from "../config/awsConfig.js";
import { uploadImageToS3, uploadRawImageToS3, deleteImageFromS3 } from "../utils/imageUpload.js";
import { extractProfilePictureKey } from "../utils/s3ProxyUrl.js";

/**
 * Upload expense receipt
 * POST /api/upload/expense-receipt
 */
export const uploadExpenseReceipt = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    // For PDFs, upload without processing; for images, use the standard upload
    let imageUrl;
    if (req.file.mimetype === 'application/pdf') {
      // Upload PDF without processing
      const { uploadRawImageToS3 } = await import("../utils/imageUpload.js");
      imageUrl = await uploadRawImageToS3(
        req.file.buffer,
        req.file.originalname,
        req.file.mimetype,
        "expense-receipts"
      );
    } else {
      // Upload image with optimization
      const { uploadImageToS3 } = await import("../utils/imageUpload.js");
      imageUrl = await uploadImageToS3(
        req.file.buffer,
        req.file.originalname,
        req.file.mimetype,
        "expense-receipts"
      );
    }

    return res.status(200).json({
      message: "Receipt uploaded successfully",
      imageUrl,
      fileName: req.file.originalname,
      fileSize: req.file.size,
    });
  } catch (error) {
    
    return res.status(500).json({
      message: "Failed to upload receipt",
      error: error.message,
    });
  }
};

/**
 * Upload payment proof image
 * POST /api/upload/payment-proof
 */
export const uploadPaymentProof = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    // Upload to S3
    const imageUrl = await uploadImageToS3(
      req.file.buffer,
      req.file.originalname,
      req.file.mimetype
    );

    return res.status(200).json({
      message: "Image uploaded successfully",
      imageUrl,
      fileName: req.file.originalname,
      fileSize: req.file.size,
    });
  } catch (error) {
    
    return res.status(500).json({
      message: "Failed to upload image",
      error: error.message,
    });
  }
};

/**
 * Upload profile picture
 * POST /api/upload/profile-picture
 */
export const uploadProfilePicture = async (req, res) => {
  try {
    
    
    

    if (!req.file) {
      
      return res.status(400).json({ message: "No file uploaded" });
    }

    if (!req.user || !req.user._id) {
      
      return res.status(401).json({ message: "User not authenticated" });
    }

    
    
    
    
    // Upload to S3 without any processing since frontend already cropped the image perfectly
    const imageUrl = await uploadRawImageToS3(
      req.file.buffer,
      req.file.originalname,
      req.file.mimetype,
      "profile-pictures"
    );

    
    

    // Update user's profile picture in database
    const User = (await import("../models/userModel.js")).default;
    
    // First, delete old profile picture if it exists
    const existingUser = await User.findById(req.user._id);
    if (existingUser?.profilePicture && existingUser.profilePicture !== imageUrl) {
      try {
        await deleteImageFromS3(existingUser.profilePicture);
      } catch (deleteError) {
        // Log error but continue
      }
    }
    
    const updatedUser = await User.findByIdAndUpdate(
      req.user._id, 
      { 
        profilePicture: imageUrl,
        updatedAt: new Date()
      },
      { new: true }
    );

    if (!updatedUser) {
      
      return res.status(404).json({ message: "User not found" });
    }

    

    return res.status(200).json({
      message: "Profile picture uploaded successfully",
      imageUrl,
      fileName: req.file.originalname,
      fileSize: req.file.size,
    });
  } catch (error) {
    
    return res.status(500).json({
      message: "Failed to upload profile picture",
      error: error.message,
    });
  }
};

/**
 * Serve profile picture via backend proxy (works when S3 bucket is private)
 * GET /api/upload/profile-picture/:fileName
 */
export const serveProfilePicture = async (req, res) => {
  try {
    const { fileName } = req.params;
    if (!fileName || fileName.includes("..") || fileName.includes("/")) {
      return res.status(400).json({ message: "Invalid file name" });
    }

    const key = `profile-pictures/${fileName}`;
    const command = new GetObjectCommand({
      Bucket: AWS_CONFIG.bucketName,
      Key: key,
    });

    const response = await s3Client.send(command);

    res.setHeader("Content-Type", response.ContentType || "image/jpeg");
    res.setHeader("Cache-Control", "public, max-age=86400");
    res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");

    const bytes = await response.Body.transformToByteArray();
    res.send(Buffer.from(bytes));
  } catch (error) {
    if (error.name === "NoSuchKey" || error.$metadata?.httpStatusCode === 404) {
      return res.status(404).json({ message: "Profile picture not found" });
    }
    return res.status(500).json({
      message: "Failed to load profile picture",
      error: error.message,
    });
  }
};

/**
 * Delete payment proof image
 * DELETE /api/upload/payment-proof
 */
export const deletePaymentProof = async (req, res) => {
  try {
    const { imageUrl } = req.body;

    if (!imageUrl) {
      return res.status(400).json({ message: "Image URL is required" });
    }

    await deleteImageFromS3(imageUrl);

    return res.status(200).json({
      message: "Image deleted successfully",
    });
  } catch (error) {
    
    return res.status(500).json({
      message: "Failed to delete image",
      error: error.message,
    });
  }
};

/**
 * Upload multiple images (for future use)
 * POST /api/upload/multiple
 */
export const uploadMultipleImages = async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ message: "No files uploaded" });
    }

    const uploadPromises = req.files.map((file) =>
      uploadImageToS3(file.buffer, file.originalname, file.mimetype)
    );

    const imageUrls = await Promise.all(uploadPromises);

    return res.status(200).json({
      message: "Images uploaded successfully",
      imageUrls,
      count: imageUrls.length,
    });
  } catch (error) {
    
    return res.status(500).json({
      message: "Failed to upload images",
      error: error.message,
    });
  }
};

/**
 * Upload employee document
 * POST /api/upload/document
 */
export const uploadDocument = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    const { documentType } = req.body;
    
    if (!documentType) {
      return res.status(400).json({ message: "Document type is required" });
    }

    // Validate document type
    const validTypes = ['aadhaarDoc', 'panDoc', 'offerLetter', 'agreement', 'experienceCertificate', 'other'];
    if (!validTypes.includes(documentType)) {
      return res.status(400).json({ message: "Invalid document type" });
    }

    // Import document upload utility
    const { uploadDocumentToS3 } = await import("../utils/documentUpload.js");
    
    // Upload to S3 in documents folder
    const documentUrl = await uploadDocumentToS3(
      req.file.buffer,
      req.file.originalname,
      req.file.mimetype,
      "documents"
    );

    // Update user's documents in database
    const User = (await import("../models/userModel.js")).default;
    const user = await User.findById(req.user._id);
    
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Update the specific document field
    if (documentType === 'experienceCertificate') {
      // Add to array
      if (!user.documents.experienceCertificates) {
        user.documents.experienceCertificates = [];
      }
      user.documents.experienceCertificates.push(documentUrl);
    } else if (documentType === 'other') {
      // Add to other documents array
      if (!user.documents.other) {
        user.documents.other = [];
      }
      user.documents.other.push({
        name: req.file.originalname,
        url: documentUrl,
        uploadedAt: new Date()
      });
    } else {
      // Update single document field
      user.documents[documentType] = documentUrl;
    }

    await user.save();

    return res.status(200).json({
      message: "Document uploaded successfully",
      documentUrl,
      documentType,
      fileName: req.file.originalname,
      fileSize: req.file.size,
    });
  } catch (error) {
    
    return res.status(500).json({
      message: "Failed to upload document",
      error: error.message,
    });
  }
};

/**
 * Clear broken profile picture URL from database
 * PATCH /api/users/clear-broken-profile-picture
 */
export const clearBrokenProfilePicture = async (req, res) => {
  try {
    

    if (!req.user || !req.user._id) {
      return res.status(401).json({ message: "User not authenticated" });
    }

    // Remove profile picture field from database
    const User = (await import("../models/userModel.js")).default;
    const updatedUser = await User.findByIdAndUpdate(
      req.user._id, 
      { 
        $unset: { profilePicture: "" },
        $set: { updatedAt: new Date() }
      },
      { new: true }
    );

    if (!updatedUser) {
      return res.status(404).json({ message: "User not found" });
    }

    

    return res.status(200).json({
      message: "Broken profile picture cleared successfully",
    });
  } catch (error) {
    
    return res.status(500).json({
      message: "Failed to clear broken profile picture",
      error: error.message,
    });
  }
};

/**
 * Delete profile picture
 * DELETE /api/upload/profile-picture
 */
export const deleteProfilePicture = async (req, res) => {
  try {
    
    

    if (!req.user || !req.user._id) {
      
      return res.status(401).json({ message: "User not authenticated" });
    }

    // Get user's current profile picture
    const User = (await import("../models/userModel.js")).default;
    const user = await User.findById(req.user._id);
    
    if (!user) {
      
      return res.status(404).json({ message: "User not found" });
    }

    // Delete from S3 if profile picture exists
    if (user.profilePicture) {
      try {
        await deleteImageFromS3(user.profilePicture);
      } catch (s3Error) {
        // Continue with database update even if S3 deletion fails
      }
    }

    // Remove profile picture field from database
    const updatedUser = await User.findByIdAndUpdate(
      req.user._id, 
      { 
        $unset: { profilePicture: "" },
        $set: { updatedAt: new Date() }
      },
      { new: true }
    );

    

    return res.status(200).json({
      message: "Profile picture deleted successfully",
    });
  } catch (error) {
    
    return res.status(500).json({
      message: "Failed to delete profile picture",
      error: error.message,
    });
  }
};

/**
 * Check profile picture health
 * GET /api/upload/profile-picture/health
 */
export const checkProfilePictureHealth = async (req, res) => {
  try {
    

    if (!req.user || !req.user._id) {
      return res.status(401).json({ message: "User not authenticated" });
    }

    const User = (await import("../models/userModel.js")).default;
    const user = await User.findById(req.user._id);
    
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const result = {
      hasProfilePicture: !!user.profilePicture,
      profilePictureUrl: user.profilePicture,
      accessible: false,
      error: null,
      lastChecked: new Date().toISOString()
    };

    if (user.profilePicture) {
      try {
        const key = extractProfilePictureKey(user.profilePicture);
        if (key) {
          const response = await s3Client.send(
            new GetObjectCommand({
              Bucket: AWS_CONFIG.bucketName,
              Key: key,
            })
          );
          result.accessible = true;
          result.contentType = response.ContentType;
          result.fileSize = response.ContentLength;
        } else {
          result.accessible = false;
          result.error = "Unrecognized profile picture URL format";
        }
      } catch (error) {
        if (error.name === "NoSuchKey" || error.$metadata?.httpStatusCode === 404) {
          result.accessible = false;
          result.error = "Image not found in storage";
        } else {
          result.warning = error.message;
          result.accessible = true;
        }
      }
    }

    return res.status(200).json(result);
  } catch (error) {
    
    return res.status(500).json({
      message: "Failed to check profile picture health",
      error: error.message,
    });
  }
};

/**
 * Delete employee document
 * DELETE /api/upload/document
 */
export const deleteDocument = async (req, res) => {
  try {
    const { documentUrl, documentType } = req.body;

    if (!documentUrl || !documentType) {
      return res.status(400).json({ message: "Document URL and type are required" });
    }

    // Delete from S3
    await deleteImageFromS3(documentUrl);

    // Update user's documents in database
    const User = (await import("../models/userModel.js")).default;
    const user = await User.findById(req.user._id);
    
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Remove the document reference
    if (documentType === 'experienceCertificate') {
      user.documents.experienceCertificates = user.documents.experienceCertificates.filter(
        url => url !== documentUrl
      );
    } else if (documentType === 'other') {
      user.documents.other = user.documents.other.filter(
        doc => doc.url !== documentUrl
      );
    } else {
      user.documents[documentType] = '';
    }

    await user.save();

    return res.status(200).json({
      message: "Document deleted successfully",
    });
  } catch (error) {
    
    return res.status(500).json({
      message: "Failed to delete document",
      error: error.message,
    });
  }
};
