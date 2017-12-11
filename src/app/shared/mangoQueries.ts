
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

export function findMultiDocuments(selectors) {
  const fields = [];
  for (const key in selectors) {
    if (key) {
      for (const key1 in selectors[key]) {
        if (key1) {
          fields.push(selectors[key][key1]);
        }
      }
    }
  }
  return JSON.parse(`
    {
      "selector": { "$and": ${JSON.stringify(selectors)} },
      "fields": ${JSON.stringify(fields)}
    }
  `);
}
