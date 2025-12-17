import { uploadImageToS3, uploadRawImageToS3, deleteImageFromS3 } from "../utils/imageUpload.js";

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
    console.error("Error uploading payment proof:", error);
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
    console.log("[UPLOAD] Profile picture upload request received");
    console.log("[UPLOAD] User ID:", req.user?._id);
    console.log("[UPLOAD] File info:", req.file ? {
      originalname: req.file.originalname,
      mimetype: req.file.mimetype,
      size: req.file.size
    } : "No file");

    if (!req.file) {
      console.log("[UPLOAD] No file uploaded");
      return res.status(400).json({ message: "No file uploaded" });
    }

    if (!req.user || !req.user._id) {
      console.log("[UPLOAD] User not authenticated");
      return res.status(401).json({ message: "User not authenticated" });
    }

    console.log("[UPLOAD] Starting S3 upload...");
    console.log("[UPLOAD] File buffer size:", req.file.buffer.length);
    console.log("[UPLOAD] File mime type:", req.file.mimetype);
    
    // Upload to S3 without any processing since frontend already cropped the image perfectly
    const imageUrl = await uploadRawImageToS3(
      req.file.buffer,
      req.file.originalname,
      req.file.mimetype,
      "profile-pictures"
    );

    console.log("[UPLOAD] S3 upload successful:", imageUrl);
    console.log("[UPLOAD] Image uploaded without any backend processing");

    // Update user's profile picture in database
    const User = (await import("../models/userModel.js")).default;
    
    // First, delete old profile picture if it exists
    const existingUser = await User.findById(req.user._id);
    if (existingUser?.profilePicture && existingUser.profilePicture !== imageUrl) {
      try {
        await deleteImageFromS3(existingUser.profilePicture);
        console.log("[UPLOAD] Old profile picture deleted from S3");
      } catch (deleteError) {
        console.log("[UPLOAD] Failed to delete old profile picture (may not exist):", deleteError.message);
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
      console.log("[UPLOAD] User not found for update");
      return res.status(404).json({ message: "User not found" });
    }

    console.log("[UPLOAD] Database update successful");

    return res.status(200).json({
      message: "Profile picture uploaded successfully",
      imageUrl,
      fileName: req.file.originalname,
      fileSize: req.file.size,
    });
  } catch (error) {
    console.error("[UPLOAD] Error uploading profile picture:", error);
    return res.status(500).json({
      message: "Failed to upload profile picture",
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
    console.error("Error deleting payment proof:", error);
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
    console.error("Error uploading multiple images:", error);
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
    console.error("Error uploading document:", error);
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
    console.log("[CLEAR] Clearing broken profile picture for user:", req.user?._id);

    if (!req.user || !req.user._id) {
      return res.status(401).json({ message: "User not authenticated" });
    }

    // Update user's profile picture to null in database
    const User = (await import("../models/userModel.js")).default;
    const updatedUser = await User.findByIdAndUpdate(
      req.user._id, 
      { 
        profilePicture: null,
        updatedAt: new Date()
      },
      { new: true }
    );

    if (!updatedUser) {
      return res.status(404).json({ message: "User not found" });
    }

    console.log("[CLEAR] Broken profile picture URL cleared from database");

    return res.status(200).json({
      message: "Broken profile picture cleared successfully",
    });
  } catch (error) {
    console.error("[CLEAR] Error clearing broken profile picture:", error);
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
    console.log("[DELETE] Profile picture delete request received");
    console.log("[DELETE] User ID:", req.user?._id);

    if (!req.user || !req.user._id) {
      console.log("[DELETE] User not authenticated");
      return res.status(401).json({ message: "User not authenticated" });
    }

    // Get user's current profile picture
    const User = (await import("../models/userModel.js")).default;
    const user = await User.findById(req.user._id);
    
    if (!user) {
      console.log("[DELETE] User not found");
      return res.status(404).json({ message: "User not found" });
    }

    // Delete from S3 if profile picture exists
    if (user.profilePicture) {
      try {
        await deleteImageFromS3(user.profilePicture);
        console.log("[DELETE] Profile picture deleted from S3");
      } catch (s3Error) {
        console.log("[DELETE] S3 deletion failed (file may not exist):", s3Error.message);
        // Continue with database update even if S3 deletion fails
      }
    }

    // Update user's profile picture in database
    const updatedUser = await User.findByIdAndUpdate(
      req.user._id, 
      { profilePicture: null },
      { new: true }
    );

    console.log("[DELETE] Database update successful");

    return res.status(200).json({
      message: "Profile picture deleted successfully",
    });
  } catch (error) {
    console.error("[DELETE] Error deleting profile picture:", error);
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
    console.log("[HEALTH] Profile picture health check for user:", req.user?._id);

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
      error: null
    };

    if (user.profilePicture) {
      try {
        // Simple URL accessibility check
        const response = await fetch(user.profilePicture, { method: 'HEAD' });
        result.accessible = response.ok;
        
        if (response.ok) {
          result.fileSize = response.headers.get('content-length');
          result.lastModified = response.headers.get('last-modified');
          result.contentType = response.headers.get('content-type');
          console.log("[HEALTH] Profile picture is accessible");
        } else {
          result.error = `HTTP ${response.status}: ${response.statusText}`;
          console.log("[HEALTH] Profile picture is not accessible:", result.error);
        }
      } catch (error) {
        result.error = error.message;
        console.log("[HEALTH] Profile picture is not accessible:", error.message);
      }
    }

    return res.status(200).json(result);
  } catch (error) {
    console.error("[HEALTH] Error checking profile picture health:", error);
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
    console.error("Error deleting document:", error);
    return res.status(500).json({
      message: "Failed to delete document",
      error: error.message,
    });
  }
};
