import { jest } from '@jest/globals';
import { submitProjectMonthReport, reviewProjectMonthReport } from '../src/controllers/projectMonthController.js';
import ProjectMonth from '../src/models/projectMonthModel.js';
import Project from '../src/models/projectModel.js';
import WorkItem from '../src/models/workItemModel.js';
import ProjectActivityLog from '../src/models/projectActivityLogModel.js';

describe('Milestone 7 - Monthly Report Submission & Review Unit Tests', () => {
  beforeEach(() => {
    jest.spyOn(ProjectActivityLog, 'create').mockResolvedValue({});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('should submit report and freeze autoSnapshot', async () => {
    const mockProject = {
      _id: '507f1f77bcf86cd799439012',
      projectHead: '507f1f77bcf86cd799439099',
      deliverables: [],
    };

    const mockProjectMonth = {
      _id: '507f1f77bcf86cd799439011',
      project: '507f1f77bcf86cd799439012',
      periodIdentifier: '2026-08',
      status: 'draft',
      toObject: function () {
        return { ...this };
      },
      save: jest.fn().mockResolvedValue(true),
    };

    jest.spyOn(Project, 'findById').mockResolvedValue(mockProject);
    jest.spyOn(ProjectMonth, 'findById').mockResolvedValue(mockProjectMonth);
    jest.spyOn(WorkItem, 'find').mockReturnValue({
      lean: jest.fn().mockResolvedValue([]),
    });

    const req = {
      params: { id: '507f1f77bcf86cd799439011' },
      user: { _id: '507f1f77bcf86cd799439099', role: 'admin' },
    };
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };

    await submitProjectMonthReport(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(mockProjectMonth.status).toBe('submitted');
    expect(mockProjectMonth.autoSnapshot).toBeDefined();
    expect(mockProjectMonth.save).toHaveBeenCalled();
  });

  test('should review report and append management comments', async () => {
    const mockProject = {
      _id: '507f1f77bcf86cd799439012',
      projectHead: '507f1f77bcf86cd799439099',
      deliverables: [],
    };

    const mockProjectMonth = {
      _id: '507f1f77bcf86cd799439011',
      project: '507f1f77bcf86cd799439012',
      periodIdentifier: '2026-08',
      status: 'submitted',
      managementComments: [],
      toObject: function () {
        return { ...this };
      },
      save: jest.fn().mockResolvedValue(true),
    };

    jest.spyOn(Project, 'findById').mockResolvedValue(mockProject);
    jest.spyOn(ProjectMonth, 'findById').mockResolvedValue(mockProjectMonth);

    const req = {
      params: { id: '507f1f77bcf86cd799439011' },
      body: { comment: 'Great execution quality on August goals!' },
      user: { _id: '507f1f77bcf86cd799439099', role: 'admin' },
    };
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };

    await reviewProjectMonthReport(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(mockProjectMonth.status).toBe('reviewed');
    expect(mockProjectMonth.managementComments.length).toBe(1);
    expect(mockProjectMonth.managementComments[0].comment).toBe('Great execution quality on August goals!');
  });
});
