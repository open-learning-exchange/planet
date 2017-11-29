import { Component } from '@angular/core';

import { CouchService } from '../shared/couchdb.service';
import { Router } from '@angular/router';

@Component({
  selector: 'planet-navigation',
  template: `
    <ul>
      <li>
        <mat-form-field>
          <mat-select [(ngModel)]="selectedLanguage">
            <mat-option *ngFor="let language of languages" [value]="language.value" (click)="setDirection(selectedLanguage)">
              {{ language.text }}
            </mat-option>
          </mat-select>
        </mat-form-field>
      </li>
      <li *ngFor="let comp of components"><a [routerLink]="'/' + comp.link">{{comp.name.toUpperCase()}}</a></li>
      <li><a href="#" class="km-logout" (click)="logoutClick()">LOGOUT</a></li>
    </ul>
  `,
  styleUrls: [ './navigation.scss' ]
})
export class NavigationComponent {

  selectedLanguage: string;

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
    { text: 'English', value: 'en' },
    { text: 'Arabic', value: 'ar' }
  ];

  setDirection(selectedValue) {
    if (selectedValue === 'ar') {
      localStorage.setItem('direction', 'rtl');
      localStorage.setItem('lang', selectedValue);
    } else {
      localStorage.setItem('direction', 'ltr');
      localStorage.setItem('lang', selectedValue);
    }
  }

  logoutClick() {
    this.couchService.delete('_session', { withCredentials: true }).then((data: any) => {
      if (data.ok === true) {
        this.router.navigate([ '/login' ], {});
      }
    });
  }

}
