import { Injectable } from '@angular/core';
import { Validators } from '@angular/forms';
import { ValidatorService } from '../validators/validator.service';
import { throwError, of, forkJoin, Observable } from 'rxjs';
import { map, switchMap, catchError, takeWhile } from 'rxjs/operators';
import { DialogsFormService } from '../shared/dialogs/dialogs-form.service';
import { CouchService } from '../shared/couchdb.service';
import { UserService } from '../shared/user.service';
import { debug } from '../debug-operator';
import { StateService } from '../shared/state.service';
import { ReportsService } from './reports/reports.service';
import { findDocuments } from '../shared/mangoQueries';
import { environment } from '../../environments/environment';

const passwordFormFields = [
  {
    'label': 'Password',
    'type': 'password',
    'name': 'password',
    'placeholder': 'Password',
    'required': true
  }
];

@Injectable()
export class ManagerService {

  private configuration = this.stateService.configuration;

  constructor(
    private dialogsFormService: DialogsFormService,
    private couchService: CouchService,
    private userService: UserService,
    private stateService: StateService,
    private activityService: ReportsService,
    private validatorService: ValidatorService,
  ) {}

  openPasswordConfirmation() {
    const title = 'Admin Confirmation';
    const formGroup = {
      password: [ '', Validators.required, ac => this.validatorService.checkPassword$(ac) ]
    };
    return this.dialogsFormService
    .confirm(title, passwordFormFields, formGroup, true)
    .pipe(
      debug('Dialog confirm'),
      switchMap((response: any): Observable<{ name, password, cancelled? }> => {
        if (response !== undefined) {
          return this.verifyPassword(response.password);
        }
        return of({ name: undefined, password: undefined, cancelled: true });
      }),
      takeWhile((value) => value.cancelled !== true),
      catchError((err) => {
        const errorMessage = err.error.reason;
        return throwError(errorMessage === 'Name or password is incorrect.' ? 'Password is incorrect.' : errorMessage);
      })
    );
  }

  private verifyPassword(password) {
    return this.couchService.post('_session', { name: this.userService.get().name, password })
    .pipe(switchMap((data) => {
      if (!data.ok) {
        return throwError('Invalid password');
      }
      return of({ name: this.userService.get().name, password });
    }));
  }

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
        this.activityService.getLoginActivities({ planetCode: configuration.code, tillDate }),
        this.activityService.getAdminActivities(configuration.code, tillDate),
        this.activityService.getResourceVisits({ planetCode: configuration.code, tillDate, filterAdmin: true }),
        this.activityService.getRatingInfo({ planetCode: configuration.code, tillDate, filterAdmin: true })
      ])
    )).pipe(map(([ loginActivities, adminActivities, resourceVisits, ratings ]) => {
      return ({
        resourceVisits: resourceVisits.byResource.reduce((total, visit) => total + visit.count, 0),
        ratings: ratings.reduce((total, rating) => total + rating.count, 0),
        ...this.activityService.mostRecentAdminActivities(configuration, loginActivities.byUser, adminActivities)
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
    return Array(4).fill(0).map(() => Math.floor(Math.random() * 10)).join('');
  }

  getChildPlanets(onlyAccepted = false) {
    const selector = onlyAccepted ?
      { '$or': [
        { 'parentCode': this.stateService.configuration.code, 'registrationRequest': 'accepted' },
        { 'docType': 'parentName' }
      ] } :
      { '_id': { '$gt': null } };
    return this.couchService.findAll('communityregistrationrequests',
      findDocuments(selector, 0, [ { 'createdDate': 'desc' } ] ));
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

}
