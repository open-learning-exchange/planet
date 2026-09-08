import { memberCompare, memberIdentity, memberPlanetCode, teamIdentityDocs } from './teams.utils';

describe('team member helpers', () => {
  describe('memberIdentity', () => {
    it('keeps an explicitly stored planet code', () => {
      expect(memberIdentity(
        { userId: 'org.couchdb.user:ann', userPlanetCode: 'community' },
        { teamPlanetCode: 'nation' }
      )).toEqual({ userId: 'org.couchdb.user:ann', userPlanetCode: 'community' });
    });

    it('resolves a member with no planet code from the team origin, not the viewing server', () => {
      expect(memberIdentity(
        { userId: 'org.couchdb.user:ann' },
        { teamPlanetCode: 'community' }
      )).toEqual({ userId: 'org.couchdb.user:ann', userPlanetCode: 'community' });
    });

    it('leaves the planet code undefined when neither side supplies one', () => {
      expect(memberIdentity({ userId: 'org.couchdb.user:ann' }, {}))
        .toEqual({ userId: 'org.couchdb.user:ann', userPlanetCode: undefined });
    });

    it('prefers stored identity over derived view identity', () => {
      expect(memberPlanetCode({
        userPlanetCode: 'stored', resolvedUserPlanetCode: 'derived'
      })).toBe('stored');
      expect(memberPlanetCode({ resolvedUserPlanetCode: 'derived' })).toBe('derived');
    });
  });

  describe('memberCompare', () => {
    it('does not treat matching user IDs from different planets as the same member', () => {
      expect(memberCompare(
        { userId: 'org.couchdb.user:leader', userPlanetCode: 'planet-a' },
        { userId: 'org.couchdb.user:leader', userPlanetCode: 'planet-b' }
      )).toBe(false);
    });

    it('does not treat two identity-less members as the same person', () => {
      expect(memberCompare({}, {}, 'nation')).toBe(false);
      expect(memberCompare({ userPlanetCode: 'nation' }, { userPlanetCode: 'nation' })).toBe(false);
    });

    it('tolerates missing member objects', () => {
      expect(memberCompare(undefined, { userId: 'org.couchdb.user:one' })).toBe(false);
      expect(memberCompare({ userId: 'org.couchdb.user:one' }, undefined)).toBe(false);
    });
  });

  describe('teamIdentityDocs', () => {
    it('resolves code-less rows through each team origin before accepting them', () => {
      const rows = [
        { _id: 'community-row', teamId: 'community-team', userId: 'org.couchdb.user:ann' },
        { _id: 'nation-row', teamId: 'nation-team', userId: 'org.couchdb.user:ann' }
      ];
      const identity = { userId: 'org.couchdb.user:ann', userPlanetCode: 'community' };

      expect(teamIdentityDocs(
        rows, { _id: 'community-team', teamPlanetCode: 'community' }, identity, 'nation'
      )).toEqual([ rows[0] ]);
      expect(teamIdentityDocs(
        rows, { _id: 'nation-team', teamPlanetCode: 'nation' }, identity, 'nation'
      )).toEqual([]);
    });
  });
});
