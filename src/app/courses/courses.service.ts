import { Injectable } from '@angular/core';
import { CouchService } from '../shared/couchdb.service';
import { Subject } from 'rxjs/Subject';
import { PlanetMessageService } from '../shared/planet-message.service';
import { UserService } from '../shared/user.service';
import { Router } from '@angular/router';
import { switchMap, catchError, map, takeUntil } from 'rxjs/operators';
import { findDocuments } from '../shared/mangoQueries';


// Service for updating and storing active course for single course views.
@Injectable()
export class CoursesService {

  course: any = { _id: '' };
  private courseUpdated = new Subject<any[]>();
  courseUpdated$ = this.courseUpdated.asObservable();
  stepIndex: any;
  returnUrl: string;
  courses = [];
  userShelf = this.userService.getUserShelf();
  private onDestroy$ = new Subject<void>();

  constructor(
    private couchService: CouchService,
    private planetMessageService: PlanetMessageService,
    private userService: UserService,
    private router: Router
  ) {
    this.userService.shelfChange$.pipe(takeUntil(this.onDestroy$))
      .subscribe(() => {
        this.userShelf = this.userService.getUserShelf();
        this.courseUpdated.next(this.setupList(this.courses, this.userShelf.courseIds));
      });
    }

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

  getCourseSecond(courseIds: string[], opts: any) {
    return this.couchService.post('courses/_find', findDocuments({
      '_id': { '$in': courseIds }
    }, 0), opts);
  }


  updateCourses({ courseIds = [], opts  = {} }: {courseIds?: string[], opts?: any } = {}) {
    const courseQuery = courseIds.length > 0 ?
      this.getCourseSecond(courseIds, opts) : this.getAllCourses(opts);
    courseQuery.subscribe((courses: any) => {
        this.courses = courses.docs ? courses.docs : courses;
        this.courseUpdated.next(this.setupList(this.courses, this.userShelf.courseIds));
      }, (err) => console.log(err));
  }

  getAllCourses(opts: any) {
    return this.couchService.allDocs('courses', opts);
  }

  setupList(courseRes, myCourses) {
    return courseRes.map((res: any) => {
      const course = res.doc || res;
      const myCourseIndex = myCourses.findIndex(courseId => {
        return course._id === courseId;
      });
      if (myCourseIndex > -1) {
        return { ...course, admission: true };
      }
      return { ...course, admission: false };
    });
  }

  admitCourse(courseId, participate) {
    console.log('CourseId', courseId);
    console.log('participate', participate);
    participate ? this.userShelf.courseIds.splice(courseId, 1)
      : this.userShelf.courseIds.push(courseId);
    console.log('This is usershelf', this.userShelf);
    this.couchService.put('shelf/' + this.userService.get()._id, this.userShelf).
      subscribe((res) => {
        this.userShelf._rev = res.rev;
        this.userService.setShelf(this.userShelf);
        const msg = participate ? 'Course successfully resigned' : 'Course added to your dashboard';
        this.planetMessageService.showMessage(msg);
      }, (error) => (error));
  }

}
