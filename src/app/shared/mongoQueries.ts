import { Injectable } from '@angular/core';

@Injectable()

export class MongoQueries {
  constructor() {}

  public findOneDocument(selector, query) {
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

 public findAllDocuments(selector, query) {
  return JSON.parse(`
    {
      "selector": {
        "${selector}": "${query}"
      },
      "fields": ["${selector}"]
    }
  `);
  }

}
