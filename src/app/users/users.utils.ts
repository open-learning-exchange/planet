import { mayHaveAvatar } from '@shared/ui/avatar.component';

export const userRelationship = (
  planetCode: string | null | undefined,
  { code, parentCode }: { code?: string, parentCode?: string }
): 'local' | 'parent' | 'child' =>
  !planetCode || planetCode === code ? 'local' : planetCode === parentCode ? 'parent' : 'child';

// A local _users doc lists its photo; other planets' user docs never carry attachments, so theirs can only be requested
export const avatarMayExist = (user, planetCode: string | null | undefined, configuration: { code?: string, parentCode?: string }) =>
  mayHaveAvatar(user) || userRelationship(planetCode, configuration) !== 'local';

export const userDocPath = (name: string, planetCode: string | null | undefined, configuration: { code?: string, parentCode?: string }) => {
  const relationship = userRelationship(planetCode, configuration);
  return relationship === 'child' ?
    `child_users/${name}@${planetCode}` :
    `${relationship === 'parent' ? 'parent_users' : '_users'}/org.couchdb.user:${name}`;
};
