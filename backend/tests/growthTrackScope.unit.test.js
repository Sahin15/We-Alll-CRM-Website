import { jest } from '@jest/globals';

const mockGetOwnedDepartmentIdForRoster = jest.fn();
const mockIsOwnDepartmentTeamViewer = jest.fn();

jest.unstable_mockModule('../src/utils/teamRosterScope.js', () => ({
  getOwnedDepartmentIdForRoster: mockGetOwnedDepartmentIdForRoster,
  isOwnDepartmentTeamViewer: mockIsOwnDepartmentTeamViewer,
}));

const {
  canManageGrowthTrackForEmployee,
  canManageGrowthTrackRecord,
  departmentIdString,
  isCompanyGrowthTrackManager,
} = await import('../src/utils/growthTrackScope.js');

describe('growthTrackScope', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockIsOwnDepartmentTeamViewer.mockReturnValue(false);
    mockGetOwnedDepartmentIdForRoster.mockResolvedValue(null);
  });

  test('departmentIdString resolves populated and raw ids', () => {
    expect(departmentIdString({ department: { _id: 'dept1' } })).toBe('dept1');
    expect(departmentIdString({ department: 'dept2' })).toBe('dept2');
    expect(departmentIdString({})).toBeNull();
  });

  test('isCompanyGrowthTrackManager is true for hr/admin/superadmin only', () => {
    expect(isCompanyGrowthTrackManager({ role: 'hr' })).toBe(true);
    expect(isCompanyGrowthTrackManager({ role: 'manager' })).toBe(false);
  });

  test('manager may initiate for direct report', async () => {
    const manager = { _id: 'mgr1', role: 'manager' };
    const employee = {
      _id: 'emp1',
      reportingManager: 'mgr1',
      department: 'deptA',
    };
    await expect(canManageGrowthTrackForEmployee(manager, employee)).resolves.toBe(true);
  });

  test('manager cannot initiate for unrelated employee', async () => {
    const manager = { _id: 'mgr1', role: 'manager' };
    const employee = {
      _id: 'emp2',
      reportingManager: 'other',
      department: 'deptA',
    };
    await expect(canManageGrowthTrackForEmployee(manager, employee)).resolves.toBe(false);
  });

  test('HoD may initiate for same department roster', async () => {
    mockIsOwnDepartmentTeamViewer.mockReturnValue(true);
    mockGetOwnedDepartmentIdForRoster.mockResolvedValue('deptA');

    const hod = { _id: 'hod1', role: 'hod' };
    const employee = {
      _id: 'emp3',
      reportingManager: 'someone-else',
      department: 'deptA',
    };

    await expect(canManageGrowthTrackForEmployee(hod, employee)).resolves.toBe(true);
  });

  test('canManageGrowthTrackRecord allows assigned track manager', async () => {
    const manager = { _id: 'mgr1', role: 'manager' };
    const track = {
      manager: 'mgr1',
      employee: { department: 'deptA', reportingManager: 'other' },
    };
    await expect(canManageGrowthTrackRecord(manager, track)).resolves.toBe(true);
  });

  test('HR can manage any track record', async () => {
    const hr = { _id: 'hr1', role: 'hr' };
    const track = { manager: 'x', employee: 'y' };
    await expect(canManageGrowthTrackRecord(hr, track)).resolves.toBe(true);
  });
});
