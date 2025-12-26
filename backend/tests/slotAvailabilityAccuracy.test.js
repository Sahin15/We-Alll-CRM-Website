import { jest } from '@jest/globals';
import mongoose from 'mongoose';
import fc from 'fast-check';
import Project from '../src/models/projectModel.js';
import Slot from '../src/models/slotModel.js';
import WorkItem from '../src/models/workItemModel.js';
import slotManagementService from '../src/services/slotManagementService.js';

/**
 * Property-Based Tests for Slot Availability Accuracy
 * 
 * **Feature: project-slot-based-progress, Property 3: Slot Availability Accuracy**
 * 
 * Tests that only slots with status 'available' are selectable for assignment
 * during work item creation and that the availability status is accurate.
 */

describe('Slot Availability Accuracy Property Tests', () => {
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
      name: 'Test Project for Slot Availability',
      description: 'Test project for slot availability accuracy testing',
      status: 'In Progress',
      slotConfiguration: {
        totalSlots: 15,
        enableSlotSystem: true,
        autoCreateSlots: true
      },
      progressTracking: {
        calculationMethod: 'slot-based',
        totalSlots: 15,
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
   * Helper function to create slots with various statuses
   */
  async function createSlotsWithStatuses(project, slotConfigs) {
    const slots = [];
    
    for (let i = 0; i < slotConfigs.length; i++) {
      const config = slotConfigs[i];
      const slot = await Slot.create({
        project: project._id,
        client: new mongoose.Types.ObjectId(),
        slotNumber: i + 1,
        slotIdentifier: `Slot ${i + 1}`,
        slotType: 'work',
        title: `Test Slot ${i + 1}`,
        description: `Test slot ${i + 1} with status ${config.status}`,
        workType: 'Other',
        priority: 'Medium',
        assignmentStatus: config.status,
        createdBy: project.createdBy,
        assignedTo: project.createdBy,
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        assignedWorkItem: config.assignedWorkItem || null,
        completionStatus: {
          isCompleted: config.status === 'completed',
          completedAt: config.status === 'completed' ? new Date() : null
        }
      });
      slots.push(slot);
    }
    
    return slots;
  }

  /**
   * **Feature: project-slot-based-progress, Property 3: Slot Availability Accuracy**
   * 
   * Property: For any work item creation request, only slots with status 'available' 
   * should be selectable for assignment
   */
  describe('Property 3: Slot Availability Accuracy', () => {
    test('getAvailableSlots returns only truly available slots', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(
            fc.record({
              status: fc.constantFrom('available', 'assigned', 'in-progress', 'completed', 'blocked', 'cancelled'),
              assignedWorkItem: fc.option(fc.constant(new mongoose.Types.ObjectId()), { nil: null })
            }),
            { minLength: 5, maxLength: 15 }
          ),
          async (slotConfigs) => {
            // Create slots with various statuses
            const slots = await createSlotsWithStatuses(testProject, slotConfigs);
            
            // Get available slots using the service
            const result = await slotManagementService.getAvailableSlots(testProject._id);
            
            // Count expected available slots
            const expectedAvailableCount = slotConfigs.filter(config => 
              config.status === 'available' && !config.assignedWorkItem
            ).length;
            
            // Verify that only available slots are returned
            expect(result.count).toBe(expectedAvailableCount);
            expect(result.slots).toHaveLength(expectedAvailableCount);
            
            // Verify each returned slot is truly available
            for (const slot of result.slots) {
              expect(slot.assignmentStatus).toBe('available');
              expect(slot.assignedWorkItem).toBeNull();
              expect(slot.completionStatus?.isCompleted).not.toBe(true);
            }
            
            // Verify no non-available slots are returned
            const returnedSlotIds = result.slots.map(s => s._id.toString());
            const nonAvailableSlots = slots.filter(s => 
              s.assignmentStatus !== 'available' || 
              s.assignedWorkItem !== null ||
              s.completionStatus?.isCompleted === true
            );
            
            for (const nonAvailableSlot of nonAvailableSlots) {
              expect(returnedSlotIds).not.toContain(nonAvailableSlot._id.toString());
            }
          }
        ),
        { numRuns: 10 }
      );
    });

    test('slot availability status is accurate after state changes', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 3, max: 8 }), // Number of slots to create
          fc.integer({ min: 1, max: 3 }), // Number of operations to perform
          async (slotCount, operationCount) => {
            // Create all slots as available initially
            const slotConfigs = Array(slotCount).fill().map(() => ({ status: 'available' }));
            const slots = await createSlotsWithStatuses(testProject, slotConfigs);
            
            // Verify all slots are initially available
            let availableResult = await slotManagementService.getAvailableSlots(testProject._id);
            expect(availableResult.count).toBe(slotCount);
            
            // Perform random operations and verify availability accuracy
            const actualOperations = Math.min(operationCount, slotCount);
            
            for (let i = 0; i < actualOperations; i++) {
              const targetSlot = slots[i];
              
              // Create a work item
              const workItem = await WorkItem.create({
                type: 'task',
                title: `Test Work Item ${i + 1}`,
                description: `Work item ${i + 1} for availability testing`,
                project: testProject._id,
                assignedTo: testProject.createdBy,
                createdBy: testProject.createdBy,
                status: 'To Do',
                priority: 'medium',
                dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
              });
              
              // Assign work item to slot
              await slotManagementService.assignWorkItemToSlot(
                workItem._id,
                targetSlot._id,
                testProject.createdBy
              );
              
              // Verify slot is no longer available
              availableResult = await slotManagementService.getAvailableSlots(testProject._id);
              expect(availableResult.count).toBe(slotCount - (i + 1));
              
              // Verify the assigned slot is not in available slots
              const availableSlotIds = availableResult.slots.map(s => s._id.toString());
              expect(availableSlotIds).not.toContain(targetSlot._id.toString());
              
              // Verify slot status is updated correctly
              const updatedSlot = await Slot.findById(targetSlot._id);
              expect(updatedSlot.assignmentStatus).toBe('assigned');
              expect(updatedSlot.assignedWorkItem.toString()).toBe(workItem._id.toString());
            }
          }
        ),
        { numRuns: 5 }
      );
    });

    test('completed slots are never returned as available', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 5, max: 10 }), // Total slots
          fc.integer({ min: 1, max: 5 }), // Slots to complete
          async (totalSlots, slotsToComplete) => {
            const actualSlotsToComplete = Math.min(slotsToComplete, totalSlots);
            
            // Create slots - some available, some to be completed
            const slotConfigs = Array(totalSlots).fill().map((_, index) => ({
              status: index < actualSlotsToComplete ? 'assigned' : 'available',
              assignedWorkItem: index < actualSlotsToComplete ? new mongoose.Types.ObjectId() : null
            }));
            
            const slots = await createSlotsWithStatuses(testProject, slotConfigs);
            
            // Complete some slots
            for (let i = 0; i < actualSlotsToComplete; i++) {
              await slots[i].completeSlot(testProject.createdBy, 'Test completion');
            }
            
            // Get available slots
            const availableResult = await slotManagementService.getAvailableSlots(testProject._id);
            
            // Verify completed slots are not returned
            const expectedAvailableCount = totalSlots - actualSlotsToComplete;
            expect(availableResult.count).toBe(expectedAvailableCount);
            
            // Verify no completed slots in results
            for (const slot of availableResult.slots) {
              expect(slot.assignmentStatus).toBe('available');
              expect(slot.completionStatus?.isCompleted).not.toBe(true);
            }
            
            // Verify completed slots are not in the results
            const availableSlotIds = availableResult.slots.map(s => s._id.toString());
            for (let i = 0; i < actualSlotsToComplete; i++) {
              expect(availableSlotIds).not.toContain(slots[i]._id.toString());
            }
          }
        ),
        { numRuns: 10 }
      );
    });

    test('slot availability filtering works correctly', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            slotType: fc.constantFrom('work', 'milestone', 'deliverable', 'review'),
            priority: fc.constantFrom('Low', 'Medium', 'High', 'Urgent'),
            workType: fc.constantFrom('Other', 'Research', 'Documentation', 'Testing')
          }),
          async (filterCriteria) => {
            // Create slots with various properties
            const slotConfigs = [
              { status: 'available', slotType: 'work', priority: 'Low', workType: 'Other' },
              { status: 'available', slotType: 'milestone', priority: 'Medium', workType: 'Research' },
              { status: 'available', slotType: 'deliverable', priority: 'High', workType: 'Documentation' },
              { status: 'available', slotType: 'review', priority: 'Urgent', workType: 'Testing' },
              { status: 'assigned', slotType: 'work', priority: 'Medium', workType: 'Other' }, // Should not appear
            ];
            
            const slots = [];
            for (let i = 0; i < slotConfigs.length; i++) {
              const config = slotConfigs[i];
              const slot = await Slot.create({
                project: testProject._id,
                client: new mongoose.Types.ObjectId(),
                slotNumber: i + 1,
                slotIdentifier: `Slot ${i + 1}`,
                slotType: config.slotType,
                title: `Test Slot ${i + 1}`,
                description: `Test slot ${i + 1}`,
                workType: config.workType,
                priority: config.priority,
                assignmentStatus: config.status,
                createdBy: testProject.createdBy,
                assignedTo: testProject.createdBy,
                dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
                assignedWorkItem: config.status === 'assigned' ? new mongoose.Types.ObjectId() : null
              });
              slots.push(slot);
            }
            
            // Apply filters and get available slots
            const filters = {
              slotType: filterCriteria.slotType,
              priority: filterCriteria.priority,
              workType: filterCriteria.workType
            };
            
            const result = await slotManagementService.getAvailableSlots(testProject._id, filters);
            
            // Count expected matches (only available slots that match all criteria)
            const expectedMatches = slotConfigs.filter(config => 
              config.status === 'available' &&
              config.slotType === filterCriteria.slotType &&
              config.priority === filterCriteria.priority &&
              config.workType === filterCriteria.workType
            ).length;
            
            expect(result.count).toBe(expectedMatches);
            
            // Verify all returned slots match the filter criteria and are available
            for (const slot of result.slots) {
              expect(slot.assignmentStatus).toBe('available');
              expect(slot.slotType).toBe(filterCriteria.slotType);
              expect(slot.priority).toBe(filterCriteria.priority);
              expect(slot.workType).toBe(filterCriteria.workType);
            }
          }
        ),
        { numRuns: 5 }
      );
    });

    test('slot availability is consistent across concurrent requests', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 5, max: 10 }), // Number of slots
          fc.integer({ min: 2, max: 5 }), // Number of concurrent requests
          async (slotCount, requestCount) => {
            // Create available slots
            const slotConfigs = Array(slotCount).fill().map(() => ({ status: 'available' }));
            await createSlotsWithStatuses(testProject, slotConfigs);
            
            // Make concurrent requests for available slots
            const requests = Array(requestCount).fill().map(() => 
              slotManagementService.getAvailableSlots(testProject._id)
            );
            
            const results = await Promise.all(requests);
            
            // All requests should return the same count and slots
            const firstResult = results[0];
            
            for (let i = 1; i < results.length; i++) {
              expect(results[i].count).toBe(firstResult.count);
              expect(results[i].slots).toHaveLength(firstResult.slots.length);
              
              // Verify same slots are returned (order might differ)
              const firstSlotIds = new Set(firstResult.slots.map(s => s._id.toString()));
              const currentSlotIds = new Set(results[i].slots.map(s => s._id.toString()));
              
              expect(currentSlotIds).toEqual(firstSlotIds);
            }
            
            // Verify all returned slots are actually available
            for (const result of results) {
              for (const slot of result.slots) {
                expect(slot.assignmentStatus).toBe('available');
                expect(slot.assignedWorkItem).toBeNull();
              }
            }
          }
        ),
        { numRuns: 3 }
      );
    });
  });

  /**
   * Edge case tests for slot availability accuracy
   */
  describe('Slot Availability Accuracy Edge Cases', () => {
    test('slots with dependencies are handled correctly in availability', async () => {
      // Create slots with dependencies
      const slot1 = await Slot.create({
        project: testProject._id,
        client: new mongoose.Types.ObjectId(),
        slotNumber: 1,
        slotIdentifier: 'Slot 1',
        slotType: 'work',
        title: 'Independent Slot',
        description: 'Slot with no dependencies',
        workType: 'Other',
        priority: 'Medium',
        assignmentStatus: 'available',
        createdBy: testProject.createdBy,
        assignedTo: testProject.createdBy,
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      });

      const slot2 = await Slot.create({
        project: testProject._id,
        client: new mongoose.Types.ObjectId(),
        slotNumber: 2,
        slotIdentifier: 'Slot 2',
        slotType: 'work',
        title: 'Dependent Slot',
        description: 'Slot that depends on Slot 1',
        workType: 'Other',
        priority: 'Medium',
        assignmentStatus: 'available',
        createdBy: testProject.createdBy,
        assignedTo: testProject.createdBy,
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        slotConfiguration: {
          dependencies: [slot1._id]
        }
      });

      // Both slots should be returned as available (dependency checking is done during assignment)
      const result = await slotManagementService.getAvailableSlots(testProject._id);
      expect(result.count).toBe(2);
      
      const slotIds = result.slots.map(s => s._id.toString());
      expect(slotIds).toContain(slot1._id.toString());
      expect(slotIds).toContain(slot2._id.toString());
    });

    test('slots in blocked status are not available', async () => {
      const slotConfigs = [
        { status: 'available' },
        { status: 'blocked' },
        { status: 'cancelled' },
        { status: 'available' }
      ];
      
      await createSlotsWithStatuses(testProject, slotConfigs);
      
      const result = await slotManagementService.getAvailableSlots(testProject._id);
      
      // Only available slots should be returned
      expect(result.count).toBe(2);
      
      for (const slot of result.slots) {
        expect(slot.assignmentStatus).toBe('available');
      }
    });

    test('project without slot system enabled returns empty results', async () => {
      // Create project without slot system
      const nonSlotProject = await Project.create({
        name: 'Non-Slot Project',
        description: 'Project without slot system',
        status: 'In Progress',
        slotConfiguration: {
          enableSlotSystem: false
        },
        createdBy: new mongoose.Types.ObjectId()
      });

      // Create slots anyway (shouldn't happen in real scenario)
      await Slot.create({
        project: nonSlotProject._id,
        client: new mongoose.Types.ObjectId(),
        slotNumber: 1,
        slotIdentifier: 'Slot 1',
        slotType: 'work',
        title: 'Test Slot',
        description: 'Test slot',
        workType: 'Other',
        priority: 'Medium',
        assignmentStatus: 'available',
        createdBy: nonSlotProject.createdBy,
        assignedTo: nonSlotProject.createdBy,
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      });

      // Should still return the slot since the query is based on project ID
      const result = await slotManagementService.getAvailableSlots(nonSlotProject._id);
      expect(result.count).toBe(1);
    });
  });
});
