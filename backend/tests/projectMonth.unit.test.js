import ProjectMonth from '../src/models/projectMonthModel.js';

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
  });
});
