import { Injectable } from '@angular/core';
import { forkJoin, Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { CouchService } from '../../shared/couchdb.service';
import { findDocuments } from '../../shared/mangoQueries';
import { dedupeShelfReduce } from '../../shared/utils';
import { UsersService } from '../../users/users.service';
import { MatDialog } from '@angular/material/dialog';
import { DialogsViewComponent } from '../../shared/dialogs/dialogs-view.component';
import { StateService } from '../../shared/state.service';

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

  constructor(
    private couchService: CouchService,
    private usersService: UsersService,
    private dialog: MatDialog,
    private stateService: StateService
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
      return ({
        count: users.length,
        byGender: users.reduce((usersByGender: any, user: any) => {
          usersByGender[user.gender || 'didNotSpecify'] += 1;
          return usersByGender;
        }, { 'male': 0, 'female': 0, 'didNotSpecify': 0 }),
        byMonth: this.groupByMonth(users, 'joinDate')
      });
    }));
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
      return ({
        ...item,
        gender: user.gender
      });
    });
  }

  timeFilter(field, time) {
    return time !== undefined ? { [field]: { '$gt': time } } : {};
  }

  filterAdmin(records, filter) {
    return filter ? records.filter(rec => this.users.findIndex((u: any) => u.name === rec.user || u.name === rec.user.name) > -1) : records;
  }

  minTime(activities, timeField) {
    return activities.reduce((minTime, { [timeField]: time }) => minTime && minTime < time ? minTime : time, undefined);
  }

  planetTypeText(planetType) {
    return planetType === 'nation' ? 'Nation' : 'Community';
  }

  viewPlanetDetails(planet) {
    this.dialog.open(DialogsViewComponent, {
      width: '600px',
      autoFocus: false,
      data: {
        allData: planet,
        title: `${this.planetTypeText(planet.planetType)} Details`
      }
    });
  }

}
