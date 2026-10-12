export const userRelationship = (
  planetCode: string | null | undefined,
  { code, parentCode }: { code?: string, parentCode?: string }
): 'local' | 'parent' | 'child' =>
  !planetCode || planetCode === code ? 'local' : planetCode === parentCode ? 'parent' : 'child';

export const userDocPath = (name: string, planetCode: string | null | undefined, configuration: { code?: string, parentCode?: string }) => {
  const relationship = userRelationship(planetCode, configuration);
  return relationship === 'child' ?
    `child_users/${name}@${planetCode}` :
    `${relationship === 'parent' ? 'parent_users' : '_users'}/org.couchdb.user:${name}`;
};
