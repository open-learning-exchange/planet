
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

export function findMultiDocuments(selector, query) {
  return JSON.parse(`
    {
      "selector": { "$and": [{"${selector}": "${query}"}] },
      "fields": ["${selector}"]
     }
  `);
}