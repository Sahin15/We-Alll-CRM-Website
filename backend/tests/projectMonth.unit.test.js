import ProjectMonth from '../src/models/projectMonthModel.js';
import { normalizeGoalStatus, normalizeGoals } from '../src/controllers/projectMonthController.js';

describe('Milestone 5 - Monthly Goals & ProjectMonth Unit Tests', () => {
  describe('ProjectMonth Schema Validation', () => {
    test('should require project, periodIdentifier, year, and month fields', () => {
      expect(ProjectMonth.schema.path('project').isRequired).toBe(true);
      expect(ProjectMonth.schema.path('periodIdentifier').isRequired).toBe(true);
      expect(ProjectMonth.schema.path('year').isRequired).toBe(true);
      expect(ProjectMonth.schema.path('month').isRequired).toBe(true);
    });

    test('should set default month status to draft', () => {
      const statusPath = ProjectMonth.schema.path('status');
      expect(statusPath.defaultValue).toBe('draft');
    });

    test('should validate allowed status enum values', () => {
      const statusPath = ProjectMonth.schema.path('status');
      expect(statusPath.enumValues).toEqual([
        'draft',
        'in_progress',
        'submitted',
        'reviewed'
      ]);
    });

    test('should validate goal status enum values used by the UI', () => {
      const goalStatusPath = ProjectMonth.schema.path('goals').schema.path('status');
      expect(goalStatusPath.enumValues).toEqual([
        'open',
        'in_progress',
        'achieved',
        'partially_achieved',
        'missed',
      ]);
      expect(goalStatusPath.defaultValue).toBe('open');
    });
  });

  describe('Goal status normalization', () => {
    test('maps legacy goal statuses to UI values', () => {
      expect(normalizeGoalStatus('planned')).toBe('open');
      expect(normalizeGoalStatus('done')).toBe('achieved');
      expect(normalizeGoalStatus('dropped')).toBe('missed');
    });

    test('preserves current UI goal statuses', () => {
      expect(normalizeGoalStatus('partially_achieved')).toBe('partially_achieved');
      expect(normalizeGoals([{ title: 'Grow leads', status: 'planned' }])[0].status).toBe('open');
    });
  });
});
