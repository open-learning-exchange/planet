import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CouchService } from '../shared/couchdb.service';
import { Router, ActivatedRoute } from '@angular/router';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { UserService } from '../shared/user.service';
import { switchMap, catchError, map } from 'rxjs/operators';
import { from, forkJoin, Observable, of, throwError } from 'rxjs';
import {
  AbstractControl, AsyncValidatorFn, FormControl, FormGroup, NonNullableFormBuilder, ValidationErrors, ValidatorFn, Validators
} from '@angular/forms';
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

interface LoginFormControls {
  name: FormControl<string>;
  password: FormControl<string>;
}

interface RegisterFormControls extends LoginFormControls {
  repeatPassword: FormControl<string>;
}

interface LoginCredentials {
  name: string;
  password: string
};

type LoginFormGroup = FormGroup<LoginFormControls>;
type RegisterFormGroup = FormGroup<RegisterFormControls>;

@Component({
  templateUrl: './login-form.component.html',
  selector: 'planet-login-form',
  styleUrls: [ './login.scss' ]
})
export class LoginFormComponent {
  public userForm!: LoginFormGroup | RegisterFormGroup;
  showPassword = false;
  showRepeatPassword = false;
  notificationDialog!: MatDialogRef<DashboardNotificationsDialogComponent>;
  @Input() createMode = false;
  @Input() isDialog = false;
  @Output() loginEvent = new EventEmitter<'loggedOut' | 'loggedIn'>();

  constructor(
    private couchService: CouchService,
    private router: Router,
    private route: ActivatedRoute,
    private dialog: MatDialog,
    private userService: UserService,
    private fb: NonNullableFormBuilder,
    private planetMessageService: PlanetMessageService,
    private validatorService: ValidatorService,
    private syncService: SyncService,
    private pouchAuthService: PouchAuthService,
    private stateService: StateService,
    private pouchService: PouchService,
    private healthService: HealthService,
    private submissionsService: SubmissionsService
  ) {
    if (!this.isDialog) {
      this.createMode = this.router.url.split('?')[0] === '/login/newmember';
    }
    this.initUserForm();
  }

  returnUrl = this.route.snapshot.queryParams['returnUrl'] || (this.stateService.configuration.planetType === 'center' ?
    'myDashboard' :
    '/'
  );

  initUserForm() {
    this.userForm = this.createMode ? this.createRegisterForm() : this.createLoginForm();
  }

  onSubmit() {
    if (!this.userForm.valid) {
      showFormErrors(this.userForm.controls);
      return;
    }
    const credentials = this.getLoginCredentials();
    if (this.createMode) {
      this.createUser(credentials);
    } else {
      this.login(credentials, false);
    }
  }

  welcomeNotification(userId: string) {
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

  createUser({ name, password }: LoginCredentials) {
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
        this.login(this.getLoginCredentials(), true);
      },
      this.errorHandler($localize`An error occurred please try again`)
    );
  }

  createParentSession({ name, password }: LoginCredentials) {
    return this.couchService.post('_session',
      { 'name': name, 'password': password },
      { withCredentials: true, domain: this.stateService.configuration.parentDomain });
  }

  async checkArchiveStatus(name: string): Promise<boolean> {
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

  async login({ name, password }: LoginCredentials, isCreate: boolean) {
    const configuration = this.stateService.configuration;
    const userId = `org.couchdb.user:${name}`;

    try {
      if (await this.checkArchiveStatus(name)) {
        return;
      }
      this.pouchAuthService.login(name, password).pipe(
        switchMap((userCtx) => (this.isDialog ?
          this.userService.setUserAndShelf(userCtx) :
          isCreate ?
          from(this.router.navigate([ 'users/update/' + name ])) :
          from(this.reRoute())
        )),
        switchMap(() => forkJoin(this.pouchService.replicateFromRemoteDBs())),
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
        switchMap(() => this.healthService.userHealthSecurity(this.healthService.userDatabaseName(userId))),
        catchError(error => error.status === 404 ? of({}) : throwError(error))
      ).subscribe(() => {
        this.loginEvent.emit('loggedIn');
      }, this.loginError.bind(this));
    } catch (error) {
      console.error('Error during login:', error);
    }
  }

  loginError() {
    const userName = this.userForm.controls.name.value;
    this.couchService.get('_users/org.couchdb.user:' + userName).subscribe(() => {
      this.errorHandler($localize`Username and/or password do not match`)();
    }, (err) => {
      if (err.error.reason === 'missing') {
        this.errorHandler($localize`Member ${userName} is not registered`)();
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

  sendNotifications(userName: string, addedMember: string) {
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

  createSession(name: string, password: string) {
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

  loginObservables(name: string, password: string) {
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

  getConfigurationSyncDown(configuration: { code: string }, credentials: LoginCredentials) {
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

  openNotificationsDialog(surveys: Array<{ parentId: string }>) {
    this.notificationDialog = this.dialog.open(DashboardNotificationsDialogComponent, {
      data: { surveys },
      maxWidth: '60vw',
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

  private createLoginForm(): LoginFormGroup {
    return this.fb.group<LoginFormControls>({
      name: this.fb.control('', { validators: [ Validators.required, CustomValidators.required ] }),
      password: this.fb.control('', { validators: [ Validators.required ] })
    });
  }

  private createRegisterForm(): RegisterFormGroup {
    return this.fb.group<RegisterFormControls>({
      name: this.fb.control('', {
        validators: this.registerNameValidators(),
        asyncValidators: [ this.uniqueUserValidator() ]
      }),
      password: this.fb.control('', {
        validators: [ Validators.required, CustomValidators.spaceValidator, CustomValidators.matchPassword('repeatPassword', false) ]
      }),
      repeatPassword: this.fb.control('', {
        validators: [ Validators.required, CustomValidators.matchPassword('password', true) ]
      })
    });
  }

  private getLoginCredentials(): LoginCredentials {
    const { name, password } = this.userForm.getRawValue();
    return { name, password };
  }

  private registerNameValidators(): ValidatorFn[] {
    return [
      Validators.required,
      CustomValidators.pattern(/^([^\x00-\x7F]|[A-Za-z0-9])/i, 'invalidFirstCharacter'),
      Validators.pattern(/^([^\x00-\x7F]|[A-Za-z0-9_.-])*$/i)
    ];
  }

  private uniqueUserValidator(): AsyncValidatorFn {
    return (ac: AbstractControl): Promise<ValidationErrors | null> | Observable<ValidationErrors | null> =>
      this.validatorService.isUnique$('_users', 'name', ac, { errorType: 'duplicateUser' });
  }

}
