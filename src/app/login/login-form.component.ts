import { Component } from '@angular/core';
import { CouchService } from '../shared/couchdb.service';
import { Router, ActivatedRoute } from '@angular/router';
import { UserService } from '../shared/user.service';
import { switchMap } from 'rxjs/operators';
import { FormControl, FormGroup, FormBuilder, Validators } from '@angular/forms';
import { CustomValidators } from '../validators/custom-validators';

@Component({
  templateUrl: './login-form.component.html',
  styleUrls: [ './login.scss' ]
})
export class LoginFormComponent {
  public userForm: FormGroup;
  public loginUserForm: FormGroup;
  constructor(
    private couchService: CouchService,
    private router: Router,
    private route: ActivatedRoute,
    private userService: UserService,
    private formBuilder: FormBuilder
  ) {
    this.userForm = this.formBuilder.group({
      name: [ '', Validators.required ],
      password: [ '', Validators.compose([
        Validators.required,
        CustomValidators.matchPassword('repeatPassword', false)
        ]) ],
      repeatPassword: [ '', Validators.compose([
        Validators.required,
        CustomValidators.matchPassword('password', true)
        ]) ]
    });
  }

  createMode: boolean = this.router.url.split('?')[0] === '/login/newuser';
  returnUrl = this.route.snapshot.queryParams['returnUrl'] || '/';
  message = '';

  onSubmit() {
    if (this.createMode) {
      if (this.userForm.valid) {
        this.createUser(this.userForm);
      }
    } else {
        this.login(this.userForm, false);
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
      .subscribe((res) => {
        console.log(res);
      }, (error) => this.message = 'Error');
  }

  reRoute() {
    this.router.navigate([ this.returnUrl ]);
  }

  createUser(userForm: FormGroup) {
    this.couchService.put('_users/org.couchdb.user:' + userForm.value.name,
      { 'name': userForm.value.name, 'password': userForm.value.password, 'roles': [], 'type': 'user', 'isUserAdmin': false })
        .subscribe((data) => {
          this.message = 'User created: ' + data.id.replace('org.couchdb.user:', '');
          this.welcomeNotification(data.id);
          this.login(this.userForm, true);
        }, (error) => this.message = '');
  }

  login(userForm: FormGroup, isCreate: boolean) {
    this.couchService.post('_session', { 'name': userForm.value.name, 'password': userForm.value.password }, { withCredentials: true })
      .pipe(switchMap((data) => {
        // Post new session info to login_activity
        this.userService.set(data);
        return this.userService.newSessionLog();
      })).subscribe((res) => {
        if (isCreate) {
          this.router.navigate( [ 'users/update/' + userForm.value.name ]);
        } else {
          this.reRoute();
        }
      }, (error) => this.message = 'Username and/or password do not match');
  }
}
