import { Injectable } from '@angular/core';
import { forkJoin } from 'rxjs';
import { map, take } from 'rxjs/operators';
import { CouchService } from '../../shared/couchdb.service';
import { findDocuments } from '../../shared/mangoQueries';
import { dedupeShelfReduce, ageFromBirthDate } from '../../shared/utils';
import { UsersService } from '../../users/users.service';
import { MatLegacyDialog as MatDialog } from '@angular/material/legacy-dialog';
import { DialogsViewComponent } from '../../shared/dialogs/dialogs-view.component';
import { StateService } from '../../shared/state.service';
import { CoursesService } from '../../courses/courses.service';

interface ActivityRequestObject {
  planetCode?: string;
  tillDate?: number;
  fromMyPlanet?: boolean;
  filterAdmin?: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class ReportsService {

  users: any[] = [];
  readonly standardTimeFilters = [
    { value: '24h', label: $localize`Last 24 Hours` },
    { value: '7d', label: $localize`Last 7 Days` },
    { value: '1m', label: $localize`Last Month` },
    { value: '6m', label: $localize`Last 6 Months` },
    { value: '12m', label: $localize`Last 12 Months` },
    { value: 'all', label: $localize`All Time` },
    { value: 'custom', label: $localize`Custom` },
  ];

  constructor(
    private couchService: CouchService,
    private usersService: UsersService,
    private dialog: MatDialog,
    private stateService: StateService,
    private coursesService: CoursesService
  ) {}

  groupBy(array, fields, { sumField = '', maxField = '', uniqueField = '', includeDocs = false } = {}) {
    return array.reduce((group, item) => {
      const currentValue = group.find((groupItem) => fields.every(field => groupItem[field] === item[field]));
      const sumValue = sumField ? (item[sumField] || 0) : 0;
      if (currentValue) {
        currentValue.count = currentValue.count + 1;
        currentValue.sum = currentValue.sum + sumValue;
        currentValue.max = maxField ?
          (currentValue.max[maxField] < item[maxField] ? item : currentValue.max) :
          {};
        currentValue.unique = uniqueField ? currentValue.unique.concat([ item[uniqueField] ]).reduce(dedupeShelfReduce, []) : [];
        currentValue.docs = includeDocs ? [ ...currentValue.docs, item ] : currentValue.docs;
      } else {
        const newEntry = fields.reduce((newObj, field) => {
          newObj[field] = item[field];
          return newObj;
        }, {});
        group.push({ ...newEntry, count: 1, sum: sumValue, max: item, unique: [ item[uniqueField] ], docs: [ item ] });
      }
      return group;
    }, []);
  }

  groupByMonth(array, dateField, uniqueField = '') {
    return this.groupBy(
      array.map(item => {
        const fullDate = new Date(item[dateField]);
        return { ...item, date: new Date(fullDate.getFullYear(), fullDate.getMonth(), 1).valueOf() };
      }),
      [ 'date', 'gender' ],
      { uniqueField }
    );
  }

  groupViewByMonth(rows: { key: any, value: any }[]) {
    return this.groupBy(
      this.appendGender(rows.map(row => ({
        ...row,
        user: row.key.user,
        date: new Date(row.key.year, row.key.month, 1).valueOf(),
        viewCount: row.value.count,
        createdOn: row.key.createdOn
      }))),
      [ 'createdOn', 'date', 'gender' ],
      { sumField: 'viewCount', uniqueField: 'user' }
    );
  }

  selector(planetCode: string, { field = 'createdOn', tillDate, dateField = 'time', fromMyPlanet }: any = { field: 'createdOn' }) {
    return planetCode ?
      findDocuments({
        ...{ [field]: planetCode },
        ...this.timeFilter(dateField, tillDate),
        ...(fromMyPlanet !== undefined ? { androidId: { '$exists': fromMyPlanet } } : {})
      }) :
      undefined;
  }

  getTotalUsers(planetCode: string, local: boolean) {
    const adminName = this.stateService.configuration.adminName.split('@')[0];
    const obs = local ?
      this.usersService.getAllUsers() :
      this.couchService.findAll('child_users', this.selector(planetCode, { field: 'planetCode' }));
    return obs.pipe(map((users: any) => {
      users = users.filter(user => user.name !== 'satellite' && user.name !== adminName);
      this.users = users;
      return this.groupUsers(users);
    }));
  }

  groupUsers(users: any[]) {
    return ({
      count: users.length,
      byGender: users.reduce((usersByGender: any, user: any) => {
        const userRecord = user.doc || user;
        const rawGender = userRecord?.gender;
        const normalizedGender = typeof rawGender === 'string' ? rawGender.toLowerCase() : '';
        const hasGender = rawGender !== undefined && rawGender !== null && rawGender !== '';
        const gender = normalizedGender === 'male' || normalizedGender === 'female' || normalizedGender === 'other'
          ? normalizedGender
          : hasGender ? 'other' : 'didNotSpecify';
        usersByGender[gender] += 1;
        return usersByGender;
      }, { 'male': 0, 'female': 0, 'other': 0, 'didNotSpecify': 0 }),
      byMonth: this.groupByMonth(users, 'joinDate')
    });
  }

  getActivities(db: 'login_activities' | 'resource_activities', view: 'byPlanet' | 'byPlanetRecent' | 'grouped' = 'byPlanet', domain?) {
    return this.couchService.get(`${db}/_design/${db}/_view/${view}?group=true`, { domain });
  }

  getAllActivities(
    db: 'login_activities' | 'resource_activities' | 'course_activities',
    { planetCode, tillDate, fromMyPlanet, filterAdmin }: ActivityRequestObject = {}
  ) {
    const dateField = db === 'login_activities' ? 'loginTime' : 'time';
    return this.couchService.findAll(db, this.selector(planetCode, { tillDate, dateField, fromMyPlanet }))
    .pipe(map((activities: any) => {
      return this.filterAdmin(activities, filterAdmin);
    }));
  }

  groupLoginActivities(loginActivities) {
    return ({
      byUser: this.groupBy(loginActivities, [ 'parentCode', 'createdOn', 'user' ], { maxField: 'loginTime' })
        .filter(loginActivity => loginActivity.user !== '' && loginActivity.user !== undefined).sort((a, b) => b.count - a.count),
      byMonth: this.groupByMonth(this.appendGender(loginActivities), 'loginTime', 'user')
    });
  }

  getRatingInfo({ planetCode, tillDate, fromMyPlanet, filterAdmin }: ActivityRequestObject = {}) {
    return this.couchService.findAll('ratings', this.selector(planetCode, { tillDate, dateField: 'time', fromMyPlanet })).pipe(
      map((ratings: any) => this.filterAdmin(ratings, filterAdmin)));
  }

  groupRatings(ratings) {
    return this.groupBy(ratings, [ 'parentCode', 'createdOn', 'type', 'item', 'title' ], { sumField: 'rate' })
      .filter(rating => rating.title !== '' && rating.title !== undefined)
      .sort((a: any, b: any) => (b.sum / b.count) - (a.sum / a.count)).map((r: any) =>
        ({ ...r, value: Math.round(10 * r.sum / r.count) / 10 }));
  }

  groupDocVisits(activites, type: 'resourceId' | 'courseId') {
    return ({
      byDoc: this.groupBy(activites, [ 'parentCode', 'createdOn', type ], { maxField: 'time' })
        .filter(activity => activity.title !== '' && activity !== undefined),
      byMonth: this.groupByMonth(this.appendGender(activites), 'time')
    });
  }

  getDatabaseCount(db: string) {
    return forkJoin([
      this.couchService.get(db),
      this.couchService.get(db + '/_design_docs')
    ]).pipe(map(([ schema, ddocs ]) => {
      return schema.doc_count - ddocs.total_rows;
    }));
  }

  getChildDatabaseCounts(code: string) {
    return this.couchService.get('child_statistics/' + code);
  }

  getAdminActivities({ planetCode, tillDate, domain }: { planetCode?: string, tillDate?: number, domain?: string }) {
    return this.couchService.findAll('admin_activities', this.selector(planetCode, { tillDate, dateField: 'time' }), { domain })
    .pipe(map(adminActivities => {
      return this.groupBy(adminActivities, [ 'parentCode', 'createdOn', 'type' ], { maxField: 'time' });
    }));
  }

  mostRecentAdminActivities(planet, logins, adminActivities) {
    const adminName = planet.adminName.split('@')[0];
    const findPlanetLog = (item: any) => item.createdOn === planet.code && item.parentCode === planet.parentCode;
    const findAdminActivity = (type: any) => (activity: any) => activity.type === type && findPlanetLog(activity);
    return ({
      lastAdminLogin: logins.find((item: any) => item.user === adminName && findPlanetLog(item)),
      lastUpgrade: adminActivities.find(findAdminActivity('upgrade')),
      lastSync: adminActivities.find(findAdminActivity('sync'))
    });
  }

  appendGender(array) {
    return array.map((item: any) => {
      const user = this.users.find((u: any) => u.name === item.user) || {};
      const rawGender = user.gender;
      const normalizedGender = typeof rawGender === 'string' ? rawGender.toLowerCase() : '';
      const gender = normalizedGender === 'male' || normalizedGender === 'female' || normalizedGender === 'other'
        ? normalizedGender
        : rawGender ? 'other' : undefined;
      return ({
        ...item,
        gender
      });
    });
  }

  appendAge(array, time) {
    return array.map((item: any) => {
      const user = this.users.find((u: any) => u.name === item.user) || {};
      return ({
        ...item,
        age: ageFromBirthDate(time, user.birthDate)
      });
    });
  }

  timeFilter(field, time) {
    return time !== undefined ? { [field]: { '$gt': time } } : {};
  }

  filterAdmin(records, filter) {
    return filter ? records.filter(rec => this.users.findIndex((u: any) => u.name === rec.user || u.name === rec.user.name) > -1) : records;
  }

  minTime(activities, timeField: string) {
    return activities.reduce((minTime, { [timeField as keyof Object]: time }) => minTime && minTime < time ? minTime : time, undefined);
  }

  planetTypeText(planetType) {
    return planetType === 'nation' ? $localize`Nation` : $localize`Community`;
  }

  viewPlanetDetails(planet) {
    this.dialog.open(DialogsViewComponent, {
      width: '600px',
      autoFocus: false,
      data: {
        allData: planet,
        title: $localize`${this.planetTypeText(planet.planetType)} Details`
      }
    });
  }

  courseProgressReport(parent = false) {
    this.coursesService.requestCourses(parent);
    return forkJoin([
      this.couchService.get('courses_progress/_design/courses_progress/_view/enrollment?group=true'),
      this.couchService.get('courses_progress/_design/courses_progress/_view/completion?group=true'),
      this.couchService.get('courses_progress/_design/courses_progress/_view/steps?group=true'),
      this.coursesService.coursesListener$().pipe(take(1))
    ]).pipe(map(([ { rows: enrollments }, { rows: completions }, { rows: steps }, courses ]) => {
      return {
        courses: courses.map(course => ({
          steps: course.doc.steps.length,
          exams: course.doc.steps.filter(step => step.exam).length,
          _id: course._id
        })),
        enrollments: enrollments.map(({ key, value }) => ({ ...key, time: value.min })),
        completions: completions.filter(({ key, value }) => {
            const course = courses.find(c => c._id === key.courseId);
            return course && value.count === course.doc.steps.length;
          })
          .map(({ key, value }) => ({ ...key, time: value.max, stepCount: value.count })),
        steps: steps.map(({ key, value }) => {
          const course = courses.find(c => c._id === key.courseId);
          return { ...key, time: value.max, title: course ? course.doc.courseTitle : '' };
        })
      };
    }));
  }

  getChatHistory() {
    return this.couchService.get('chat_history/_all_docs', { params: { include_docs: 'true' } })
      .pipe(map((data: any) => data.rows.map((row: any) => row.doc)));
  }

  groupChatUsage(chats: any) {
    return ({
      byMonth: this.groupByMonth(this.appendGender(chats), 'createdDate', '_id')
    });
  }

  getVoicesCreated() {
    return this.couchService.get('news/_all_docs', { params: { include_docs: 'true' } })
      .pipe(map((data: any) => data.rows.map((row: any) => row.doc)));
  }

  groupVoicesCreated(voices: any[]) {
    return ({
      byMonth: this.groupByMonth(this.appendGender(voices), 'time', '_id')
    });
  }

  groupStepCompletion(steps: any[]) {
    return ({
      byMonth: this.groupByMonth(this.appendGender(steps), 'time', 'userId')
    });
  }

  getDateRange(timeFilter: string, minDate: Date): { startDate: Date, endDate: Date, showCustomDateFields: boolean } {
    const now = new Date();
    const endDate = now;
    let startDate: Date;
    const showCustomDateFields = timeFilter === 'custom';

    if (timeFilter === 'custom') {
      return { startDate: null, endDate: null, showCustomDateFields };
    }

    switch (timeFilter) {
      case '24h':
        startDate = new Date(now);
        startDate.setDate(now.getDate() - 1);
        break;
      case '7d':
        startDate = new Date(now);
        startDate.setDate(now.getDate() - 7);
        break;
      case '1m':
        startDate = new Date(now);
        startDate.setMonth(now.getMonth() - 1);
        break;
      case '6m':
        startDate = new Date(now);
        startDate.setMonth(now.getMonth() - 6);
        break;
      case '12m':
        startDate = new Date(now);
        startDate.setMonth(now.getMonth() - 12);
        break;
      case 'all':
        startDate = minDate;
        break;
      default:
        return { startDate: null, endDate: null, showCustomDateFields: false };
    }
    return { startDate, endDate, showCustomDateFields };
  }
}
