import ProjectCommitment from '../src/models/projectCommitmentModel.js';
import WorkItem from '../src/models/workItemModel.js';

describe('Milestone 4 - Commitments & Deliverables Unit Tests', () => {
  describe('ProjectCommitment Schema Validation', () => {
    test('should require title, owner, and project fields', () => {
      expect(ProjectCommitment.schema.path('title').isRequired).toBe(true);
      expect(ProjectCommitment.schema.path('owner').isRequired).toBe(true);
      expect(ProjectCommitment.schema.path('project').isRequired).toBe(true);
    });

    test('should set default status to proposed', () => {
      const statusPath = ProjectCommitment.schema.path('status');
      expect(statusPath.defaultValue).toBe('proposed');
    });

    test('should validate allowed status enum values', () => {
      const statusPath = ProjectCommitment.schema.path('status');
      expect(statusPath.enumValues).toEqual([
        'proposed',
        'accepted',
        'in_progress',
        'delivered',
        'missed',
        'cancelled'
      ]);
    });
  });

  describe('WorkItem Deliverable Linkage Schema', () => {
    test('should define deliverableId and plannedMonth fields on WorkItem schema', () => {
      expect(WorkItem.schema.path('deliverableId')).toBeDefined();
      expect(WorkItem.schema.path('expectationId')).toBeDefined();
      expect(WorkItem.schema.path('commitmentId')).toBeDefined();
      expect(WorkItem.schema.path('plannedMonth.year')).toBeDefined();
      expect(WorkItem.schema.path('plannedMonth.month')).toBeDefined();
    });
  });
});
