import { Component } from '@angular/core';
import { CouchService } from '../shared/couchdb.service';
import { Router, ActivatedRoute } from '@angular/router';
import { UserService } from '../shared/user.service';
import { switchMap } from 'rxjs/operators';
import { fromPromise } from 'rxjs/observable/fromPromise';
import { FormControl, FormGroup, FormBuilder, Validators } from '@angular/forms';
import { CustomValidators } from '../validators/custom-validators';
import { PlanetMessageService } from '../shared/planet-message.service';

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
    private planetMessageService: PlanetMessageService
  ) {
    const formObj = this.createMode ? Object.assign({}, loginForm, repeatPassword) : loginForm;
    this.userForm = this.formBuilder.group(formObj);
  }

  createMode: boolean = this.router.url.split('?')[0] === '/login/newuser';
  returnUrl = this.route.snapshot.queryParams['returnUrl'] || '/';
  message = '';
  model = { name: '', password: '', repeatPassword: '' };

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

  welcomeNotification(user_id) {
    const data = {
      'user': user_id,
      'message': 'Welcome ' + user_id.replace('org.couchdb.user:', '') + ' to the Planet Learning',
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
    return this.router.navigate([ this.returnUrl ]);
  }

  createUser({ name, password }: {name: string, password: string}) {
    this.couchService.put('_users/org.couchdb.user:' + name,
      { 'name': name, 'password': password, 'roles': [], 'type': 'user', 'isUserAdmin': false })
        .subscribe((data) => {
          this.planetMessageService.showMessage('User created: ' + data.id.replace('org.couchdb.user:', ''));
          this.welcomeNotification(data.id);
          this.login(this.userForm.value, true);
        }, error => {
          if (error.error.error === 'conflict') {
            this.planetMessageService.showAlert('User name already exists. Please register with a different user name.');
          }
        });
  }

  login({ name, password }: {name: string, password: string}, isCreate: boolean) {
    this.couchService.post('_session', { 'name': name, 'password': password }, { withCredentials: true })
      .pipe(switchMap((data) => {
        // Navigate into app
        if (isCreate) {
          return fromPromise(this.router.navigate( [ 'users/update/' + name ]));
        } else {
          return fromPromise(this.reRoute());
        }
      }), switchMap((routeSuccess) => {
        // Post new session info to login_activity
        return this.userService.newSessionLog();
      })).subscribe((res) => {

      }, (error) => this.planetMessageService.showMessage('Username and/or password do not match'));
  }
}

const repeatPassword = {
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
