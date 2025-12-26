import { jest } from '@jest/globals';
import mongoose from 'mongoose';
import fc from 'fast-check';
import Project from '../src/models/projectModel.js';
import Slot from '../src/models/slotModel.js';
import WorkItem from '../src/models/workItemModel.js';

/**
 * Property-Based Tests for Progress Calculation Consistency
 * 
 * **Feature: project-slot-based-progress, Property 2: Progress Calculation Consistency**
 * 
 * Tests that the progress percentage equals (completed slots / total slots) * 100 
 * when using slot-based calculation method.
 */

describe('Progress Calculation Consistency Property Tests', () => {
  let testProject;
  let testSlots;
  
  beforeAll(async () => {
    // Connect to test database
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(process.env.MONGODB_TEST_URI || 'mongodb://localhost:27017/test-slot-system');
    }
  });

  beforeEach(async () => {
    // Clean up test data
    await Project.deleteMany({});
    await Slot.deleteMany({});
    await WorkItem.deleteMany({});
  });

  afterEach(async () => {
    // Clean up test data
    await Project.deleteMany({});
    await Slot.deleteMany({});
    await WorkItem.deleteMany({});
  });

  afterAll(async () => {
    await mongoose.connection.close();
  });

  /**
   * Helper function to create a test project with specified slot configuration
   */
  async function createTestProject(totalSlots = 10, enableSlotSystem = true) {
    return await Project.create({
      name: 'Test Project for Progress Calculation',
      description: 'Test project for progress calculation consistency testing',
      status: 'In Progress',
      slotConfiguration: {
        totalSlots: totalSlots,
        enableSlotSystem: enableSlotSystem,
        autoCreateSlots: true,
        slotType: 'generic'
      },
      progressTracking: {
        calculationMethod: enableSlotSystem ? 'slot-based' : 'manual',
        totalSlots: totalSlots,
        completedSlots: 0,
        progressPercentage: 0
      },
      slotManagement: {
        allowSlotReassignment: true,
        autoReleaseOnWorkItemDeletion: true
      },
      createdBy: new mongoose.Types.ObjectId()
    });
  }

  /**
   * Helper function to create slots for a project
   */
  async function createSlotsForProject(project, count) {
    const slots = [];
    for (let i = 1; i <= count; i++) {
      const slot = await Slot.create({
        project: project._id,
        client: new mongoose.Types.ObjectId(),
        slotNumber: i,
        slotIdentifier: `Slot ${i}`,
        slotType: 'work',
        title: `Test Slot ${i}`,
        description: `Test slot ${i} for progress calculation`,
        workType: 'Other',
        priority: 'Medium',
        assignmentStatus: 'available',
        createdBy: project.createdBy,
        assignedTo: project.createdBy,
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        completionStatus: {
          isCompleted: false,
          requiresApproval: false
        },
        slotConfiguration: {
          isRequired: true,
          weight: 1.0
        }
      });
      slots.push(slot);
    }
    return slots;
  }

  /**
   * Helper function to complete a specified number of slots
   */
  async function completeSlotsRandomly(slots, completionCount, completedBy) {
    const slotsToComplete = slots.slice(0, completionCount);
    
    for (const slot of slotsToComplete) {
      await slot.completeSlot(completedBy, 'Test completion for progress calculation');
    }
    
    return slotsToComplete;
  }

  /**
   * **Feature: project-slot-based-progress, Property 2: Progress Calculation Consistency**
   * 
   * Property: For any project using slot-based calculation, the progress percentage 
   * should equal (completed slots / total slots) * 100
   */
  describe('Property 2: Progress Calculation Consistency', () => {
    test('progress calculation consistency holds for all slot completion scenarios', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 1, max: 20 }), // Total slots
          fc.integer({ min: 0, max: 20 }), // Completed slots
          async (totalSlots, completedSlotsInput) => {
            // Ensure completed slots doesn't exceed total slots
            const completedSlots = Math.min(completedSlotsInput, totalSlots);
            
            // Create test project
            const project = await createTestProject(totalSlots, true);
            
            // Create slots
            const slots = await createSlotsForProject(project, totalSlots);
            
            // Complete specified number of slots
            if (completedSlots > 0) {
              await completeSlotsRandomly(slots, completedSlots, project.createdBy);
            }
            
            // Recalculate project progress
            await project.recalculateSlotProgress();
            
            // Calculate expected progress
            const expectedProgress = totalSlots > 0 ? Math.round((completedSlots / totalSlots) * 100) : 0;
            
            // Verify progress calculation consistency
            const updatedProject = await Project.findById(project._id);
            
            expect(updatedProject.progressTracking.completedSlots).toBe(completedSlots);
            expect(updatedProject.progressTracking.totalSlots).toBe(totalSlots);
            expect(updatedProject.progressTracking.progressPercentage).toBe(expectedProgress);
            expect(updatedProject.progress).toBe(expectedProgress); // Legacy field should match
            
            // Verify the calculation formula
            if (totalSlots > 0) {
              const calculatedProgress = Math.round((updatedProject.progressTracking.completedSlots / updatedProject.progressTracking.totalSlots) * 100);
              expect(updatedProject.progressTracking.progressPercentage).toBe(calculatedProgress);
            }
          }
        ),
        { numRuns: 10 }
      );
    });

    test('progress updates immediately when slots are completed', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 5, max: 15 }), // Total slots
          fc.integer({ min: 1, max: 5 }), // Slots to complete in sequence
          async (totalSlots, slotsToComplete) => {
            const actualSlotsToComplete = Math.min(slotsToComplete, totalSlots);
            
            // Create test project
            const project = await createTestProject(totalSlots, true);
            const slots = await createSlotsForProject(project, totalSlots);
            
            // Complete slots one by one and verify progress updates
            for (let i = 1; i <= actualSlotsToComplete; i++) {
              // Complete one more slot
              await slots[i - 1].completeSlot(project.createdBy, `Completing slot ${i}`);
              
              // Recalculate progress
              await project.recalculateSlotProgress();
              
              // Verify progress is updated correctly
              const updatedProject = await Project.findById(project._id);
              const expectedProgress = Math.round((i / totalSlots) * 100);
              
              expect(updatedProject.progressTracking.completedSlots).toBe(i);
              expect(updatedProject.progressTracking.progressPercentage).toBe(expectedProgress);
              expect(updatedProject.progress).toBe(expectedProgress);
            }
          }
        ),
        { numRuns: 5 }
      );
    });

    test('progress calculation handles edge cases correctly', async () => {
      // Test with zero total slots
      const projectWithZeroSlots = await createTestProject(0, true);
      await projectWithZeroSlots.recalculateSlotProgress();
      
      let updatedProject = await Project.findById(projectWithZeroSlots._id);
      expect(updatedProject.progressTracking.progressPercentage).toBe(0);
      expect(updatedProject.progress).toBe(0);
      
      // Test with one slot
      const projectWithOneSlot = await createTestProject(1, true);
      const singleSlot = await createSlotsForProject(projectWithOneSlot, 1);
      
      // Before completion
      await projectWithOneSlot.recalculateSlotProgress();
      updatedProject = await Project.findById(projectWithOneSlot._id);
      expect(updatedProject.progressTracking.progressPercentage).toBe(0);
      
      // After completion
      await singleSlot[0].completeSlot(projectWithOneSlot.createdBy, 'Single slot completion');
      await projectWithOneSlot.recalculateSlotProgress();
      updatedProject = await Project.findById(projectWithOneSlot._id);
      expect(updatedProject.progressTracking.progressPercentage).toBe(100);
      expect(updatedProject.progress).toBe(100);
    });

    test('progress calculation consistency with slot capacity changes', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 5, max: 10 }), // Initial total slots
          fc.integer({ min: 1, max: 5 }), // Slots to complete
          fc.integer({ min: 8, max: 15 }), // New total slots
          async (initialTotalSlots, slotsToComplete, newTotalSlots) => {
            const actualSlotsToComplete = Math.min(slotsToComplete, initialTotalSlots);
            
            // Create project with initial slot configuration
            const project = await createTestProject(initialTotalSlots, true);
            const slots = await createSlotsForProject(project, initialTotalSlots);
            
            // Complete some slots
            await completeSlotsRandomly(slots, actualSlotsToComplete, project.createdBy);
            await project.recalculateSlotProgress();
            
            // Verify initial progress
            let updatedProject = await Project.findById(project._id);
            const initialProgress = Math.round((actualSlotsToComplete / initialTotalSlots) * 100);
            expect(updatedProject.progressTracking.progressPercentage).toBe(initialProgress);
            
            // Change slot capacity
            project.slotConfiguration.totalSlots = newTotalSlots;
            project.progressTracking.totalSlots = newTotalSlots;
            await project.save();
            
            // Create additional slots if capacity increased
            if (newTotalSlots > initialTotalSlots) {
              await createSlotsForProject(project, newTotalSlots - initialTotalSlots);
            }
            
            // Recalculate progress with new capacity
            await project.recalculateSlotProgress();
            
            // Verify progress calculation with new capacity
            updatedProject = await Project.findById(project._id);
            const newProgress = Math.round((actualSlotsToComplete / newTotalSlots) * 100);
            
            expect(updatedProject.progressTracking.completedSlots).toBe(actualSlotsToComplete);
            expect(updatedProject.progressTracking.totalSlots).toBe(newTotalSlots);
            expect(updatedProject.progressTracking.progressPercentage).toBe(newProgress);
            expect(updatedProject.progress).toBe(newProgress);
          }
        ),
        { numRuns: 5 }
      );
    });

    test('manual calculation method does not interfere with slot-based calculation', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 5, max: 15 }), // Total slots
          fc.integer({ min: 0, max: 100 }), // Manual progress value
          async (totalSlots, manualProgress) => {
            // Create project with manual calculation method
            const manualProject = await Project.create({
              name: 'Manual Progress Project',
              description: 'Project with manual progress calculation',
              status: 'In Progress',
              progress: manualProgress,
              slotConfiguration: {
                totalSlots: totalSlots,
                enableSlotSystem: false // Slot system disabled
              },
              progressTracking: {
                calculationMethod: 'manual',
                totalSlots: totalSlots,
                completedSlots: 0,
                progressPercentage: manualProgress
              },
              createdBy: new mongoose.Types.ObjectId()
            });
            
            // Create slots but don't enable slot-based calculation
            await createSlotsForProject(manualProject, totalSlots);
            
            // Attempt to recalculate progress (should not change manual progress)
            await manualProject.recalculateSlotProgress();
            
            // Verify manual progress is preserved
            const updatedProject = await Project.findById(manualProject._id);
            expect(updatedProject.progress).toBe(manualProgress);
            expect(updatedProject.progressTracking.progressPercentage).toBe(manualProgress);
            expect(updatedProject.progressTracking.calculationMethod).toBe('manual');
            
            // Now enable slot-based calculation
            manualProject.slotConfiguration.enableSlotSystem = true;
            manualProject.progressTracking.calculationMethod = 'slot-based';
            await manualProject.save();
            
            // Recalculate with slot-based method
            await manualProject.recalculateSlotProgress();
            
            // Verify progress is now calculated based on slots (should be 0 since no slots completed)
            const slotBasedProject = await Project.findById(manualProject._id);
            expect(slotBasedProject.progressTracking.progressPercentage).toBe(0);
            expect(slotBasedProject.progress).toBe(0);
            expect(slotBasedProject.progressTracking.calculationMethod).toBe('slot-based');
          }
        ),
        { numRuns: 5 }
      );
    });

    test('progress history tracks calculation changes correctly', async () => {
      const project = await createTestProject(10, true);
      const slots = await createSlotsForProject(project, 10);
      
      // Complete slots incrementally and verify history
      const completionSteps = [2, 5, 8, 10];
      
      for (const targetCompleted of completionSteps) {
        // Complete additional slots
        const currentCompleted = project.progressTracking?.completedSlots || 0;
        const slotsToComplete = targetCompleted - currentCompleted;
        
        if (slotsToComplete > 0) {
          for (let i = currentCompleted; i < targetCompleted; i++) {
            await slots[i].completeSlot(project.createdBy, `Completing slot ${i + 1}`);
          }
        }
        
        // Recalculate progress
        await project.recalculateSlotProgress();
        
        // Verify progress and history
        const updatedProject = await Project.findById(project._id);
        const expectedProgress = Math.round((targetCompleted / 10) * 100);
        
        expect(updatedProject.progressTracking.completedSlots).toBe(targetCompleted);
        expect(updatedProject.progressTracking.progressPercentage).toBe(expectedProgress);
        
        // Verify history entry was added
        const historyEntries = updatedProject.progressTracking.progressHistory;
        expect(historyEntries.length).toBeGreaterThan(0);
        
        const latestEntry = historyEntries[historyEntries.length - 1];
        expect(latestEntry.completedSlots).toBe(targetCompleted);
        expect(latestEntry.totalSlots).toBe(10);
        expect(latestEntry.progressPercentage).toBe(expectedProgress);
        expect(latestEntry.changeType).toBe('slot-completion');
      }
    });
  });

  /**
   * Integration tests for progress calculation with work items
   */
  describe('Progress Calculation with Work Item Integration', () => {
    test('work item completion triggers slot completion and progress update', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 3, max: 8 }), // Total slots
          fc.integer({ min: 1, max: 3 }), // Work items to complete
          async (totalSlots, workItemsToComplete) => {
            const actualWorkItems = Math.min(workItemsToComplete, totalSlots);
            
            // Create project and slots
            const project = await createTestProject(totalSlots, true);
            const slots = await createSlotsForProject(project, totalSlots);
            
            // Create work items and assign to slots
            const workItems = [];
            for (let i = 0; i < actualWorkItems; i++) {
              const workItem = await WorkItem.create({
                type: 'task',
                title: `Test Work Item ${i + 1}`,
                description: `Work item ${i + 1} for progress integration test`,
                project: project._id,
                assignedTo: project.createdBy,
                createdBy: project.createdBy,
                status: 'To Do',
                priority: 'medium',
                dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
                slotIntegration: {
                  autoCompleteSlotOnWorkItemCompletion: true
                }
              });
              
              await workItem.assignToSlot(slots[i]._id, project.createdBy);
              workItems.push(workItem);
            }
            
            // Complete work items one by one
            for (let i = 0; i < actualWorkItems; i++) {
              const workItem = workItems[i];
              workItem.status = 'Done';
              workItem.modifiedBy = project.createdBy;
              await workItem.save();
              
              // Verify slot was completed and progress updated
              const updatedSlot = await Slot.findById(slots[i]._id);
              expect(updatedSlot.assignmentStatus).toBe('completed');
              expect(updatedSlot.completionStatus.isCompleted).toBe(true);
              
              // Verify project progress
              const updatedProject = await Project.findById(project._id);
              const expectedProgress = Math.round(((i + 1) / totalSlots) * 100);
              
              expect(updatedProject.progressTracking.completedSlots).toBe(i + 1);
              expect(updatedProject.progressTracking.progressPercentage).toBe(expectedProgress);
              expect(updatedProject.progress).toBe(expectedProgress);
            }
          }
        ),
        { numRuns: 3 }
      );
    });
  });
});
