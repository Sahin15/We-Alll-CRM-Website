import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import { authorizeRoles } from "../middleware/roleMiddleware.js";
import SalaryPreviewService from "../services/salaryPreviewService.js";

const router = express.Router();
const previewService = new SalaryPreviewService();

// Generate salary preview for employee
router.post("/generate", 
  protect, 
  authorizeRoles("hr", "admin", "superadmin"),
  async (req, res) => {
    try {
      const { employeeId, month, year, additionalData } = req.body;

      if (!employeeId || !month || !year) {
        return res.status(400).json({
          message: "Employee ID, month, and year are required"
        });
      }

      const preview = await previewService.generatePreview(
        employeeId, 
        month, 
        year, 
        additionalData
      );

      res.status(201).json({
        message: "Salary preview generated successfully",
        preview
      });
    } catch (error) {
      console.error("Error generating salary preview:", error);
      res.status(500).json({
        message: "Failed to generate salary preview",
        error: error.message
      });
    }
  }
);

// Bulk generate previews
router.post("/bulk-generate",
  protect,
  authorizeRoles("hr", "admin", "superadmin"),
  async (req, res) => {
    try {
      const { employeeIds, month, year, additionalData } = req.body;

      if (!employeeIds || !Array.isArray(employeeIds) || !month || !year) {
        return res.status(400).json({
          message: "Employee IDs array, month, and year are required"
        });
      }

      const results = await previewService.bulkGeneratePreviews(
        employeeIds,
        month,
        year,
        additionalData
      );

      res.status(200).json({
        message: "Bulk preview generation completed",
        ...results
      });
    } catch (error) {
      console.error("Error in bulk preview generation:", error);
      res.status(500).json({
        message: "Failed to generate previews",
        error: error.message
      });
    }
  }
);

export default router;
// Get employee's own salary preview
router.get("/my-preview/:month/:year",
  protect,
  async (req, res) => {
    try {
      const { month, year } = req.params;
      const employeeId = req.user.id;

      const preview = await previewService.getPreview(employeeId, parseInt(month), parseInt(year));

      res.status(200).json(preview);
    } catch (error) {
      console.error("Error getting employee preview:", error);
      res.status(404).json({
        message: "Salary preview not found",
        error: error.message
      });
    }
  }
);

// Submit employee query on preview
router.post("/:previewId/query",
  protect,
  async (req, res) => {
    try {
      const { previewId } = req.params;
      const { query } = req.body;
      const employeeId = req.user.id;

      if (!query || query.trim().length === 0) {
        return res.status(400).json({
          message: "Query text is required"
        });
      }

      const updatedPreview = await previewService.submitEmployeeQuery(
        previewId,
        query.trim(),
        employeeId
      );

      res.status(200).json({
        message: "Query submitted successfully",
        preview: updatedPreview
      });
    } catch (error) {
      console.error("Error submitting query:", error);
      res.status(500).json({
        message: "Failed to submit query",
        error: error.message
      });
    }
  }
);

// HR respond to employee query
router.post("/:previewId/query/:queryIndex/respond",
  protect,
  authorizeRoles("hr", "admin", "superadmin"),
  async (req, res) => {
    try {
      const { previewId, queryIndex } = req.params;
      const { response } = req.body;
      const hrUserId = req.user.id;

      if (!response || response.trim().length === 0) {
        return res.status(400).json({
          message: "Response text is required"
        });
      }

      const updatedPreview = await previewService.respondToQuery(
        previewId,
        parseInt(queryIndex),
        response.trim(),
        hrUserId
      );

      res.status(200).json({
        message: "Response submitted successfully",
        preview: updatedPreview
      });
    } catch (error) {
      console.error("Error responding to query:", error);
      res.status(500).json({
        message: "Failed to respond to query",
        error: error.message
      });
    }
  }
);

// Employee acknowledge preview
router.post("/:previewId/acknowledge",
  protect,
  async (req, res) => {
    try {
      const { previewId } = req.params;
      const employeeId = req.user.id;

      const updatedPreview = await previewService.acknowledgePreview(previewId, employeeId);

      res.status(200).json({
        message: "Preview acknowledged successfully",
        preview: updatedPreview
      });
    } catch (error) {
      console.error("Error acknowledging preview:", error);
      res.status(500).json({
        message: "Failed to acknowledge preview",
        error: error.message
      });
    }
  }
);

