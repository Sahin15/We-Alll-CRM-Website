import { jest } from '@jest/globals';
import { calculateMonthProgress } from '../src/services/projectMonthProgressService.js';
import Project from '../src/models/projectModel.js';
import WorkItem from '../src/models/workItemModel.js';

describe('Milestone 6 - Monthly Progress Service Unit Tests', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('should export calculateMonthProgress function', () => {
    expect(typeof calculateMonthProgress).toBe('function');
  });

  test('should throw error if project not found', async () => {
    jest.spyOn(Project, 'findById').mockResolvedValue(null);
    await expect(calculateMonthProgress('507f1f77bcf86cd799439011', '2026-08')).rejects.toThrow(
      'Project not found'
    );
  });

  test('should calculate deliverable achievement percentage and health status', async () => {
    const mockProject = {
      _id: '507f1f77bcf86cd799439011',
      deliverables: [
        { title: 'Del 1', status: 'approved', monthKey: '2026-08' },
        { title: 'Del 2', status: 'delivered', monthKey: '2026-08' },
        { title: 'Del 3', status: 'pending', monthKey: '2026-08' },
      ],
    };

    jest.spyOn(Project, 'findById').mockResolvedValue(mockProject);
    jest.spyOn(WorkItem, 'find').mockReturnValue({
      lean: jest.fn().mockResolvedValue([]),
    });

    const result = await calculateMonthProgress('507f1f77bcf86cd799439011', '2026-08');

    expect(result.totalPlannedDeliverables).toBe(3);
    expect(result.completedDeliverables).toBe(2);
    expect(result.deliverableAchievementPercent).toBe(67);
    expect(result.achievementPercent).toBe(67);
    expect(result.healthStatus).toBe('at_risk');
  });
});
