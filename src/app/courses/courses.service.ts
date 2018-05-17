import { Injectable } from '@angular/core';
import { CouchService } from '../shared/couchdb.service';
import { Subject } from 'rxjs/Subject';

// Service for updating and storing active course for single course views.
@Injectable()
export class CoursesService {

  course: any = { _id: '' };
  submission: any = { courseId: '', examId: '' };
  private courseUpdated = new Subject<any[]>();
  courseUpdated$ = this.courseUpdated.asObservable();
  stepIndex: any;
  returnUrl: string;

  constructor(
    private couchService: CouchService
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
    this.couchService.get('courses/' + courseId, opts).subscribe(course => {
      this.course = course;
      this.courseUpdated.next(course);
    });
  }

  reset() {
    this.course = { _id: '' };
    this.stepIndex = -1;
    this.returnUrl = '';
  }

  private newSubmission({ courseId, examId, user }) {
    this.submission = { courseId, examId, user, answers: [], status: 'pending' };
  }

  openSubmission({ courseId, examId, user }) {
    this.couchService.post('submissions/_find', { 'selector': { courseId, examId, user, status: 'pending' } })
      .subscribe((res) => {
        if (res.docs.length > 0) {
          this.submission = res.docs[0];
        } else {
          this.newSubmission({ courseId, examId, user });
        }
      });
  }

  updateSubmission(answer, index: number, close: boolean) {
    const submission = { ...this.submission, answers: [ ...this.submission.answers ] };
    submission.answers[index] = answer;
    submission.status = close ? 'complete' : 'pending';
    this.couchService.post('submissions', submission).subscribe((res) => {
      this.submission = { ...submission, _id: res.id, _rev: res.rev };
    });
  }

}
