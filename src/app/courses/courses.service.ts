import { Injectable } from '@angular/core';
import { CouchService } from '../shared/couchdb.service';
import { Subject, forkJoin, of, combineLatest, zip } from 'rxjs';
import { UserService } from '../shared/user.service';
import { findDocuments, inSelector } from '../shared/mangoQueries';
import { switchMap, map, startWith, skip, debounceTime } from 'rxjs/operators';
import { RatingService } from '../shared/forms/rating.service';
import { PlanetMessageService } from '../shared/planet-message.service';
import { StateService } from '../shared/state.service';
import { TagsService } from '../shared/forms/tags.service';

// Service for updating and storing active course for single course views.
@Injectable({
  providedIn: 'root'
})
export class CoursesService {
  private dbName = 'courses';
  private progressDb = 'courses_progress';
  private _course: any = {};
  get course() {
    return this._course;
  }
  set course(newCourse: any) {
    this._course = { ...this._course, ...newCourse };
  }
  progress: any;
  submission: any = { courseId: '', examId: '' };
  private courseUpdated = new Subject<{ progress: any, course: any }>();
  courseUpdated$ = this.courseUpdated.asObservable();
  private coursesUpdated = new Subject<{ parent: boolean, planetField: string, courses: any[] }>();
  stepIndex: any;
  returnUrl: string;
  currentParams: any;
  local = { courses: [], ratings: [], tags: [], courses_progress: [] };
  parent = { courses: [], ratings: [], tags: [], courses_progress: [] };
  isReady = { local: false, parent: false };

  constructor(
    private couchService: CouchService,
    private userService: UserService,
    private ratingService: RatingService,
    private planetMessageService: PlanetMessageService,
    private stateService: StateService,
    private tagsService: TagsService
  ) {
    const handleStateRes = (res: any, dataName: string) => {
      if (res !== undefined) {
        this.isReady[res.planetField] = dataName === this.dbName ? true : this.isReady[res.planetField];
        this[res.planetField][dataName] = res.newData;
        this.mergeData(this[res.planetField], res.planetField, res.planetField === 'parent');
      }
    };
    this.ratingService.ratingsUpdated$.subscribe((res: any) => {
      if (res !== undefined) {
        const planetField = res.parent ? 'parent' : 'local';
        this[planetField].ratings = res.ratings;
        this.mergeData(this[planetField], planetField, res.parent);
      }
    });
    this.stateService.couchStateListener('tags').subscribe((res: any) => handleStateRes(res, 'tags'));
    this.stateService.couchStateListener(this.dbName).subscribe((res: any) => handleStateRes(res, this.dbName));
    this.stateService.couchStateListener(this.progressDb).subscribe((res: any) => handleStateRes(res, this.progressDb));
  }

  requestCourses(parent = false) {
    this.stateService.requestData(this.dbName, parent ? 'parent' : 'local');
    this.stateService.requestData(this.progressDb, parent ? 'parent' : 'local');
    this.stateService.requestData('tags', parent ? 'parent' : 'local');
    this.ratingService.newRatings(parent);
  }

  mergeData({ courses, courses_progress, ratings, tags }, planetField = 'local', parent = false) {
    tags = tags.map(this.tagsService.fillSubTags);
    const data = courses.map((course: any) => ({
      doc: course,
      _id: course._id,
      _rev: course._rev,
      progress: courses_progress.filter((p: any) => p.courseId === course._id && p.userId === this.userService.get()._id) || [],
      rating: this.ratingService.createItemList([ course ], ratings)[0].rating,
      tags: this.tagsService.attachTagsToDocs(this.dbName, [ course ], tags)[0].tags
    }));
    this.coursesUpdated.next({ courses: data, planetField, parent });
  }

  coursesListener$(reqParent = false) {
    return this.coursesUpdated.pipe(
      map(({ parent, planetField, courses }) => parent === reqParent && this.isReady[planetField] ? courses : undefined)
    );
  }

  progressLearnerListener$(parent = false) {
    return this.coursesListener$(parent).pipe(
      map((response) => response ? response.filter((course: any) => course.progress.length > 0) : response)
    );
  }

