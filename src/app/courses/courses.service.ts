import { Injectable } from '@angular/core';
import { CouchService } from '../shared/couchdb.service';
import { Subject, forkJoin, of } from 'rxjs';
import { UserService } from '../shared/user.service';
import { findDocuments, inSelector } from '../shared/mangoQueries';
import { switchMap, map, filter, take } from 'rxjs/operators';
import { RatingService } from '../shared/forms/rating.service';
import { PlanetMessageService } from '../shared/planet-message.service';
import { StateService } from '../shared/state.service';
import { TagsService } from '../shared/forms/tags.service';
import { dedupeObjectArray } from '../shared/utils';
import { MarkdownService } from '../shared/markdown.service';
import { UsersService } from '../users/users.service';
import { DataAccessService } from '../shared/data-access.service';

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
  private progressUpdated = new Subject<{ parent: boolean, planetField: string, progress: any[] }>();
  progressUpdateInProgress = false;
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
    private tagsService: TagsService,
    private markdownService: MarkdownService,
    private usersService: UsersService,
    private dataAccessService: DataAccessService
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
    this.progressUpdated.next({ progress: courses_progress, planetField, parent });
  }

  coursesListener$(reqParent = false) {
    return this.coursesUpdated.pipe(
      filter(({ parent, planetField }) => parent === reqParent && this.isReady[planetField]),
      map(({ courses }) => courses),
    );
  }

  progressListener$(reqParent = false) {
    return this.progressUpdated.pipe(filter(res => res.parent === reqParent), map(res => res.progress));
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
    obs.push(this.usersService.usersListener(true).pipe(take(1)));
    forkJoin(obs).subscribe(([ progress, course, ratings, users ]: [ any[], any, any, any[] ]) => {
      this.progress = progress;
      course.creatorDoc = users.find(user => `${user.doc.name}@${user.doc.planetCode}` === course.creator);
      this.updateCourse({ progress: progress, course: this.ratingService.createItemList([ course ], ratings)[0] });
    });
    this.usersService.requestUserData();
  }

  reset() {
    this._course = {};
    this.stepIndex = -1;
    this.returnUrl = '';
  }

  updateProgress({ courseId, stepNum, passed = true }, userId?) {
    if (this.progressUpdateInProgress === true) {
      return;
    }
    this.progressUpdateInProgress = true;
    const configuration = this.stateService.configuration;
    const newProgress = { stepNum, courseId, passed,
      userId: userId || this.userService.get()._id, createdOn: configuration.code, parentCode: configuration.parentCode,
      updatedDate: this.couchService.datePlaceholder
    };
    this.findOneCourseProgress(courseId, userId).pipe(switchMap((progress: any[] = []) => {
      const currentProgress: any[] = progress.length > 0 ? progress.filter((p: any) => p.stepNum === stepNum) : [];
      if (currentProgress.length === 1 && currentProgress.every(current => current.passed === newProgress.passed)) {
        return of({});
      }
      return this.couchService.bulkDocs(this.progressDb, this.newProgressDocs(currentProgress, newProgress));
    })).subscribe(() => {
      this.progressUpdateInProgress = false;
      this.requestCourse({ courseId });
    });
  }

  newProgressDocs(currentProgressDocs: any[], newProgress: any) {
    return currentProgressDocs.length === 0 ?
      [ { createdDate: this.couchService.datePlaceholder, ...newProgress } ] :
      currentProgressDocs.map((current, index) => index === 0 ?
        { createdDate: this.couchService.datePlaceholder, ...current, ...newProgress, passed: current.passed || newProgress.passed } :
        { ...current, _deleted: true }
      );
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

  courseResignAdmission(courseId, type, courseTitle?) {
    const title = courseTitle ? courseTitle : this.getCourseNameFromId(courseId);
    const courseIds: any = [ ...this.userService.shelf.courseIds ];
    if (type === 'resign') {
      const myCourseIndex = courseIds.indexOf(courseId);
      courseIds.splice(myCourseIndex, 1);
    } else {
      courseIds.push(courseId);
    }
    return this.dataAccessService.saveShelfData(courseIds, 'courseIds').pipe(map((res) => {
      const admissionMessage = type === 'resign'
        ? $localize`Removed from myCourses: ${title}`
        : $localize`Course added to your dashboard: ${title}`;
      this.planetMessageService.showMessage(admissionMessage);
      return res;
    }));
  }

  getCourseNameFromId(courseId, parent = false) {
    return (this[parent ? 'parent' : 'local'].courses.find( (mCourse) => mCourse._id === courseId )).courseTitle;
  }

  courseAdmissionMany(courseIds, type) {
    return this.dataAccessService.changeShelfData(courseIds, 'courseIds', type).pipe(map(({ shelf, countChanged }) => {
      const prefix = countChanged > 1 ? $localize`${countChanged} courses` : this.getCourseNameFromId(courseIds[courseIds.length - 1]);
      const message = type === 'remove' ? $localize`Removed from myCourses: ${prefix}` :
        $localize`Added to myCourses: ${prefix} `;
      this.planetMessageService.showMessage(message);
      return shelf;
    }));
  }

  stepResourceSort(a: { title: string }, b: { title: string }) {
    return a.title.localeCompare(b.title);
  }

  courseActivity(type: string, course: any, courseStep?: number) {
    this.userService.getCurrentSession().pipe(switchMap(currentSession => {
      const data = {
        'courseId': course._id,
        'title': course.courseTitle,
        'user': this.userService.get().name,
        type,
        courseStep,
        'time': this.couchService.datePlaceholder,
        'createdOn': this.stateService.configuration.code,
        'parentCode': this.stateService.configuration.parentCode,
        'session': currentSession._id
      };
      return this.couchService.updateDocument('course_activities', data);
    })).subscribe((response) => {}, (error) => console.log('Error'));
  }

  stepHasExamSurveyBoth(step): 'exam' | 'survey' | 'both' | undefined {
    const possibleTypes: ('exam' | 'survey')[] = [ 'exam', 'survey' ];
    const types: ('exam' | 'survey')[] = possibleTypes
      .filter((type: 'exam' | 'survey') => step[type] && step[type].questions && step[type].questions.length > 0);
    return types.length > 1 ? 'both' : types[0];
  }

  storeMarkdownImages(course) {
    const markdownText = (item: { description: any }) => item.description.text === undefined ? item.description : item.description.text;
    const imagesArray = (item: { description: any }) => this.markdownService.createImagesArray(item, markdownText(item), 'description');
    const images = dedupeObjectArray(
      [ course.images || [], imagesArray(course), course.steps.map(step => imagesArray(step)) ].flat(2),
      [ 'resourceId' ]
    );
    return {
      ...course,
      description: markdownText(course),
      steps: course.steps.map(step => ({ ...step, description: markdownText(step), images: undefined })),
      images: this.markdownService.filterMissingImages([ markdownText(course), ...course.steps.map(step => markdownText(step)) ], images)
    };
  }

}
