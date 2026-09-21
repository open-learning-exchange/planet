// Creates more general find query that can search with multiple selectors & fields
export const findDocuments = (selectors, fields: any = 0, sort: any = 0, limit = 1000, skip = 0) => {
  const queries = { selector: selectors, skip };
  if (fields) {
    queries['fields'] = fields;
  }
  if (limit) {
    queries['limit'] = limit;
  }
  if (sort !== 0) {
    queries['sort'] = sort;
  }
  return queries;
};

// Returns a selector to get all docs with a field matching one of the array or all docs if array is empty
export const inSelector = (array = []) => array.length > 0 ? { $in: array } : { $gt: null };

// $exists: false does not match blank codes, and an undefined code would serialize to a bare {} inside $or.
export const userPlanetCodeSelector = (...codes: (string | undefined)[]) => ({
  $or: [
    ...[ ...new Set(codes.filter((code): code is string => !!code)) ].map(userPlanetCode => ({ userPlanetCode })),
    { userPlanetCode: '' },
    { userPlanetCode: { $exists: false } }
  ]
});

export const userIdentitySelector = (identities: { userId: string, userPlanetCode?: string }[]) => ({
  userId: { $in: [ ...new Set(identities.map(identity => identity.userId)) ] },
  ...userPlanetCodeSelector(...identities.map(identity => identity.userPlanetCode))
});
