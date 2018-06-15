import { Injectable } from '@angular/core';
import { CouchService } from '../shared/couchdb.service';
import { Subject, BehaviorSubject, forkJoin, of } from 'rxjs';
import { UserService } from '../shared/user.service';
import { findDocuments } from '../shared/mangoQueries';
import { catchError } from 'rxjs/operators';

const startingRating = { rateSum: 0, totalRating: 0, maleRating: 0, femaleRating: 0, userRating: {} };

// Service for updating and storing active course for single course views.
@Injectable()
export class CoursesService {

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

  updateProgress({ courseId, stepNum, passed = true, progress = {} }) {
    const newProgress = { ...progress, stepNum, courseId, passed, userId: this.userService.get()._id };
    this.couchService.post('courses_progress', newProgress).subscribe(() => {
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
    this.couchService.findAll('courses', query, opts).subscribe((courses) => {
      this.coursesUpdated.next(courses);
    });
  }

  updateCourses({ courseIds = [], opts = {} }: { courseIds?: string[], opts?: any } = {}) {
    const courseQuery = courseIds.length > 0 ?
      this.getCourses({ 'selector': { '_id': { '$in': courseIds } } }, opts) : this.getAllCourses(opts);
    forkJoin(courseQuery, this.getRatings(courseIds, opts)).subscribe((results: any) => {
      const coursesRes = results[0].docs || results[0],
        ratingsCourse = results[1];
      this.courseUpdated.next(this.createCourseList(coursesRes, ratingsCourse.docs));
    }, (err) => console.log(err));
  }

  getAllCourses(opts: any) {
    return this.couchService.allDocs('courses', opts);
  }

  getRatings(courseIds: string[], opts: any) {
    const itemSelector = courseIds.length > 0 ?
      { '$in': courseIds } : { '$gt': null };
    return this.couchService.post('ratings/_find', findDocuments({
      // Selector
      'type': 'course',
      // Must have sorted property in selector to sort correctly
      'item': { '$gt': null }
    }, 0, [ { 'item': 'desc' } ], 1000), opts).pipe(catchError(err => {
      // If there's an error, return a fake couchDB empty response
      // so courses can be displayed.
      return of({ docs: [] });
    }));
  }

  createCourseList(coursesRes, ratings) {
    return coursesRes.map((c: any) => {
      const course = c.doc || c;
      const ratingIndex = ratings.findIndex(rating => {
        return course._id === rating.item;
      });
      if (ratingIndex > -1) {
        const ratingInfo = this.addRatingToCourse(course._id, ratingIndex, ratings, Object.assign({}, startingRating));
        return { ...course, rating: ratingInfo };
      }
      return { ...course,  rating: Object.assign({}, startingRating) };
    });
  }

  addRatingToCourse(id, index, ratings, ratingInfo: any) {
    const rating = ratings[index];
    // If totalRating is undefined, will start count at 1
    ratingInfo.totalRating = ratingInfo.totalRating + 1;
    ratingInfo.rateSum = ratingInfo.rateSum + rating.rate;
    switch (rating.user.gender) {
      case 'male':
        ratingInfo.maleRating = ratingInfo.maleRating + 1;
        break;
      case 'female':
        ratingInfo.femaleRating = ratingInfo.femaleRating + 1;
        break;
    }
    ratingInfo.userRating = rating.user.name === this.userService.get().name ? rating : ratingInfo.userRating;
    if (ratings.length > index + 1 && ratings[index + 1].item === id) {
      // Ratings are sorted by course id,
      // so this recursion will add all ratings to course
      return this.addRatingToCourse(id, index + 1, ratings, ratingInfo);
    }
    return ratingInfo;
  }

}
