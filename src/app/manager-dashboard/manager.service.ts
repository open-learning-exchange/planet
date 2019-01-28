import { Injectable } from '@angular/core';
import { Validators } from '@angular/forms';
import { throwError, of, forkJoin, Observable } from 'rxjs';
import { map, switchMap, catchError, takeWhile } from 'rxjs/operators';
import { DialogsFormService } from '../shared/dialogs/dialogs-form.service';
import { CouchService } from '../shared/couchdb.service';
import { UserService } from '../shared/user.service';
import { debug } from '../debug-operator';
import { StateService } from '../shared/state.service';
import { ReportsService } from './reports/reports.service';
import { findDocuments } from '../shared/mangoQueries';

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
    private activityService: ReportsService
  ) {}

  openPasswordConfirmation() {
    const title = 'Admin Confirmation';
    let passwordInvalid = null;
    const formGroup = {
      password: [ '', [ Validators.required, () => passwordInvalid ] ]
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
      takeWhile((value) => value.cancelled === true),
      catchError((err) => {
        passwordInvalid = { 'invalidPassword': true };
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
    return forkJoin([
      this.activityService.getLoginActivities(configuration.code, tillDate),
      this.activityService.getAdminActivities(configuration.code, tillDate),
      this.activityService.getResourceVisits(configuration.code, tillDate),
      this.activityService.getRatingInfo(configuration.code, tillDate)
    ]).pipe(map(([ loginActivities, adminActivities, resourceVisits, ratings ]) => {
      return ({
        resourceVisits: resourceVisits.byResource.reduce((total, visit) => total + visit.count, 0),
        ratings: ratings.reduce((total, rating) => total + rating.count, 0),
        ...this.activityService.mostRecentAdminActivities(configuration, loginActivities.byUser, adminActivities)
      });
    }));
  }

  getPushedList() {
    return this.couchService.post(
      `send_items/_find`,
      findDocuments({ 'sendTo': this.configuration.code }),
      { domain: this.configuration.parentDomain }
    );
  }

  arrangePlanetsIntoHubs(planets, hubs) {
    return ({
      hubs: hubs.map((hub: any) => ({
        ...hub,
        children: hub.spokes.map(code => planets.find((planet: any) => planet.code === code)).filter(child => child)
      })),
      sandboxPlanets: planets.filter(
        (planet: any) => hubs.find((hub: any) => hub.spokes.indexOf(planet.code) > -1) === undefined
      )
    });
  }

}
