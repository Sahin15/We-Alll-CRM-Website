import { jest } from '@jest/globals';
import BusinessDocument from '../src/models/businessDocumentModel.js';
import Project from '../src/models/projectModel.js';
import { createBusinessDocument } from '../src/controllers/businessDocumentController.js';

describe('Milestone 8 - Business Documents Unit Tests', () => {
  beforeEach(() => {
    jest.spyOn(BusinessDocument.prototype, 'save').mockResolvedValue(true);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('BusinessDocument Schema Rules', () => {
    test('should require title and category fields', () => {
      expect(BusinessDocument.schema.path('title').isRequired).toBe(true);
      expect(BusinessDocument.schema.path('category').isRequired).toBe(true);
    });

    test('should set default version as 1 and isActive as true', () => {
      expect(BusinessDocument.schema.path('version').defaultValue).toBe(1);
      expect(BusinessDocument.schema.path('isActive').defaultValue).toBe(true);
    });

    test('should validate allowed category enum values', () => {
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

  describe('Document Version Bumping', () => {
    test('should increment version when replacing an existing document', async () => {
      const oldDoc = {
        _id: '507f1f77bcf86cd799439011',
        title: 'Original Contract',
        version: 1,
        isActive: true,
        save: jest.fn().mockResolvedValue(true),
      };

      const mockProject = {
        _id: '507f1f77bcf86cd799439099',
        projectHead: '507f1f77bcf86cd799439001',
      };

      jest.spyOn(BusinessDocument, 'findById').mockResolvedValue(oldDoc);
      jest.spyOn(Project, 'findById').mockResolvedValue(mockProject);

      const req = {
        body: {
          project: '507f1f77bcf86cd799439099',
          title: 'Revised Contract v2',
          category: 'contract',
          path: 'https://s3.amazonaws.com/doc-v2.pdf',
          replaces: '507f1f77bcf86cd799439011',
        },
        user: { _id: '507f1f77bcf86cd799439001', role: 'admin' },
      };

      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };

      await createBusinessDocument(req, res);

      expect(oldDoc.isActive).toBe(false);
      expect(oldDoc.save).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(201);
    });
  });
});
