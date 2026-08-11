import BusinessDocument from "../models/businessDocumentModel.js";
import { canUserViewClient, canUserViewProject } from "../services/resourceVisibilityService.js";
import logger from "../utils/logger.js";

/**
 * Get business documents by client or project
 * GET /api/business-documents?client=ID or ?project=ID
 */
export const getBusinessDocuments = async (req, res) => {
  try {
    const { client, project, category } = req.query;

    if (!client && !project) {
      return res
        .status(400)
        .json({ message: "Either client or project ID is required" });
    }

    if (project) {
      const hasAccess = await canUserViewProject(req.user, project);
      if (!hasAccess) {
        return res.status(403).json({ message: "Access denied to this project" });
      }
    } else if (client) {
      const hasAccess = await canUserViewClient(req.user, client);
      if (!hasAccess) {
        return res.status(403).json({ message: "Access denied to this client" });
      }
    }

    const query = { isActive: true };
    if (project) query.project = project;
    if (client) query.client = client;
    if (category) query.category = category;

    const documents = await BusinessDocument.find(query)
      .populate("uploadedBy", "name email avatar")
      .populate("replaces", "title version path")
      .sort({ createdAt: -1 })
      .lean();

    res.status(200).json({
      success: true,
      data: documents,
      count: documents.length,
    });
  } catch (error) {
    logger.error("Error fetching business documents:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

/**
 * Upload / Record a new Business Document
 * POST /api/business-documents
 */
export const createBusinessDocument = async (req, res) => {
  try {
    const {
      client,
      project,
      category,
      title,
      description,
      originalName,
      filename,
      path,
      size,
      mimetype,
      relatedDeliverableId,
      relatedCommitmentId,
      relatedExpectationId,
      replaces,
    } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ message: "Document title is required" });
    }

    if (!category) {
      return res.status(400).json({ message: "Document category is required" });
    }

    if (project) {
      const hasAccess = await canUserViewProject(req.user, project);
      if (!hasAccess) {
        return res.status(403).json({ message: "Access denied to this project" });
      }
    } else if (client) {
      const hasAccess = await canUserViewClient(req.user, client);
      if (!hasAccess) {
        return res.status(403).json({ message: "Access denied to this client" });
      }
    }

    let version = 1;
    if (replaces) {
      const oldDoc = await BusinessDocument.findById(replaces);
      if (oldDoc) {
        oldDoc.isActive = false;
        await oldDoc.save();
        version = (oldDoc.version || 1) + 1;
      }
    }

    const document = new BusinessDocument({
      client: client || null,
      project: project || null,
      category,
      title: title.trim(),
      description: description ? description.trim() : "",
      originalName: originalName || "",
      filename: filename || "",
      path: path || "",
      size: size || 0,
      mimetype: mimetype || "",
      relatedDeliverableId: relatedDeliverableId || null,
      relatedCommitmentId: relatedCommitmentId || null,
      relatedExpectationId: relatedExpectationId || null,
      version,
      replaces: replaces || null,
      uploadedBy: req.user._id || req.user.id,
      uploadedAt: new Date(),
      isActive: true,
    });

    await document.save();

    res.status(201).json({
      success: true,
      data: document,
    });
  } catch (error) {
    logger.error("Error creating business document:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

/**
 * Soft delete a business document
 * DELETE /api/business-documents/:id
 */
export const deleteBusinessDocument = async (req, res) => {
  try {
    const { id } = req.params;

    const document = await BusinessDocument.findById(id);
    if (!document) {
      return res.status(404).json({ message: "Document not found" });
    }

    if (document.project) {
      const hasAccess = await canUserViewProject(req.user, document.project);
      if (!hasAccess) {
        return res.status(403).json({ message: "Access denied to this project" });
      }
    } else if (document.client) {
      const hasAccess = await canUserViewClient(req.user, document.client);
      if (!hasAccess) {
        return res.status(403).json({ message: "Access denied to this client" });
      }
    }

    document.isActive = false;
    await document.save();

    res.status(200).json({
      success: true,
      message: "Document deleted successfully",
    });
  } catch (error) {
    logger.error("Error deleting business document:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};
