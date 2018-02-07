import { Component } from '@angular/core';
import { CouchService } from '../shared/couchdb.service';
import { Router, ActivatedRoute } from '@angular/router';
import { UserService } from '../shared/user.service';
import { switchMap } from 'rxjs/operators';

@Component({
  templateUrl: './login-form.component.html',
  styleUrls: [ './login.scss' ]
})
export class LoginFormComponent {
  constructor(
    private couchService: CouchService,
    private router: Router,
    private route: ActivatedRoute,
    private userService: UserService
  ) { }

  createMode: boolean = this.router.url.split('?')[0] === '/login/newuser';
  returnUrl = this.route.snapshot.queryParams['returnUrl'] || '/';
  model = { name: '', password: '', repeatPassword: '' };
  message = '';

  onSubmit() {
    if (this.createMode) {
      this.createUser(this.model);
    } else {
      this.login(this.model);
    }
  }

  reRoute() {
    this.router.navigate([ this.returnUrl ]);
  }

  createUser({ name, password, repeatPassword }: {name: string, password: string, repeatPassword: string}) {
    if (password === repeatPassword) {
      this.couchService.put('_users/org.couchdb.user:' + name, { 'name': name, 'password': password, 'roles': [], 'type': 'user' })
        .subscribe((data) => {
          this.message = 'User created: ' + data.id.replace('org.couchdb.user:', '');
          this.login(this.model);
        }, (error) => this.message = '');
    } else {
      this.message = 'Passwords do not match';
    }
  }

  login({ name, password }: {name: string, password: string}) {
    this.couchService.post('_session', { 'name': name, 'password': password }, { withCredentials: true })
      .pipe(switchMap((data) => {
        // Post new session info to login_activity
        this.userService.set(data);
        return this.userService.newSessionLog();
      })).subscribe((res) => {
        this.reRoute();
      }, (error) => this.message = 'Username and/or password do not match');
  }
}
