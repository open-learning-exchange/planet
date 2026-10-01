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

export const assigneeKey = (
  assignee: Partial<AssigneeIdentity> = {}, localPlanetCode?: string
): string => assignee.userId ?
  `${assignee.userId}\u0000${assignee.userPlanetCode || localPlanetCode || ''}` : '';

export const assigneeMatches = (
  assignee: Partial<AssigneeIdentity>, identity: Partial<AssigneeIdentity>, localPlanetCode?: string
): boolean => assignee?.userId === identity?.userId &&
    (assignee?.userPlanetCode || localPlanetCode) === (identity?.userPlanetCode || localPlanetCode);

export const effectiveAssignees = (task: any): any[] =>
  Array.isArray(task?.assignees) && task.assignees.length > 0 ?
    task.assignees : task?.assignee ? [ task.assignee ] : [];

export const isTaskAssignedTo = (
  task: any, identity: Partial<AssigneeIdentity>, localPlanetCode?: string
): boolean => effectiveAssignees(task).some(assignee => assigneeMatches(assignee, identity, localPlanetCode));

export const assigneeName = (assignee: any): string => assignee?.userDoc?.fullName || assignee?.name;

export const storedAssignee = (assignee: any, localPlanetCode?: string): any => ({
  userId: assignee?.userId,
  userPlanetCode: assignee?.userPlanetCode || localPlanetCode,
  name: assignee?.name,
  userDoc: assignee?.userDoc?.fullName ? { fullName: assignee.userDoc.fullName } : undefined
});

export type TaskStatus = 'to_do' | 'in_progress' | 'completed' | 'archived';

export const effectiveTaskStatus = (task: any): TaskStatus => {
  if (task?.status === 'archived') {
    return 'archived';
  }
  if (task?.completed === true) {
    return 'completed';
  }
  if (task?.completed === false && task?.status === 'completed') {
    return 'to_do';
  }
  if (task?.status === 'in_progress') {
    return 'in_progress';
  }
  if (task?.status === 'completed') {
    return 'completed';
  }
  return 'to_do';
};

export const nextTaskStatus = (status: TaskStatus | string): TaskStatus => {
  switch (status) {
    case 'to_do':
      return 'in_progress';
    case 'in_progress':
      return 'completed';
    case 'completed':
      return 'to_do';
    default:
      return 'to_do';
  }
};

export const taskStatusBadgeLabel = (status: TaskStatus | string): string => {
  switch (status) {
    case 'to_do':
      return $localize`To Do`;
    case 'in_progress':
      return $localize`In Progress`;
    case 'completed':
      return $localize`Completed`;
    default:
      return $localize`To Do`;
  }
};

