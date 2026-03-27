import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CouchService } from '../shared/couchdb.service';
import { Router, ActivatedRoute } from '@angular/router';
import { UserService } from '../shared/user.service';
import { switchMap, catchError } from 'rxjs/operators';
import { from, Observable, of, throwError } from 'rxjs';
import {
  AbstractControl, AsyncValidatorFn, FormControl, FormGroup, NonNullableFormBuilder, ValidationErrors, ValidatorFn, Validators
} from '@angular/forms';
import { CustomValidators } from '../validators/custom-validators';
import { PlanetMessageService } from '../shared/planet-message.service';
import { ValidatorService } from '../validators/validator.service';
import { PouchAuthService } from '../shared/database/pouch-auth.service';
import { StateService } from '../shared/state.service';
import { showFormErrors } from '../shared/table-helpers';
import { LoginTasksService } from './login-tasks.service';

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
  styleUrls: ['./login.scss'],
  standalone: false
})
export class LoginFormComponent {
  public userForm!: LoginFormGroup | RegisterFormGroup;
  showPassword = false;
  showRepeatPassword = false;
  @Input() createMode = false;
  @Input() isDialog = false;
  @Output() loginEvent = new EventEmitter<'loggedOut' | 'loggedIn'>();

  constructor(
    private couchService: CouchService,
    private router: Router,
    private route: ActivatedRoute,
    private userService: UserService,
    private fb: NonNullableFormBuilder,
    private planetMessageService: PlanetMessageService,
    private validatorService: ValidatorService,
    private pouchAuthService: PouchAuthService,
    private stateService: StateService,
    private loginTasksService: LoginTasksService
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
      if (this.isDialog) {
        this.pouchAuthService.login(name, password).pipe(
          switchMap((userCtx) => this.userService.setUserAndShelf(userCtx))
        ).subscribe(() => {
          this.loginEvent.emit('loggedIn');
          this.loginTasksService.runPostLoginTasks(name, password, isCreate, userId, configuration);
        }, this.loginError.bind(this));
        return;
      }
      this.pouchAuthService.login(name, password).pipe(
        switchMap(() => (isCreate ?
          from(this.router.navigate([ 'users/update/' + name ])) :
          from(this.reRoute())
        )),
        switchMap(() => this.loginTasksService.postLoginTasks$(name, password, isCreate, userId, configuration)),
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
