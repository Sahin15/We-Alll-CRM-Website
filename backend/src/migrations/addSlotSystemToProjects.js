import mongoose from 'mongoose';
import Project from '../models/projectModel.js';
import Slot from '../models/slotModel.js';
import logger from '../utils/logger.js';

/**
 * Migration Script: Add Slot System to Existing Projects
 * 
 * This script adds slot configuration to existing projects and creates
 * initial slots for projects that don't have any.
 */

const DEFAULT_SLOT_CONFIGURATION = {
  totalSlots: 10,
  slotType: 'generic',
  allowDynamicSlots: true,
  slotNamingPattern: 'Slot {number}',
  autoCreateSlots: true,
  enableSlotSystem: false // Start disabled for existing projects
};

const DEFAULT_PROGRESS_TRACKING = {
  calculationMethod: 'manual', // Keep existing behavior
  completedSlots: 0,
  totalSlots: 10,
  progressPercentage: 0,
  lastProgressUpdate: new Date(),
  progressHistory: []
};

const DEFAULT_SLOT_MANAGEMENT = {
  allowSlotReassignment: true,
  requireApprovalForSlotChanges: false,
  slotCompletionRequiresApproval: false,
  autoReleaseOnWorkItemDeletion: true,
  notifyOnSlotCompletion: true
};

/**
 * Add slot configuration to projects that don't have it
 */
async function addSlotConfigurationToProjects() {
  try {
    logger.info('Starting migration: Adding slot configuration to existing projects');
    
    // Find projects without slot configuration
    const projectsWithoutSlotConfig = await Project.find({
      'slotConfiguration.enableSlotSystem': { $exists: false }
    });
    
    logger.info(`Found ${projectsWithoutSlotConfig.length} projects without slot configuration`);
    
    let updatedCount = 0;
    
    for (const project of projectsWithoutSlotConfig) {
      try {
        // Add slot configuration
        project.slotConfiguration = {
          ...DEFAULT_SLOT_CONFIGURATION,
          totalSlots: 10 // Default to 10 slots
        };
        
        // Add progress tracking
        project.progressTracking = {
          ...DEFAULT_PROGRESS_TRACKING,
          progressPercentage: project.progress || 0, // Preserve existing progress
          totalSlots: 10
        };
        
        // Add slot management configuration
        project.slotManagement = DEFAULT_SLOT_MANAGEMENT;
        
        await project.save();
        updatedCount++;
        
        logger.info(`Updated project: ${project.name} (${project._id})`);
      } catch (error) {
        logger.error(`Error updating project ${project._id}:`, error);
      }
    }
    
    logger.info(`Successfully updated ${updatedCount} projects with slot configuration`);
    return updatedCount;
  } catch (error) {
    logger.error('Error in addSlotConfigurationToProjects:', error);
    throw error;
  }
}

/**
 * Create initial slots for projects that have slot system enabled but no slots
 */
async function createInitialSlotsForProjects() {
  try {
    logger.info('Starting: Creating initial slots for projects');
    
    // Find projects with slot system enabled but no slots
    const projectsNeedingSlots = await Project.find({
      'slotConfiguration.enableSlotSystem': true,
      'slotConfiguration.autoCreateSlots': true
    });
    
    let slotsCreated = 0;
    
    for (const project of projectsNeedingSlots) {
      try {
        // Check if project already has slots
        const existingSlots = await Slot.countDocuments({ project: project._id });
        
        if (existingSlots === 0) {
          const totalSlots = project.slotConfiguration.totalSlots || 10;
          const slotNamingPattern = project.slotConfiguration.slotNamingPattern || 'Slot {number}';
          
          // Create initial slots
          const slotsToCreate = [];
          for (let i = 1; i <= totalSlots; i++) {
            const slotIdentifier = slotNamingPattern.replace('{number}', i);
            
            slotsToCreate.push({
              project: project._id,
              client: project.client,
              slotNumber: i,
              slotIdentifier: slotIdentifier,
              slotType: 'work',
              title: `${slotIdentifier} - Work Assignment`,
              description: `Auto-generated slot for project work assignment`,
              workType: 'Other',
              priority: 'Medium',
              assignmentStatus: 'available',
              createdBy: project.createdBy || project.projectHead,
              assignedTo: project.projectHead || project.createdBy,
              dueDate: project.endDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
              slotConfiguration: {
                isRequired: true,
                canBeSkipped: false,
                requiresApproval: false,
                estimatedEffort: 8, // 8 hours default
                weight: 1.0
              },
              slotMetadata: {
                category: 'other',
                tags: ['auto-generated']
              }
            });
          }
          
          await Slot.insertMany(slotsToCreate);
          slotsCreated += slotsToCreate.length;
          
          logger.info(`Created ${slotsToCreate.length} slots for project: ${project.name}`);
        }
      } catch (error) {
        logger.error(`Error creating slots for project ${project._id}:`, error);
      }
    }
    
    logger.info(`Successfully created ${slotsCreated} initial slots`);
    return slotsCreated;
  } catch (error) {
    logger.error('Error in createInitialSlotsForProjects:', error);
    throw error;
  }
}

/**
 * Update existing slots with new schema fields
 */
