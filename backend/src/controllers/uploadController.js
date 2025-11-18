import { uploadImageToS3, deleteImageFromS3 } from "../utils/imageUpload.js";

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
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    // Upload to S3 with profile picture specific options
    const imageUrl = await uploadImageToS3(
      req.file.buffer,
      req.file.originalname,
      req.file.mimetype,
      "profile-pictures",
      {
        width: 400,
        height: 400,
        fit: "cover", // Crop to square
        quality: 90,
      }
    );

    // Update user's profile picture in database
    const User = (await import("../models/userModel.js")).default;
    await User.findByIdAndUpdate(req.user.id, {
      profilePicture: imageUrl,
    });

    return res.status(200).json({
      message: "Profile picture uploaded successfully",
      imageUrl,
      fileName: req.file.originalname,
      fileSize: req.file.size,
    });
  } catch (error) {
    console.error("Error uploading profile picture:", error);
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
