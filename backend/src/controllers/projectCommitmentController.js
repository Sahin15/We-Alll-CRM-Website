import ProjectCommitment from "../models/projectCommitmentModel.js";
import Project from "../models/projectModel.js";
import { canUserViewProjectById } from "../services/resourceVisibilityService.js";
import { logProjectActivity } from "../services/projectActivityService.js";
import logger from "../utils/logger.js";

/**
 * Get all commitments for a project
 * GET /api/projects/:projectId/commitments
 */
export const getProjectCommitments = async (req, res) => {
  try {
    const { projectId } = req.params;

    const hasAccess = await canUserViewProjectById(req.user, projectId);
    if (!hasAccess) {
      return res.status(403).json({ message: "Access denied to this project" });
    }

    const commitments = await ProjectCommitment.find({ project: projectId })
      .populate("owner", "name email avatar")
      .populate("committedBy", "name email")
      .populate("relatedExpectationIds", "title priority status")
      .populate("evidenceDocumentIds", "title category path originalName")
      .sort({ createdAt: -1 })
      .lean();

    res.status(200).json({
      success: true,
      data: commitments,
      count: commitments.length,
    });
  } catch (error) {
    logger.error("Error fetching project commitments:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

/**
 * Create a new project commitment
 * POST /api/projects/:projectId/commitments
 */
export const createProjectCommitment = async (req, res) => {
  try {
    const { projectId } = req.params;
    const {
      title,
      description,
      owner,
      dueDate,
      status,
      relatedDeliverableIds,
      relatedWorkItemIds,
      relatedExpectationIds,
      notes,
      evidenceDocumentIds,
    } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ message: "Commitment title is required" });
    }

    if (!owner) {
      return res.status(400).json({ message: "Commitment owner is required" });
    }

    const hasAccess = await canUserViewProjectById(req.user, projectId);
    if (!hasAccess) {
      return res.status(403).json({ message: "Access denied to this project" });
    }

    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({ message: "Project not found" });
    }

    const commitment = new ProjectCommitment({
      project: projectId,
      client: project.client,
      title: title.trim(),
      description: description ? description.trim() : "",
      owner,
      dueDate: dueDate || null,
      status: status || "proposed",
      relatedDeliverableIds: relatedDeliverableIds || [],
      relatedWorkItemIds: relatedWorkItemIds || [],
      relatedExpectationIds: relatedExpectationIds || [],
      notes: notes ? notes.trim() : "",
      evidenceDocumentIds: evidenceDocumentIds || [],
      committedBy: req.user._id || req.user.id,
    });

    await commitment.save();

    await logProjectActivity({
      actor: req.user._id || req.user.id,
      action: "commitment.created",
      entityType: "ProjectCommitment",
      entityId: commitment._id,
      project: projectId,
      client: project.client,
      after: commitment.toObject(),
      message: `Commitment created: "${commitment.title}"`,
    });

    res.status(201).json({
      success: true,
      data: commitment,
    });
  } catch (error) {
    logger.error("Error creating project commitment:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

/**
 * Update a project commitment
 * PUT /api/commitments/:id
 */
export const updateProjectCommitment = async (req, res) => {
  try {
    const { id } = req.params;

    const commitment = await ProjectCommitment.findById(id);
    if (!commitment) {
      return res.status(404).json({ message: "Commitment not found" });
    }

    const hasAccess = await canUserViewProjectById(req.user, commitment.project);
    if (!hasAccess) {
      return res.status(403).json({ message: "Access denied to this project" });
    }

    const beforeState = commitment.toObject();

    const {
      title,
      description,
      owner,
      dueDate,
      status,
      notes,
      relatedDeliverableIds,
      relatedWorkItemIds,
      relatedExpectationIds,
      evidenceDocumentIds,
    } = req.body;

    if (title !== undefined) commitment.title = title.trim();
    if (description !== undefined) commitment.description = description.trim();
    if (owner !== undefined) commitment.owner = owner;
    if (dueDate !== undefined) commitment.dueDate = dueDate;
    if (status !== undefined) commitment.status = status;
    if (notes !== undefined) commitment.notes = notes.trim();
    if (relatedDeliverableIds !== undefined)
      commitment.relatedDeliverableIds = relatedDeliverableIds;
    if (relatedWorkItemIds !== undefined)
      commitment.relatedWorkItemIds = relatedWorkItemIds;
    if (relatedExpectationIds !== undefined)
      commitment.relatedExpectationIds = relatedExpectationIds;
    if (evidenceDocumentIds !== undefined)
      commitment.evidenceDocumentIds = evidenceDocumentIds;

    await commitment.save();

    await logProjectActivity({
      actor: req.user._id || req.user.id,
      action: "commitment.updated",
      entityType: "ProjectCommitment",
      entityId: commitment._id,
      project: commitment.project,
      client: commitment.client,
      before: beforeState,
      after: commitment.toObject(),
      message: `Commitment updated: "${commitment.title}"`,
    });

    res.status(200).json({
      success: true,
      data: commitment,
    });
  } catch (error) {
    logger.error("Error updating project commitment:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

/**
 * Delete a project commitment
 * DELETE /api/commitments/:id
 */
export const deleteProjectCommitment = async (req, res) => {
  try {
    const { id } = req.params;

    const commitment = await ProjectCommitment.findById(id);
    if (!commitment) {
      return res.status(404).json({ message: "Commitment not found" });
    }

    const hasAccess = await canUserViewProjectById(req.user, commitment.project);
    if (!hasAccess) {
      return res.status(403).json({ message: "Access denied to this project" });
    }

    const beforeState = commitment.toObject();

    await ProjectCommitment.findByIdAndDelete(id);

    await logProjectActivity({
      actor: req.user._id || req.user.id,
      action: "commitment.deleted",
      entityType: "ProjectCommitment",
      entityId: id,
      project: commitment.project,
      client: commitment.client,
      before: beforeState,
      message: `Commitment deleted: "${commitment.title}"`,
    });

    res.status(200).json({
      success: true,
      message: "Commitment deleted successfully",
    });
  } catch (error) {
    logger.error("Error deleting project commitment:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};
