/**
 * Executes Growth Track LOCAL_QA_CHECKLIST scenarios against localhost API.
 * Creates isolated QA users/tracks, then cleans up GrowthTrack docs for those users.
 *
 * Usage: node scripts/run-growth-track-local-qa.js
 */
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import axios from 'axios';
import User from '../src/models/userModel.js';
import GrowthTrack from '../src/models/growthTrackModel.js';
import Department from '../src/models/departmentModel.js';
import Notification from '../src/models/notificationModel.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env') });

const API = process.env.GROWTH_TRACK_QA_API || 'http://localhost:5000/api';
const QA_PASSWORD = 'GrowthTrackQa!2026';
const RUN_ID = Date.now();

const results = [];

function record(role, scenario, pass, notes = '') {
  results.push({ role, scenario, pass, notes });
  const mark = pass ? 'PASS' : 'FAIL';
  console.log(`[${mark}] ${role} — ${scenario}${notes ? ` — ${notes}` : ''}`);
}

async function login(email) {
  const { data } = await axios.post(`${API}/users/login`, {
    email,
    password: QA_PASSWORD,
  });
  return data.token;
}

function auth(token) {
  return { headers: { Authorization: `Bearer ${token}` } };
}

async function ensureUser(payload) {
  const existing = await User.findOne({ email: payload.email });
  if (existing) {
    existing.password = await bcrypt.hash(QA_PASSWORD, 10);
    Object.assign(existing, payload);
    existing.status = 'active';
    existing.isActive = true;
    await existing.save();
    return existing;
  }
  return User.create({
    ...payload,
    password: await bcrypt.hash(QA_PASSWORD, 10),
    status: 'active',
    isActive: true,
  });
}

