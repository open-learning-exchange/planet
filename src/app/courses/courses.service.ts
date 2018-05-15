import { Injectable } from '@angular/core';
import { CouchService } from '../shared/couchdb.service';
import { Subject } from 'rxjs/Subject';
import { PlanetMessageService } from '../shared/planet-message.service';
import { UserService } from '../shared/user.service';

// Service for updating and storing active course for single course views.
@Injectable()
export class CoursesService {

  course: any = { _id: '' };
  private shelfUpdate = new Subject<any[]>();
  shelfUpdate$ = this.shelfUpdate.asObservable();
  private updateCourseAdmission = new Subject<any>();
  updateCourseAdmission$ = this.updateCourseAdmission.asObservable();
  private updateCourseResigin = new Subject<any>();
  updateCourseResigin$ = this.updateCourseResigin.asObservable();
  private courseUpdated = new Subject<any[]>();
  courseUpdated$ = this.courseUpdated.asObservable();
  stepIndex: any;
  returnUrl: string;

  constructor(
    private couchService: CouchService,
    private planetMessageService: PlanetMessageService,
    private userService: UserService
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

  setCourseAdmission(id) {
    this.updateCourseAdmission.next(id);
  }

  setCourseResigin(id) {
    this.updateCourseResigin.next(id);
  }

  updateShelf(newShelf, message) {
    const newShelfAndMessageArray = [];
    newShelfAndMessageArray[0] = newShelf;
    newShelfAndMessageArray[1] = message;
    this.shelfUpdate.next(newShelfAndMessageArray);
  }

}
