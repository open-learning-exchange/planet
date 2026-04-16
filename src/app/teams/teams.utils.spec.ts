import { memberNameCompare } from './teams.utils';

describe('teams.utils', () => {
  describe('memberNameCompare', () => {
    it('falls back to userId when lastName is missing', () => {
      const userWithoutLastName = {
        userId: 'org.couchdb.user:zebra',
        userDoc: { doc: { lastName: '' } }
      };
      const namedUser = {
        userId: 'org.couchdb.user:alpha',
        userDoc: { doc: { lastName: 'Able' } }
      };

      expect(memberNameCompare(userWithoutLastName, namedUser)).toBeGreaterThan(0);
      expect(memberNameCompare(namedUser, userWithoutLastName)).toBeLessThan(0);
    });
  });
});
