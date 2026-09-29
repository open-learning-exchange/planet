import { Injectable } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { catchError, defaultIfEmpty, map, switchMap } from 'rxjs/operators';
import { forkJoin, of, throwError } from 'rxjs';
import { CouchService } from '../shared/couchdb.service';
import { UserService } from '../shared/user.service';
import { PouchService } from '../shared/database/pouch.service';
import { SyncService } from '../shared/sync.service';
import { StateService } from '../shared/state.service';
import { HealthService } from '../health/health.service';
import { SubmissionsService } from '../submissions/submissions.service';
import { PlanetMessageService } from '../shared/planet-message.service';
import { DashboardNotificationsDialogComponent } from '../dashboard/dashboard-notifications-dialog.component';
import { findDocuments } from '../shared/mangoQueries';
import { dedupeObjectArray } from '../shared/utils';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class LoginTasksService {

  constructor(
    private couchService: CouchService,
    private userService: UserService,
    private pouchService: PouchService,
    private syncService: SyncService,
    private stateService: StateService,
    private healthService: HealthService,
    private submissionsService: SubmissionsService,
    private planetMessageService: PlanetMessageService,
    private dialog: MatDialog
  ) {}

  postLoginTasks$(name: string, password: string, isCreate: boolean, userId: string, configuration: any) {
    return forkJoin(this.pouchService.replicateFromRemoteDBs()).pipe(
      defaultIfEmpty([]),
      switchMap(this.createSession(name, password)),
      switchMap((sessionData) => {
        const adminName = configuration.adminName.split('@')[0];
        return isCreate ? this.sendNotifications(adminName, name) : of(sessionData);
      }),
      switchMap(() => this.submissionsService.getSubmissions(findDocuments({ type: 'survey', status: 'pending', 'user.name': name }))),
      map((surveys) => {
        const uniqueSurveys = dedupeObjectArray(surveys, [ 'parentId' ]);
        if (uniqueSurveys.length > 0) {
          this.openNotificationsDialog(uniqueSurveys);
        }
      }),
      switchMap(() => this.healthService.userHealthSecurity(this.healthService.userDatabaseName(userId)))
    );
  }

  runPostLoginTasks(name: string, password: string, isCreate: boolean, userId: string, configuration: any) {
    this.postLoginTasks$(name, password, isCreate, userId, configuration).pipe(
      catchError((error) => {
        console.error('Background post-login task failed:', error);
        return of(null);
      })
    ).subscribe();
  }

  private createSession(name: string, password: string) {
    const msg = this.stateService.configuration.planetType === 'community' ? 'nation' : 'center';
    return () => {
      const obsArr = this.loginObservables(name, password);
      return forkJoin(obsArr).pipe(catchError(error => {
        if (error.status === 401) {
          this.planetMessageService.showMessage($localize`Can not login to ${msg} planet.`);
        } else {
          this.planetMessageService.showMessage($localize`Error connecting to ${msg}.`);
        }
        return of(error);
      }));
    };
  }

  private loginObservables(name: string, password: string) {
    const obsArr = [ this.userService.newSessionLog() ];
    const localConfig = this.stateService.configuration;
    if (environment.test || this.userService.get().roles.indexOf('_admin') === -1 || localConfig.planetType === 'center') {
      return obsArr;
    }
    const parentSession = this.createParentSession({ name: name + '@' + localConfig.code, password });
    const syncDown = () => this.getConfigurationSyncDown(localConfig, { name, password });
    // Waits for the session to restore the parent account, but runs even if it fails: the server may reach the parent when we can't
    obsArr.push(localConfig.registrationRequest === 'pending' ?
      parentSession.pipe(
        catchError(error => syncDown().pipe(switchMap(() => throwError(error)))),
        switchMap(syncDown)
      ) :
      parentSession
    );
    return obsArr;
  }

  private createParentSession({ name, password }: { name: string, password: string }) {
    const opts = { withCredentials: true, domain: this.stateService.configuration.parentDomain };
    const isRegisteredAdmin = name === this.stateService.configuration.adminName;
    return this.couchService.post('_session', { name, password }, opts).pipe(
      catchError(error => error.status === 401 && isRegisteredAdmin ?
        this.restoreParentAccount(name).pipe(
          switchMap(() => this.couchService.post('_session', { name, password }, opts)),
          catchError(() => throwError(error))
        ) :
        throwError(error))
    );
  }

  private restoreParentAccount(adminName: string) {
    const localConfig = this.stateService.configuration;
    const opts = { domain: localConfig.parentDomain, withCredentials: false, suppressMessage: true };
    const { _id, _rev, _attachments, ...user } = { ...this.userService.get(), ...this.userService.credentials };
    return this.parentRegistration(localConfig).pipe(
      switchMap(request => {
        if (!request) {
          return throwError(new Error('No registration request on the parent planet'));
        }
        const create = (roles: string[]) => this.couchService.updateDocument('_users', {
          ...user, _id: 'org.couchdb.user:' + adminName, name: adminName, isUserAdmin: false, requestId: request._id, roles
        }, opts);
        // Once accepted, unlockUser has already run, so learner can only come from this create while the parent auto accepts
        return request.registrationRequest === 'accepted' ?
          create([ 'learner' ]).pipe(catchError(error => error.status === 403 ? create([]) : throwError(error))) :
          create([]);
      })
    );
  }

  private parentRegistration(localConfig: any) {
    return this.couchService.post(
      'communityregistrationrequests/_find',
      findDocuments({ code: localConfig.code }),
      { domain: localConfig.parentDomain, withCredentials: false }
    ).pipe(map(({ docs }) => docs[0]));
  }

  private getConfigurationSyncDown(configuration: { code: string }, credentials: { name: string, password: string }) {
    return this.syncService.sync({
      dbSource: 'communityregistrationrequests',
      dbTarget: 'configurations',
      type: 'pull',
      date: true,
      selector: { code: configuration.code }
    }, credentials);
  }

  private sendNotifications(userName: string, addedMember: string) {
    return this.couchService.updateDocument('notifications', {
      user: 'org.couchdb.user:' + userName,
      message: $localize`New member <b>${addedMember}</b> has joined.`,
      link: '/manager/users/profile/' + addedMember,
      type: 'new user',
      priority: 1,
      status: 'unread',
      time: this.couchService.datePlaceholder
    });
  }

  private openNotificationsDialog(surveys: Array<{ parentId: string }>) {
    this.dialog.open(DashboardNotificationsDialogComponent, {
      data: { surveys },
      maxWidth: '60vw',
      maxHeight: '90vh',
      autoFocus: false
    });
  }
}
