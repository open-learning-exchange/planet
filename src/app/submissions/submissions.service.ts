import { Injectable } from '@angular/core';
import { CouchService } from '../shared/couchdb.service';
import { findDocuments } from '../shared/mangoQueries';
import { UserService } from '../shared/user.service';
import { Subject } from 'rxjs/Subject';
import { of } from 'rxjs/observable/of';
import { forkJoin } from 'rxjs/observable/forkJoin';
import { switchMap, catchError, map, takeUntil } from 'rxjs/operators';
import { PlanetMessageService } from '../shared/planet-message.service';
import { Router } from '@angular/router';

@Injectable()
export class SubmissionsService {

  private submissionsUpdated = new Subject<any[]>();
  submissionsUpdated$ = this.submissionsUpdated.asObservable();
  submissions = [];
  submission: any;

  constructor(
    private couchService: CouchService,
  ) { }

  updateSubmissions({ opts = {} }: { meetupIds?: string[], opts?: any } = {}) {
    this.getSubmissions(opts).subscribe((submissions: any) => {
      this.submissions = submissions;
      this.submissionsUpdated.next(submissions);
    }, (err) => console.log(err));
  }

  getSubmissions(opts: any) {
    return this.couchService.allDocs('submissions', opts);
  }

  setSubmission(id: string) {
    this.submission = this.submissions.find((submission) => {
      return submission._id === id;
    });
  }

}
