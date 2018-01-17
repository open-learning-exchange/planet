import { Component, ViewEncapsulation, OnInit } from '@angular/core';
import { environment } from '../../environments/environment';
import { CouchService } from '../shared/couchdb.service';
import { Router, ActivatedRoute } from '@angular/router';
import { tap, catchError } from 'rxjs/operators';

import { of } from 'rxjs/observable/of';

require('./login.scss');

@Component({
  templateUrl: './login.component.html',
  styleUrls: [ './login.scss' ],
  encapsulation: ViewEncapsulation.None
})
export class LoginComponent implements OnInit {
  constructor(
    private couchService: CouchService,
    private router: Router,
    private route: ActivatedRoute
  ) { }

  createMode: boolean = this.router.url.split('?')[0] === '/login/newuser';
  returnUrl = this.route.snapshot.queryParams['returnUrl'] || '/';
  model = { name: '', password: '', repeatPassword: '' };
  message = '';

  ngOnInit() {
    // If not e2e tests, route to create user if there is no admin
    if (!environment.test) {
      this.checkAdminExistence().subscribe((noAdmin) => {
        // false means there is admin
        if (noAdmin) {
          this.router.navigate([ '/login/newuser' ]);
        }
      });
    }
  }

  onSubmit() {
    if (this.createMode) {
      this.checkAdminExistence().subscribe((noAdmin) => {
        if (noAdmin) {
          this.createAdmin(this.model);
        } else {
          this.createUser(this.model);
        }
      });
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
          this.loginAndEditProfile(this.model);
        }, (error) => this.message = '');
    } else {
      this.message = 'Passwords do not match';
    }
  }

  createAdmin({ name, password, repeatPassword }: {name: string, password: string, repeatPassword: string}) {
    if (password === repeatPassword) {
      this.couchService.put('_node/nonode@nohost/_config/admins/' + name, password)
        .subscribe((data) => {
          this.login(this.model);
        }, (error) => this.message = '');
    } else {
      this.message = 'Passwords do not match';
    }
  }

  checkAdminExistence() {
    return this.couchService.get('_users/_all_docs').pipe(
      tap((data) => {
        return true; // user can see data so there is no admin
      }),
      catchError((error) => {
        return of(false); // user doesn't have permission so there is an admin
      })
    );
  }

  login({ name, password }: {name: string, password: string}) {
    this.couchService.post('_session', { 'name': name, 'password': password }, { withCredentials: true })
      .subscribe((data) => {
        this.reRoute();
      }, (error) => this.message = 'Username and/or password do not match');
  }
   loginAndEditProfile({ name, password }: {name: string, password: string}) {
    this.couchService.post('_session', { 'name': name, 'password': password }, { withCredentials: true })
      .subscribe((data) => {
        this.router.navigate( [ 'users/profile/' + name ]);
      }, (error) => this.message = 'Username and/or password do not match');
  }
}
