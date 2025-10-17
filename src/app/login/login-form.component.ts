import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CouchService } from '../shared/couchdb.service';
import { Router, ActivatedRoute } from '@angular/router';
import { MatLegacyDialog as MatDialog, MatLegacyDialogRef as MatDialogRef } from '@angular/material/legacy-dialog';
import { UserService } from '../shared/user.service';
import { switchMap, catchError, map, tap, finalize } from 'rxjs/operators';
import { from, forkJoin, of, throwError, Observable } from 'rxjs';
import { FormGroup, FormBuilder, Validators, ValidatorFn, AsyncValidatorFn } from '@angular/forms';
import { CustomValidators } from '../validators/custom-validators';
import { PlanetMessageService } from '../shared/planet-message.service';
import { environment } from '../../environments/environment';
import { ValidatorService } from '../validators/validator.service';
import { SyncService } from '../shared/sync.service';
import { PouchAuthService } from '../shared/database/pouch-auth.service';
import { PouchService } from '../shared/database/pouch.service';
import { StateService } from '../shared/state.service';
import { showFormErrors } from '../shared/table-helpers';
import { HealthService } from '../health/health.service';
import { DashboardNotificationsDialogComponent } from '../dashboard/dashboard-notifications-dialog.component';
import { SubmissionsService } from '../submissions/submissions.service';
import { findDocuments } from '../shared/mangoQueries';
import { dedupeObjectArray } from '../shared/utils';
import { LoginProgressService } from './login-progress.service';

interface RegisterForm {
  name: [ string, ValidatorFn[]?, AsyncValidatorFn? ],
  password: [ string, ValidatorFn ],
  repeatPassword: [ string, ValidatorFn ]
}

interface LoginForm {
  name: [ string, ValidatorFn ],
  password: [ string, ValidatorFn ]
}

const registerForm: RegisterForm = {
  name: [ '' ],
  password: [ '', Validators.compose([
    Validators.required,
    CustomValidators.spaceValidator,
    CustomValidators.matchPassword('repeatPassword', false)
  ]) ],
  repeatPassword: [ '', Validators.compose([
    Validators.required,
    CustomValidators.matchPassword('password', true)
  ]) ]
};

const loginForm: LoginForm = {
  name: [ '', CustomValidators.required ],
  password: [ '', Validators.required ]
};

@Component({
  templateUrl: './login-form.component.html',
  selector: 'planet-login-form',
  styleUrls: [ './login.scss' ]
})
export class LoginFormComponent {
  public userForm: FormGroup;
  showPassword = false;
  showRepeatPassword = false;
  notificationDialog: MatDialogRef<DashboardNotificationsDialogComponent>;
  @Input() createMode: boolean;
  @Input() isDialog = false;
  @Output() loginEvent = new EventEmitter<'loggedOut' | 'loggedIn'>();
  isProcessing = false;

  constructor(
    private couchService: CouchService,
    private router: Router,
    private route: ActivatedRoute,
    private dialog: MatDialog,
    private userService: UserService,
    private formBuilder: FormBuilder,
    private planetMessageService: PlanetMessageService,
    private validatorService: ValidatorService,
    private syncService: SyncService,
    private pouchAuthService: PouchAuthService,
    private stateService: StateService,
    private pouchService: PouchService,
    private healthService: HealthService,
    private submissionsService: SubmissionsService,
    private loginProgressService: LoginProgressService
  ) {
    if (!this.isDialog) {
      this.createMode = this.router.url.split('?')[0] === '/login/newmember';
    }
    registerForm.name = [ '', [
      Validators.required,
      CustomValidators.pattern(/^([^\x00-\x7F]|[A-Za-z0-9])/i, 'invalidFirstCharacter'),
      Validators.pattern(/^([^\x00-\x7F]|[A-Za-z0-9_.-])*$/i) ],
      ac => this.validatorService.isUnique$('_users', 'name', ac, { errorType: 'duplicateUser' })
    ];
    this.initUserForm();
  }

  returnUrl = this.route.snapshot.queryParams['returnUrl'] || (this.stateService.configuration.planetType === 'center' ?
    'myDashboard' :
    '/'
  );

  initUserForm() {
    const formObj: RegisterForm | LoginForm = this.createMode ? registerForm : loginForm;
    this.userForm = this.formBuilder.group(formObj);
  }

  onSubmit() {
    if (!this.userForm.valid) {
      showFormErrors(this.userForm.controls);
      return;
    }
    if (this.createMode) {
      this.createUser(this.userForm.value);
    } else {
      this.login(this.userForm.value, false);
    }
  }

