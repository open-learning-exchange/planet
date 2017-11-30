import { Component } from '@angular/core';

import { CouchService } from '../shared/couchdb.service';
import { Router } from '@angular/router';

@Component({
  selector: 'planet-navigation',
  template: `
    <ul>
      <li [ngStyle]="{'width': '10%'}">
        <i *ngIf="selectedIcon"><img [src]="selectedIcon" alt="selectedIcon" style="margin-bottom: -15px"></i>
        <mat-form-field [ngStyle]="{'width': '60%'}">
          <mat-select [(ngModel)]="selectedLanguage" [(value)]="selected">
            <mat-option *ngFor="let language of languages" value="{{language.value}}" (click)="setDirection(selectedLanguage)">
              <img src="{{language.icon}}" alt="{{language.value}}" title="{{language.text}}">
              {{language.text}}
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
  selectedIcon;

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
    { text: 'English', value: 'en', icon: '../../assets/flags/us.png' },
    { text: 'Arabic', value: 'ar', icon: '../../assets/flags/ar.png' }
  ];

  setDirection(selected) {
    const url = '../../assets/flags/';
    if (selected === 'en') {
      selected = 'us';
    }
    this.selectedIcon = url + selected + '.png';
    if (selected === 'ar') {
      localStorage.setItem('direction', 'rtl');
      localStorage.setItem('lang', selected);
    } else {
      localStorage.setItem('direction', 'ltr');
      localStorage.setItem('lang', selected);
    }
    location.reload();
  }

  logoutClick() {
    this.couchService.delete('_session', { withCredentials: true }).then((data: any) => {
      if (data.ok === true) {
        this.router.navigate([ '/login' ], {});
      }
    });
  }


}
