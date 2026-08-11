import ProjectExpectation from "../models/projectExpectationModel.js";
import Project from "../models/projectModel.js";
import { canUserViewProject } from "../services/resourceVisibilityService.js";
import { logProjectActivity } from "../services/projectActivityService.js";
import logger from "../utils/logger.js";

/**
 * Get all expectations for a project
 * GET /api/projects/:projectId/expectations
 */
export const getProjectExpectations = async (req, res) => {
  try {
    const { projectId } = req.params;

    const hasAccess = await canUserViewProject(req.user, projectId);
    if (!hasAccess) {
      return res.status(403).json({ message: "Access denied to this project" });
    }

    const expectations = await ProjectExpectation.find({ project: projectId })
      .populate("owner", "name email avatar")
      .populate("recordedBy", "name email")
      .populate("evidenceDocumentIds", "title category path originalName")
      .sort({ createdAt: -1 })
      .lean();

    res.status(200).json({
      success: true,
      data: expectations,
      count: expectations.length,
    });
  } catch (error) {
    logger.error("Error fetching project expectations:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

/**
 * Create a new project expectation
 * POST /api/projects/:projectId/expectations
 */
export const createProjectExpectation = async (req, res) => {
  try {
    const { projectId } = req.params;
    const {
      title,
      description,
      priority,
      source,
      owner,
      dueDate,
      status,
      notes,
      relatedDeliverableIds,
      relatedCommitmentIds,
      evidenceDocumentIds,
    } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ message: "Expectation title is required" });
    }

    const hasAccess = await canUserViewProject(req.user, projectId);
    if (!hasAccess) {
      return res.status(403).json({ message: "Access denied to this project" });
    }

    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({ message: "Project not found" });
    }

    const expectation = new ProjectExpectation({
      project: projectId,
      client: project.client,
      title: title.trim(),
      description: description ? description.trim() : "",
      priority: priority || "medium",
      source: source || "other",
      recordedBy: req.user._id || req.user.id,
      owner: owner || null,
      dueDate: dueDate || null,
      status: status || "open",
      notes: notes ? notes.trim() : "",
      relatedDeliverableIds: relatedDeliverableIds || [],
      relatedCommitmentIds: relatedCommitmentIds || [],
      evidenceDocumentIds: evidenceDocumentIds || [],
      completedAt: ["met", "partially_met"].includes(status) ? new Date() : null,
    });

    await expectation.save();

    await logProjectActivity({
      actor: req.user._id || req.user.id,
      action: "expectation.created",
      entityType: "ProjectExpectation",
      entityId: expectation._id,
      project: projectId,
      client: project.client,
      after: expectation.toObject(),
      message: `Expectation created: "${expectation.title}"`,
    });

    res.status(201).json({
      success: true,
      data: expectation,
    });
  } catch (error) {
    logger.error("Error creating project expectation:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

/**
 * Update a project expectation
 * PUT /api/expectations/:id
 */
export const updateProjectExpectation = async (req, res) => {
  try {
    const { id } = req.params;

    const expectation = await ProjectExpectation.findById(id);
    if (!expectation) {
      return res.status(404).json({ message: "Expectation not found" });
    }

    const hasAccess = await canUserViewProject(req.user, expectation.project);
    if (!hasAccess) {
      return res.status(403).json({ message: "Access denied to this project" });
    }

    const beforeState = expectation.toObject();

    const {
      title,
      description,
      priority,
      source,
      owner,
      dueDate,
      status,
      notes,
      relatedDeliverableIds,
      relatedCommitmentIds,
      evidenceDocumentIds,
    } = req.body;

    if (title !== undefined) expectation.title = title.trim();
    if (description !== undefined) expectation.description = description.trim();
    if (priority !== undefined) expectation.priority = priority;
    if (source !== undefined) expectation.source = source;
    if (owner !== undefined) expectation.owner = owner;
    if (dueDate !== undefined) expectation.dueDate = dueDate;
    if (notes !== undefined) expectation.notes = notes.trim();
    if (relatedDeliverableIds !== undefined)
      expectation.relatedDeliverableIds = relatedDeliverableIds;
    if (relatedCommitmentIds !== undefined)
      expectation.relatedCommitmentIds = relatedCommitmentIds;
    if (evidenceDocumentIds !== undefined)
      expectation.evidenceDocumentIds = evidenceDocumentIds;

    if (status !== undefined && status !== expectation.status) {
      expectation.status = status;
      if (["met", "partially_met"].includes(status)) {
        expectation.completedAt = new Date();
      } else {
        expectation.completedAt = null;
      }
    }

    await expectation.save();

    await logProjectActivity({
      actor: req.user._id || req.user.id,
      action: "expectation.updated",
      entityType: "ProjectExpectation",
      entityId: expectation._id,
      project: expectation.project,
      client: expectation.client,
      before: beforeState,
      after: expectation.toObject(),
      message: `Expectation updated: "${expectation.title}"`,
    });

    res.status(200).json({
      success: true,
      data: expectation,
    });
  } catch (error) {
    logger.error("Error updating project expectation:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

/**
 * Delete a project expectation
 * DELETE /api/expectations/:id
 */
export const deleteProjectExpectation = async (req, res) => {
  try {
    const { id } = req.params;

    const expectation = await ProjectExpectation.findById(id);
    if (!expectation) {
      return res.status(404).json({ message: "Expectation not found" });
    }

    const hasAccess = await canUserViewProject(req.user, expectation.project);
    if (!hasAccess) {
      return res.status(403).json({ message: "Access denied to this project" });
    }

    const beforeState = expectation.toObject();

    await ProjectExpectation.findByIdAndDelete(id);

    await logProjectActivity({
      actor: req.user._id || req.user.id,
      action: "expectation.deleted",
      entityType: "ProjectExpectation",
      entityId: id,
      project: expectation.project,
      client: expectation.client,
      before: beforeState,
      message: `Expectation deleted: "${expectation.title}"`,
    });

    res.status(200).json({
      success: true,
      message: "Expectation deleted successfully",
    });
  } catch (error) {
    logger.error("Error deleting project expectation:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};
