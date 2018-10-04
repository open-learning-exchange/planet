import { Component } from '@angular/core';
import { CouchService } from '../shared/couchdb.service';
import { Router, ActivatedRoute } from '@angular/router';
import { UserService } from '../shared/user.service';
import { switchMap, catchError } from 'rxjs/operators';
import { from, forkJoin, of } from 'rxjs';
import { FormControl, FormGroup, FormBuilder, Validators } from '@angular/forms';
import { CustomValidators } from '../validators/custom-validators';
import { PlanetMessageService } from '../shared/planet-message.service';
import { environment } from '../../environments/environment';
import { ValidatorService } from '../validators/validator.service';
import { SyncService } from '../shared/sync.service';
import { PouchAuthService } from '../shared/database';
import { ConfigurationService } from '../configuration/configuration.service';

const registerForm = {
  name: [],
  password: [ '', Validators.compose([
    Validators.required,
    CustomValidators.matchPassword('repeatPassword', false)
  ]) ],
  repeatPassword: [ '', Validators.compose([
    Validators.required,
    CustomValidators.matchPassword('password', true)
  ]) ]
};

const loginForm = {
  name: [ '', Validators.required ],
  password: [ '', Validators.required ]
};

@Component({
  templateUrl: './login-form.component.html',
  styleUrls: [ './login.scss' ]
})
export class LoginFormComponent {
  public userForm: FormGroup;
  constructor(
    private couchService: CouchService,
    private router: Router,
    private route: ActivatedRoute,
    private userService: UserService,
    private formBuilder: FormBuilder,
    private planetMessageService: PlanetMessageService,
    private validatorService: ValidatorService,
    private syncService: SyncService,
    private pouchAuthService: PouchAuthService,
    private configurationService: ConfigurationService,
  ) {
    registerForm.name = [ '', [
      Validators.required,
      CustomValidators.pattern(/^([^\x00-\x7F]|[A-Za-z0-9])/i, 'invalidFirstCharacter'),
      Validators.pattern(/^([^\x00-\x7F]|[A-Za-z0-9_.-])*$/i) ],
      ac => this.validatorService.isUnique$('_users', 'name', ac)
    ];
    const formObj = this.createMode ? registerForm : loginForm;
    this.userForm = this.formBuilder.group(formObj);
  }

  createMode: boolean = this.router.url.split('?')[0] === '/login/newmember';
  returnUrl = this.route.snapshot.queryParams['returnUrl'] || '/';

  onSubmit() {
    if (this.userForm.valid) {
      if (this.createMode) {
        this.createUser(this.userForm.value);
      } else {
        this.login(this.userForm.value, false);
      }
    } else {
      Object.keys(this.userForm.controls).forEach(fieldName => {
        this.userForm.controls[fieldName].markAsTouched();
      });
    }
  }

  welcomeNotification(userId) {
    const data = {
      'user': userId,
      'message': 'Welcome ' + userId.replace('org.couchdb.user:', '') + ' to the Planet Learning',
      'link': '',
      'type': 'register',
      'priority': 1,
      'status': 'unread',
      'time': Date.now()
    };
    this.couchService.post('notifications', data)
      .subscribe();
  }

  reRoute() {
    return this.router.navigateByUrl(this.returnUrl);
  }

  createUser({ name, password }: { name: string, password: string }) {
    const configuration = this.configurationService.configuration;
    const opts = {
      metadata: {
        isUserAdmin: false,
        planetCode: configuration.code,
        parentCode: configuration.parentCode,
        joinDate: Date.now(),
      },
      roles: configuration.autoAccept ? [ 'learner' ] : []
    };

    this.pouchAuthService.signup(name, password, opts).pipe(
      switchMap(() => this.couchService.put('shelf/org.couchdb.user:' + name, {}))
    ).subscribe(
      res => {
        this.planetMessageService.showMessage('Welcome to Planet Learning, ' + res.id.replace('org.couchdb.user:', '') + '!');
        this.welcomeNotification(res.id);
        this.login(this.userForm.value, true);
      },
      this.loginError('An error occurred please try again')
    );
  }

  createParentSession({ name, password }) {
    return this.couchService.post('_session',
      { 'name': name, 'password': password },
      { withCredentials: true, domain: this.userService.getConfig().parentDomain });
  }

  login({ name, password }: { name: string, password: string }, isCreate: boolean) {
    this.pouchAuthService.login(name, password).pipe(
      switchMap(() => isCreate ? from(this.router.navigate([ 'users/update/' + name ])) : from(this.reRoute())),
      switchMap(this.createSession(name, password)),
      switchMap((sessionData) => {
        const adminName = this.userService.getConfig().adminName.split('@')[0];
        return isCreate ? this.sendNotifications(adminName, name) : of(sessionData);
      })
    ).subscribe(() => {}, this.loginError('Username and/or password do not match'));
  }

  loginError(message: string) {
    return () => {
      this.userForm.setErrors({ 'invalid': true });
      this.planetMessageService.showAlert(message);
    };
  }

  sendNotifications(userName, addedMember) {
    const data = {
      'user': 'org.couchdb.user:' + userName,
      'message': 'New member ' + addedMember + ' has joined.',
      'link': '/manager/users/',
      'linkParams': { 'search': addedMember },
      'type': 'new user',
      'priority': 1,
      'status': 'unread',
      'time': Date.now()
    };
    return this.couchService.post('notifications', data);
  }

  createSession(name, password) {
    return () => {
      // Post new session info to login_activity
      const obsArr = this.loginObservables(name, password);
      return forkJoin(obsArr).pipe(catchError(error => {
        // 401 is for Unauthorized
        if (error.status === 401) {
          this.planetMessageService.showMessage('Can not login to parent planet.');
        } else {
          this.planetMessageService.showMessage('Error connecting to parent.');
        }
        return of(error);
      }));
    };
  }

  loginObservables(name, password) {
    const obsArr = [ this.userService.newSessionLog() ];
    const localConfig = this.userService.getConfig();
    const localAdminName = localConfig.adminName.split('@')[0];
    if (environment.test || localAdminName !== name || localConfig.planetType === 'center') {
      return obsArr;
    }
    obsArr.push(this.createParentSession({ 'name': this.userService.getConfig().adminName, 'password': password }));
    if (localConfig.registrationRequest === 'pending') {
      obsArr.push(this.getConfigurationSyncDown(localConfig, { name, password }));
    }
    return obsArr;
  }

  getConfigurationSyncDown(configuration, credentials) {
    const replicators =  {
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

}
