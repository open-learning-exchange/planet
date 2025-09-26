// Creates more general find query that can search with multiple selectors & fields
export function findDocuments(selectors, fields: any = 0, sort: any = 0, limit = 1000, skip = 0) {
  const queries = { 'selector': selectors, 'skip': skip };
  if (fields) { queries['fields'] = fields; }
  if (limit) { queries['limit'] = limit; }
  if (sort !== 0) { queries['sort'] = sort; }
  return queries;
}

// Returns a selector to get all docs with a field matching one of the array or all docs if array is empty
export function inSelector(array = []) {
  return array.length > 0 ? { '$in': array } : { '$gt': null };
}
