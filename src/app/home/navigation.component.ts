import { Component, OnInit } from '@angular/core';

import { CouchService } from '../shared/couchdb.service';
import { Router } from '@angular/router';

@Component({
  selector: 'planet-navigation',
  template: `
    <ul>
      <li *ngFor="let comp of components"><a [routerLink]="'/' + comp.link">{{comp.name.toUpperCase()}}</a></li>
      <li><a href="#" class="km-logout" (click)="logoutClick()">LOGOUT</a></li>
      <li><a routerLink="/manager"><mat-icon>person</mat-icon></a></li>
      <li>
        <button mat-icon-button [matMenuTriggerFor]="language_menu">
          <mat-icon>more_vert</mat-icon>
        </button>
        <mat-menu #language_menu="matMenu">
          <button mat-menu-item *ngFor="let language of languages">
            <img src = "" title= "{{language.name}}" alt = "{{language.name}}" />
            <span>{{language.short_code}}</span>
          </button>
        </mat-menu>
      </li>
    </ul>
  `,
  styleUrls: [ './navigation.scss' ]
})

export class NavigationComponent implements OnInit {

  languages = [];

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

  ngOnInit() {
    this.couchService.get('languages/_all_docs?include_docs=true')
      .subscribe((data) => {
        this.languages = data.rows.map(language => language.doc);
      }, (error) => console.log('There is a problem of getting languages'));
  }

  logoutClick() {
    this.couchService.delete('_session', { withCredentials: true }).subscribe((data: any) => {
      if (data.ok === true) {
        this.router.navigate([ '/login' ], {});
      }
    });
  }

}
