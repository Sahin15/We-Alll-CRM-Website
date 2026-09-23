import request from 'supertest';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import app from '../src/server.js';
import User from '../src/models/userModel.js';
import GrowthTrack from '../src/models/growthTrackModel.js';

const signToken = (user) =>
  jwt.sign(
    { id: user._id, email: user.email, role: user.role },
    process.env.JWT_SECRET || 'test-secret',
    { expiresIn: '1h' }
  );

describe('Growth Track routes integration', () => {
  let manager;
  let employee;
  let outsider;
  let managerToken;
  let employeeToken;
  let outsiderToken;

  beforeAll(async () => {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(
        process.env.MONGODB_URI_TEST || 'mongodb://localhost:27017/crm_test'
      );
    }
  });

  beforeEach(async () => {
    await User.deleteMany({});
    await GrowthTrack.deleteMany({});

    manager = await User.create({
      name: 'Manager User',
      email: 'manager-gt@test.com',
      password: 'password123',
      role: 'manager',
      isActive: true,
      status: 'active',
    });

    employee = await User.create({
      name: 'Employee User',
      email: 'employee-gt@test.com',
      password: 'password123',
      role: 'employee',
      isActive: true,
      status: 'active',
      reportingManager: manager._id,
    });

    outsider = await User.create({
      name: 'Other Employee',
      email: 'other-gt@test.com',
      password: 'password123',
      role: 'employee',
      isActive: true,
      status: 'active',
    });

    managerToken = signToken(manager);
    employeeToken = signToken(employee);
    outsiderToken = signToken(outsider);
  });

  test('GET /my-active returns 200 null when no active track', async () => {
    const res = await request(app)
      .get('/api/growth-tracks/my-active')
      .set('Authorization', `Bearer ${employeeToken}`);

    expect(res.status).toBe(200);
    expect(res.body).toBeNull();
  });

  test('POST /initiate creates track for direct report', async () => {
    const deadline = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

    const res = await request(app)
      .post('/api/growth-tracks/initiate')
      .set('Authorization', `Bearer ${managerToken}`)
      .send({
        employeeId: employee._id.toString(),
        stage: 'concern',
        problemCategories: ['attendance'],
        description: 'Late arrivals this week',
        deadline,
      });

    expect(res.status).toBe(200);
    expect(res.body.track).toBeDefined();
    expect(res.body.track.employee.toString()).toBe(employee._id.toString());
  });

  test('POST /initiate returns 403 for unrelated employee', async () => {
    const deadline = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

    const res = await request(app)
      .post('/api/growth-tracks/initiate')
      .set('Authorization', `Bearer ${managerToken}`)
      .send({
        employeeId: outsider._id.toString(),
        stage: 'concern',
        problemCategories: ['attendance'],
        description: 'Should be forbidden',
        deadline,
      });

    expect(res.status).toBe(403);
  });

  test('acknowledge notice returns 403 for non-owner', async () => {
    const deadline = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    const track = await GrowthTrack.create({
      employee: employee._id,
      manager: manager._id,
      stage: 'concern',
      status: 'active',
      notices: [
        {
          stage: 'concern',
          problemCategories: ['attendance'],
          problemCategory: 'attendance',
          description: 'Notice',
          deadline,
          issuedBy: manager._id,
        },
      ],
      history: [],
    });

    const noticeId = track.notices[0]._id.toString();

    const res = await request(app)
      .post(
        `/api/growth-tracks/${track._id}/notices/${noticeId}/acknowledge`
      )
      .set('Authorization', `Bearer ${outsiderToken}`);

    expect(res.status).toBe(403);
  });

  test('employee can acknowledge own notice', async () => {
    const deadline = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    const track = await GrowthTrack.create({
      employee: employee._id,
      manager: manager._id,
      stage: 'concern',
      status: 'active',
      notices: [
        {
          stage: 'concern',
          problemCategories: ['attendance'],
          problemCategory: 'attendance',
          description: 'Notice',
          deadline,
          issuedBy: manager._id,
        },
      ],
      history: [],
    });

    const noticeId = track.notices[0]._id.toString();

    const res = await request(app)
      .post(
        `/api/growth-tracks/${track._id}/notices/${noticeId}/acknowledge`
      )
      .set('Authorization', `Bearer ${employeeToken}`);

    expect(res.status).toBe(200);
    expect(res.body.track.notices[0].acknowledged).toBe(true);
  });
});
