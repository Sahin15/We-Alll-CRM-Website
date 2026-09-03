import { filterProjectsVisibleToUser } from '../src/services/resourceVisibilityService.js';

describe('Milestone 2 - Client Enhancements Unit Tests', () => {
  describe('Contact Validation Logic', () => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    test('should validate contact fields correctly', () => {
      const validContact = {
        name: 'John Doe',
        designation: 'CEO',
        type: 'Email',
        value: 'john@example.com',
        label: 'Primary',
        isPrimary: true,
      };

      expect(validContact.name.trim()).not.toBe('');
      expect(['Phone', 'Email', 'WhatsApp']).toContain(validContact.type);
      expect(emailRegex.test(validContact.value)).toBe(true);
    });

    test('should reject invalid email format for Email contact type', () => {
      const invalidEmailContact = {
        name: 'Jane Doe',
        type: 'Email',
        value: 'not-an-email',
      };

      expect(emailRegex.test(invalidEmailContact.value)).toBe(false);
    });
  });

  describe('Project Summary Grouping Logic', () => {
    test('should correctly filter and group projects by status', () => {
      const user = { _id: 'user1', role: 'admin' };
      const rawProjects = [
        { _id: 'p1', name: 'Project 1', status: 'Active' },
        { _id: 'p2', name: 'Project 2', status: 'On Hold' },
        { _id: 'p3', name: 'Project 3', status: 'Completed' },
        { _id: 'p4', name: 'Project 4', status: 'Pending' },
      ];

      const visibleProjects = filterProjectsVisibleToUser(user, rawProjects);
      expect(visibleProjects.length).toBe(4);

      const active = visibleProjects.filter(p => p.status === 'Active');
      const onHold = visibleProjects.filter(p => p.status === 'On Hold');
      const completed = visibleProjects.filter(p => p.status === 'Completed');
      const pending = visibleProjects.filter(p => p.status === 'Pending');

      expect(active.length).toBe(1);
      expect(onHold.length).toBe(1);
      expect(completed.length).toBe(1);
      expect(pending.length).toBe(1);
    });
  });
});
