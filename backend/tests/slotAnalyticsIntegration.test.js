import request from 'supertest';
import mongoose from 'mongoose';
import app from '../src/server.js';
import User from '../src/models/userModel.js';
import Project from '../src/models/projectModel.js';
import Slot from '../src/models/slotModel.js';
import WorkCalendar from '../src/models/workCalendarModel.js';
import jwt from 'jsonwebtoken';

describe('Slot Analytics Integration Tests', () => {
  let adminToken;
  let adminUser;
  let testProject;
  let testSlots;

  beforeAll(async () => {
    // Connect to test database
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(process.env.MONGODB_URI_TEST || 'mongodb://localhost:27017/crm_test');
    }
  });

  beforeEach(async () => {
    // Clean up database
    await User.deleteMany({});
    await Project.deleteMany({});
    await Slot.deleteMany({});
    await WorkCalendar.deleteMany({});

    // Create admin user
    adminUser = await User.create({
      name: 'Admin User',
      email: 'admin@test.com',
      password: 'password123',
      role: 'admin',
      isActive: true
    });

    // Generate admin token
    adminToken = jwt.sign(
      { id: adminUser._id, email: adminUser.email, role: adminUser.role },
      process.env.JWT_SECRET || 'test-secret',
      { expiresIn: '1h' }
    );

    // Create test project with slot configuration
    testProject = await Project.create({
      name: 'Test Project',
      description: 'Test project for slot analytics',
      status: 'active',
      createdBy: adminUser._id,
      projectHead: adminUser._id,
      slotConfiguration: {
        enableSlotSystem: true,
        totalSlots: 10,
        slotType: 'generic',
        allowDynamicSlots: true,
        slotNamingPattern: 'Slot {number}',
        autoCreateSlots: true
      },
      progressTracking: {
        calculationMethod: 'slot-based',
        completedSlots: 0,
        totalSlots: 10,
        progressPercentage: 0
      }
    });

    // Create test slots with different statuses
    testSlots = await Slot.insertMany([
      {
        project: testProject._id,
        slotNumber: 1,
        slotIdentifier: 'Slot 1',
        slotType: 'work',
        title: 'Test Slot 1',
        assignmentStatus: 'available',
        createdBy: adminUser._id,
        assignedTo: adminUser._id
      },
      {
        project: testProject._id,
        slotNumber: 2,
        slotIdentifier: 'Slot 2',
        slotType: 'work',
        title: 'Test Slot 2',
        assignmentStatus: 'assigned',
        createdBy: adminUser._id,
        assignedTo: adminUser._id
      },
      {
        project: testProject._id,
        slotNumber: 3,
        slotIdentifier: 'Slot 3',
        slotType: 'work',
        title: 'Test Slot 3',
        assignmentStatus: 'in-progress',
        createdBy: adminUser._id,
        assignedTo: adminUser._id
      },
      {
        project: testProject._id,
        slotNumber: 4,
        slotIdentifier: 'Slot 4',
        slotType: 'work',
        title: 'Test Slot 4',
        assignmentStatus: 'completed',
        createdBy: adminUser._id,
        assignedTo: adminUser._id,
        completionStatus: {
          isCompleted: true,
          completedAt: new Date(),
          completedBy: adminUser._id
        }
      },
      {
        project: testProject._id,
        slotNumber: 5,
        slotIdentifier: 'Slot 5',
        slotType: 'work',
        title: 'Test Slot 5',
        assignmentStatus: 'blocked',
        createdBy: adminUser._id,
        assignedTo: adminUser._id
      }
    ]);

    // Create work calendar entries for the project
    await WorkCalendar.create({
      project: testProject._id,
      assignedTo: adminUser._id,
      title: 'Test Work Entry',
      description: 'Test work entry for analytics',
      startDate: new Date(),
      endDate: new Date(Date.now() + 24 * 60 * 60 * 1000),
      status: 'in-progress',
      workType: 'Development',
      priority: 'Medium',
      createdBy: adminUser._id
    });
  });

  afterAll(async () => {
    // Clean up and close connection
    await User.deleteMany({});
    await Project.deleteMany({});
    await Slot.deleteMany({});
    await WorkCalendar.deleteMany({});
    await mongoose.connection.close();
  });

  describe('GET /api/work-calendar/admin/slot-analytics', () => {
    test('should return slot analytics for admin user', async () => {
      const response = await request(app)
        .get('/api/work-calendar/admin/slot-analytics')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      
      // Check overall metrics
      const overall = response.body.data.overall;
      expect(overall).toBeDefined();
      expect(overall.totalSlots).toBe(5);
      expect(overall.availableSlots).toBe(1);
      expect(overall.assignedSlots).toBe(1);
      expect(overall.inProgressSlots).toBe(1);
      expect(overall.completedSlots).toBe(1);
      expect(overall.blockedSlots).toBe(1);
      expect(overall.slotUtilizationRate).toBeGreaterThan(0);
      expect(overall.slotCompletionRate).toBeGreaterThan(0);
    });

    test('should return project-level slot breakdown', async () => {
      const response = await request(app)
        .get('/api/work-calendar/admin/slot-analytics')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      const byProject = response.body.data.byProject;
      expect(byProject).toBeDefined();
      expect(Array.isArray(byProject)).toBe(true);
      expect(byProject.length).toBeGreaterThan(0);

      const projectData = byProject[0];
      expect(projectData.projectName).toBe('Test Project');
      expect(projectData.totalSlots).toBe(5);
      expect(projectData.slotCompletionRate).toBeDefined();
      expect(projectData.slotUtilizationRate).toBeDefined();
    });

    test('should return slot status distribution', async () => {
      const response = await request(app)
        .get('/api/work-calendar/admin/slot-analytics')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      const statusDistribution = response.body.data.slotStatusDistribution;
      expect(statusDistribution).toBeDefined();
      expect(Array.isArray(statusDistribution)).toBe(true);
      expect(statusDistribution.length).toBeGreaterThan(0);

      // Check that all status types are represented
      const statusNames = statusDistribution.map(item => item.status);
      expect(statusNames).toContain('available');
      expect(statusNames).toContain('assigned');
      expect(statusNames).toContain('in-progress');
      expect(statusNames).toContain('completed');
      expect(statusNames).toContain('blocked');
    });

    test('should return completion trends when available', async () => {
      const response = await request(app)
        .get('/api/work-calendar/admin/slot-analytics')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      const completionTrends = response.body.data.completionTrends;
      expect(completionTrends).toBeDefined();
      expect(Array.isArray(completionTrends)).toBe(true);
    });

    test('should return bottleneck analysis for projects with blocked slots', async () => {
      const response = await request(app)
        .get('/api/work-calendar/admin/slot-analytics')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      const bottleneckAnalysis = response.body.data.bottleneckAnalysis;
      expect(bottleneckAnalysis).toBeDefined();
      expect(Array.isArray(bottleneckAnalysis)).toBe(true);
      
      if (bottleneckAnalysis.length > 0) {
        const bottleneck = bottleneckAnalysis[0];
        expect(bottleneck.projectName).toBeDefined();
        expect(bottleneck.blockedRatio).toBeGreaterThan(0);
        expect(bottleneck.totalSlots).toBeGreaterThan(0);
        expect(bottleneck.blockedSlots).toBeGreaterThan(0);
      }
    });

    test('should support filtering by project', async () => {
      const response = await request(app)
        .get('/api/work-calendar/admin/slot-analytics')
        .query({ project: testProject._id.toString() })
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.overall).toBeDefined();
      expect(response.body.appliedFilters.project).toBe(testProject._id.toString());
    });

    test('should support date range filtering', async () => {
      const startDate = new Date().toISOString().split('T')[0];
      const endDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

      const response = await request(app)
        .get('/api/work-calendar/admin/slot-analytics')
        .query({ 
          startDate: startDate,
          endDate: endDate
        })
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.appliedFilters.startDate).toBe(startDate);
      expect(response.body.appliedFilters.endDate).toBe(endDate);
    });

    test('should require admin privileges', async () => {
      // Create regular user
      const regularUser = await User.create({
        name: 'Regular User',
        email: 'user@test.com',
        password: 'password123',
        role: 'employee',
        isActive: true
      });

      const userToken = jwt.sign(
        { id: regularUser._id, email: regularUser.email, role: regularUser.role },
        process.env.JWT_SECRET || 'test-secret',
        { expiresIn: '1h' }
      );

      await request(app)
        .get('/api/work-calendar/admin/slot-analytics')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403);
    });

    test('should require authentication', async () => {
      await request(app)
        .get('/api/work-calendar/admin/slot-analytics')
        .expect(401);
    });

    test('should handle empty slot data gracefully', async () => {
      // Remove all slots
      await Slot.deleteMany({});

      const response = await request(app)
        .get('/api/work-calendar/admin/slot-analytics')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      const overall = response.body.data.overall;
      expect(overall.totalSlots).toBe(0);
      expect(overall.availableSlots).toBe(0);
      expect(overall.slotUtilizationRate).toBe(0);
      expect(overall.slotCompletionRate).toBe(0);
    });
  });

  describe('Enhanced Overview Integration', () => {
    test('should include slot analytics in enhanced overview response', async () => {
      const response = await request(app)
        .get('/api/work-calendar/admin/enhanced-overview')
        .query({ includeAnalytics: 'true' })
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.analytics).toBeDefined();
      expect(response.body.data.slotAnalytics).toBeDefined();
      
      // Verify slot analytics structure
      const slotAnalytics = response.body.data.slotAnalytics;
      expect(slotAnalytics.overall).toBeDefined();
      expect(slotAnalytics.byProject).toBeDefined();
      expect(slotAnalytics.slotStatusDistribution).toBeDefined();
    });

    test('should not include slot analytics when includeAnalytics is false', async () => {
      const response = await request(app)
        .get('/api/work-calendar/admin/enhanced-overview')
        .query({ includeAnalytics: 'false' })
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.analytics).toBeNull();
      expect(response.body.data.slotAnalytics).toBeNull();
    });
  });
});
