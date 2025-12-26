import mongoose from 'mongoose';
import Project from '../models/projectModel.js';
import Slot from '../models/slotModel.js';
import WorkItem from '../models/workItemModel.js';
import logger from '../utils/logger.js';
import realTimeUpdateService from './realTimeUpdateService.js';

/**
 * Slot Management Service
 * 
 * Provides comprehensive slot lifecycle management including:
 * - Slot creation and configuration
 * - Assignment and release operations
 * - Completion and approval workflows
 * - Conflict detection and resolution
 * - Statistics and analytics
 */
class SlotManagementService {
  
  /**
   * Create slots for a project based on slot configuration
   */
  async createSlotsForProject(projectId, options = {}) {
    try {
      const project = await Project.findById(projectId);
      if (!project) {
        throw new Error('Project not found');
      }

      if (!project.slotConfiguration?.enableSlotSystem) {
        throw new Error('Slot system is not enabled for this project');
      }

      const {
        startingSlotNumber = 1,
        count = project.slotConfiguration.totalSlots,
        slotType = 'work',
        createdBy
      } = options;

      // Ensure we have valid user IDs for required fields
      const fallbackUserId = createdBy || project.createdBy || project.projectHead;
      if (!fallbackUserId) {
        throw new Error('Cannot create slots: No valid user ID available for createdBy/assignedTo fields');
      }

      // Check if slots already exist
      const existingSlots = await Slot.find({ project: projectId });
      const existingSlotNumbers = existingSlots.map(slot => slot.slotNumber);

      const slotsToCreate = [];
      const slotNamingPattern = project.slotConfiguration.slotNamingPattern || 'Slot {number}';

      for (let i = startingSlotNumber; i < startingSlotNumber + count; i++) {
        // Skip if slot number already exists
        if (existingSlotNumbers.includes(i)) {
          continue;
        }

        const slotIdentifier = slotNamingPattern.replace('{number}', i);
        
        const slotData = {
          project: projectId,
          slotNumber: i,
          slotIdentifier: slotIdentifier,
          slotType: slotType,
          title: `${slotIdentifier} - Work Assignment`,
          description: `Auto-generated slot for project work assignment`,
          workType: 'Other',
          priority: 'Medium',
          assignmentStatus: 'available',
          createdBy: fallbackUserId,
          assignedTo: fallbackUserId,
          dueDate: project.endDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          slotConfiguration: {
            isRequired: true,
            canBeSkipped: false,
            requiresApproval: false,
            estimatedEffort: 8,
            weight: 1.0
          },
          slotMetadata: {
            category: 'other',
            tags: ['auto-generated']
          }
        };

        // Only add client if project has one
        if (project.client) {
          slotData.client = project.client;
        }
        
        slotsToCreate.push(slotData);
      }

      if (slotsToCreate.length === 0) {
        return { created: [], message: 'No new slots needed' };
      }

      const createdSlots = await Slot.insertMany(slotsToCreate);
      
      // Update project slot tracking
      await this.updateProjectSlotTracking(projectId);

      // Broadcast real-time update
      await realTimeUpdateService.broadcastSlotUpdate(projectId, 'slots-created', {
        projectId,
        slotsCreated: createdSlots.length,
        totalSlots: existingSlots.length + createdSlots.length
      });

      logger.info(`Created ${createdSlots.length} slots for project ${projectId}`);
      
      return {
        created: createdSlots,
        message: `Successfully created ${createdSlots.length} slots`
      };
    } catch (error) {
      logger.error('Error creating slots for project:', error);
      throw error;
    }
  }

  /**
   * Get available slots for a project with optional filtering
   */
  async getAvailableSlots(projectId, filters = {}) {
    try {
      const query = {
        project: projectId,
        assignmentStatus: 'available',
        'completionStatus.isCompleted': { $ne: true },
        ...filters
      };

      const availableSlots = await Slot.find(query)
        .sort({ slotNumber: 1 })
        .populate('project', 'name client slotConfiguration')
        .lean();

      // Add recommendations based on slot dependencies and priorities
      const slotsWithRecommendations = await this.addSlotRecommendations(availableSlots);

      return {
        slots: slotsWithRecommendations,
        count: availableSlots.length,
        recommendations: slotsWithRecommendations.filter(slot => slot.recommendation)
      };
    } catch (error) {
      logger.error('Error getting available slots:', error);
      throw error;
    }
  }

