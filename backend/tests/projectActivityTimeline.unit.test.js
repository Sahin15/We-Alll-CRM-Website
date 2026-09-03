import { jest } from '@jest/globals';
import { getProjectActivityLogs } from '../src/controllers/projectActivityController.js';
import ProjectActivityLog from '../src/models/projectActivityLogModel.js';
import Project from '../src/models/projectModel.js';
import Client from '../src/models/clientModel.js';

describe('Milestone 10 - Project Activity Timeline Unit Tests', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('should fetch project activity logs for project member', async () => {
    const mockActivities = [
      {
        _id: '507f1f77bcf86cd799439011',
        action: 'month.submitted',
        message: 'Monthly report submitted for 2026-08',
        createdAt: new Date(),
      },
    ];

    const mockProject = {
      _id: '507f1f77bcf86cd799439012',
      projectHead: '507f1f77bcf86cd799439099',
    };

    jest.spyOn(Project, 'findById').mockResolvedValue(mockProject);
    jest.spyOn(ProjectActivityLog, 'find').mockReturnValue({
      populate: jest.fn().mockReturnThis(),
      sort: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      lean: jest.fn().mockResolvedValue(mockActivities),
    });

    const req = {
      params: { projectId: '507f1f77bcf86cd799439012' },
      user: { _id: '507f1f77bcf86cd799439099', role: 'admin' },
    };
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };

    await getProjectActivityLogs(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      data: mockActivities,
      count: 1,
    });
  });
});
