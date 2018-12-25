import { Injectable } from '@angular/core';
import { map } from 'rxjs/operators';
import { CouchService } from '../../shared/couchdb.service';
import { findDocuments } from '../../shared/mangoQueries';
import { dedupeShelfReduce } from '../../shared/utils';

@Injectable({
  providedIn: 'root'
})
export class ReportsService {

  users: any[] = [];

  constructor(
    private couchService: CouchService
  ) {}

  groupBy(array, fields, { sumField = '', maxField = '', uniqueField = '' } = {}) {
    return array.reduce((group, item) => {
      const currentValue = group.find((groupItem) => fields.every(field => groupItem[field] === item[field]));
      if (currentValue) {
        currentValue.count = currentValue.count + 1;
        currentValue.sum = sumField ? currentValue.sum + item[sumField] : 0;
        currentValue.max = maxField ?
          (currentValue.max[maxField] < item[maxField] ? item : currentValue.max) :
          {};
        currentValue.unique = uniqueField ? currentValue.unique.concat([ item[uniqueField] ]).reduce(dedupeShelfReduce, []) : [];
      } else {
        const newEntry = fields.reduce((newObj, field) => {
          newObj[field] = item[field];
          return newObj;
        }, {});
        group.push({ ...newEntry, count: 1, sum: sumField ? item[sumField] : 0, max: item, unique: [ item[uniqueField] ] });
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

  selector(planetCode?: string, field: string = 'createdOn') {
    return planetCode ? findDocuments({ [field]: planetCode }) : undefined;
  }

  getTotalUsers(planetCode: string, local: boolean) {
    const obs = local ?
      this.couchService.findAll('_users') :
      this.couchService.findAll('child_users', this.selector(planetCode, 'planetCode'));
    return obs.pipe(map((users: any) => {
      users = users.filter(user => user.name !== 'satellite');
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

  getLoginActivities(planetCode?: string, tillDate?: number) {
    const timeFilter = tillDate ? { 'selector': { 'loginTime': { '$gt': tillDate } } } : {};
    return this.couchService.findAll('login_activities', { ...this.selector(planetCode), ...timeFilter })
    .pipe(map((loginActivities: any) => {
      return ({
        byUser: this.groupBy(loginActivities, [ 'parentCode', 'createdOn', 'user' ], { maxField: 'loginTime' })
          .filter(loginActivity => loginActivity.user !== '' && loginActivity.user !== undefined).sort((a, b) => b.count - a.count),
        byMonth: this.groupByMonth(this.appendGender(loginActivities), 'loginTime', 'user')
      });
    }));
  }

  getRatingInfo(planetCode?: string, tillDate?: number) {
    const timeFilter = tillDate ? { 'selector': { 'loginTime': { '$gt': tillDate } } } : {};
    return this.couchService.findAll('ratings', { ...this.selector(planetCode), ...timeFilter })
    .pipe(map((ratings: any) => {
      return this.groupBy(ratings, [ 'parentCode', 'createdOn', 'type', 'item', 'title' ], { sumField: 'rate' })
        .filter(rating => rating.title !== '' && rating.title !== undefined)
        .sort((a: any, b: any) => (b.sum / b.count) - (a.sum / a.count)).map((r: any) =>
          ({ ...r, value: Math.round(10 * r.sum / r.count) / 10 }));
    }));
  }

  getResourceVisits(planetCode?: string, tillDate?: number) {
    const timeFilter = tillDate ? { 'selector': { 'time': { '$gt': tillDate } } } : {};
    return this.couchService.findAll('resource_activities', { ...this.selector(planetCode), ...timeFilter })
    .pipe(map((resourceActivites) => {
      return ({
        byResource: this.groupBy(resourceActivites, [ 'parentCode', 'createdOn', 'resourceId', 'title' ])
          .filter(resourceActivity => resourceActivity.title !== '' && resourceActivity !== undefined),
        byMonth: this.groupByMonth(this.appendGender(resourceActivites), 'time')
      });
    }));
  }

  getDatabaseCount(db: string) {
    return this.couchService.get(db + '/_design_docs').pipe(map((res: any) => {
      return res.total_rows - res.rows.length;
    }));
  }

  getChildDatabaseCounts(code: string) {
    return this.couchService.get('child_statistics/' + code);
  }

  getAdminActivities(planetCode?: string, tillDate?: number) {
    const timeFilter = tillDate ? { 'selector': { 'time': { '$gt': tillDate } } } : {};
    return this.couchService.findAll('admin_activities', { ...this.selector(planetCode), ...timeFilter })
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

}
