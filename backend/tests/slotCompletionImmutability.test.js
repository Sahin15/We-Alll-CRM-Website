import { jest } from '@jest/globals';
import mongoose from 'mongoose';
import fc from 'fast-check';
import Project from '../src/models/projectModel.js';
import Slot from '../src/models/slotModel.js';
import WorkItem from '../src/models/workItemModel.js';
import slotManagementService from '../src/services/slotManagementService.js';

/**
 * Property-Based Tests for Slot Completion Immutability
 * 
 * **Feature: project-slot-based-progress, Property 4: Slot Completion Immutability**
 * 
 * Tests that slots marked as completed cannot be reassigned to other work items
 * and maintain their completed state immutably.
 */

describe('Slot Completion Immutability Property Tests', () => {
  let testProject;
  
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
    
    // Create test project with slot system enabled
    testProject = await Project.create({
      name: 'Test Project for Slot Completion Immutability',
      description: 'Test project for slot completion immutability testing',
      status: 'In Progress',
      slotConfiguration: {
        totalSlots: 10,
        enableSlotSystem: true,
        autoCreateSlots: true
      },
      progressTracking: {
        calculationMethod: 'slot-based',
        totalSlots: 10,
        completedSlots: 0
      },
      createdBy: new mongoose.Types.ObjectId()
    });
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
   * Helper function to create a slot and assign it to a work item
   */
  async function createAssignedSlot(project, slotNumber = 1) {
    const slot = await Slot.create({
      project: project._id,
      client: new mongoose.Types.ObjectId(),
      slotNumber: slotNumber,
      slotIdentifier: `Slot ${slotNumber}`,
      slotType: 'work',
      title: `Test Slot ${slotNumber}`,
      description: `Test slot ${slotNumber} for completion testing`,
      workType: 'Other',
      priority: 'Medium',
      assignmentStatus: 'available',
      createdBy: project.createdBy,
      assignedTo: project.createdBy,
      dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    });

    const workItem = await WorkItem.create({
      type: 'task',
      title: `Work Item for Slot ${slotNumber}`,
      description: `Work item assigned to slot ${slotNumber}`,
      project: project._id,
      assignedTo: project.createdBy,
      createdBy: project.createdBy,
      status: 'To Do',
      priority: 'medium',
      dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    });

    // Assign work item to slot
    await slotManagementService.assignWorkItemToSlot(
      workItem._id,
      slot._id,
      project.createdBy
    );

    return { slot: await Slot.findById(slot._id), workItem };
  }

  /**
   * **Feature: project-slot-based-progress, Property 4: Slot Completion Immutability**
   * 
   * Property: For any slot marked as completed, it should not be available for 
   * reassignment to other work items
   */
  describe('Property 4: Slot Completion Immutability', () => {
    test('completed slots cannot be reassigned to new work items', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 1, max: 5 }), // Number of slots to test
          fc.integer({ min: 1, max: 3 }), // Number of reassignment attempts per slot
          async (slotCount, reassignmentAttempts) => {
            const completedSlots = [];
            
            // Create and complete slots
            for (let i = 0; i < slotCount; i++) {
              const { slot, workItem } = await createAssignedSlot(testProject, i + 1);
              
              // Complete the slot
              await slotManagementService.completeSlot(
                slot._id,
                testProject.createdBy,
                { notes: `Completing slot ${i + 1} for immutability test` }
              );
              
              completedSlots.push(await Slot.findById(slot._id));
            }
            
            // Verify all slots are completed
            for (const slot of completedSlots) {
              expect(slot.assignmentStatus).toBe('completed');
              expect(slot.completionStatus.isCompleted).toBe(true);
            }
            
            // Attempt to reassign completed slots to new work items
            for (const completedSlot of completedSlots) {
              for (let attempt = 0; attempt < reassignmentAttempts; attempt++) {
                // Create a new work item
                const newWorkItem = await WorkItem.create({
                  type: 'task',
                  title: `New Work Item ${attempt + 1} for Slot ${completedSlot.slotNumber}`,
                  description: `Attempting to reassign completed slot ${completedSlot.slotNumber}`,
                  project: testProject._id,
                  assignedTo: testProject.createdBy,
                  createdBy: testProject.createdBy,
                  status: 'To Do',
                  priority: 'medium',
                  dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
                });
                
                // Attempt assignment should fail
                await expect(
                  slotManagementService.assignWorkItemToSlot(
                    newWorkItem._id,
                    completedSlot._id,
                    testProject.createdBy
                  )
                ).rejects.toThrow('not available for assignment');
                
                // Verify slot remains completed and unchanged
                const unchangedSlot = await Slot.findById(completedSlot._id);
                expect(unchangedSlot.assignmentStatus).toBe('completed');
                expect(unchangedSlot.completionStatus.isCompleted).toBe(true);
                expect(unchangedSlot.assignedWorkItem.toString()).toBe(completedSlot.assignedWorkItem.toString());
                
                // Verify new work item has no slot assignment
                const unchangedWorkItem = await WorkItem.findById(newWorkItem._id);
                expect(unchangedWorkItem.slotAssignment.assignedSlot).toBeNull();
              }
            }
          }
        ),
        { numRuns: 5 }
      );
    });

    test('completed slots are not returned in available slots queries', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 3, max: 8 }), // Total slots
          fc.integer({ min: 1, max: 5 }), // Slots to complete
          async (totalSlots, slotsToComplete) => {
            const actualSlotsToComplete = Math.min(slotsToComplete, totalSlots);
            const slotsAndWorkItems = [];
            
            // Create and assign slots
            for (let i = 0; i < totalSlots; i++) {
              const { slot, workItem } = await createAssignedSlot(testProject, i + 1);
              slotsAndWorkItems.push({ slot, workItem });
            }
            
            // Complete some slots
            for (let i = 0; i < actualSlotsToComplete; i++) {
              await slotManagementService.completeSlot(
                slotsAndWorkItems[i].slot._id,
                testProject.createdBy,
                { notes: `Completing slot ${i + 1}` }
              );
            }
            
            // Query for available slots
            const availableResult = await slotManagementService.getAvailableSlots(testProject._id);
            
            // Should return 0 available slots (all are either assigned or completed)
            expect(availableResult.count).toBe(0);
            expect(availableResult.slots).toHaveLength(0);
            
            // Verify completed slots are not in the available list
            const completedSlotIds = slotsAndWorkItems
              .slice(0, actualSlotsToComplete)
              .map(item => item.slot._id.toString());
            
            const availableSlotIds = availableResult.slots.map(s => s._id.toString());
            
            for (const completedSlotId of completedSlotIds) {
              expect(availableSlotIds).not.toContain(completedSlotId);
            }
          }
        ),
        { numRuns: 10 }
      );
    });

    test('slot completion status is immutable after completion', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 100 }), // Completion notes
          fc.boolean(), // Requires approval
          async (completionNotes, requiresApproval) => {
            // Create and assign a slot
            const { slot, workItem } = await createAssignedSlot(testProject);
            
            // Complete the slot
            const completionResult = await slotManagementService.completeSlot(
              slot._id,
              testProject.createdBy,
              { notes: completionNotes, requiresApproval }
            );
            
            expect(completionResult.success).toBe(true);
            
            // Get the completed slot
            const completedSlot = await Slot.findById(slot._id);
            const originalCompletionData = {
              isCompleted: completedSlot.completionStatus.isCompleted,
              completedAt: completedSlot.completionStatus.completedAt,
              completedBy: completedSlot.completionStatus.completedBy,
              completionNotes: completedSlot.completionStatus.completionNotes,
              assignmentStatus: completedSlot.assignmentStatus,
              assignedWorkItem: completedSlot.assignedWorkItem
            };
            
            // Attempt to complete again (should be idempotent)
            const secondCompletionResult = await slotManagementService.completeSlot(
              slot._id,
              testProject.createdBy,
              { notes: 'Different notes', requiresApproval: !requiresApproval }
            );
            
            expect(secondCompletionResult.success).toBe(true);
            expect(secondCompletionResult.message).toBe('Slot already completed');
            
            // Verify completion data remains unchanged
            const unchangedSlot = await Slot.findById(slot._id);
            expect(unchangedSlot.completionStatus.isCompleted).toBe(originalCompletionData.isCompleted);
            expect(unchangedSlot.completionStatus.completedAt.getTime()).toBe(originalCompletionData.completedAt.getTime());
            expect(unchangedSlot.completionStatus.completedBy.toString()).toBe(originalCompletionData.completedBy.toString());
            expect(unchangedSlot.completionStatus.completionNotes).toBe(originalCompletionData.completionNotes);
            expect(unchangedSlot.assignmentStatus).toBe(originalCompletionData.assignmentStatus);
            expect(unchangedSlot.assignedWorkItem.toString()).toBe(originalCompletionData.assignedWorkItem.toString());
          }
        ),
        { numRuns: 5 }
      );
    });

    test('completed slots cannot be released', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 50 }), // Release reason
          async (releaseReason) => {
            // Create, assign, and complete a slot
            const { slot, workItem } = await createAssignedSlot(testProject);
            
            await slotManagementService.completeSlot(
              slot._id,
              testProject.createdBy,
              { notes: 'Completion for release test' }
            );
            
            // Verify slot is completed
            const completedSlot = await Slot.findById(slot._id);
            expect(completedSlot.assignmentStatus).toBe('completed');
            
            // Attempt to release the completed slot should fail
            await expect(
              slotManagementService.releaseSlotFromWorkItem(
                workItem._id,
                testProject.createdBy,
                releaseReason
              )
            ).rejects.toThrow('already completed');
            
            // Verify slot remains completed and unchanged
            const unchangedSlot = await Slot.findById(slot._id);
            expect(unchangedSlot.assignmentStatus).toBe('completed');
            expect(unchangedSlot.completionStatus.isCompleted).toBe(true);
            expect(unchangedSlot.assignedWorkItem.toString()).toBe(workItem._id.toString());
            
            // Verify work item still has slot assignment
            const unchangedWorkItem = await WorkItem.findById(workItem._id);
            expect(unchangedWorkItem.slotAssignment.assignedSlot.toString()).toBe(slot._id.toString());
          }
        ),
        { numRuns: 5 }
      );
    });

    test('project progress reflects completed slots immutably', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 2, max: 6 }), // Number of slots to complete
          async (slotsToComplete) => {
            const slotsAndWorkItems = [];
            
            // Create and assign slots
            for (let i = 0; i < slotsToComplete + 2; i++) { // Create extra slots
              const { slot, workItem } = await createAssignedSlot(testProject, i + 1);
              slotsAndWorkItems.push({ slot, workItem });
            }
            
            // Complete specified number of slots
            for (let i = 0; i < slotsToComplete; i++) {
              await slotManagementService.completeSlot(
                slotsAndWorkItems[i].slot._id,
                testProject.createdBy,
                { notes: `Completing slot ${i + 1}` }
              );
            }
            
            // Get updated project progress
            const updatedProject = await Project.findById(testProject._id);
            const expectedProgress = Math.round((slotsToComplete / testProject.slotConfiguration.totalSlots) * 100);
            
            expect(updatedProject.progressTracking.completedSlots).toBe(slotsToComplete);
            expect(updatedProject.progressTracking.progressPercentage).toBe(expectedProgress);
            
            // Attempt to reassign completed slots (should fail and not affect progress)
            for (let i = 0; i < slotsToComplete; i++) {
              const newWorkItem = await WorkItem.create({
                type: 'task',
                title: `Reassignment Attempt ${i + 1}`,
                description: `Attempting to reassign completed slot ${i + 1}`,
                project: testProject._id,
                assignedTo: testProject.createdBy,
                createdBy: testProject.createdBy,
                status: 'To Do',
                priority: 'medium',
                dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
              });
              
              await expect(
                slotManagementService.assignWorkItemToSlot(
                  newWorkItem._id,
                  slotsAndWorkItems[i].slot._id,
                  testProject.createdBy
                )
              ).rejects.toThrow();
            }
            
            // Verify progress remains unchanged
            const finalProject = await Project.findById(testProject._id);
            expect(finalProject.progressTracking.completedSlots).toBe(slotsToComplete);
            expect(finalProject.progressTracking.progressPercentage).toBe(expectedProgress);
          }
        ),
        { numRuns: 5 }
      );
    });
  });

  /**
   * Edge case tests for slot completion immutability
   */
  describe('Slot Completion Immutability Edge Cases', () => {
    test('work item completion automatically completes slot immutably', async () => {
      // Create and assign a slot
      const { slot, workItem } = await createAssignedSlot(testProject);
      
      // Complete the work item (should auto-complete slot)
      workItem.status = 'Done';
      workItem.modifiedBy = testProject.createdBy;
      await workItem.save();
      
      // Verify slot is completed
      const completedSlot = await Slot.findById(slot._id);
      expect(completedSlot.assignmentStatus).toBe('completed');
      expect(completedSlot.completionStatus.isCompleted).toBe(true);
      
      // Attempt to assign another work item to the completed slot
      const newWorkItem = await WorkItem.create({
        type: 'task',
        title: 'New Work Item for Completed Slot',
        description: 'Attempting to assign to auto-completed slot',
        project: testProject._id,
        assignedTo: testProject.createdBy,
        createdBy: testProject.createdBy,
        status: 'To Do',
        priority: 'medium',
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      });
      
      await expect(
        slotManagementService.assignWorkItemToSlot(
          newWorkItem._id,
          slot._id,
          testProject.createdBy
        )
      ).rejects.toThrow('not available for assignment');
    });

    test('bulk operations respect slot completion immutability', async () => {
      // Create multiple slots, some completed
      const slotsAndWorkItems = [];
      for (let i = 0; i < 4; i++) {
        const { slot, workItem } = await createAssignedSlot(testProject, i + 1);
        slotsAndWorkItems.push({ slot, workItem });
      }
      
      // Complete first two slots
      await slotManagementService.completeSlot(slotsAndWorkItems[0].slot._id, testProject.createdBy);
      await slotManagementService.completeSlot(slotsAndWorkItems[1].slot._id, testProject.createdBy);
      
      // Create new work items for bulk reassignment attempt
      const newWorkItems = [];
      for (let i = 0; i < 4; i++) {
        const workItem = await WorkItem.create({
          type: 'task',
          title: `Bulk Assignment Work Item ${i + 1}`,
          description: `Work item ${i + 1} for bulk assignment test`,
          project: testProject._id,
          assignedTo: testProject.createdBy,
          createdBy: testProject.createdBy,
          status: 'To Do',
          priority: 'medium',
          dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
        });
        newWorkItems.push(workItem);
      }
      
      // Attempt bulk slot assignment (should fail for completed slots)
      const workItemIds = newWorkItems.map(wi => wi._id);
      const targetSlots = slotsAndWorkItems.map(item => item.slot._id);
      
      const bulkResult = await slotManagementService.bulkSlotOperations({
        workItemIds,
        operation: 'assign-slots',
        slotData: { targetSlots }
      });
      
      // Should have some failures due to completed slots
      expect(bulkResult.failed.length).toBeGreaterThan(0);
      
      // Verify completed slots remain unchanged
      const finalSlot1 = await Slot.findById(slotsAndWorkItems[0].slot._id);
      const finalSlot2 = await Slot.findById(slotsAndWorkItems[1].slot._id);
      
      expect(finalSlot1.assignmentStatus).toBe('completed');
      expect(finalSlot2.assignmentStatus).toBe('completed');
      expect(finalSlot1.assignedWorkItem.toString()).toBe(slotsAndWorkItems[0].workItem._id.toString());
      expect(finalSlot2.assignedWorkItem.toString()).toBe(slotsAndWorkItems[1].workItem._id.toString());
    });

    test('slot completion with approval workflow maintains immutability', async () => {
      // Create and assign a slot
      const { slot, workItem } = await createAssignedSlot(testProject);
      
      // Complete slot with approval requirement
      await slotManagementService.completeSlot(
        slot._id,
        testProject.createdBy,
        { notes: 'Completion requiring approval', requiresApproval: true }
      );
      
      const completedSlot = await Slot.findById(slot._id);
      expect(completedSlot.assignmentStatus).toBe('completed');
      expect(completedSlot.completionStatus.isCompleted).toBe(true);
      expect(completedSlot.completionStatus.requiresApproval).toBe(true);
      
      // Even with pending approval, slot should be immutable
      const newWorkItem = await WorkItem.create({
        type: 'task',
        title: 'Work Item for Approval-Pending Slot',
        description: 'Attempting to assign to slot pending approval',
        project: testProject._id,
        assignedTo: testProject.createdBy,
        createdBy: testProject.createdBy,
        status: 'To Do',
        priority: 'medium',
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      });
      
      await expect(
        slotManagementService.assignWorkItemToSlot(
          newWorkItem._id,
          slot._id,
          testProject.createdBy
        )
      ).rejects.toThrow('not available for assignment');
    });
  });
});
