import { Injectable } from '@angular/core';
import { forkJoin, Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { CouchService } from '../../shared/couchdb.service';
import { findDocuments } from '../../shared/mangoQueries';
import { dedupeShelfReduce } from '../../shared/utils';

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
    const obs = local ?
      this.couchService.findAll('_users') :
      this.couchService.findAll('child_users', this.selector(planetCode, { field: 'planetCode' }));
    return obs.pipe(map((users: any) => {
      users = users.filter(user => user.name !== 'satellite' && user.roles.length);
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

  getActivities(
    db: 'login_activities' | 'resource_activities',
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

  getGroupedReport(
    type: 'logins' | 'resourceViews',
    { planetCode, tillDate, fromMyPlanet, filterAdmin }: ActivityRequestObject = {}
  ): Observable<{ byUser?, byResource?, byMonth }> {
    const { db, request, groupFunction } = {
      logins: { db: 'login_activities', request: this.getActivities, groupFunction: this.groupLoginActivities },
      resourceViews: { db: 'resource_activities', request: this.getActivities, groupFunction: this.groupResourceVisits }
    }[type];
    return request.bind(this)(db, { planetCode, tillDate, fromMyPlanet, filterAdmin }).pipe(
      map(response => groupFunction.bind(this)(response))
    );
  }

  getRatingInfo({ planetCode, tillDate, fromMyPlanet, filterAdmin }: ActivityRequestObject = {}) {
    return this.couchService.findAll('ratings', this.selector(planetCode, { tillDate, dateField: 'time', fromMyPlanet }))
    .pipe(map((ratings: any) => {
      ratings = this.filterAdmin(ratings, filterAdmin);
      return this.groupBy(ratings, [ 'parentCode', 'createdOn', 'type', 'item', 'title' ], { sumField: 'rate' })
        .filter(rating => rating.title !== '' && rating.title !== undefined)
        .sort((a: any, b: any) => (b.sum / b.count) - (a.sum / a.count)).map((r: any) =>
          ({ ...r, value: Math.round(10 * r.sum / r.count) / 10 }));
    }));
  }

  groupResourceVisits(resourceActivites) {
    return ({
      byResource: this.groupBy(resourceActivites, [ 'parentCode', 'createdOn', 'resourceId' ], { maxField: 'time' })
        .filter(resourceActivity => resourceActivity.title !== '' && resourceActivity !== undefined),
      byMonth: this.groupByMonth(this.appendGender(resourceActivites), 'time')
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

  getAdminActivities(planetCode?: any, tillDate?: number) {
    return this.couchService.findAll('admin_activities', this.selector(planetCode, { tillDate, dateField: 'time' }))
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

  attachNamesToPlanets(planetDocs) {
    const names = planetDocs.filter((d: any) => d.docType === 'parentName');
    return planetDocs.map((d: any) => ({ doc: d, nameDoc: names.find((name: any) => name.planetId === d._id) }));
  }

  arrangePlanetsIntoHubs(planets, hubs) {
    return ({
      hubs: hubs.map((hub: any) => ({
        ...hub,
        children: hub.spokes.map(code => planets.find((planet: any) => planet.doc.code === code)).filter(child => child)
      })),
      sandboxPlanets: planets.filter(
        (planet: any) => hubs.find((hub: any) => hub.spokes.indexOf(planet.doc.code) > -1) === undefined
      )
    });
  }

  filterAdmin(records, filter) {
    return filter ? records.filter(rec => this.users.findIndex((u: any) => u.name === rec.user || u.name === rec.user.name) > -1) : records;
  }

}