  welcomeNotification(userId) {
    const data = {
      'user': userId,
      'message': $localize`Welcome <b>${userId.replace('org.couchdb.user:', '')}</b> to the Planet Learning`,
      'link': '',
      'type': 'register',
      'priority': 1,
      'status': 'unread',
      'time': this.couchService.datePlaceholder
    };
    this.couchService.updateDocument('notifications', data)
      .subscribe();
  }

  reRoute() {
    return this.router.navigateByUrl(this.returnUrl, { state: { login: true } });
  }

  createUser({ name, password }: { name: string, password: string }) {
    const configuration = this.stateService.configuration;
    const opts = {
      metadata: {
        isUserAdmin: false,
        planetCode: configuration.code,
        parentCode: configuration.parentCode,
        joinDate: this.couchService.datePlaceholder,
      },
      roles: configuration.autoAccept ? [ 'learner' ] : []
    };

    this.pouchAuthService.signup(name, password, opts).pipe(
      switchMap(() => this.couchService.put('shelf/org.couchdb.user:' + name, {}))
    ).subscribe(
      res => {
        this.planetMessageService.showMessage($localize`Welcome to Planet Learning, ${res.id.replace('org.couchdb.user:', '')}!`);
        this.welcomeNotification(res.id);
        this.login(this.userForm.value, true);
      },
      this.errorHandler($localize`An error occurred please try again`)
    );
  }

  createParentSession({ name, password }) {
    return this.couchService.post('_session',
      { 'name': name, 'password': password },
      { withCredentials: true, domain: this.stateService.configuration.parentDomain });
  }

  async checkArchiveStatus(name) {
    try {
      const userData = await this.couchService.get('_users/org.couchdb.user:' + name).toPromise();

      if (userData?.isArchived) {
        this.errorHandler($localize`Member ${name} is not registered.`)();
        return true;
      }
      return false;
    } catch (error) {
      this.errorHandler($localize`There was an error connecting to Planet`)();
      return false;
    }
  }

  async login({ name, password }: { name: string, password: string }, isCreate: boolean) {
    const configuration = this.stateService.configuration;
    const userId = `org.couchdb.user:${name}`;

    try {
      this.isProcessing = true;
      this.loginProgressService.setState('authenticating');
      if (await this.checkArchiveStatus(name)) {
        this.isProcessing = false;
        this.loginProgressService.setState('idle');
        return;
      }
      this.pouchAuthService.login(name, password).pipe(
        switchMap((userCtx) => this.isDialog ?
          this.userService.setUserAndShelf(userCtx) :
          of(userCtx)
        ),
        tap(() => this.loginProgressService.setState('syncing')),
        switchMap(() => this.syncSessionAndReplication(name, password)),
        switchMap(() => {
          if (!this.isDialog) {
            this.loginProgressService.setState('navigating');
          }
          return this.navigateAfterSync(name, isCreate);
        }),
        tap(() => {
          this.loginProgressService.setState('finalizing');
          this.runPostLoginTasks({ configuration, userId, name, isCreate });
          this.loginEvent.emit('loggedIn');
        }),
        catchError(error => {
          this.loginProgressService.setState('idle');
          return throwError(error);
        }),
        finalize(() => {
          this.isProcessing = false;
        })
      ).subscribe({
        error: this.loginError.bind(this)
      });
    } catch (error) {
      this.isProcessing = false;
      this.loginProgressService.setState('idle');
      console.error('Error during login:', error);
    }
  }

  private syncSessionAndReplication(name: string, password: string) {
    const replicationTasks = this.pouchService.replicateFromRemoteDBs();
    const replication$ = replicationTasks.length > 0 ? forkJoin(replicationTasks) : of([]);
    return forkJoin([
      replication$,
      this.createSession(name, password)()
    ]);
  }

  private navigateAfterSync(name: string, isCreate: boolean): Observable<unknown> {
    if (this.isDialog) {
      return of(true);
    }
    return isCreate ?
      from(this.router.navigate([ 'users/update/' + name ])) :
      from(this.reRoute());
  }

