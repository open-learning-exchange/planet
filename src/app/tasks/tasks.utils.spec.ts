import {
  assigneeIdentityCandidates, assigneeKey, assigneeMatches, effectiveAssignees,
  effectiveTaskStatus, isTaskAssignedTo, nextTaskStatus, storedAssignee, taskStatusBadgeLabel
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

describe('task status utilities', () => {
  it('determines effective status with backward compatibility', () => {
    expect(effectiveTaskStatus({ status: 'archived' })).toBe('archived');
    expect(effectiveTaskStatus({ completed: true })).toBe('completed');
    expect(effectiveTaskStatus({ status: 'completed', completed: true })).toBe('completed');
    expect(effectiveTaskStatus({ status: 'in_progress', completed: false })).toBe('in_progress');
    expect(effectiveTaskStatus({ status: 'in_progress' })).toBe('in_progress');
    expect(effectiveTaskStatus({ status: 'to_do', completed: false })).toBe('to_do');
    expect(effectiveTaskStatus({ status: 'completed', completed: false })).toBe('to_do');
    expect(effectiveTaskStatus({})).toBe('to_do');
    expect(effectiveTaskStatus(null)).toBe('to_do');
  });

  it('cycles through task status transitions', () => {
    expect(nextTaskStatus('to_do')).toBe('in_progress');
    expect(nextTaskStatus('in_progress')).toBe('completed');
    expect(nextTaskStatus('completed')).toBe('to_do');
    expect(nextTaskStatus('archived')).toBe('to_do');
    expect(nextTaskStatus('unknown')).toBe('to_do');
  });

  it('provides human-readable status badge labels', () => {
    expect(taskStatusBadgeLabel('to_do')).toBe('To Do');
    expect(taskStatusBadgeLabel('in_progress')).toBe('In Progress');
    expect(taskStatusBadgeLabel('completed')).toBe('Completed');
  });
});