// HR finalize preview
router.post("/:previewId/finalize",
  protect,
  authorizeRoles("hr", "admin", "superadmin"),
  async (req, res) => {
    try {
      const { previewId } = req.params;
      const hrUserId = req.user.id;

      const updatedPreview = await previewService.finalizePreview(previewId, hrUserId);

      res.status(200).json({
        message: "Preview finalized successfully",
        preview: updatedPreview
      });
    } catch (error) {
      console.error("Error finalizing preview:", error);
      res.status(500).json({
        message: "Failed to finalize preview",
        error: error.message
      });
    }
  }
);

// Get all previews for a month (HR view)
router.get("/month/:month/:year",
  protect,
  authorizeRoles("hr", "admin", "superadmin"),
  async (req, res) => {
    try {
      const { month, year } = req.params;
      const { status, department } = req.query;

      const filters = {};
      if (status) filters.status = status;
      if (department) filters["employee.department"] = department;

      const previews = await previewService.getPreviewsForMonth(
        parseInt(month),
        parseInt(year),
        filters
      );

      res.status(200).json(previews);
    } catch (error) {
      console.error("Error getting previews for month:", error);
      res.status(500).json({
        message: "Failed to get previews",
        error: error.message
      });
    }
  }
);

// Get previews requiring HR attention
router.get("/attention/:month/:year",
  protect,
  authorizeRoles("hr", "admin", "superadmin"),
  async (req, res) => {
    try {
      const { month, year } = req.params;

      const previews = await previewService.getPreviewsRequiringAttention(
        parseInt(month),
        parseInt(year)
      );

      res.status(200).json(previews);
    } catch (error) {
      console.error("Error getting previews requiring attention:", error);
      res.status(500).json({
        message: "Failed to get previews requiring attention",
        error: error.message
      });
    }
  }
);

// Get preview statistics
router.get("/statistics/:month/:year",
  protect,
  authorizeRoles("hr", "admin", "superadmin"),
  async (req, res) => {
    try {
      const { month, year } = req.params;

      const statistics = await previewService.getPreviewStatistics(
        parseInt(month),
        parseInt(year)
      );

      res.status(200).json(statistics);
    } catch (error) {
      console.error("Error getting preview statistics:", error);
      res.status(500).json({
        message: "Failed to get statistics",
        error: error.message
      });
    }
  }
);

// Update preview with corrections
router.put("/:previewId/corrections",
  protect,
  authorizeRoles("hr", "admin", "superadmin"),
  async (req, res) => {
    try {
      const { previewId } = req.params;
      const { corrections } = req.body;
      const hrUserId = req.user.id;

      if (!corrections) {
        return res.status(400).json({
          message: "Corrections data is required"
        });
      }

      const updatedPreview = await previewService.updatePreviewWithCorrections(
        previewId,
        corrections,
        hrUserId
      );

      res.status(200).json({
        message: "Preview updated with corrections",
        preview: updatedPreview
      });
    } catch (error) {
      console.error("Error updating preview with corrections:", error);
      res.status(500).json({
        message: "Failed to update preview",
        error: error.message
      });
    }
  }
);

// Convert finalized preview to salary slip
router.post("/:previewId/convert-to-slip",
  protect,
  authorizeRoles("hr", "admin", "superadmin"),
  async (req, res) => {
    try {
      const { previewId } = req.params;
      const hrUserId = req.user.id;

      const salarySlip = await previewService.convertPreviewToSalarySlip(previewId, hrUserId);

      res.status(201).json({
        message: "Preview converted to salary slip successfully",
        salarySlip
      });
    } catch (error) {
      console.error("Error converting preview to salary slip:", error);
      res.status(500).json({
        message: "Failed to convert preview",
        error: error.message
      });
    }
  }
);

// Delete preview
router.delete("/:previewId",
  protect,
  authorizeRoles("hr", "admin", "superadmin"),
  async (req, res) => {
    try {
      const { previewId } = req.params;
      const userId = req.user.id;

      await previewService.deletePreview(previewId, userId);

      res.status(200).json({
        message: "Preview deleted successfully"
      });
    } catch (error) {
      console.error("Error deleting preview:", error);
      res.status(500).json({
        message: "Failed to delete preview",
        error: error.message
      });
    }
  }
);