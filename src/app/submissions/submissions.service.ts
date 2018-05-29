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

  // Currently there are separate observables for the single submission for a specific exam
  // and an array of submissions for the list of submissions
  private submissionsUpdated = new Subject<any[]>();
  submissionsUpdated$ = this.submissionsUpdated.asObservable();
  submissions = [];
  submission: any;
  private submissionUpdated = new Subject<any>();
  submissionUpdated$ = this.submissionUpdated.asObservable();
  submissionAttempts = 0;

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

  private newSubmission({ parentId, parent, user, type }) {
    this.submission = { parentId, parent, user, type, answers: [], grades: [], status: 'pending' };
  }

  openSubmission({ parentId = '', parent = '', user = '', type = '', submissionId = '', status = 'pending' }) {
    const selector = submissionId ? { '_id': submissionId } : { parentId, user };
    this.couchService.post('submissions/_find', { selector })
      .subscribe((res) => {
        let attempts = res.docs.length - 1;
        this.submission = res.docs.find(submission => submission.status === status);
        if (this.submission === undefined) {
          attempts += 1;
          this.newSubmission({ parentId, parent, user, type });
        }
        this.submissionAttempts = attempts;
        this.submissionUpdated.next({ submission: this.submission, attempts });
      });
  }

  submitAnswer(answer, index: number, close: boolean) {
    const submission = { ...this.submission, answers: [ ...this.submission.answers ] };
    submission.answers[index] = answer;
    submission.status = close ? 'complete' : 'pending';
    this.updateSubmission(submission, true);
  }

  submitGrade(grade, index: number) {
    const submission = { ...this.submission, grades: [ ...this.submission.grades ] };
    submission.grades[index] = grade;
    this.updateSubmission(submission, false);
  }

  updateSubmission(submission: any, takingExam: boolean) {
    this.couchService.post('submissions', submission).subscribe((res) => {
      let attempts = this.submissionAttempts;
      if (submission.status === 'complete' && takingExam) {
        attempts += 1;
        this.newSubmission(submission);
      } else {
        this.submission = { ...submission, _id: res.id, _rev: res.rev };
      }
      this.submissionUpdated.next({ submission: this.submission, attempts });
    });
  }

}
