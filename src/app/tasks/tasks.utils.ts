import { identityMatches, identityPlanetCode, userIdentity } from '../shared/identity.utils';

export interface AssigneeIdentity {
  userId: string;
  userPlanetCode?: string;
}

export const assigneeIdentityCandidates = (user: any, localPlanetCode?: string): AssigneeIdentity[] => {
  const source = user?.doc ? { ...user.doc, _id: user.doc._id || user._id } : user;
  const identity = userIdentity(source, localPlanetCode);
  if (!identity.userId) {
    return [];
  }
  const candidates = [ identity ];
  if ((source.requestId || source.sync) && source._id && source._id !== identity.userId) {
    candidates.push({ ...identity, userId: source._id });
    if (localPlanetCode && localPlanetCode !== identity.userPlanetCode) {
      candidates.push({ userId: source._id, userPlanetCode: localPlanetCode });
    }
  }
  return candidates;
};

export const assigneeKey = (
  assignee: Partial<AssigneeIdentity> = {}, localPlanetCode?: string
): string => assignee.userId ?
  `${assignee.userId}\u0000${identityPlanetCode(assignee, localPlanetCode) || ''}` : '';

export const assigneeMatches = (
  assignee: Partial<AssigneeIdentity>, identity: Partial<AssigneeIdentity>, localPlanetCode?: string
): boolean => identityMatches(assignee, identity, localPlanetCode);

export const effectiveAssignees = (task: any): any[] =>
  Array.isArray(task?.assignees) && task.assignees.length > 0 ?
    task.assignees : task?.assignee ? [ task.assignee ] : [];

export const isTaskAssignedTo = (
  task: any, identity: Partial<AssigneeIdentity>, localPlanetCode?: string
): boolean => effectiveAssignees(task).some(assignee => assigneeMatches(assignee, identity, localPlanetCode));

export const assigneeName = (assignee: any): string => assignee?.userDoc?.fullName || assignee?.name;

export const storedAssignee = (assignee: any, localPlanetCode?: string): any => ({
  userId: assignee?.userId,
  userPlanetCode: identityPlanetCode(assignee, localPlanetCode),
  name: assignee?.name,
  userDoc: assignee?.userDoc?.fullName ? { fullName: assignee.userDoc.fullName } : undefined
});
