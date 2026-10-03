import { userDocPath, userRelationship } from './users.utils';

describe('user planet helpers', () => {
  const configuration = { code: 'local', parentCode: 'parent' };

  it('distinguishes local, parent, and child planet codes', () => {
    expect(userRelationship('local', configuration)).toBe('local');
    expect(userRelationship('parent', configuration)).toBe('parent');
    expect(userRelationship('child', configuration)).toBe('child');
  });

  it('treats a missing planet code as local, even without a parent code', () => {
    expect(userRelationship(null, configuration)).toBe('local');
    expect(userRelationship(undefined, configuration)).toBe('local');
    expect(userRelationship('', configuration)).toBe('local');
    expect(userRelationship(undefined, { code: 'local' })).toBe('local');
  });

  it('builds the user document path for each planet relationship', () => {
    expect(userDocPath('alice', 'local', configuration)).toBe('_users/org.couchdb.user:alice');
    expect(userDocPath('alice', 'parent', configuration)).toBe('parent_users/org.couchdb.user:alice');
    expect(userDocPath('alice', 'child', configuration)).toBe('child_users/alice@child');
  });
});
