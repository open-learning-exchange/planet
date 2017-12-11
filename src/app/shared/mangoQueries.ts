
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

export function findMultiDocuments(selectors, fields, limit, skip) {
  return JSON.parse(`
    {
      "selector": ${JSON.stringify(selectors[0])},
      "fields": ${JSON.stringify(fields)},
      "limit": ${limit},
      "skip": ${skip}
    }
  `);
}
