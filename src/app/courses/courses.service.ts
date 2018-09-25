import { Injectable } from '@angular/core';
import { CouchService } from '../shared/couchdb.service';
import { Subject, forkJoin, of } from 'rxjs';
import { UserService } from '../shared/user.service';
import { findDocuments, inSelector } from '../shared/mangoQueries';
import { switchMap, map } from 'rxjs/operators';
import { RatingService } from '../shared/forms/rating.service';
import { PlanetMessageService } from '../shared/planet-message.service';

// Service for updating and storing active course for single course views.
@Injectable()
export class CoursesService {
  private dbName = 'courses';
  private progressDb = 'courses_progress';
  course: any = { _id: '' };
  progress: any;
  submission: any = { courseId: '', examId: '' };
  private courseUpdated = new Subject<{ progress: any, course: any }>();
  courseUpdated$ = this.courseUpdated.asObservable();
  courses: any = [];
  private coursesUpdated = new Subject<any[]>();
  coursesUpdated$ = this.coursesUpdated.asObservable();
  stepIndex: any;
  returnUrl: string;
  currentParams: any;

  constructor(
    private couchService: CouchService,
    private userService: UserService,
    private ratingService: RatingService,
    private planetMessageService: PlanetMessageService
  ) {
    this.ratingService.ratingsUpdated$.pipe(switchMap(() => {
      const { ids, opts } = this.currentParams;
      return this.findRatings(ids, opts);
    })).subscribe((ratings) => {
      this.updateCourses(this.createCourseList(this.courses, ratings.docs));
      this.updateCourse({ course: this.createCourseList([ this.course ], ratings.docs)[0], progress: this.progress });
    });
  }

  updateCourses(courses) {
    this.courses = courses;
    this.coursesUpdated.next(courses);
  }

  updateCourse({ course, progress }) {
    this.course = course;
    this.courseUpdated.next({ course, progress });
  }

  // Components call this to get details of one course and associated progress.
  // If the id already matches what is stored on the service, return that.
  // Or will get new version if forceLatest set to true
  // Always queries CouchDB for the latest progress by the logged in user
  requestCourse({ courseId, forceLatest = false }, opts: any = {}) {
    this.currentParams = { ids: [ courseId ], opts };
    const obs = [
      this.couchService.post(this.progressDb + '/_find', findDocuments({
        'userId': this.userService.get()._id,
        courseId
      }))
    ];
    if (!forceLatest && courseId === this.course._id) {
      obs.push(of(this.course));
    } else {
      obs.push(this.couchService.get(this.dbName + '/' + courseId, opts));
    }
    obs.push(this.ratingService.getRatings({ itemIds: [ courseId ], type: 'course' }, opts));

    forkJoin(obs).subscribe(([ progress, course, ratings ]) => {
      this.updateCourse({ progress: progress.docs[0], course: this.createCourseList([ course ], ratings.docs)[0] });
    });
  }

  reset() {
    this.course = { _id: '' };
    this.stepIndex = -1;
    this.returnUrl = '';
  }

  updateProgress({ courseId, stepNum, passed = true, progress = {} }) {
    const newProgress = { ...progress, stepNum, courseId, passed, userId: this.userService.get()._id };
    this.couchService.post(this.progressDb, newProgress).subscribe(() => {
      this.requestCourse({ courseId });
    });
  }

  attachedItemsOfCourses(courses: any[]) {
    return courses.reduce((attached, course) => {
      course.steps.forEach(step => {
        attached.resources = attached.resources.concat(step.resources || []);
        attached.exams = attached.exams.concat(step.exam ? [ step.exam ] : []);
      });
      return attached;
    }, { resources: [], exams: [] });
  }

  getCourses({ ids = [], addProgress = false, addRatings = false }, opts?) {
    this.currentParams = { ids, opts };
    const observables = [ this.findCourses(ids, opts) ];
    observables.push(addProgress ? this.findProgress(ids, opts) : of([]));
    observables.push(addRatings ? this.findRatings(ids, opts) : of([]));
    forkJoin(observables).subscribe(([ courses, progress, ratings ]: any[]) => {
      if (addRatings) {
        courses = this.createCourseList(courses, ratings.docs);
      }
      if (addProgress) {
        courses = courses.map(course => ({
          ...course,
          progress: progress.find((p: any) => p.courseId === course._id && p.userId === this.userService.get()._id) || { stepNum: 0 }
        }));
      }
      this.courses = courses;
      this.coursesUpdated.next(courses);
    });
  }

  findCourses(ids, opts) {
    return this.couchService.findAll(this.dbName, findDocuments({ '_id': inSelector(ids) }), opts);
  }

  findProgress(ids, opts) {
    return this.couchService.findAll(
      this.progressDb,
      findDocuments({ 'courseId': inSelector(ids), 'userId': this.userService.get()._id }), opts
    );
  }

  findRatings(ids, opts) {
    return this.ratingService.getRatings({ itemIds: ids, type: 'course' }, opts);
  }

  createCourseList(courses, ratings) {
    return this.ratingService.createItemList(courses, ratings);
  }

  getUsersCourses(userId) {
    this.couchService.post('courses_progress/_find', findDocuments({ 'userId': userId }, [ 'courseId' ])).subscribe(response => {
      // Added [ 0 ] as when no record it will return all records
      const courseIds = response.docs.map(c => c.courseId).concat([ '0' ]);
      this.getCourses({ ids: courseIds });
    });
  }

  courseResignAdmission(courseId, type) {
    const courseIds: any = [ ...this.userService.shelf.courseIds ];
    if (type === 'resign') {
      const myCourseIndex = courseIds.indexOf(courseId);
      courseIds.splice(myCourseIndex, 1);
    } else {
      courseIds.push(courseId);
    }
    return this.userService.updateShelf(courseIds, 'courseIds').pipe(map((res) => {
      const admissionMessage = type === 'resign' ? 'Course successfully resigned from myCourses' : 'Course added to your dashboard';
      this.planetMessageService.showMessage(admissionMessage);
      return res;
    }));
  }

  libraryAddRemove(courseIds, type) {
    return this.userService.changeShelf(courseIds, 'courseIds', type).pipe(map((res) => {
      const admissionMessage = type === 'remove' ? 'Course successfully removed from myLibrary' : 'Course added to your dashboard';
      this.planetMessageService.showMessage(admissionMessage);
      return res;
    }));
  }
}
