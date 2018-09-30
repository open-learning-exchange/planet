import { Injectable } from '@angular/core';
import { PouchService } from './pouch.service';
import { Observable, from } from 'rxjs';
import { map, filter } from 'rxjs/operators';

interface Feedback {
  _id: string;
  owner: string;
  priority: string;
  type: string;
  openTime: Date;
  status: string;
  messages: [
    {
      message: string;
      time: Date;
      user: string;
    }
  ];
  source: string;
  title: string;
}

@Injectable()
export class FeedbackService {
  private feedbackDB;

  constructor(private pouchService: PouchService) {
    this.feedbackDB = pouchService.getLocalPouchDB('feedback');

    this.feedbackDB
      .createIndex({
        index: {
          fields: [ 'owner', 'openTime' ]
        }
      })
      .catch(error => {
        console.log(error);
      });
  }

  getFeedbacks(isAdmin: boolean, name: string): Observable<Feedback[]> {
    if (isAdmin) {
      return from(
        this.feedbackDB.allDocs({
          include_docs: true,
          descending: true,
          endkey: '_design0'
        })
      ).pipe(map(({ rows }) => rows.map(row => row.doc)));
    }

    return from(
      this.feedbackDB.find({
        selector: { owner: name, openTime: { $gte: null } },
        sort: [ { openTime: 'desc' } ]
      })
    ).pipe(map((data: { docs: Feedback[] }) => data.docs));
  }
}
