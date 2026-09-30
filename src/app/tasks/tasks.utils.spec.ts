import {
  assigneeIdentityCandidates, assigneeKey, assigneeMatches, effectiveAssignees, isTaskAssignedTo, storedAssignee
} from './tasks.utils';

describe('task assignee utilities', () => {
  const local = { userId: 'alex', userPlanetCode: 'planet-a', name: 'alex' };
  const remote = { userId: 'alex', userPlanetCode: 'planet-b', name: 'alex' };

  it('falls back to the legacy assignee when the array is empty', () => {
    expect(effectiveAssignees({ assignee: local, assignees: [] })).toEqual([ local ]);
    expect(isTaskAssignedTo({ assignee: local, assignees: [] }, local)).toBe(true);
  });

  it('uses planet identity and treats missing planet codes as local', () => {
    expect(assigneeKey(local)).not.toBe(assigneeKey(remote));
    expect(assigneeMatches(local, remote, 'planet-a')).toBe(false);
    expect(assigneeMatches({ userId: 'alex' }, local, 'planet-a')).toBe(true);
    expect(assigneeMatches({ userId: 'alex' }, remote, 'planet-a')).toBe(false);
  });

  it('uses both origin and local identities only for associated users', () => {
    expect(assigneeIdentityCandidates({ _id: 'alex', planetCode: 'planet-b' }, 'planet-a')).toEqual([
      { userId: 'alex', userPlanetCode: 'planet-b' }
    ]);
    expect(assigneeIdentityCandidates({
      _id: 'alex', planetCode: 'planet-b', requestId: 'request-1'
    }, 'planet-a')).toEqual([
      { userId: 'alex', userPlanetCode: 'planet-b' },
      { userId: 'alex', userPlanetCode: 'planet-a' }
    ]);
  });

  it('does not treat a materialized but undefined requestId as associated', () => {
    expect(assigneeIdentityCandidates({
      _id: 'alex', planetCode: 'planet-b', requestId: undefined
    }, 'planet-a')).toEqual([ { userId: 'alex', userPlanetCode: 'planet-b' } ]);
  });

  it('prefers the canonical CouchDB identity used by membership documents', () => {
    expect(assigneeIdentityCandidates({
      _id: 'alex@planet-b',
      userId: 'legacy-alex',
      couchId: 'alex',
      planetCode: 'planet-b'
    }, 'planet-a')).toEqual([ { userId: 'alex', userPlanetCode: 'planet-b' } ]);
  });

  it('stores only portable display metadata', () => {
    expect(storedAssignee({
      ...local,
      attachmentDoc: { _attachments: { img: {} } },
      userDoc: { fullName: 'Alex Example', doc: { salt: 'private' } }
    })).toEqual({ ...local, userDoc: { fullName: 'Alex Example' } });
  });
});
