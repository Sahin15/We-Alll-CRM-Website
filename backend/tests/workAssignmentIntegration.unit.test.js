import { jest } from '@jest/globals';
import WorkItem from '../src/models/workItemModel.js';
import { reassignWorkItem } from '../src/controllers/workItemController.js';
import User from '../src/models/userModel.js';
import Project from '../src/models/projectModel.js';

describe('Milestone 9 - Work Assignment Integration Unit Tests', () => {
  beforeEach(() => {
    jest.spyOn(WorkItem.prototype, 'save').mockResolvedValue(true);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('WorkItem V2 Schema Links', () => {
    test('should support deliverableId, expectationId, commitmentId, plannedMonth, and delayReason schema fields', () => {
      expect(WorkItem.schema.path('deliverableId')).toBeDefined();
      expect(WorkItem.schema.path('expectationId')).toBeDefined();
      expect(WorkItem.schema.path('commitmentId')).toBeDefined();
      expect(WorkItem.schema.path('plannedMonth.year')).toBeDefined();
      expect(WorkItem.schema.path('plannedMonth.month')).toBeDefined();
      expect(WorkItem.schema.path('delayReason')).toBeDefined();
    });
  });

  describe('Reassign Work Item Route Contract', () => {
    test('should reassign work item to new user via PUT contract', async () => {
      const mockWorkItem = {
        _id: '507f1f77bcf86cd799439011',
        title: 'Task 1',
        project: '507f1f77bcf86cd799439012',
        assignedTo: { _id: '507f1f77bcf86cd799439001', name: 'Old Assignee' },
        status: 'In Progress',
        save: jest.fn().mockResolvedValue(true),
        populate: jest.fn().mockReturnThis(),
        execPopulate: jest.fn().mockResolvedValue(true),
        then: function (resolve) {
          resolve(this);
        },
      };

      const mockUser = {
        _id: '507f1f77bcf86cd799439002',
        name: 'New Assignee',
        select: jest.fn().mockResolvedValue({ _id: '507f1f77bcf86cd799439002', name: 'New Assignee' }),
      };

      const mockProject = {
        _id: '507f1f77bcf86cd799439012',
        projectHead: '507f1f77bcf86cd799439099',
      };

      const queryMock = {
        populate: jest.fn().mockReturnThis(),
        then: function (resolve) {
          resolve(mockWorkItem);
        },
      };

      jest.spyOn(WorkItem, 'findById').mockReturnValue(queryMock);
      jest.spyOn(User, 'findById').mockReturnValue(mockUser);
      jest.spyOn(Project, 'findById').mockResolvedValue(mockProject);

      const req = {
        params: { id: '507f1f77bcf86cd799439011' },
        body: { newAssigneeId: '507f1f77bcf86cd799439002' },
        user: { _id: '507f1f77bcf86cd799439099', role: 'admin' },
      };

      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };

      await reassignWorkItem(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(mockWorkItem.assignedTo).toBe('507f1f77bcf86cd799439002');
      expect(mockWorkItem.save).toHaveBeenCalled();
    });
  });
});
