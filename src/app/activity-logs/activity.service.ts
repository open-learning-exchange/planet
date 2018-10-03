import { Injectable } from '@angular/core';
import { map } from 'rxjs/operators';
import { CouchService } from '../shared/couchdb.service';

@Injectable({
  providedIn: 'root'
})
export class ActivityService {

  constructor(
    private couchService: CouchService
  ) {}

  groupBy(array, fields, { sumField = '', maxField = '' } = {}) {
    return array.reduce((group, item) => {
      const currentValue = group.find((groupItem) => fields.every(field => groupItem[field] === item[field]));
      if (currentValue) {
        currentValue.count = currentValue.count + 1;
        currentValue.sum = sumField ? currentValue[sumField] + item[sumField] : 0;
        currentValue.max = maxField ?
          (currentValue.max[maxField] < item[maxField] ? item : currentValue.max) :
          {};
      } else {
        const newEntry = fields.reduce((newObj, field) => {
          newObj[field] = item[field];
          return newObj;
        }, {});
        group.push({ ...newEntry, count: 1, sum: sumField ? item[sumField] : 0, max: item });
      }
      return group;
    }, []);
  }

  getTotalUsers() {
    return this.couchService.findAll('_users').pipe(map((users: any) => {
      return ({
        count: users.length,
        byGender: users.reduce((usersByGender: any, user: any) => {
          usersByGender[user.gender || 'undeclared'] += 1;
          return usersByGender;
        }, { 'male': 0, 'female': 0, 'undeclared': 0 })
      });
    }));
  }

  getLoginActivities() {
    return this.couchService.findAll('login_activities').pipe(map((loginActivities: any) => {
      return this.groupBy(loginActivities, [ 'parentCode', 'createdOn', 'user' ], { maxField: 'loginTime' })
        .sort((a, b) => b.count - a.count);
    }));
  }

  getRatingInfo() {
    return this.couchService.findAll('ratings').pipe(map((ratings: any) => {
      return this.groupBy(ratings, [ 'type', 'item' ], { sumField: 'rate' })
        .sort((a: any, b: any) => (b.sum / b.count) - (a.sum / a.count)).map((r: any) => ({ ...r, value: r.sum / r.count }));
    }));
  }

  getResourceVisits() {
    return this.couchService.findAll('resource_activities').pipe(map((resourceActivites) => {
      return this.groupBy(resourceActivites, [ 'parentCode', 'createdOn', 'resource' ]);
    }));
  }

  getDatabaseCount(db: string) {
    return this.couchService.get(db + '/_design_docs').pipe(map((res: any) => {
      return res.total_rows - res.rows.length;
    }));
  }

  getAdminActivities() {
    return this.couchService.findAll('activity_logs').pipe(map(adminActivities => {
      return this.groupBy(adminActivities, [ 'parentCode', 'createdOn', 'type' ], { maxField: 'createdTime' });
    }));
  }

}