  private runPostLoginTasks(
    { configuration, userId, name, isCreate }:
    { configuration: any, userId: string, name: string, isCreate: boolean }
  ) {
    const adminName = configuration.adminName.split('@')[0];
    const postLoginTasks: Observable<any>[] = [];

    if (isCreate) {
      postLoginTasks.push(
        this.sendNotifications(adminName, name).pipe(
          catchError(error => this.handlePostLoginError('notifications', error))
        )
      );
    }

    postLoginTasks.push(
      this.submissionsService.getSubmissions(
        findDocuments({ type: 'survey', status: 'pending', 'user.name': name })
      ).pipe(
        map((surveys) => {
          const uniqueSurveys = dedupeObjectArray(surveys, [ 'parentId' ]);
          if (uniqueSurveys.length > 0) {
            this.openNotificationsDialog(uniqueSurveys);
          }
        }),
        catchError(error => error.status === 404 ? of(null) : this.handlePostLoginError('surveys', error))
      )
    );

    postLoginTasks.push(
      this.healthService.userHealthSecurity(this.healthService.userDatabaseName(userId)).pipe(
        catchError(error => error.status === 404 ? of({}) : this.handlePostLoginError('health', error))
      )
    );

    forkJoin(postLoginTasks).pipe(
      finalize(() => this.loginProgressService.setState('complete'))
    ).subscribe({ error: (error) => console.error('Post login tasks failed', error) });
  }

  private handlePostLoginError(context: 'notifications' | 'surveys' | 'health', error: any) {
    console.error(`Error during post-login ${context} task`, error);
    if (context === 'health') {
      this.planetMessageService.showAlert($localize`We were unable to prepare health records. Some features may be unavailable.`);
    }
    if (context === 'surveys') {
      this.planetMessageService.showMessage($localize`Pending surveys will continue syncing in the background.`);
    }
    return of(null);
  }

  loginError() {
    this.couchService.get('_users/org.couchdb.user:' + this.userForm.value.name).subscribe((data: any) => {
      this.errorHandler($localize`Username and/or password do not match`)();
    }, (err) => {
      if (err.error.reason === 'missing') {
        this.errorHandler($localize`Member ${this.userForm.value.name} is not registered`)();
      } else {
        this.errorHandler($localize`There was an error connecting to Planet`)();
      }
    });
  }

  errorHandler(message: string) {
    return () => {
      this.userForm.setErrors({ 'invalid': true });
      this.planetMessageService.showAlert(message);
    };
  }

  sendNotifications(userName, addedMember) {
    const data = {
      'user': 'org.couchdb.user:' + userName,
      'message': $localize`New member <b>${addedMember}</b> has joined.`,
      'link': '/manager/users/profile/' + addedMember,
      'type': 'new user',
      'priority': 1,
      'status': 'unread',
      'time': this.couchService.datePlaceholder
    };
    return this.couchService.updateDocument('notifications', data);
  }

  createSession(name, password) {
    const msg = this.stateService.configuration.planetType === 'community' ? 'nation' : 'center';
    return () => {
      // Post new session info to login_activity
      const obsArr = this.loginObservables(name, password);
      return forkJoin(obsArr).pipe(catchError(error => {
        // 401 is for Unauthorized
        if (error.status === 401) {
          this.planetMessageService.showMessage($localize`Can not login to ${msg} planet.`);
        } else {
          this.planetMessageService.showMessage($localize`Error connecting to ${msg}.`);
        }
        return of(error);
      }));
    };
  }

  loginObservables(name, password) {
    const obsArr = [ this.userService.newSessionLog() ];
    const localConfig = this.stateService.configuration;
    if (environment.test || this.userService.get().roles.indexOf('_admin') === -1 || localConfig.planetType === 'center') {
      return obsArr;
    }
    obsArr.push(this.createParentSession({ 'name': name + '@' + localConfig.code, 'password': password }));
    if (localConfig.registrationRequest === 'pending') {
      obsArr.push(this.getConfigurationSyncDown(localConfig, { name, password }));
    }
    return obsArr;
  }

  getConfigurationSyncDown(configuration, credentials) {
    const replicators = {
      dbSource: 'communityregistrationrequests',
      dbTarget: 'configurations',
      type: 'pull',
      date: true,
      selector: {
        code: configuration.code
      }
    };
    return this.syncService.sync(replicators, credentials);
  }

  openNotificationsDialog(surveys) {
    this.notificationDialog = this.dialog.open(DashboardNotificationsDialogComponent, {
      data: { surveys },
      width: '40vw',
      maxHeight: '90vh',
      autoFocus: false
    });
  }

  toggleMode() {
    if (this.isDialog) {
      this.createMode = !this.createMode;
      this.initUserForm();
      return;
    }
    const newRoute = this.createMode ? [ '/login' ] : [ '/login/newmember' ];
    this.router.navigate(newRoute);
  }

}
