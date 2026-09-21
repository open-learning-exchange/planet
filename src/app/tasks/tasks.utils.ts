import { identityKey, identityMatches, identityPlanetCode, userIdentityCandidates } from '../shared/identity.utils';

export interface AssigneeIdentity {
  userId: string;
  userPlanetCode?: string;
}

export const assigneeIdentityCandidates = (user: any, localPlanetCode?: string): AssigneeIdentity[] =>
  userIdentityCandidates(user, localPlanetCode);

// Before member origins were derived from teamPlanetCode, code-less rows were saved on tasks with the local code.
// The old assignment is ambiguous if the team also has a native member with the same ID.
export const legacyTeamAssigneeIdentity = (
  member: any, members: any[], localPlanetCode?: string
): AssigneeIdentity | undefined =>
  member?.userId && localPlanetCode && !member.userPlanetCode && member.teamPlanetCode &&
  member.teamPlanetCode !== localPlanetCode &&
  !members.some(other => other !== member && other.userId === member.userId &&
    identityPlanetCode(other, localPlanetCode) === localPlanetCode) ?
    { userId: member.userId, userPlanetCode: localPlanetCode } : undefined;

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
