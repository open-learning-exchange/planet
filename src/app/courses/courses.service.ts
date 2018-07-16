import { Injectable } from '@angular/core';
import { CouchService } from '../shared/couchdb.service';
import { Subject, BehaviorSubject, forkJoin, of } from 'rxjs';
import { UserService } from '../shared/user.service';
import { findDocuments } from '../shared/mangoQueries';
import { map } from 'rxjs/operators';
import { RatingService } from '../rating/rating.service';

// Service for updating and storing active course for single course views.
@Injectable()
export class CoursesService {
  private dbName = 'courses';
  private progressDb = 'courses_progress';
  course: any = { _id: '' };
  submission: any = { courseId: '', examId: '' };
  private courseUpdated = new Subject<{ progress: any, course: any }>();
  courseUpdated$ = this.courseUpdated.asObservable();
  private coursesUpdated = new BehaviorSubject<any[]>([]);
  coursesUpdated$ = this.coursesUpdated.asObservable();
  stepIndex: any;
  returnUrl: string;

  constructor(
    private couchService: CouchService,
    private userService: UserService,
    private ratingService: RatingService
  ) {}

  // Components call this to get details of one course and associated progress.
  // If the id already matches what is stored on the service, return that.
  // Or will get new version if forceLatest set to true
  // Always queries CouchDB for the latest progress by the logged in user
  requestCourse({ courseId, forceLatest = false }, opts: any = {}) {
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
      const courses = this.createCourseList([ course ], ratings.docs);
      this.course = courses[0];
      this.courseUpdated.next({ progress: progress.docs[0], course: this.course });
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

  getCourses(query = { 'selector': {} }, opts?) {
    this.couchService.findAll(this.dbName, query, opts).subscribe((courses) => {
      this.coursesUpdated.next(courses);
    });
  }

  getAllCourses(opts: any) {
    return forkJoin([
      this.couchService.allDocs(this.dbName, opts),
      this.couchService.allDocs(this.progressDb, opts),
      this.ratingService.getRatings({ itemIds: [], type: 'course' }, opts)
    ]).pipe(
      map(([ courses, progress, ratings ]) => {
        courses = this.createCourseList(courses, ratings.docs);
        return courses.map(course => ({
          ...course,
          progress: progress.find(p => p.courseId === course._id && p.userId === this.userService.get()._id) || { stepNum: 0 }
        }));
      })
    );
  }

  createCourseList(courses, ratings) {
    return this.ratingService.createItemList(courses, ratings);
  }

}