  updateCourse({ course, progress }) {
    this.course = course;
    this.courseUpdated.next({ course, progress });
  }

  // Components call this to get details of one course and associated progress.
  // If the id already matches what is stored on the service, return that.
  // Or will get new version if forceLatest set to true
  // Always queries CouchDB for the latest progress by the logged in user
  requestCourse({ courseId, forceLatest = false, parent = false }, opts: any = {}) {
    opts = { ...opts, domain: parent ? this.stateService.configuration.parentDomain : '' };
    this.currentParams = { ids: [ courseId ], opts };
    const obs = [ parent ? of([]) : this.findOneCourseProgress(courseId) ];
    if (!forceLatest && courseId === this.course._id) {
      obs.push(of(this.course));
    } else {
      obs.push(this.couchService.get(this.dbName + '/' + courseId, opts));
    }
    obs.push(this.ratingService.getRatings({ itemIds: [ courseId ], type: 'course' }, opts));
    forkJoin(obs).subscribe(([ progress, course, ratings ]: [ any[], any, any ]) => {
      this.progress = progress;
      this.updateCourse({ progress: progress, course: this.createCourseList([ course ], ratings)[0] });
    });
  }

  reset() {
    this._course = {};
    this.stepIndex = -1;
    this.returnUrl = '';
  }

  updateProgress({ courseId, stepNum, passed = true }, userId?) {
    const configuration = this.stateService.configuration;
    const newProgress = { stepNum, courseId, passed,
      userId: userId || this.userService.get()._id, createdOn: configuration.code, parentCode: configuration.parentCode,
      updatedDate: this.couchService.datePlaceholder
    };
    this.findOneCourseProgress(courseId, userId).pipe(switchMap((progress: any[] = []) => {
      const currentProgress: any = progress.length > 0 ? progress.find((p: any) => p.stepNum === stepNum) : undefined;
      if (currentProgress !== undefined && currentProgress.passed === newProgress.passed) {
        return of({});
      }
      return this.couchService.updateDocument(
        this.progressDb, { createdDate: this.couchService.datePlaceholder, ...currentProgress, ...newProgress }
      );
    })).subscribe(() => {
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

  findCourses(ids, opts) {
    return this.couchService.findAll(this.dbName, findDocuments({ '_id': inSelector(ids) }), opts);
  }

  findProgress(ids, opts) {
    const userQuery = opts.allUsers ? {} : { 'userId': this.userService.get()._id };
    return this.couchService.findAll(
      this.progressDb,
      findDocuments({ 'courseId': inSelector(ids), ...userQuery }), opts
    );
  }

  findOneCourseProgress(courseId: string, userId?) {
    return this.couchService.findAll(this.progressDb, findDocuments({
      'userId': userId || this.userService.get()._id,
      courseId
    }));
  }

  createCourseList(courses, ratings) {
    return this.ratingService.createItemList(courses, ratings);
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
      const admissionMessage = type === 'resign' ? this.getCourseNameFromId(courseId) + ' successfully removed from myCourses' :
        this.getCourseNameFromId(courseId) + ' added to your dashboard';
      this.planetMessageService.showMessage(admissionMessage);
      return res;
    }));
  }

  getCourseNameFromId(courseId, parent = false) {
    return (this[parent ? 'parent' : 'local'].courses.find( (mCourse) => mCourse._id === courseId )).courseTitle;
  }

  courseAdmissionMany(courseIds, type) {
    return this.userService.changeShelf(courseIds, 'courseIds', type).pipe(map(({ shelf, countChanged }) => {
      const prefix = countChanged > 1 ? countChanged + ' courses' : this.getCourseNameFromId(courseIds[courseIds.length - 1]);
      const message = type === 'remove' ? prefix + ' successfully removed from myCourses' : prefix + ' added to your dashboard';
      this.planetMessageService.showMessage(message);
      return shelf;
    }));
  }

  stepResourceSort(a: { title: string }, b: { title: string }) {
    return a.title.localeCompare(b.title);
  }

}
