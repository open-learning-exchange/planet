import { Component } from '@angular/core';

import { CouchService } from '../shared/couchdb.service';
import { Router } from '@angular/router';

@Component({
  selector: 'planet-navigation',
  template: `
    <ul>
      <li *ngFor="let comp of components"><a [routerLink]="'/' + comp.link">{{comp.name.toUpperCase()}}</a></li>
      <li><a href="#" class="km-logout" (click)="logoutClick()">LOGOUT</a></li>
      <li>
        <mat-form-field>
          <mat-select placeholder="Select Language">
            <mat-option *ngFor="let language of languages" [value]="language.value" (click)="open()">
              {{ language.viewValue }}
            </mat-option>
          </mat-select>
        </mat-form-field>
      </li>
    </ul>
  `,
  styleUrls: [ './navigation.scss' ]
})
export class NavigationComponent {
  direction = 'ltr';
  constructor(
    private couchService: CouchService,
    private router: Router
  ) {}

  components = [
    { link: '', name: 'Home' },
    { link: 'resources', name: 'Library' },
    { link: 'courses', name: 'Courses' },
    { link: 'meetups', name: 'Meetups' },
    { link: 'users', name: 'Members' },
    { link: '', name: 'Reports' },
    { link: '', name: 'Feedback' },
  ];

  languages = [
    { value: 'language-0', viewValue: 'English' },
    { value: 'language-1', viewValue: 'Arabic' }
  ];

  open() {
    this.direction = this.direction === 'ltr' ? 'rtl' : 'ltr';
  }

  logoutClick() {
    this.couchService.delete('_session', { withCredentials: true }).then((data: any) => {
      if (data.ok === true) {
        this.router.navigate([ '/login' ], {});
      }
    });
  }

}
