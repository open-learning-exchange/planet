import { memberCompare } from './teams.utils';

describe('team member helpers', () => {
  it('does not treat matching user IDs from different planets as the same member', () => {
    expect(memberCompare(
      { userId: 'org.couchdb.user:leader', userPlanetCode: 'planet-a' },
      { userId: 'org.couchdb.user:leader', userPlanetCode: 'planet-b' }
    )).toBe(false);
  });

  it('does not treat identity-less or missing members as the same person', () => {
    expect(memberCompare({ userPlanetCode: 'nation' }, { userPlanetCode: 'nation' })).toBe(false);
    expect(memberCompare(undefined, { userId: 'org.couchdb.user:one' })).toBe(false);
  });
});
