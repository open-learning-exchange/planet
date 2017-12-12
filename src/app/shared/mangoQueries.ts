
export function findOneDocument(selector, query) {
  return JSON.parse(`
    {
      "selector": {
        "${selector}": "${query}"
      },
      "fields": ["${selector}"],
      "limit": 1
    }
  `);
}

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

export function findMultiDocuments(selectors, fields, limit=1, skip=0) {
  return JSON.parse(`
    {
      "selector": ${JSON.stringify(selectors)},
      "fields": ${JSON.stringify(fields)},
      "limit": ${limit},
      "skip": ${skip}
    }
  `);
}
