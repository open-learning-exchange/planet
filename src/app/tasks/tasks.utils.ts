export interface AssigneeIdentity {
  userId: string;
  userPlanetCode?: string;
}

export const assigneeIdentityCandidates = (user: any, localPlanetCode?: string): AssigneeIdentity[] => {
  const userId = user?.couchId || user?.userId || user?._id;
  if (!userId) {
    return [];
  }
  const planetCodes = new Set<string | undefined>([ user.userPlanetCode || user.planetCode ]);
  if ((user.requestId || user.sync) && localPlanetCode) {
    planetCodes.add(localPlanetCode);
  }
  return [ ...planetCodes ].map(userPlanetCode => ({ userId, userPlanetCode }));
};

export const assigneeKey = (assignee: Partial<AssigneeIdentity> = {}, localPlanetCode?: string): string => {
  return assignee.userId ? `${assignee.userId}\u0000${assignee.userPlanetCode || localPlanetCode || ''}` : '';
};

export const assigneeMatches = (
  assignee: Partial<AssigneeIdentity>, identity: Partial<AssigneeIdentity>, localPlanetCode?: string
): boolean => {
  return assignee?.userId === identity?.userId &&
    (assignee?.userPlanetCode || localPlanetCode) === (identity?.userPlanetCode || localPlanetCode);
};

export const effectiveAssignees = (task: any): any[] => {
  return Array.isArray(task?.assignees) && task.assignees.length > 0 ? task.assignees : task?.assignee ? [ task.assignee ] : [];
};

export const isTaskAssignedTo = (task: any, identity: Partial<AssigneeIdentity>, localPlanetCode?: string): boolean => {
  return effectiveAssignees(task).some(assignee => assigneeMatches(assignee, identity, localPlanetCode));
};

export const assigneeName = (assignee: any): string => {
  return assignee?.userDoc?.fullName || assignee?.name;
};

export const storedAssignee = (assignee: any, localPlanetCode?: string): any => {
  return {
    userId: assignee?.userId,
    userPlanetCode: assignee?.userPlanetCode || localPlanetCode,
    name: assignee?.name,
    userDoc: assignee?.userDoc?.fullName ? { fullName: assignee.userDoc.fullName } : undefined
  };
};
