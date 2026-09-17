import { identityKey, identityMatches, identityPlanetCode, identitySource, userIdentityCandidates } from '../shared/identity.utils';

export interface AssigneeIdentity {
  userId: string;
  userPlanetCode?: string;
}

export const assigneeIdentityCandidates = (user: any, localPlanetCode?: string): AssigneeIdentity[] => {
  const source = identitySource(user);
  const candidates = userIdentityCandidates(source, localPlanetCode);
  return source?.requestId || source?.sync ? candidates : candidates.slice(0, 1);
};

export const assigneeKey = (
  assignee: Partial<AssigneeIdentity> = {}, localPlanetCode?: string
): string => identityKey(assignee, localPlanetCode);

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
