import { Injectable } from '@angular/core';
import { CouchService } from '../shared/couchdb.service';
import { Subject, forkJoin, of } from 'rxjs';
import { UserService } from '../shared/user.service';
import { findDocuments } from '../shared/mangoQueries';

// Service for updating and storing active course for single course views.
@Injectable()
export class CoursesService {

  course: any = { _id: '' };
  submission: any = { courseId: '', examId: '' };
  private courseUpdated = new Subject<{ progress: any, course: any }>();
  courseUpdated$ = this.courseUpdated.asObservable();
  stepIndex: any;
  returnUrl: string;

  constructor(
    private couchService: CouchService,
    private userService: UserService
  ) {}

  // Components call this to get details of one course and associated progress.
  // If the id already matches what is stored on the service, return that.
  // Or will get new version if forceLatest set to true
  // Always queries CouchDB for the latest progress by the logged in user
  requestCourse({ courseId, forceLatest = false }, opts: any = {}) {
    const obs = [
      this.couchService.post('courses_progress/_find', findDocuments({
        'userId': this.userService.get()._id,
        courseId
      }))
    ];
    if (!forceLatest && courseId === this.course._id) {
      obs.push(of(this.course));
    } else {
      obs.push(this.couchService.get('courses/' + courseId, opts));
    }
    forkJoin(obs).subscribe(([ progress, course ]) => {
      this.course = course;
      this.courseUpdated.next({ progress: progress.docs[0], course });
    });
  }

  reset() {
    this.course = { _id: '' };
    this.stepIndex = -1;
    this.returnUrl = '';
  }

  updateProgress({ courseId, stepNum, progress = {} }) {
    const newProgress = { ...progress, stepNum, courseId, userId: this.userService.get()._id };
    this.couchService.post('courses_progress', newProgress).subscribe(() => {
      this.requestCourse({ courseId });
    });
  }

}
