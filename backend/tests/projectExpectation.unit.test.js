import ProjectExpectation from '../src/models/projectExpectationModel.js';

describe('Milestone 3 - Project Expectations Unit Tests', () => {
  describe('Expectation Status Transition Logic', () => {
    test('should require title and project fields', () => {
      expect(ProjectExpectation.schema.path('title').isRequired).toBe(true);
      expect(ProjectExpectation.schema.path('project').isRequired).toBe(true);
    });

    test('should set default status as open and priority as medium', () => {
      const statusPath = ProjectExpectation.schema.path('status');
      const priorityPath = ProjectExpectation.schema.path('priority');
      expect(statusPath.defaultValue).toBe('open');
      expect(priorityPath.defaultValue).toBe('medium');
    });

    test('should validate allowed status enum values', () => {
      const statusPath = ProjectExpectation.schema.path('status');
      expect(statusPath.enumValues).toEqual([
        'open',
        'in_progress',
        'met',
        'partially_met',
        'dropped'
      ]);
    });

    test('should validate allowed source enum values', () => {
      const sourcePath = ProjectExpectation.schema.path('source');
      expect(sourcePath.enumValues).toEqual([
        'kickoff',
        'email',
        'meeting',
        'whatsapp',
        'brief',
        'other'
      ]);
    });
  });
});
