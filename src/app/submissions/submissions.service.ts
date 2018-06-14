import { Injectable } from '@angular/core';
import { CouchService } from '../shared/couchdb.service';
import { findDocuments } from '../shared/mangoQueries';
import { UserService } from '../shared/user.service';
import { Subject, of, forkJoin } from 'rxjs';
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

  updateSubmissions({ opts = {}, parentId }: { parentId?: string, opts?: any } = {}) {
    this.getSubmissions(opts).subscribe((submissions: any) => {
      this.submissions = parentId ? this.filterSubmissions(submissions, parentId) : submissions;
      this.submissionsUpdated.next(this.submissions);
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
    this.submission = { parentId, parent, user, type, answers: [], grade: 0, status: 'pending' };
  }

  openSubmission({ parentId = '', parent = '', user = '', type = '', submissionId = '', status = 'pending' }) {
    const selector = submissionId ? { '_id': submissionId } : { parentId, user };
    this.couchService.post('submissions/_find', { selector })
      .subscribe((res) => {
        let attempts = res.docs.length - 1;
        const bestAttempt = res.docs.reduce((best: any, submission: any) =>
          submission.grade > best.grade ? submission : best, res.docs[0]);
        this.submission = res.docs.find(submission => submission.status === status);
        if (this.submission === undefined) {
          attempts += 1;
          this.newSubmission({ parentId, parent, user, type });
        }
        this.submissionAttempts = attempts;
        this.submissionUpdated.next({ submission: this.submission, attempts, bestAttempt });
      });
  }

  submitAnswer(answer, correct: boolean, index: number, close: boolean) {
    const submission = { ...this.submission, answers: [ ...this.submission.answers ] };
    const oldAnswer = submission.answers[index];
    submission.answers[index] = {
      value: answer,
      mistakes: (oldAnswer ? oldAnswer.mistakes : 0) + (correct === false ? 1 : 0),
      passed: correct !== false
    };
    if (correct !== undefined) {
      this.updateGrade(submission, correct ? 1 : 0, index);
    }
    return this.updateSubmission(submission, true, close);
  }

  submitGrade(grade, index: number, close) {
    const submission = { ...this.submission, answers: [ ...this.submission.answers ] };
    this.updateGrade(submission, grade, index);
    return this.updateSubmission(submission, false, close);
  }

  updateGrade(submission, grade, index) {
    submission.answers[index].grade = grade;
    submission.grade = this.calcTotalGrade(submission);
  }

  updateStatus(submission: any) {
    const statusProgression = new Map([ [ 'pending', 'complete' ], [ 'complete', 'graded' ] ]);
    return statusProgression.get(submission.status) || 'graded';
  }

  calcTotalGrade(submission: any) {
    return submission.answers.reduce((total: number, answer: any, index: number) =>
      total + (submission.parent.questions[index].marks * (answer.grade || 0)), 0);
  }

  updateSubmission(submission: any, takingExam: boolean, close: boolean) {
    submission.status = close ? this.updateStatus(submission) : submission.status;
    return this.couchService.post('submissions', submission).pipe(map((res) => {
      let attempts = this.submissionAttempts;
      if (submission.status === 'complete' && takingExam) {
        attempts += 1;
        this.newSubmission(submission);
      } else {
        this.submission = { ...submission, _id: res.id, _rev: res.rev };
      }
      this.submissionUpdated.next({ submission: this.submission, attempts });
    }));
  }

  filterSubmissions(submissions, parentId) {
    return submissions.filter(s => s.parentId === parentId).reduce((subs, submission) => {
      const userSubmissionIndex = subs.findIndex((s) => s.user === submission.user);
      if (userSubmissionIndex !== -1) {
        const oldSubmission = subs[userSubmissionIndex];
        subs[userSubmissionIndex] = this.calcTotalGrade(submission) > this.calcTotalGrade(oldSubmission) ?
          submission : oldSubmission;
      } else {
        subs.push(submission);
      }
      return subs;
    }, []);
  }

}
