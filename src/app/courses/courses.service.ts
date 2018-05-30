import { Injectable } from '@angular/core';
import { CouchService } from '../shared/couchdb.service';
import { Subject } from 'rxjs/Subject';
import { CoursesService as PouchCoursesService, Course } from '../shared/services';

// Service for updating and storing active course for single course views.
@Injectable()
export class CoursesService {
  course: any;
  submission: any = { courseId: '', examId: '' };
  private courseUpdated: Subject<Course> = new Subject<Course>();
  courseUpdated$ = this.courseUpdated.asObservable();
  private submissionUpdated = new Subject<any>();
  submissionUpdated$ = this.submissionUpdated.asObservable();
  submissionAttempts = 0;
  stepIndex: any;
  returnUrl: string;

  constructor(
    private couchService: CouchService,
    private pouchCourseService: PouchCoursesService
  ) {}

  // Components call this to get details of one course.
  // If the id already matches what is stored on the service, return that.
  // Or will get new version if forceLatest set to true
  requestCourse({ courseId, forceLatest = false }, opts: any = {}) {
    if (!forceLatest && courseId === this.course._id) {
      this.courseUpdated.next(this.course);
    } else {
      this.getCourse(courseId, opts);
    }
  }

  private getCourse(courseId: string, opts) {
    this.pouchCourseService.getCourse(courseId).subscribe(course => {
      this.course = course;
      this.courseUpdated.next(course);
    });
  }

  reset() {
    this.course = null;
    this.stepIndex = -1;
    this.returnUrl = '';
  }

  private newSubmission({ parentId, parent, user, type }) {
    this.submission = { parentId, parent, user, type, answers: [], status: 'pending' };
  }

  openSubmission({ parentId, parent, user, type }) {
    this.couchService.post('submissions/_find', { 'selector': { parentId, user } })
      .subscribe((res) => {
        let attempts = res.docs.length - 1;
        this.submission = res.docs.find(submission => submission.status === 'pending');
        if (this.submission === undefined) {
          attempts += 1;
          this.newSubmission({ parentId, parent, user, type });
        }
        this.submissionAttempts = attempts;
        this.submissionUpdated.next({ submission: this.submission, attempts });
      });
  }

  updateSubmission(answer, index: number, close: boolean) {
    const submission = { ...this.submission, answers: [ ...this.submission.answers ] };
    submission.answers[index] = answer;
    submission.status = close ? 'complete' : 'pending';
    this.couchService.post('submissions', submission).subscribe((res) => {
      let attempts = this.submissionAttempts;
      if (submission.status === 'complete') {
        attempts += 1;
        this.newSubmission(submission);
      } else {
        this.submission = { ...submission, _id: res.id, _rev: res.rev };
      }
      this.submissionUpdated.next({ submission: this.submission, attempts });
    });
  }

}