async function updateExistingSlotsSchema() {
  try {
    logger.info('Starting: Updating existing slots with new schema fields');
    
    // Find slots without the new assignment status field
    const slotsToUpdate = await Slot.find({
      assignmentStatus: { $exists: false }
    });
    
    logger.info(`Found ${slotsToUpdate.length} slots to update`);
    
    let updatedCount = 0;
    
    for (const slot of slotsToUpdate) {
      try {
        // Set default assignment status based on existing status
        let assignmentStatus = 'available';
        if (slot.status === 'Completed' || slot.designStatus === 'Approved') {
          assignmentStatus = 'completed';
        } else if (slot.status === 'In Progress') {
          assignmentStatus = 'in-progress';
        } else if (slot.assignedTo && slot.status !== 'Pending') {
          assignmentStatus = 'assigned';
        }
        
        // Add new fields
        slot.assignmentStatus = assignmentStatus;
        
        // Add slot number if missing
        if (!slot.slotNumber) {
          // Try to extract number from title or generate based on creation order
          const projectSlots = await Slot.find({ project: slot.project }).sort({ createdAt: 1 });
          slot.slotNumber = projectSlots.findIndex(s => s._id.equals(slot._id)) + 1;
        }
        
        // Add slot identifier if missing
        if (!slot.slotIdentifier) {
          slot.slotIdentifier = `Slot ${slot.slotNumber}`;
        }
        
        // Add completion status
        slot.completionStatus = {
          isCompleted: assignmentStatus === 'completed',
          completedAt: assignmentStatus === 'completed' ? slot.updatedAt : null,
          requiresApproval: false
        };
        
        // Add slot configuration
        slot.slotConfiguration = {
          isRequired: true,
          canBeSkipped: false,
          requiresApproval: false,
          estimatedEffort: 8,
          weight: 1.0
        };
        
        // Add slot metadata
        slot.slotMetadata = {
          category: 'other',
          tags: ['migrated']
        };
        
        await slot.save();
        updatedCount++;
      } catch (error) {
        logger.error(`Error updating slot ${slot._id}:`, error);
      }
    }
    
    logger.info(`Successfully updated ${updatedCount} existing slots`);
    return updatedCount;
  } catch (error) {
    logger.error('Error in updateExistingSlotsSchema:', error);
    throw error;
  }
}

/**
 * Recalculate progress for projects with slot system enabled
 */
async function recalculateProjectProgress() {
  try {
    logger.info('Starting: Recalculating progress for slot-enabled projects');
    
    const slotEnabledProjects = await Project.find({
      'slotConfiguration.enableSlotSystem': true,
      'progressTracking.calculationMethod': 'slot-based'
    });
    
    let recalculatedCount = 0;
    
    for (const project of slotEnabledProjects) {
      try {
        await project.recalculateSlotProgress();
        recalculatedCount++;
        logger.info(`Recalculated progress for project: ${project.name}`);
      } catch (error) {
        logger.error(`Error recalculating progress for project ${project._id}:`, error);
      }
    }
    
    logger.info(`Successfully recalculated progress for ${recalculatedCount} projects`);
    return recalculatedCount;
  } catch (error) {
    logger.error('Error in recalculateProjectProgress:', error);
    throw error;
  }
}

/**
 * Main migration function
 */
async function runSlotSystemMigration() {
  try {
    logger.info('=== Starting Slot System Migration ===');
    
    const results = {
      projectsUpdated: 0,
      slotsCreated: 0,
      slotsUpdated: 0,
      progressRecalculated: 0
    };
    
    // Step 1: Add slot configuration to existing projects
    results.projectsUpdated = await addSlotConfigurationToProjects();
    
    // Step 2: Update existing slots with new schema
    results.slotsUpdated = await updateExistingSlotsSchema();
    
    // Step 3: Create initial slots for projects that need them
    results.slotsCreated = await createInitialSlotsForProjects();
    
    // Step 4: Recalculate progress for slot-enabled projects
    results.progressRecalculated = await recalculateProjectProgress();
    
    logger.info('=== Slot System Migration Completed Successfully ===');
    logger.info('Migration Results:', results);
    
    return results;
  } catch (error) {
    logger.error('=== Slot System Migration Failed ===');
    logger.error('Migration error:', error);
    throw error;
  }
}

/**
 * Rollback function to disable slot system for all projects
 */
async function rollbackSlotSystemMigration() {
  try {
    logger.info('=== Starting Slot System Migration Rollback ===');
    
    // Disable slot system for all projects
    const result = await Project.updateMany(
      { 'slotConfiguration.enableSlotSystem': true },
      { 
        $set: { 
          'slotConfiguration.enableSlotSystem': false,
          'progressTracking.calculationMethod': 'manual'
        }
      }
    );
    
    logger.info(`Disabled slot system for ${result.modifiedCount} projects`);
    logger.info('=== Slot System Migration Rollback Completed ===');
    
    return result.modifiedCount;
  } catch (error) {
    logger.error('=== Slot System Migration Rollback Failed ===');
    logger.error('Rollback error:', error);
    throw error;
  }
}

// Export functions for use in other scripts or API endpoints
export {
  runSlotSystemMigration,
  rollbackSlotSystemMigration,
  addSlotConfigurationToProjects,
  createInitialSlotsForProjects,
  updateExistingSlotsSchema,
  recalculateProjectProgress
};

// If running directly, execute the migration
if (import.meta.url === `file://${process.argv[1]}`) {
  runSlotSystemMigration()
    .then((results) => {
      console.log('Migration completed successfully:', results);
      process.exit(0);
    })
    .catch((error) => {
      console.error('Migration failed:', error);
      process.exit(1);
    });
}