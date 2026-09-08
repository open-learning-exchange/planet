import { canonicalUserId } from '../shared/identity.utils';

export interface AssigneeIdentity {
  userId: string;
  userPlanetCode?: string;
}

const assigneePlanetCode = (assignee: any, localPlanetCode?: string) =>
  assignee?.userPlanetCode || assignee?.resolvedUserPlanetCode || assignee?.planetCode || localPlanetCode;

export const assigneeIdentityCandidates = (user: any, localPlanetCode?: string): AssigneeIdentity[] => {
  const source = user?.doc ? { ...user.doc, _id: user.doc._id || user._id } : user;
  const userId = canonicalUserId(source);
  if (!userId) {
    return [];
  }
  const planetCodes = new Set<string | undefined>([ assigneePlanetCode(source) ]);
  if ((source.requestId || source.sync) && localPlanetCode) {
    planetCodes.add(localPlanetCode);
  }
  return [ ...planetCodes ].map(userPlanetCode => ({ userId, userPlanetCode }));
};

export const assigneeKey = (
  assignee: Partial<AssigneeIdentity> = {}, localPlanetCode?: string
): string => assignee.userId ?
  `${assignee.userId}\u0000${assigneePlanetCode(assignee, localPlanetCode) || ''}` : '';

export const assigneeMatches = (
  assignee: Partial<AssigneeIdentity>, identity: Partial<AssigneeIdentity>, localPlanetCode?: string
): boolean => assignee?.userId === identity?.userId &&
    assigneePlanetCode(assignee, localPlanetCode) === assigneePlanetCode(identity, localPlanetCode);

export const effectiveAssignees = (task: any): any[] =>
  Array.isArray(task?.assignees) && task.assignees.length > 0 ?
    task.assignees : task?.assignee ? [ task.assignee ] : [];

export const isTaskAssignedTo = (
  task: any, identity: Partial<AssigneeIdentity>, localPlanetCode?: string
): boolean => effectiveAssignees(task).some(assignee => assigneeMatches(assignee, identity, localPlanetCode));

export const assigneeName = (assignee: any): string => assignee?.userDoc?.fullName || assignee?.name;

export const storedAssignee = (assignee: any, localPlanetCode?: string): any => ({
  userId: assignee?.userId,
  userPlanetCode: assigneePlanetCode(assignee, localPlanetCode),
  name: assignee?.name,
  userDoc: assignee?.userDoc?.fullName ? { fullName: assignee.userDoc.fullName } : undefined
});
