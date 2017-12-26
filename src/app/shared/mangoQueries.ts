// Creates a Mango query to find one document with search based on one field
export function findOneDocument(selector, query) {
  return Object.assign(findAllDocuments(selector, query), { limit: 1 });
}

// Creates a Mango query to find all documents with search based on one field
export function findAllDocuments(selector, query) {
  return JSON.parse(`
    {
      "selector": {
        "${selector}": "${query}"
      },
      "fields": ["${selector}"]
    }
  `);
}

// Creates more general find query that can search with multiple selectors & fields
export function findDocuments(selectors, fields: any = 0, sort: any = 0, limit = 1, skip = 0) {
  let query: any = {
    'selector': selectors,
    'limit': limit,
    'skip': skip
  };
  if(fields !== 0) {
    query.fields = fields;
  }
  if(sort !== 0) {
    query.sort = sort;
  }
  return query;
}
