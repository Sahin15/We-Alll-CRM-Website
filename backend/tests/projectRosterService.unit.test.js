import {
  collectProjectRosterUserIds,
  getMissingTeamMemberUserIds,
} from '../src/services/projectRosterService.js';

describe('projectRosterService', () => {
  const nabanita = '6923fbbff4c5d17d76046396';
  const other = '6923fb0ff4c5d17d7604632a';
  const head = '6a5211f7ebcd239ac6fca54b';

  test('detects assignedUsers missing from teamMembers (We Alll / Nabanita case)', () => {
    const project = {
      projectHead: head,
      assignedUsers: [nabanita, other, head],
      teamMembers: [
        { user: other, isActive: true, role: 'designer' },
        { user: head, isActive: true, role: 'Digital Marketing' },
      ],
    };

    expect(getMissingTeamMemberUserIds(project)).toEqual([nabanita]);
    expect(collectProjectRosterUserIds(project)).toEqual(
      expect.arrayContaining([nabanita, other, head])
    );
  });

  test('treats inactive teamMembers as missing so they can be re-activated', () => {
    const project = {
      assignedUsers: [nabanita],
      teamMembers: [{ user: nabanita, isActive: false, role: 'other' }],
    };

    expect(getMissingTeamMemberUserIds(project)).toEqual([nabanita]);
  });

  test('includes projectHead when not on teamMembers', () => {
    const project = {
      projectHead: head,
      assignedUsers: [],
      teamMembers: [],
    };

    expect(getMissingTeamMemberUserIds(project)).toEqual([head]);
  });
});
