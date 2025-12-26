import { jest } from '@jest/globals';
import mongoose from 'mongoose';
import fc from 'fast-check';
import Project from '../src/models/projectModel.js';
import Slot from '../src/models/slotModel.js';
import WorkItem from '../src/models/workItemModel.js';

/**
 * Property-Based Tests for Slot Assignment Uniqueness
 * 
 * **Feature: project-slot-based-progress, Property 1: Slot Assignment Uniqueness**
 * 
 * Tests that at most one work item can be assigned to any project slot at any given time.
 * This ensures data integrity and prevents conflicts in slot assignments.
 */

describe('Slot Assignment Uniqueness Property Tests', () => {
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
    
    // Create test project with slot system enabled
    testProject = await Project.create({
      name: 'Test Project for Slot Assignment',
      description: 'Test project for slot assignment uniqueness testing',
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
    
    // Create test slots
    testSlots = [];
    for (let i = 1; i <= 5; i++) {
      const slot = await Slot.create({
        project: testProject._id,
        client: new mongoose.Types.ObjectId(),
        slotNumber: i,
        slotIdentifier: `Slot ${i}`,
        slotType: 'work',
        title: `Test Slot ${i}`,
        description: `Test slot ${i} for assignment testing`,
        workType: 'Other',
        priority: 'Medium',
        assignmentStatus: 'available',
        createdBy: testProject.createdBy,
        assignedTo: testProject.createdBy,
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days from now
      });
      testSlots.push(slot);
    }
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
   * **Feature: project-slot-based-progress, Property 1: Slot Assignment Uniqueness**
   * 
   * Property: For any project slot, at most one work item can be assigned to that slot at any given time
   * 
   * This test verifies that:
   * 1. A slot can be assigned to one work item successfully
   * 2. Attempting to assign the same slot to another work item fails
   * 3. The slot remains assigned to the original work item
   * 4. The assignment status is correctly maintained
   */
  describe('Property 1: Slot Assignment Uniqueness', () => {
    test('slot assignment uniqueness holds for all valid assignments', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 0, max: 4 }), // Slot index
          fc.integer({ min: 1, max: 3 }), // Number of work items to create
          async (slotIndex, workItemCount) => {
            const targetSlot = testSlots[slotIndex];
            const workItems = [];
            
            // Create multiple work items
            for (let i = 0; i < workItemCount; i++) {
              const workItem = await WorkItem.create({
                type: 'task',
                title: `Test Work Item ${i + 1}`,
                description: `Test work item ${i + 1} for slot assignment`,
                project: testProject._id,
                assignedTo: testProject.createdBy,
                createdBy: testProject.createdBy,
                status: 'To Do',
                priority: 'medium',
                dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
              });
              workItems.push(workItem);
            }
            
            // Attempt to assign all work items to the same slot
            let successfulAssignments = 0;
            let assignedWorkItem = null;
            
            for (const workItem of workItems) {
              try {
                await workItem.assignToSlot(targetSlot._id, testProject.createdBy);
                successfulAssignments++;
                assignedWorkItem = workItem;
              } catch (error) {
                // Assignment should fail for all but the first work item
                expect(error.message).toContain('not available for assignment');
              }
            }
            
            // Verify uniqueness property: exactly one assignment should succeed
            expect(successfulAssignments).toBe(1);
            
            // Verify the slot is correctly assigned
            const updatedSlot = await Slot.findById(targetSlot._id);
            expect(updatedSlot.assignmentStatus).toBe('assigned');
            expect(updatedSlot.assignedWorkItem.toString()).toBe(assignedWorkItem._id.toString());
            
            // Verify the work item has correct slot assignment
            const updatedWorkItem = await WorkItem.findById(assignedWorkItem._id);
            expect(updatedWorkItem.slotAssignment.assignedSlot.toString()).toBe(targetSlot._id.toString());
            expect(updatedWorkItem.slotAssignment.slotNumber).toBe(targetSlot.slotNumber);
          }
        ),
        { numRuns: 10 }
      );
    });

    test('slot uniqueness maintained across concurrent assignment attempts', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 0, max: 4 }), // Slot index
          async (slotIndex) => {
            const targetSlot = testSlots[slotIndex];
            
            // Create multiple work items
            const workItems = await Promise.all([
              WorkItem.create({
                type: 'task',
                title: 'Concurrent Work Item 1',
                description: 'First concurrent work item',
                project: testProject._id,
                assignedTo: testProject.createdBy,
                createdBy: testProject.createdBy,
                status: 'To Do',
                priority: 'medium',
                dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
              }),
              WorkItem.create({
                type: 'task',
                title: 'Concurrent Work Item 2',
                description: 'Second concurrent work item',
                project: testProject._id,
                assignedTo: testProject.createdBy,
                createdBy: testProject.createdBy,
                status: 'To Do',
                priority: 'medium',
                dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
              })
            ]);
            
            // Attempt concurrent assignments
            const assignmentPromises = workItems.map(workItem =>
              workItem.assignToSlot(targetSlot._id, testProject.createdBy).catch(error => ({ error }))
            );
            
            const results = await Promise.all(assignmentPromises);
            
            // Count successful assignments
            const successfulAssignments = results.filter(result => !result.error).length;
            
            // Verify uniqueness: exactly one assignment should succeed
            expect(successfulAssignments).toBe(1);
            
            // Verify slot state consistency
            const finalSlot = await Slot.findById(targetSlot._id);
            expect(finalSlot.assignmentStatus).toBe('assigned');
            expect(finalSlot.assignedWorkItem).not.toBeNull();
            
            // Verify exactly one work item has this slot assigned
            const workItemsWithSlot = await WorkItem.find({
              'slotAssignment.assignedSlot': targetSlot._id
            });
            expect(workItemsWithSlot).toHaveLength(1);
          }
        ),
        { numRuns: 5 }
      );
    });

    test('slot reassignment maintains uniqueness', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 0, max: 4 }), // Source slot index
          fc.integer({ min: 0, max: 4 }), // Target slot index
          async (sourceSlotIndex, targetSlotIndex) => {
            const sourceSlot = testSlots[sourceSlotIndex];
            const targetSlot = testSlots[targetSlotIndex];
            
            // Create work items
            const workItem1 = await WorkItem.create({
              type: 'task',
              title: 'Work Item for Reassignment Test 1',
              description: 'First work item for reassignment testing',
              project: testProject._id,
              assignedTo: testProject.createdBy,
              createdBy: testProject.createdBy,
              status: 'To Do',
              priority: 'medium',
              dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
            });
            
            const workItem2 = await WorkItem.create({
              type: 'task',
              title: 'Work Item for Reassignment Test 2',
              description: 'Second work item for reassignment testing',
              project: testProject._id,
              assignedTo: testProject.createdBy,
              createdBy: testProject.createdBy,
              status: 'To Do',
              priority: 'medium',
              dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
            });
            
            // Assign work items to different slots initially
            await workItem1.assignToSlot(sourceSlot._id, testProject.createdBy);
            
            if (sourceSlotIndex !== targetSlotIndex) {
              await workItem2.assignToSlot(targetSlot._id, testProject.createdBy);
              
              // Attempt to reassign workItem1 to targetSlot (should fail due to uniqueness)
              await expect(
                workItem1.assignToSlot(targetSlot._id, testProject.createdBy)
              ).rejects.toThrow('not available for assignment');
              
              // Verify both slots maintain their original assignments
              const finalSourceSlot = await Slot.findById(sourceSlot._id);
              const finalTargetSlot = await Slot.findById(targetSlot._id);
              
              expect(finalSourceSlot.assignedWorkItem.toString()).toBe(workItem1._id.toString());
              expect(finalTargetSlot.assignedWorkItem.toString()).toBe(workItem2._id.toString());
            } else {
              // Same slot - should maintain assignment to workItem1
              const finalSlot = await Slot.findById(sourceSlot._id);
              expect(finalSlot.assignedWorkItem.toString()).toBe(workItem1._id.toString());
            }
          }
        ),
        { numRuns: 10 }
      );
    });

    test('slot release restores availability for new assignments', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 0, max: 4 }), // Slot index
          async (slotIndex) => {
            const targetSlot = testSlots[slotIndex];
            
            // Create two work items
            const workItem1 = await WorkItem.create({
              type: 'task',
              title: 'Work Item for Release Test 1',
              description: 'First work item for release testing',
              project: testProject._id,
              assignedTo: testProject.createdBy,
              createdBy: testProject.createdBy,
              status: 'To Do',
              priority: 'medium',
              dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
            });
            
            const workItem2 = await WorkItem.create({
              type: 'task',
              title: 'Work Item for Release Test 2',
              description: 'Second work item for release testing',
              project: testProject._id,
              assignedTo: testProject.createdBy,
              createdBy: testProject.createdBy,
              status: 'To Do',
              priority: 'medium',
              dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
            });
            
            // Assign first work item to slot
            await workItem1.assignToSlot(targetSlot._id, testProject.createdBy);
            
            // Verify slot is assigned
            let slotState = await Slot.findById(targetSlot._id);
            expect(slotState.assignmentStatus).toBe('assigned');
            
            // Attempt to assign second work item (should fail)
            await expect(
              workItem2.assignToSlot(targetSlot._id, testProject.createdBy)
            ).rejects.toThrow('not available for assignment');
            
            // Release the slot
            await workItem1.releaseSlot(testProject.createdBy, 'Testing slot release');
            
            // Verify slot is available again
            slotState = await Slot.findById(targetSlot._id);
            expect(slotState.assignmentStatus).toBe('available');
            expect(slotState.assignedWorkItem).toBeNull();
            
            // Now second work item should be able to assign to the slot
            await workItem2.assignToSlot(targetSlot._id, testProject.createdBy);
            
            // Verify successful assignment
            slotState = await Slot.findById(targetSlot._id);
            expect(slotState.assignmentStatus).toBe('assigned');
            expect(slotState.assignedWorkItem.toString()).toBe(workItem2._id.toString());
          }
        ),
        { numRuns: 10 }
      );
    });
  });

  /**
   * Edge case tests for slot assignment uniqueness
   */
  describe('Slot Assignment Uniqueness Edge Cases', () => {
    test('completed slots cannot be reassigned', async () => {
      const targetSlot = testSlots[0];
      
      // Create and assign work item
      const workItem1 = await WorkItem.create({
        type: 'task',
        title: 'Work Item for Completion Test',
        description: 'Work item for completion testing',
        project: testProject._id,
        assignedTo: testProject.createdBy,
        createdBy: testProject.createdBy,
        status: 'To Do',
        priority: 'medium',
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      });
      
      await workItem1.assignToSlot(targetSlot._id, testProject.createdBy);
      
      // Complete the slot
      const slot = await Slot.findById(targetSlot._id);
      await slot.completeSlot(testProject.createdBy, 'Test completion');
      
      // Create another work item and try to assign to completed slot
      const workItem2 = await WorkItem.create({
        type: 'task',
        title: 'Work Item for Completed Slot Test',
        description: 'Work item for completed slot testing',
        project: testProject._id,
        assignedTo: testProject.createdBy,
        createdBy: testProject.createdBy,
        status: 'To Do',
        priority: 'medium',
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      });
      
      // Assignment should fail
      await expect(
        workItem2.assignToSlot(targetSlot._id, testProject.createdBy)
      ).rejects.toThrow('not available for assignment');
      
      // Verify slot remains completed and assigned to original work item
      const finalSlot = await Slot.findById(targetSlot._id);
      expect(finalSlot.assignmentStatus).toBe('completed');
      expect(finalSlot.assignedWorkItem.toString()).toBe(workItem1._id.toString());
    });

    test('cross-project slot assignment is prevented', async () => {
      // Create another project
      const otherProject = await Project.create({
        name: 'Other Test Project',
        description: 'Another test project',
        status: 'In Progress',
        slotConfiguration: {
          totalSlots: 5,
          enableSlotSystem: true
        },
        createdBy: new mongoose.Types.ObjectId()
      });
      
      // Create work item in other project
      const workItemFromOtherProject = await WorkItem.create({
        type: 'task',
        title: 'Work Item from Other Project',
        description: 'Work item from different project',
        project: otherProject._id,
        assignedTo: otherProject.createdBy,
        createdBy: otherProject.createdBy,
        status: 'To Do',
        priority: 'medium',
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      });
      
      // Attempt to assign work item from other project to our test slot
      await expect(
        workItemFromOtherProject.assignToSlot(testSlots[0]._id, otherProject.createdBy)
      ).rejects.toThrow('does not belong to the same project');
      
      // Verify slot remains available
      const slot = await Slot.findById(testSlots[0]._id);
      expect(slot.assignmentStatus).toBe('available');
      expect(slot.assignedWorkItem).toBeNull();
    });
  });
});
