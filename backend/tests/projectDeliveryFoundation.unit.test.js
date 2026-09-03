import ProjectExpectation from '../src/models/projectExpectationModel.js';
import ProjectCommitment from '../src/models/projectCommitmentModel.js';
import ProjectMonth from '../src/models/projectMonthModel.js';
import BusinessDocument from '../src/models/businessDocumentModel.js';
import ProjectActivityLog from '../src/models/projectActivityLogModel.js';
import Client from '../src/models/clientModel.js';
import Project from '../src/models/projectModel.js';
import WorkItem from '../src/models/workItemModel.js';
import Meeting from '../src/models/meetingModel.js';
import { VALID_PERMISSION_KEYS } from '../src/authz/permissionCatalog.js';
import { LEGACY_ROLE_TO_ACCESS_ROLES } from '../src/authz/legacyRoleMapping.js';

describe('V2 Project Delivery Foundation Models and Permissions', () => {
  describe('ProjectExpectation Schema', () => {
    test('should have required title, project, and client fields', () => {
      expect(ProjectExpectation.schema.path('title').isRequired).toBe(true);
      expect(ProjectExpectation.schema.path('project').isRequired).toBe(true);
      expect(ProjectExpectation.schema.path('client').isRequired).toBe(true);
    });

    test('should have correct status enum values', () => {
      const statusPath = ProjectExpectation.schema.path('status');
      expect(statusPath.enumValues).toEqual([
        'open',
        'in_progress',
        'met',
        'partially_met',
        'dropped'
      ]);
      expect(statusPath.defaultValue).toBe('open');
    });

    test('should have priority and source enums', () => {
      expect(ProjectExpectation.schema.path('priority').enumValues).toEqual([
        'low',
        'medium',
        'high',
        'urgent'
      ]);
      expect(ProjectExpectation.schema.path('source').enumValues).toEqual([
        'kickoff',
        'email',
        'meeting',
        'whatsapp',
        'brief',
        'other'
      ]);
    });
  });

  describe('ProjectCommitment Schema', () => {
    test('should have required title, owner, and project fields', () => {
      expect(ProjectCommitment.schema.path('title').isRequired).toBe(true);
      expect(ProjectCommitment.schema.path('owner').isRequired).toBe(true);
      expect(ProjectCommitment.schema.path('project').isRequired).toBe(true);
    });

    test('should have correct status enum values', () => {
      const statusPath = ProjectCommitment.schema.path('status');
      expect(statusPath.enumValues).toEqual([
        'proposed',
        'accepted',
        'in_progress',
        'delivered',
        'missed',
        'cancelled'
      ]);
      expect(statusPath.defaultValue).toBe('proposed');
    });
  });

  describe('ProjectMonth Schema', () => {
    test('should require project, year, month, and periodIdentifier', () => {
      expect(ProjectMonth.schema.path('project').isRequired).toBe(true);
      expect(ProjectMonth.schema.path('year').isRequired).toBe(true);
      expect(ProjectMonth.schema.path('month').isRequired).toBe(true);
      expect(ProjectMonth.schema.path('periodIdentifier').isRequired).toBe(true);
    });

    test('should validate month range between 1 and 12', () => {
      const monthPath = ProjectMonth.schema.path('month');
      expect(monthPath.options.min).toBe(1);
      expect(monthPath.options.max).toBe(12);
    });

    test('should have draft as default status', () => {
      const statusPath = ProjectMonth.schema.path('status');
      expect(statusPath.enumValues).toEqual(['draft', 'in_progress', 'submitted', 'reviewed']);
      expect(statusPath.defaultValue).toBe('draft');
    });
  });

  describe('BusinessDocument Schema', () => {
    test('should have required title and category', () => {
      expect(BusinessDocument.schema.path('title').isRequired).toBe(true);
      expect(BusinessDocument.schema.path('category').isRequired).toBe(true);
    });

    test('should support specific business categories', () => {
      const categoryPath = BusinessDocument.schema.path('category');
      expect(categoryPath.enumValues).toEqual([
        'contract',
        'proposal',
        'requirement',
        'client_brief',
        'design',
        'technical',
        'approval',
        'meeting',
        'report',
        'invoice',
        'other'
      ]);
    });
  });

  describe('Client Schema Extensions', () => {
    test('should contain contacts array', () => {
      const contactsPath = Client.schema.path('contacts');
      expect(contactsPath).toBeDefined();
      expect(contactsPath.caster).toBeDefined();
    });

    test('should enforce required contact fields', () => {
      const contactsSchema = Client.schema.path('contacts').schema;
      expect(contactsSchema.path('name').isRequired).toBe(true);
      expect(contactsSchema.path('type').isRequired).toBe(true);
      expect(contactsSchema.path('value').isRequired).toBe(true);
    });

    test('should restrict contact communication types', () => {
      const contactsSchema = Client.schema.path('contacts').schema;
      expect(contactsSchema.path('type').enumValues).toEqual(['Phone', 'Email', 'WhatsApp']);
    });
  });

  describe('Project Schema Extensions', () => {
    test('should contain deliverables and milestones arrays with V2 fields', () => {
      const deliverablesSchema = Project.schema.path('deliverables').schema;
      expect(deliverablesSchema.path('owner')).toBeDefined();
      expect(deliverablesSchema.path('priority').enumValues).toEqual(['low', 'medium', 'high', 'urgent']);
      expect(deliverablesSchema.path('plannedDate')).toBeDefined();
      expect(deliverablesSchema.path('monthKey')).toBeDefined();

      const milestonesSchema = Project.schema.path('milestones').schema;
      expect(milestonesSchema.path('owner')).toBeDefined();
      expect(milestonesSchema.path('deliverableIds')).toBeDefined();
      expect(milestonesSchema.path('notes')).toBeDefined();
    });

    test('should include Completed in status options', () => {
      const statusPath = Project.schema.path('status');
      expect(statusPath.enumValues).toContain('Completed');
    });
  });

  describe('WorkItem and Meeting Extensions', () => {
    test('should contain link fields for expectations, commitments, and deliverables', () => {
      expect(WorkItem.schema.path('deliverableId')).toBeDefined();
      expect(WorkItem.schema.path('expectationId')).toBeDefined();
      expect(WorkItem.schema.path('commitmentId')).toBeDefined();
      expect(WorkItem.schema.path('plannedMonth.year')).toBeDefined();
      expect(WorkItem.schema.path('plannedMonth.month')).toBeDefined();
    });

    test('should contain client and project links on meetings', () => {
      expect(Meeting.schema.path('client')).toBeDefined();
      expect(Meeting.schema.path('project')).toBeDefined();
      expect(Meeting.schema.path('projectMonthKey')).toBeDefined();
    });
  });

  describe('Permission Registry V2 updates', () => {
    test('should register 5 new keys in permission catalog', () => {
      expect(VALID_PERMISSION_KEYS.has('projects.report.view')).toBe(true);
      expect(VALID_PERMISSION_KEYS.has('projects.report.manage')).toBe(true);
      expect(VALID_PERMISSION_KEYS.has('projects.report.approve')).toBe(true);
      expect(VALID_PERMISSION_KEYS.has('projects.document.view')).toBe(true);
      expect(VALID_PERMISSION_KEYS.has('projects.document.manage')).toBe(true);
    });

    test('should map new keys to legacy role mappings', () => {
      // Admin should have all five
      const adminGrants = LEGACY_ROLE_TO_ACCESS_ROLES.admin[0].grants;
      const adminPermissions = adminGrants.map(g => g.permission);
      expect(adminPermissions).toContain('projects.report.view');
      expect(adminPermissions).toContain('projects.report.manage');
      expect(adminPermissions).toContain('projects.report.approve');
      expect(adminPermissions).toContain('projects.document.view');
      expect(adminPermissions).toContain('projects.document.manage');

      // Employee should have standard standard report and document views
      const employeeGrants = LEGACY_ROLE_TO_ACCESS_ROLES.employee[0].grants;
      const employeePermissions = employeeGrants.map(g => g.permission);
      expect(employeePermissions).toContain('projects.report.view');
      expect(employeePermissions).toContain('projects.document.view');
    });
  });
});