  /**
   * Assign a work item to a slot
   */
  async assignWorkItemToSlot(workItemId, slotId, assignedBy, options = {}) {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const workItem = await WorkItem.findById(workItemId).session(session);
      const slot = await Slot.findById(slotId).session(session);

      if (!workItem) {
        throw new Error('Work item not found');
      }

      if (!slot) {
        throw new Error('Slot not found');
      }

      // Validate assignment
      await this.validateSlotAssignment(workItem, slot);

      // Release current slot if work item is already assigned
      if (workItem.slotAssignment?.assignedSlot) {
        await this.releaseSlotFromWorkItem(workItemId, assignedBy, 'Reassigning to different slot', { session });
      }

      // Assign to new slot
      await slot.assignToWorkItem(workItemId, assignedBy);
      await workItem.assignToSlot(slotId, assignedBy);

      // Update project tracking
      await this.updateProjectSlotTracking(slot.project, { session });

      await session.commitTransaction();

      // Broadcast real-time update
      await realTimeUpdateService.broadcastSlotUpdate(slot.project, 'slot-assigned', {
        slotId,
        workItemId,
        slotNumber: slot.slotNumber,
        slotIdentifier: slot.slotIdentifier
      });

      logger.info(`Assigned work item ${workItemId} to slot ${slot.slotIdentifier}`);

      return {
        success: true,
        slot: await Slot.findById(slotId).populate('assignedWorkItem', 'title status'),
        workItem: await WorkItem.findById(workItemId).populate('slotAssignment.assignedSlot', 'slotNumber slotIdentifier')
      };
    } catch (error) {
      await session.abortTransaction();
      logger.error('Error assigning work item to slot:', error);
      throw error;
    } finally {
      session.endSession();
    }
  }

  /**
   * Release a work item from its assigned slot
   */
  async releaseSlotFromWorkItem(workItemId, releasedBy, reason = '', options = {}) {
    const session = options.session || await mongoose.startSession();
    const shouldEndSession = !options.session;
    
    if (!options.session) {
      session.startTransaction();
    }

    try {
      const workItem = await WorkItem.findById(workItemId).session(session);
      
      if (!workItem || !workItem.slotAssignment?.assignedSlot) {
        return { success: true, message: 'No slot assigned to release' };
      }

      const slot = await Slot.findById(workItem.slotAssignment.assignedSlot).session(session);
      
      if (slot) {
        await slot.releaseSlot(releasedBy, reason);
        await this.updateProjectSlotTracking(slot.project, { session });

        // Broadcast real-time update
        await realTimeUpdateService.broadcastSlotUpdate(slot.project, 'slot-released', {
          slotId: slot._id,
          workItemId,
          slotNumber: slot.slotNumber,
          slotIdentifier: slot.slotIdentifier,
          reason
        });
      }

      await workItem.releaseSlot(releasedBy, reason);

      if (!options.session) {
        await session.commitTransaction();
      }

      logger.info(`Released slot from work item ${workItemId}: ${reason}`);

      return {
        success: true,
        message: 'Slot released successfully',
        slot: slot ? await Slot.findById(slot._id) : null
      };
    } catch (error) {
      if (!options.session) {
        await session.abortTransaction();
      }
      logger.error('Error releasing slot from work item:', error);
      throw error;
    } finally {
      if (shouldEndSession) {
        session.endSession();
      }
    }
  }

  /**
   * Complete a slot
   */
  async completeSlot(slotId, completedBy, options = {}) {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const slot = await Slot.findById(slotId).session(session);
      
      if (!slot) {
        throw new Error('Slot not found');
      }

      if (slot.assignmentStatus === 'completed') {
        return { success: true, message: 'Slot already completed' };
      }

      const { notes = '', requiresApproval = false } = options;

      // Complete the slot
      await slot.completeSlot(completedBy, notes);

      // Update project progress
      const project = await Project.findById(slot.project).session(session);
      if (project && project.slotConfiguration?.enableSlotSystem) {
        await project.recalculateSlotProgress();
      }

      await session.commitTransaction();

      // Broadcast real-time update
      await realTimeUpdateService.broadcastSlotUpdate(slot.project, 'slot-completed', {
        slotId,
        slotNumber: slot.slotNumber,
        slotIdentifier: slot.slotIdentifier,
        completedBy,
        requiresApproval
      });

      // Broadcast project progress update
      if (project) {
        await realTimeUpdateService.broadcastProjectProgressUpdate(project._id, {
          completedSlots: project.progressTracking.completedSlots,
          totalSlots: project.progressTracking.totalSlots,
          progressPercentage: project.progressTracking.progressPercentage
        });
      }

      logger.info(`Completed slot ${slot.slotIdentifier} for project ${slot.project}`);

      return {
        success: true,
        slot: await Slot.findById(slotId),
        projectProgress: project ? {
          completedSlots: project.progressTracking.completedSlots,
          totalSlots: project.progressTracking.totalSlots,
          progressPercentage: project.progressTracking.progressPercentage
        } : null
      };
    } catch (error) {
      await session.abortTransaction();
      logger.error('Error completing slot:', error);
      throw error;
    } finally {
      session.endSession();
    }
  }

  /**
   * Get comprehensive slot statistics for a project
   */
  async getProjectSlotStatistics(projectId) {
    try {
      // Validate projectId
      if (!projectId || !mongoose.Types.ObjectId.isValid(projectId)) {
        throw new Error('Invalid project ID provided');
      }

      const [slotStats, project] = await Promise.all([
        Slot.getProjectSlotStats(projectId),
        Project.findById(projectId).select('slotConfiguration progressTracking')
      ]);

      // Handle case where no slots exist yet
      const stats = slotStats[0] || {
        totalSlots: 0,
        availableSlots: 0,
        assignedSlots: 0,
        inProgressSlots: 0,
        completedSlots: 0,
        blockedSlots: 0
      };

      // Calculate additional metrics
      const utilizationRate = stats.totalSlots > 0 ? 
        ((stats.assignedSlots + stats.inProgressSlots + stats.completedSlots) / stats.totalSlots) * 100 : 0;

      const completionRate = stats.totalSlots > 0 ? 
        (stats.completedSlots / stats.totalSlots) * 100 : 0;

      return {
        ...stats,
        utilizationRate: Math.round(utilizationRate * 100) / 100,
        completionRate: Math.round(completionRate * 100) / 100,
        projectConfiguration: project?.slotConfiguration || {},
        progressTracking: project?.progressTracking || {}
      };
    } catch (error) {
      logger.error('Error getting project slot statistics:', error);
      
      // Return default stats instead of throwing to prevent 500 errors
      return {
        totalSlots: 0,
        availableSlots: 0,
        assignedSlots: 0,
        inProgressSlots: 0,
        completedSlots: 0,
        blockedSlots: 0,
        utilizationRate: 0,
        completionRate: 0,
        projectConfiguration: {},
        progressTracking: {},
        error: error.message
      };
    }
  }

  /**
   * Detect and resolve slot conflicts
   */
  async detectSlotConflicts(projectId) {
    try {
      const conflicts = [];

      // Find slots with multiple work items assigned (should not happen but check anyway)
      const duplicateAssignments = await WorkItem.aggregate([
        { $match: { project: new mongoose.Types.ObjectId(projectId), 'slotAssignment.assignedSlot': { $ne: null } } },
        { $group: { _id: '$slotAssignment.assignedSlot', workItems: { $push: '$_id' }, count: { $sum: 1 } } },
        { $match: { count: { $gt: 1 } } }
      ]);

      for (const duplicate of duplicateAssignments) {
        conflicts.push({
          type: 'duplicate_assignment',
          slotId: duplicate._id,
          workItemIds: duplicate.workItems,
          severity: 'high',
          description: `Slot has ${duplicate.count} work items assigned`
        });
      }

      // Find work items with slot assignments that don't match slot records
      const orphanedAssignments = await WorkItem.aggregate([
        { $match: { project: new mongoose.Types.ObjectId(projectId), 'slotAssignment.assignedSlot': { $ne: null } } },
        {
          $lookup: {
            from: 'slots',
            localField: 'slotAssignment.assignedSlot',
            foreignField: '_id',
            as: 'slotInfo'
          }
        },
        { $match: { $or: [{ slotInfo: { $size: 0 } }, { 'slotInfo.assignedWorkItem': { $ne: '$_id' } }] } }
      ]);

      for (const orphaned of orphanedAssignments) {
        conflicts.push({
          type: 'orphaned_assignment',
          workItemId: orphaned._id,
          slotId: orphaned.slotAssignment.assignedSlot,
          severity: 'medium',
          description: 'Work item slot assignment does not match slot record'
        });
      }

      // Find slots marked as assigned but with no work item
      const orphanedSlots = await Slot.find({
        project: projectId,
        assignmentStatus: { $in: ['assigned', 'in-progress'] },
        assignedWorkItem: null
      });

      for (const slot of orphanedSlots) {
        conflicts.push({
          type: 'orphaned_slot',
          slotId: slot._id,
          slotNumber: slot.slotNumber,
          severity: 'medium',
          description: 'Slot marked as assigned but has no work item'
        });
      }

      return {
        conflicts,
        conflictCount: conflicts.length,
        hasConflicts: conflicts.length > 0
      };
    } catch (error) {
      logger.error('Error detecting slot conflicts:', error);
      throw error;
    }
  }

  /**
   * Resolve slot conflicts automatically where possible
   */
  async resolveSlotConflicts(projectId, conflicts) {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const resolutionResults = [];

      for (const conflict of conflicts) {
        try {
          switch (conflict.type) {
            case 'duplicate_assignment':
              // Keep the first work item, release others
              const [keepWorkItem, ...releaseWorkItems] = conflict.workItemIds;
              
              for (const workItemId of releaseWorkItems) {
                await this.releaseSlotFromWorkItem(
                  workItemId, 
                  'system', 
                  'Resolving duplicate slot assignment',
                  { session }
                );
              }
              
              resolutionResults.push({
                conflictType: conflict.type,
                action: 'resolved',
                details: `Kept assignment for work item ${keepWorkItem}, released ${releaseWorkItems.length} others`
              });
              break;

            case 'orphaned_assignment':
              // Release the orphaned assignment
              await this.releaseSlotFromWorkItem(
                conflict.workItemId,
                'system',
                'Resolving orphaned slot assignment',
                { session }
              );
              
              resolutionResults.push({
                conflictType: conflict.type,
                action: 'resolved',
                details: `Released orphaned assignment for work item ${conflict.workItemId}`
              });
              break;

            case 'orphaned_slot':
              // Reset slot to available status
              await Slot.findByIdAndUpdate(
                conflict.slotId,
                {
                  assignmentStatus: 'available',
                  assignedWorkItem: null,
                  assignedBy: null,
                  assignedAt: null
                },
                { session }
              );
              
              resolutionResults.push({
                conflictType: conflict.type,
                action: 'resolved',
                details: `Reset orphaned slot ${conflict.slotNumber} to available status`
              });
              break;

            default:
              resolutionResults.push({
                conflictType: conflict.type,
                action: 'skipped',
                details: 'Unknown conflict type'
              });
          }
        } catch (error) {
          resolutionResults.push({
            conflictType: conflict.type,
            action: 'failed',
            details: error.message
          });
        }
      }

      // Update project slot tracking
      await this.updateProjectSlotTracking(projectId, { session });

      await session.commitTransaction();

      logger.info(`Resolved ${resolutionResults.filter(r => r.action === 'resolved').length} slot conflicts for project ${projectId}`);

      return {
        resolutions: resolutionResults,
        resolvedCount: resolutionResults.filter(r => r.action === 'resolved').length,
        failedCount: resolutionResults.filter(r => r.action === 'failed').length
      };
    } catch (error) {
      await session.abortTransaction();
      logger.error('Error resolving slot conflicts:', error);
      throw error;
    } finally {
      session.endSession();
    }
  }

  /**
   * Update project slot tracking information
   */
  async updateProjectSlotTracking(projectId, options = {}) {
    const session = options.session;
    
    try {
      const project = await Project.findById(projectId).session(session);
      
      if (!project || !project.slotConfiguration?.enableSlotSystem) {
        return;
      }

      // Recalculate slot-based progress
      await project.recalculateSlotProgress();

      logger.debug(`Updated slot tracking for project ${projectId}`);
    } catch (error) {
      logger.error('Error updating project slot tracking:', error);
      throw error;
    }
  }

  /**
   * Validate slot assignment before performing the operation
   */
  async validateSlotAssignment(workItem, slot) {
    // Check if work item and slot belong to same project
    if (workItem.project.toString() !== slot.project.toString()) {
      throw new Error('Work item and slot must belong to the same project');
    }

    // Check if slot is available
    if (!slot.isAvailable) {
      throw new Error(`Slot ${slot.slotIdentifier} is not available for assignment`);
    }

    // Check slot dependencies
    if (slot.slotConfiguration?.dependencies?.length > 0) {
      const dependencySlots = await Slot.find({
        _id: { $in: slot.slotConfiguration.dependencies },
        'completionStatus.isCompleted': { $ne: true }
      });

      if (dependencySlots.length > 0) {
        const pendingDependencies = dependencySlots.map(s => s.slotIdentifier).join(', ');
        throw new Error(`Cannot assign slot ${slot.slotIdentifier}. Pending dependencies: ${pendingDependencies}`);
      }
    }

    return true;
  }

  /**
   * Add slot recommendations based on priorities and dependencies
   */
  async addSlotRecommendations(slots) {
    return slots.map(slot => {
      let recommendation = null;
      let priority = 'medium';

      // High priority slots get recommendation
      if (slot.priority === 'High' || slot.priority === 'Urgent') {
        recommendation = {
          reason: 'High priority slot',
          priority: 'high'
        };
        priority = 'high';
      }

      // Slots with no dependencies get recommendation
      if (!slot.slotConfiguration?.dependencies?.length) {
        recommendation = {
          reason: 'No dependencies - ready to start',
          priority: priority
        };
      }

      // Slots nearing due date get recommendation
      if (slot.dueDate) {
        const daysUntilDue = Math.ceil((new Date(slot.dueDate) - new Date()) / (1000 * 60 * 60 * 24));
        if (daysUntilDue <= 3 && daysUntilDue > 0) {
          recommendation = {
            reason: `Due in ${daysUntilDue} day${daysUntilDue === 1 ? '' : 's'}`,
            priority: 'high'
          };
        }
      }

      return {
        ...slot,
        recommendation
      };
    });
  }
}

// Create singleton instance
const slotManagementService = new SlotManagementService();

export default slotManagementService;