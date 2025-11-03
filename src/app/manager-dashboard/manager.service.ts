import { Injectable } from '@angular/core';
import { of, forkJoin } from 'rxjs';
import { map, switchMap, catchError } from 'rxjs/operators';
import { CouchService } from '../shared/couchdb.service';
import { UserService } from '../shared/user.service';
import { StateService } from '../shared/state.service';
import { ReportsService } from './reports/reports.service';
import { findDocuments } from '../shared/mangoQueries';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class ManagerService {

  private configuration = this.stateService.configuration;

  constructor(
    private couchService: CouchService,
    private userService: UserService,
    private stateService: StateService,
    private activityService: ReportsService
  ) {}

  addAdminLog(type) {
    const log = {
      createdOn: this.configuration.code,
      parentCode: this.configuration.parentCode,
      user: this.userService.get().name,
      time: this.couchService.datePlaceholder
    };
    return this.couchService.updateDocument('admin_activities', { ...log, type });
  }

  getLogs(tillDate?: number) {
    const configuration = this.configuration;
    return this.activityService.getTotalUsers(configuration.code, true).pipe(switchMap(() =>
      forkJoin([
        this.activityService.getAdminActivities({ planetCode: configuration.code, tillDate }),
        this.activityService.getActivities('resource_activities', 'byPlanetRecent'),
        this.activityService.getRatingInfo({ planetCode: configuration.code, tillDate, filterAdmin: true }),
      ])
    )).pipe(map(([ adminActivities, resourceVisits, ratings ]) => {
      return ({
        resourceVisits: (resourceVisits.rows.find(row => row.key === configuration.code) || { value: 0 }).value,
        ratings: ratings.length,
        ...this.activityService.mostRecentAdminActivities(configuration, [], adminActivities)
      });
    }));
  }

  getPushedList() {
    return this.couchService.findAll(
      'send_items',
      findDocuments({ 'sendTo': this.configuration.code }),
      { domain: this.configuration.parentDomain }
    );
  }

  createPin() {
    // Use window.crypto.getRandomValues for cryptographically secure random digits
    const pinArray = new Uint8Array(4);
    window.crypto.getRandomValues(pinArray);
    // Map random bytes to digits 0-9 without modulo bias
    return Array.from(pinArray, byte => {
      // Discard and retry if value is > 249 to prevent modulo bias
      let digit = byte;
      while (digit > 249) {
        digit = window.crypto.getRandomValues(new Uint8Array(1))[0];
      }
      return (digit % 10).toString();
    }).join('');
  }

  getChildPlanets(onlyAccepted = false, parentCode = this.stateService.configuration.code, domain?) {
    const selector = onlyAccepted ?
      { '$or': [
        { 'parentCode': parentCode, 'registrationRequest': 'accepted' },
        { 'docType': 'parentName' }
      ] } :
      { '_id': { '$gt': null } };
    return this.couchService.findAll('communityregistrationrequests',
      findDocuments(selector, 0, [ { 'createdDate': 'desc' } ] ), domain ? { domain } : undefined);
  }

  updateCredentialsYml({ name, password }) {
    if (environment.production === true) {
      const opts = {
        responseType: 'text',
        withCredentials: false,
        headers: { 'Content-Type': 'text/plain' }
      };
      return this.couchService.getUrl('updateyml?u=' + name + ',' + password, opts);
    }
    return of({});
  }

  getVersion(app: 'planet' | 'myPlanet', opts: any = {}) {
    return this.couchService.getUrl(`${app === 'myPlanet' ? 'apk' : ''}version`, opts).pipe(catchError(() => of('N/A')));
  }

  getApkLatestVersion(opts: any = {}) {
    return this.couchService.getUrl('versions', opts).pipe(
      map((response: any) => JSON.parse(response)),
      catchError(() => of({}))
    );
  }

}
