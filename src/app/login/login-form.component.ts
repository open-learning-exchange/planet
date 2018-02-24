import { Component } from '@angular/core';
import { CouchService } from '../shared/couchdb.service';
import { Router, ActivatedRoute } from '@angular/router';
import { UserService } from '../shared/user.service';
import { switchMap } from 'rxjs/operators';
import { PouchdbService } from '../shared/pouchdb.service';

@Component({
  templateUrl: './login-form.component.html',
  styleUrls: ['./login.scss']
})
export class LoginFormComponent {
  constructor(
    private couchService: CouchService,
    private pouchdbService: PouchdbService,
    private router: Router,
    private route: ActivatedRoute,
    private userService: UserService
  ) {}

  createMode: boolean = this.router.url.split('?')[0] === '/login/newuser';
  returnUrl = this.route.snapshot.queryParams['returnUrl'] || '/';
  model = { name: '', password: '', repeatPassword: '' };
  message = '';

  onSubmit() {
    if (this.createMode) {
      this.createUser(this.model);
    } else {
      this.login(this.model, false);
    }
  }

  welcomeNotification(user_id) {
    const data = {
      user: user_id,
      message:
        'Welcome ' +
        user_id.replace('org.couchdb.user:', '') +
        ' to the Planet Learning',
      link: '',
      type: 'register',
      priority: 1,
      status: 'unread',
      time: Date.now()
    };
    this.couchService.post('notifications', data).subscribe(res => {
      console.log(res);
    }, error => (this.message = 'Error'));
  }

  reRoute() {
    this.router.navigate([this.returnUrl]);
  }

  async createUser({
    name,
    password,
    repeatPassword
  }: {
    name: string;
    password: string;
    repeatPassword: string;
  }) {
    if (password === repeatPassword) {
      this.pouchdbService.signupUser(name, password);
      this.reRoute();
      // this.couchService
      //   .put('_users/org.couchdb.user:' + name, {
      //     name: name,
      //     password: password,
      //     roles: [],
      //     type: 'user',
      //     isUserAdmin: false
      //   })
      //   .subscribe(data => {
      //     this.message =
      //       'User created: ' + data.id.replace('org.couchdb.user:', '');
      //     this.welcomeNotification(data.id);
      //     this.login(this.model, true);
      //   }, error => (this.message = ''));
    } else {
      this.message = 'Passwords do not match';
    }
  }

  async login(
    { name, password }: { name: string; password: string },
    isCreate: boolean
  ) {
    this.pouchdbService.login(name, password);
    this.reRoute();
    // this.couchService.post('_session', { 'name': name, 'password': password }, { withCredentials: true })
    //   .pipe(switchMap((data) => {
    //     // Post new session info to login_activity
    //     this.userService.set(data);
    //     return this.userService.newSessionLog();
    //   })).subscribe((res) => {
    //     if (isCreate) {
    //       this.router.navigate( [ 'users/update/' + name ]);
    //     } else {
    //       this.reRoute();
    //     }
    //   }, (error) => this.message = 'Username and/or password do not match');
  }
}
