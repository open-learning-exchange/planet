import { Component } from '@angular/core';

import { CouchService } from '../shared/couchdb.service';
import { Router, ActivatedRoute } from '@angular/router';

require('./login.scss');

@Component({
  template: `
    <div class="ole-login">
      <div class="ole-logo">
        <img src="assets/cropped-ole-ico-logo-180x180.png">
        <h1 i18n>Planet Learning</h1>
        <h3 i18n>Version 2.01</h3>
      </div>
      <form (ngSubmit)="onSubmit()" #loginForm="ngForm">
        <div>
          <input [(ngModel)]="model.name" i18n-placeholder placeholder="Username" name="name" />
        </div>
        <div *ngIf="createMode || resetMode == false">
          <input [(ngModel)]="model.password" i18n-placeholder placeholder="Password" name="password" type="password" />
        </div>
        <div *ngIf="createMode">
          <input [(ngModel)]="model.repeatPassword" i18n-placeholder placeholder="Repeat Password" name="repeatPassword" type="password" />
        </div>
        <div class="login-actions">
          <div>
            <button class="ole-btn cursor-pointer" *ngIf="createMode">{{ 'Create User' }}</button>
            <button class="ole-btn cursor-pointer" *ngIf="resetMode">{{ 'Reset' }}</button>
            <button class="ole-btn cursor-pointer" *ngIf="createMode == false && resetMode == false">{{ 'SIGN-IN' }}</button>
          </div>
          <div>
            <a [routerLink]="resetMode ? ['/login'] : ['/login/resetpassword']">
              {{ resetMode ? 'Already have an account?' : 'RESET' }}
            </a>
          </div>
          <div>
            <a [routerLink]="createMode ? ['/login'] : ['/login/newuser']">
              {{ createMode ? 'Already have an account?' : 'SIGN-UP' }}
            </a>
          </div>
        </div>
      </form>
      <div id="login-status">{{message}}</div>
    </div>
  `,
  styleUrls: ['./login.scss']

})
export class LoginComponent {
  constructor(
    private couchService: CouchService,
    private router: Router,
    private route: ActivatedRoute
  ) { }

  createMode: boolean = this.router.url.split('?')[0] === '/login/newuser';
  resetMode: boolean = this.router.url.split('?')[0] === '/login/resetpassword';
  returnUrl = this.route.snapshot.queryParams['returnUrl'] || '/';
  model = { name: '', password: '', repeatPassword: '' };
  message = '';

  onSubmit() {
    if (this.createMode) {
      this.checkAdminExistence().then((noAdmin) => {
        if (noAdmin) {
          this.createAdmin(this.model);
        } else {
          this.createUser(this.model);
        }
      });
    } else if (this.resetMode) {
      this.resetPassword(this.model);
    } else {
      this.login(this.model);
    }
  }

  reRoute() {
    this.router.navigate([this.returnUrl]);
  }

  createUser({name, password, repeatPassword}: {name: string, password: string, repeatPassword: string}) {
    if (password === repeatPassword) {
      this.couchService.put('_users/org.couchdb.user:' + name, {'name': name, 'password': password, 'roles': [], 'type': 'user'})
        .then((data) => {
          this.message = 'User created: ' + data.id.replace('org.couchdb.user:', '');
          this.reRoute();
        }, (error) => this.message = '');
    } else {
      this.message = 'Passwords do not match';
    }
  }

  createAdmin({name, password, repeatPassword}: {name: string, password: string, repeatPassword: string}) {
    if (password === repeatPassword) {
      this.couchService.put('_node/nonode@nohost/_config/admins/' + name, password)
        .then((data) => {
          this.reRoute();
        }, (error) => this.message = '');
    } else {
      this.message = 'Passwords do not match';
    }
  }

  checkAdminExistence() {
    return this.couchService.get('_users/_all_docs')
      .then((data) => {
        return true; // user can see data so there is no admin
      }, (error) => {
        return false; // user doesn't have permission so there is an admin
      });
  }

  login({name, password}: {name: string, password: string}) {
    this.couchService.post('_session', {'name': name, 'password': password}, { withCredentials: true })
      .then((data) => {
        this.reRoute();
      }, (error) => this.message = 'Username and/or password do not match');
  }

  resetPassword({name}: {name: string}) {
    //checkbyname and password
    this.couchService.get('_users/_design/planet/_view/CheckByUser?key="' + name + '"')
      .then((data) => {
         console.log(data);
       }, (error) => {
          this.message = 'Username does not exist.'
         return false; 
    });
  }
}
