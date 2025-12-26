/**
 * Project Creation Integration Test
 * 
 * Tests the integration between project creation and slot system
 * to ensure the 500 error is resolved.
 */

import mongoose from 'mongoose';
import Project from '../src/models/projectModel.js';
import Department from '../src/models/departmentModel.js';
import User from '../src/models/userModel.js';
import { createProject } from '../src/controllers/projectController.js';

describe('Project Creation Integration', () => {
  let testDepartment;
  let testUser;
  let mockReq;
  let mockRes;

  beforeAll(async () => {
    // Create test department
    testDepartment = await Department.create({
      name: 'Test Department',
      description: 'Test department for integration tests'
    });

    // Create test user
    testUser = await User.create({
      name: 'Test User',
      email: 'test@example.com',
      role: 'admin',
      password: 'testpassword'
    });
  });

  beforeEach(() => {
    // Mock request and response objects
    mockReq = {
      body: {},
      user: {
        _id: testUser._id,
        id: testUser._id.toString(),
        email: testUser.email,
        role: testUser.role
      }
    };

    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };
  });

  afterAll(async () => {
    // Clean up test data
    await Project.deleteMany({ name: /^Test.*Project/ });
    await Department.findByIdAndDelete(testDepartment._id);
    await User.findByIdAndDelete(testUser._id);
  });

  describe('Project Creation with Slot System', () => {
    test('should create project without slot system (backward compatibility)', async () => {
      mockReq.body = {
        name: 'Test Basic Project',
        description: 'Test project without slot system',
        departments: [testDepartment._id.toString()],
        status: 'Pending',
        startDate: '2024-12-24'
      };

      await createProject(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(201);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Project created successfully',
          project: expect.objectContaining({
            name: 'Test Basic Project',
            slotConfiguration: expect.objectContaining({
              enableSlotSystem: false,
              totalSlots: 10,
              slotType: 'generic'
            }),
            progressTracking: expect.objectContaining({
              calculationMethod: 'manual',
              completedSlots: 0,
              progressPercentage: 0
            })
          })
        })
      );
    });

    test('should create project with slot system enabled', async () => {
      mockReq.body = {
        name: 'Test Slot Project',
        description: 'Test project with slot system',
        departments: [testDepartment._id.toString()],
        status: 'Pending',
        startDate: '2024-12-24',
        enableSlotSystem: true,
        totalSlots: 8,
        slotType: 'milestone',
        calculationMethod: 'slot-based'
      };

      await createProject(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(201);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Project created successfully',
          project: expect.objectContaining({
            name: 'Test Slot Project',
            slotConfiguration: expect.objectContaining({
              enableSlotSystem: true,
              totalSlots: 8,
              slotType: 'milestone',
              autoCreateSlots: true
            }),
            progressTracking: expect.objectContaining({
              calculationMethod: 'slot-based',
              completedSlots: 0,
              totalSlots: 8,
              progressPercentage: 0
            })
          })
        })
      );
    });

    test('should handle missing required fields gracefully', async () => {
      mockReq.body = {
        description: 'Project without name'
      };

      await createProject(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Project name is required'
        })
      );
    });

    test('should handle missing departments gracefully', async () => {
      mockReq.body = {
        name: 'Test Project',
        description: 'Project without departments'
      };

      await createProject(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'At least one service/department is required'
        })
      );
    });

    test('should initialize slot management configuration', async () => {
      mockReq.body = {
        name: 'Test Slot Management Project',
        description: 'Test slot management configuration',
        departments: [testDepartment._id.toString()],
        status: 'Pending',
        startDate: '2024-12-24',
        enableSlotSystem: true,
        totalSlots: 5
      };

      await createProject(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(201);
      
      const responseCall = mockRes.json.mock.calls[0][0];
      expect(responseCall.project.slotManagement).toEqual(
        expect.objectContaining({
          allowSlotReassignment: true,
          requireApprovalForSlotChanges: false,
          slotCompletionRequiresApproval: false,
          autoReleaseOnWorkItemDeletion: true
        })
      );
    });
  });

  describe('Error Handling', () => {
    test('should not throw 500 error when creating project with slot system', async () => {
      mockReq.body = {
        name: 'Test Error Handling Project',
        description: 'Test that 500 error is resolved',
        departments: [testDepartment._id.toString()],
        status: 'Pending',
        startDate: '2024-12-24',
        enableSlotSystem: true,
        totalSlots: 10,
        slotType: 'generic',
        calculationMethod: 'slot-based'
      };

      // This should not throw an error
      await expect(createProject(mockReq, mockRes)).resolves.not.toThrow();

      // Should return success status, not 500
      expect(mockRes.status).toHaveBeenCalledWith(201);
      expect(mockRes.status).not.toHaveBeenCalledWith(500);
    });
  });
});