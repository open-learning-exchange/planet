import { Injectable } from '@angular/core';
import { CouchService } from '../shared/couchdb.service';
import { Subject, of, forkJoin } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';
import { findDocuments } from '../shared/mangoQueries';
import { StateService } from '../shared/state.service';
import { CoursesService } from '../courses/courses.service';

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
    private stateService: StateService,
    private courseService: CoursesService
  ) { }

  updateSubmissions({ query, opts = {}, parentId }: { parentId?: string, opts?: any, query?: any } = {}) {
    forkJoin([
      this.getSubmissions(query, opts),
      this.courseService.findCourses([], opts)
    ]).subscribe(([ submissions, courses ]: [any, any]) => {
      this.submissions = (parentId ? this.filterSubmissions(submissions, parentId) : submissions).filter(sub => {
        if (sub.status !== 'pending' || sub.type !== 'exam') {
          return true;
        }
        return courses.find((c: any) => sub.parentId.split('@')[1] === c._id) !== undefined;
      });
      this.submissionsUpdated.next(this.submissions);
    }, (err) => console.log(err));
  }

  getSubmissions(query: any = { 'selector': {} }, opts: any = {}) {
    return this.couchService.findAll('submissions', query, opts);
  }

  setSubmission(id: string) {
    this.submission = this.submissions.find((submission) => {
      return submission._id === id;
    });
  }

  private newSubmission({ parentId, parent, user, type }) {
    this.submission = this.createNewSubmission({ parentId, parent, user, type });
  }

  private createNewSubmission({ parentId, parent, user, type }) {
    const date = this.couchService.datePlaceholder;
    const times = { startTime: date, lastUpdateTime: date };
    const configuration = this.stateService.configuration;
    return { parentId, parent, user, type, answers: [], grade: 0, status: 'pending',
      ...this.submissionSource(configuration, user), ...times };
  }

  private submissionSource(configuration, user) {
    if (user.planetCode !== undefined && configuration.code !== user.planetCode) {
      return { source: user.planetCode, parentCode: configuration.code };
    }
    return { source: configuration.code, parentCode: configuration.parentCode };
  }

  openSubmission({ parentId = '', parent = '', user = { name: '' }, type = '', submissionId = '', status = 'pending' }: any) {
    const selector = submissionId ? { '_id': submissionId } : { parentId, 'user.name': user.name, 'parent._rev': parent._rev };
    const obs = user.name || submissionId ? this.couchService.post('submissions/_find', { selector }) : of({ docs: [] });
    obs.subscribe((res) => {
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

  submitAnswer(answer, correct: boolean, index: number) {
    const submission = { ...this.submission, answers: [ ...this.submission.answers ], lastUpdateTime: this.couchService.datePlaceholder };
    const oldAnswer = submission.answers[index];
    submission.answers[index] = this.newAnswer(answer, oldAnswer, correct);
    const nextQuestion = this.nextQuestion(submission, index, 'passed');
    if (submission.answers.findIndex(submission.answer => submission.answer.grade === undefined) === -1) {
      submission.status = 'graded';
    }
    if (correct !== undefined) {
      this.updateGrade(submission, correct ? 1 : 0, index);
    }
    return this.updateSubmission(submission, this.submission.type === 'exam', nextQuestion);
  }

  newAnswer(answer, oldAnswer, correct) {
    return ({
      value: answer,
      mistakes: (oldAnswer ? oldAnswer.mistakes : 0) + (correct === false ? 1 : 0),
      passed: correct !== false && this.validAnswer(answer)
    });
  }

  submitGrade(grade, index: number) {
    const submission = { ...this.submission, answers: [ ...this.submission.answers ], gradeTime: this.couchService.datePlaceholder };
    this.updateGrade(submission, grade, index);
    const nextQuestion = this.nextQuestion(submission, index, 'grade');
    return this.updateSubmission(submission, false, nextQuestion);
  }

  nextQuestion(submission, index, field) {
    const close = this.shouldCloseSubmission(submission, field);
    return close ? -1 : this.findNextQuestion(submission, index + 1, field);
  }

  updateGrade(submission, grade, index) {
    submission.answers[index].grade = grade;
    submission.grade = this.calcTotalGrade(submission);
  }

  updateStatus(submission: any) {
    if (submission.type === 'survey' && submission.status === 'complete') {
      return 'complete';
    }
    const statusProgression = new Map([ [ 'pending', 'complete' ], [ 'complete', 'graded' ] ]);
    return statusProgression.get(submission.status) || 'graded';
  }

  calcTotalGrade(submission: any) {
    return submission.answers.reduce((total: number, answer: any, index: number) =>
      total + (submission.parent.questions[index].marks * (answer.grade || 0)), 0);
  }

  updateSubmission(submission: any, takingExam: boolean, nextQuestion: number) {
    submission.status = nextQuestion === -1 ? this.updateStatus(submission) : submission.status;
    return this.couchService.updateDocument('submissions', submission).pipe(map((res) => {
      let attempts = this.submissionAttempts;
      if (submission.status === 'complete' && takingExam) {
        attempts += 1;
        this.newSubmission(submission);
      } else {
        this.submission = { ...submission, _id: res.id, _rev: res.rev };
      }
      this.submissionUpdated.next({ submission: this.submission, attempts });
      return { submission, nextQuestion };
    }));
  }

  filterSubmissions(submissions, parentId) {
    return submissions.filter(s => s.parentId.indexOf(parentId) > -1).reduce((subs, submission) => {
      const userSubmissionIndex = subs.findIndex((s) => s.user._id === submission.user._id && s.parentId === submission.parentId);
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

  sendSubmissionRequests(users: string[], { parentId, parent }) {
    return this.couchService.post('submissions/_find', findDocuments({
      parentId,
      'parent': { '_rev': parent._rev },
      '$or': users.map((user: any) => ({ 'user._id': user._id, 'source': user.planetCode }))
    })).pipe(
      switchMap((submissions: any) => {
        const newSubmissionUsers = users.filter((user: any) =>
          submissions.docs.findIndex((s: any) => (s.user._id === user._id && s.parent._rev === parent._rev)) === -1
        );
        return this.couchService.updateDocument('submissions/_bulk_docs', {
          'docs': newSubmissionUsers.map((user) => this.createNewSubmission({ user, parentId, parent, type: 'survey' }))
        });
      })
    );
  }

  createSubmission(parent: any, type: string, user: any = '') {
    return this.couchService.updateDocument('submissions', this.createNewSubmission({ parentId: parent._id, parent, user, type }));
  }

  submissionName(user) {
    return user.name || ((user.firstName || '') + ' ' + (user.lastName || '')).trim();
  }

  shouldCloseSubmission(submission, field) {
    return submission.answers.filter(answer => answer && this.validAnswer(answer[field])).length >= submission.parent.questions.length;
  }

  findNextQuestion(submission, index, field) {
    if (index >= submission.parent.questions.length) {
      return this.findNextQuestion(submission, 0, field);
    }
    return submission.answers[index] && this.validAnswer(submission.answers[index][field]) ?
      this.findNextQuestion(submission, index + 1, field) : index;
  }

  validAnswer(field) {
    return field !== undefined && field !== false && field !== '';
  }

}