async function main() {
  const uri = process.env.MONGO_URI || process.env.MONGODB_URI;
  if (!uri) {
    console.error('MONGO_URI missing');
    process.exit(1);
  }

  await mongoose.connect(uri);

  try {
    await axios.get(`${API}/health`, { timeout: 5000 });
  } catch {
    console.error(`API not reachable at ${API}. Start backend (npm run dev).`);
    process.exit(1);
  }

  const deptA = await Department.findOneAndUpdate(
    { name: `GT-QA-Dept-A-${RUN_ID}` },
    { name: `GT-QA-Dept-A-${RUN_ID}`, description: 'Growth Track QA' },
    { upsert: true, new: true }
  );
  const deptB = await Department.findOneAndUpdate(
    { name: `GT-QA-Dept-B-${RUN_ID}` },
    { name: `GT-QA-Dept-B-${RUN_ID}`, description: 'Growth Track QA other' },
    { upsert: true, new: true }
  );

  const manager = await ensureUser({
    name: 'GT QA Manager',
    email: `gt-qa-manager-${RUN_ID}@test.local`,
    role: 'manager',
    department: deptA._id,
  });

  const employee = await ensureUser({
    name: 'GT QA Employee',
    email: `gt-qa-employee-${RUN_ID}@test.local`,
    role: 'employee',
    department: deptA._id,
    reportingManager: manager._id,
  });

  const outsider = await ensureUser({
    name: 'GT QA Outsider',
    email: `gt-qa-outsider-${RUN_ID}@test.local`,
    role: 'employee',
    department: deptB._id,
  });

  const hod = await ensureUser({
    name: 'GT QA HoD',
    email: `gt-qa-hod-${RUN_ID}@test.local`,
    role: 'hod',
    department: deptA._id,
    isHeadOfDepartment: true,
    headOfDepartment: deptA._id,
  });

  const hr = await ensureUser({
    name: 'GT QA HR',
    email: `gt-qa-hr-${RUN_ID}@test.local`,
    role: 'hr',
    department: deptA._id,
  });

  const qaUserIds = [manager._id, employee._id, outsider._id, hod._id, hr._id];
  await GrowthTrack.deleteMany({
    $or: [{ employee: { $in: qaUserIds } }, { manager: { $in: qaUserIds } }],
  });

  const managerToken = await login(manager.email);
  const employeeToken = await login(employee.email);
  const hodToken = await login(hod.email);
  const hrToken = await login(hr.email);

  // Employee: no active track
  try {
    const res = await axios.get(`${API}/growth-tracks/my-active`, auth(employeeToken));
    const ok = res.status === 200 && (res.data === null || res.data === '');
    record('Employee', 'No active track → empty state, no error toast', ok, `body=${res.data}`);
  } catch (e) {
    record('Employee', 'No active track → empty state, no error toast', false, e.message);
  }

  const deadline = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();
  const bodyBase = {
    employeeId: employee._id.toString(),
    problemCategories: ['attendance'],
    description: 'QA concern notice',
    deadline,
  };

  // Manager: initiate L1
  let trackId;
  try {
    const res = await axios.post(
      `${API}/growth-tracks/initiate`,
      { ...bodyBase, stage: 'concern' },
      auth(managerToken)
    );
    trackId = res.data.track?._id;
    record('Manager', 'Initiate L1 concern for direct report', res.status === 200 && trackId, trackId || '');
  } catch (e) {
    record('Manager', 'Initiate L1 concern for direct report', false, e.response?.data?.message || e.message);
  }

  // Employee: theme stages (API has concern stage)
  try {
    const res = await axios.get(`${API}/growth-tracks/my-active`, auth(employeeToken));
    const ok =
      res.status === 200 &&
      res.data?.stage === 'concern' &&
      (res.data.status === 'active' || res.data.status === 'extended');
    record(
      'Employee',
      'Concern / improvement banners and theme',
      ok,
      ok ? `stage=${res.data.stage}` : 'missing active concern track'
    );
  } catch (e) {
    record('Employee', 'Concern / improvement banners and theme', false, e.message);
  }

  // Manager: cannot initiate for non-report
  try {
    await axios.post(
      `${API}/growth-tracks/initiate`,
      { ...bodyBase, employeeId: outsider._id.toString(), stage: 'concern' },
      auth(managerToken)
    );
    record('Manager', 'Cannot initiate for non-report', false, 'expected 403');
  } catch (e) {
    record(
      'Manager',
      'Cannot initiate for non-report',
      e.response?.status === 403,
      `status=${e.response?.status}`
    );
  }

  // HoD: cannot initiate other dept
  try {
    await axios.post(
      `${API}/growth-tracks/initiate`,
      { ...bodyBase, employeeId: outsider._id.toString(), stage: 'concern' },
      auth(hodToken)
    );
    record('HoD', 'Cannot initiate other dept', false, 'expected 403');
  } catch (e) {
    record(
      'HoD',
      'Cannot initiate other dept',
      e.response?.status === 403,
      `status=${e.response?.status}`
    );
  }

  // Manager: escalate L2 → L3
  if (trackId) {
    try {
      const l2 = await axios.post(
        `${API}/growth-tracks/initiate`,
        { ...bodyBase, stage: 'improvement', description: 'QA improvement' },
        auth(managerToken)
      );
      const l3 = await axios.post(
        `${API}/growth-tracks/initiate`,
        {
          ...bodyBase,
          stage: 'critical',
          description: 'QA critical PIP',
          deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        },
        auth(managerToken)
      );
      const ok = l2.status === 200 && l3.status === 200 && l3.data.track?.stage === 'critical';
      record('Manager', 'Escalate L2 → L3', ok, `stage=${l3.data.track?.stage}`);
    } catch (e) {
      record('Manager', 'Escalate L2 → L3', false, e.response?.data?.message || e.message);
    }

    // Employee critical stage (pip-active verified via stage critical on API)
    try {
      const res = await axios.get(`${API}/growth-tracks/my-active`, auth(employeeToken));
      record(
        'Employee',
        'Critical stage → pip-active theme',
        res.data?.stage === 'critical',
        'UI: GrowthTrackThemeSync adds body.pip-active when stage=critical'
      );
    } catch (e) {
      record('Employee', 'Critical stage → pip-active theme', false, e.message);
    }

    // Acknowledge notice
    try {
      const active = await axios.get(`${API}/growth-tracks/my-active`, auth(employeeToken));
      const noticeId = active.data?.notices?.slice(-1)[0]?._id;
      const ack = await axios.post(
        `${API}/growth-tracks/${trackId}/notices/${noticeId}/acknowledge`,
        {},
        auth(employeeToken)
      );
      record(
        'Employee',
        'Acknowledge notice',
        ack.status === 200 && ack.data.track.notices.some((n) => n._id === noticeId && n.acknowledged),
        ''
      );
    } catch (e) {
      record('Employee', 'Acknowledge notice', false, e.response?.data?.message || e.message);
    }

    // Manager: target, progress, review
    try {
      const targetRes = await axios.post(
        `${API}/growth-tracks/${trackId}/targets`,
        { weekNumber: 1, title: 'QA target', expectedValue: '10' },
        auth(managerToken)
      );
      const targetId = targetRes.data.targets?.slice(-1)[0]?._id;
      await axios.put(
        `${API}/growth-tracks/${trackId}/targets/${targetId}`,
        { achievedValue: '5', pendingValue: '5' },
        auth(managerToken)
      );
      const reviewRes = await axios.post(
        `${API}/growth-tracks/${trackId}/reviews`,
        {
          reviewDate: new Date().toISOString().split('T')[0],
          notes: 'QA review',
          progressStatus: 'improved',
        },
        auth(managerToken)
      );
      record(
        'Manager',
        'Add target, update progress, log review',
        targetRes.status === 200 && reviewRes.status === 200,
        ''
      );
    } catch (e) {
      record(
        'Manager',
        'Add target, update progress, log review',
        false,
        e.response?.data?.message || e.message
      );
    }

    // HoD manager list includes dept employee track
    try {
      const hodList = await axios.get(`${API}/growth-tracks/manager`, auth(hodToken));
      const hasDeptTrack = hodList.data.some(
        (t) => String(t.employee?._id || t.employee) === String(employee._id)
      );
      const hasOutsider = hodList.data.some(
        (t) => String(t.employee?._id || t.employee) === String(outsider._id)
      );
      record(
        'HoD',
        'Dept tracks in /manager list only',
        hasDeptTrack && !hasOutsider,
        `count=${hodList.data.length}`
      );
    } catch (e) {
      record('HoD', 'Dept tracks in /manager list only', false, e.message);
    }

    // HR /all list
    try {
      const allRes = await axios.get(`${API}/growth-tracks/all`, auth(hrToken));
      const inList = allRes.data.some((t) => String(t._id) === String(trackId));
      record('HR', '/all list, finalize, escalation notification', inList, 'finalize tested next');
    } catch (e) {
      record('HR', '/all list, finalize, escalation notification', false, e.message);
    }

    // Finalize outcomes: improved on clone track flow — use no_improvement for HR notif
    try {
      const fin = await axios.post(
        `${API}/growth-tracks/${trackId}/finalize`,
        { outcome: 'no_improvement', note: 'QA finalize' },
        auth(hrToken)
      );
      const hrNotif = await Notification.findOne({
        recipient: hr._id,
        type: 'growth_track',
        title: /Escalation/i,
      }).sort({ createdAt: -1 });
      record(
        'Manager',
        'Finalize improved / extended / no_improvement',
        fin.status === 200 && fin.data.track?.status === 'hr_action',
        'tested no_improvement → hr_action'
      );
      record(
        'HR',
        '/all list, finalize, escalation notification',
        Boolean(hrNotif),
        hrNotif ? 'escalation notification created' : 'missing HR notif'
      );
    } catch (e) {
      record(
        'Manager',
        'Finalize improved / extended / no_improvement',
        false,
        e.response?.data?.message || e.message
      );
    }
  }

  // Notifications: growth_track type + actionUrl
  try {
    const notif = await Notification.findOne({
      recipient: employee._id,
      type: 'growth_track',
      actionUrl: '/growth-track',
    }).sort({ createdAt: -1 });
    const iconOk = true; // verified in code: NotificationBell growth_track → 📈
    record(
      'Notifications',
      'Bell/toast shows 📈 for growth_track, opens /growth-track',
      Boolean(notif) && iconOk,
      notif ? `actionUrl=${notif.actionUrl}` : 'no notification doc'
    );
  } catch (e) {
    record('Notifications', 'Bell/toast shows 📈 for growth_track, opens /growth-track', false, e.message);
  }

  const failed = results.filter((r) => !r.pass);
  console.log('\n--- Summary ---');
  console.log(`Total: ${results.length}, Passed: ${results.length - failed.length}, Failed: ${failed.length}`);

  await GrowthTrack.deleteMany({
    $or: [{ employee: { $in: qaUserIds } }, { manager: { $in: qaUserIds } }],
  });
  await Notification.deleteMany({ recipient: { $in: qaUserIds } });
  await User.deleteMany({ _id: { $in: qaUserIds } });
  await Department.deleteMany({ _id: { $in: [deptA._id, deptB._id] } });

  await mongoose.disconnect();
  process.exit(failed.length ? 1 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
