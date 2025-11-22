import User from "../models/userModel.js";
import { uploadDocumentToS3, deleteDocumentFromS3 } from "../utils/documentUpload.js";

/**
 * Upload document for employee (HR/Admin only)
 * POST /api/users/:userId/documents/upload
 */
export const uploadEmployeeDocument = async (req, res) => {
  try {
    const { userId } = req.params;
    const { documentType, month, year } = req.body;

    // Check if file is uploaded
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    // Validate document type
    const validDocTypes = ["offerLetter", "agreement", "salarySlip", "aadhaarDoc", "panDoc", "resume"];
    if (!validDocTypes.includes(documentType)) {
      return res.status(400).json({ 
        message: `Invalid document type. Allowed types: ${validDocTypes.join(", ")}` 
      });
    }

    // Check if user exists
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Upload to S3
    const folder = `documents/${documentType}`;
    const documentUrl = await uploadDocumentToS3(
      req.file.buffer,
      req.file.originalname,
      req.file.mimetype,
      folder
    );

    // Update user document based on type
    if (documentType === "salarySlip") {
      // Validate month and year for salary slips
      if (!month || !year) {
        return res.status(400).json({ 
          message: "Month and year are required for salary slips" 
        });
      }

      // Check if salary slip for this month/year already exists
      const existingSlip = user.documents.salarySlips.find(
        slip => slip.month === month && slip.year === parseInt(year)
      );

      if (existingSlip) {
        // Delete old file from S3
        try {
          await deleteDocumentFromS3(existingSlip.url);
        } catch (err) {
          console.error("Error deleting old salary slip:", err);
        }
        // Update existing slip
        existingSlip.url = documentUrl;
        existingSlip.uploadedAt = new Date();
        existingSlip.uploadedBy = req.user.id;
      } else {
        // Add new salary slip
        user.documents.salarySlips.push({
          month,
          year: parseInt(year),
          url: documentUrl,
          uploadedAt: new Date(),
          uploadedBy: req.user.id,
        });
      }
    } else {
      // For other document types, replace if exists
      if (user.documents[documentType]) {
        // Delete old file from S3
        try {
          await deleteDocumentFromS3(user.documents[documentType]);
        } catch (err) {
          console.error("Error deleting old document:", err);
        }
      }
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
    console.error("Error uploading employee document:", error);
    return res.status(500).json({
      message: "Failed to upload document",
      error: error.message,
    });
  }
};

/**
 * Delete employee document (HR/Admin only)
 * DELETE /api/users/:userId/documents/:documentType
 */
export const deleteEmployeeDocument = async (req, res) => {
  try {
    const { userId, documentType } = req.params;
    const { month, year } = req.query;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (documentType === "salarySlip") {
      if (!month || !year) {
        return res.status(400).json({ 
          message: "Month and year are required for salary slip deletion" 
        });
      }

      const slipIndex = user.documents.salarySlips.findIndex(
        slip => slip.month === month && slip.year === parseInt(year)
      );

      if (slipIndex === -1) {
        return res.status(404).json({ message: "Salary slip not found" });
      }

      const slip = user.documents.salarySlips[slipIndex];
      
      // Delete from S3
      try {
        await deleteDocumentFromS3(slip.url);
      } catch (err) {
        console.error("Error deleting from S3:", err);
      }

      // Remove from array
      user.documents.salarySlips.splice(slipIndex, 1);
    } else {
      if (!user.documents[documentType]) {
        return res.status(404).json({ message: "Document not found" });
      }

      // Delete from S3
      try {
        await deleteDocumentFromS3(user.documents[documentType]);
      } catch (err) {
        console.error("Error deleting from S3:", err);
      }

      // Remove from database
      user.documents[documentType] = null;
    }

    await user.save();

    return res.status(200).json({
      message: "Document deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting employee document:", error);
    return res.status(500).json({
      message: "Failed to delete document",
      error: error.message,
    });
  }
};

/**
 * Get document status for all employees (HR/Admin only)
 * GET /api/users/documents/status
 */
export const getDocumentStatus = async (req, res) => {
  try {
    const users = await User.find({ 
      role: { $in: ["employee", "hod"] } 
    }).select("name employeeId department documents");

    const stats = {
      total: users.length,
      complete: 0,
      incomplete: 0,
      missingCritical: 0,
      employees: users.map(user => ({
        _id: user._id,
        name: user.name,
        employeeId: user.employeeId,
        department: user.department,
        hasOfferLetter: !!user.documents?.offerLetter,
        hasAgreement: !!user.documents?.agreement,
        salarySlipsCount: user.documents?.salarySlips?.length || 0,
        status: (user.documents?.offerLetter && user.documents?.agreement) 
          ? "complete" 
          : (!user.documents?.offerLetter && !user.documents?.agreement)
          ? "missing-critical"
          : "incomplete"
      }))
    };

    // Calculate statistics
    stats.employees.forEach(emp => {
      if (emp.status === "complete") stats.complete++;
      else if (emp.status === "incomplete") stats.incomplete++;
      else if (emp.status === "missing-critical") stats.missingCritical++;
    });

    return res.status(200).json(stats);
  } catch (error) {
    console.error("Error getting document status:", error);
    return res.status(500).json({
      message: "Failed to get document status",
      error: error.message,
    });
  }
};

/**
 * Get pending document approvals (Future feature)
 * GET /api/users/documents/pending
 */
export const getPendingDocumentApprovals = async (req, res) => {
  try {
    // This is a placeholder for future implementation
    // When employees upload documents that need approval
    return res.status(200).json([]);
  } catch (error) {
    console.error("Error getting pending approvals:", error);
    return res.status(500).json({
      message: "Failed to get pending approvals",
      error: error.message,
    });
  }
};

/**
 * Approve employee document (Future feature)
 * POST /api/users/documents/:docId/approve
 */
export const approveDocument = async (req, res) => {
  try {
    const { docId } = req.params;
    const { comments } = req.body;

    // Placeholder for future implementation
    return res.status(200).json({
      message: "Document approved successfully",
    });
  } catch (error) {
    console.error("Error approving document:", error);
    return res.status(500).json({
      message: "Failed to approve document",
      error: error.message,
    });
  }
};

/**
 * Reject employee document (Future feature)
 * POST /api/users/documents/:docId/reject
 */
export const rejectDocument = async (req, res) => {
  try {
    const { docId } = req.params;
    const { comments } = req.body;

    if (!comments || comments.trim() === "") {
      return res.status(400).json({
        message: "Rejection reason is required",
      });
    }

    // Placeholder for future implementation
    return res.status(200).json({
      message: "Document rejected successfully",
    });
  } catch (error) {
    console.error("Error rejecting document:", error);
    return res.status(500).json({
      message: "Failed to reject document",
      error: error.message,
    });
  }
};

/**
 * Get employee's own documents
 * GET /api/users/me/documents
 */
export const getMyDocuments = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("documents");
    
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    return res.status(200).json({
      documents: user.documents,
    });
  } catch (error) {
    console.error("Error getting user documents:", error);
    return res.status(500).json({
      message: "Failed to get documents",
      error: error.message,
    });
  }
};
