import { Component, OnInit } from '@angular/core';
import { UserService } from '../shared/user.service';
import { CouchService } from '../shared/couchdb.service';
import { Router } from '@angular/router';
import * as languages from '../../../design/languages/languages-mockup.json';

@Component({
  selector: 'planet-navigation',
  template: `
    <ul>
      <li *ngFor="let comp of components"><a [routerLink]="'/' + comp.link">{{comp.name.toUpperCase()}}</a></li>
      <li><a href="#" class="km-logout" (click)="logoutClick()">LOGOUT</a></li>
      <li><a routerLink="/manager"><mat-icon>person</mat-icon></a></li>
      <li>
        <img *ngIf="selected_flag" src="{{selected_flag}}" i18n-alt alt="{{selected_lang}}" i18n-title title="{{selected_lang}}" />
        <button mat-icon-button [matMenuTriggerFor]="language_menu">
          <mat-icon>more_vert</mat-icon>
        </button>
        <mat-menu #language_menu="matMenu">
          <button mat-menu-item *ngFor="let language of languages" (click)="switchLanguage(language)">
            <img src="{{language.flag}}" i18n-title title="{{language.name}}" i18n-alt alt="{{language.name}}" />
            <span>{{language.short_code}}</span>
          </button>
        </mat-menu>
      </li>
      <li><a routerLink="/manager"><i class="material-icons">settings</i></a></li>
      <li *ngIf="roles.indexOf('_admin') === -1"><a routerLink="/users/profile/{{name}}"><mat-icon>person</mat-icon></a></li>
    </ul>
  `,
  styleUrls: [ './navigation.scss' ]
})

export class NavigationComponent implements OnInit {

  languages = [];
  selected_flag = '';
  selected_lang = '';
  name = '';
  roles: string[] = [];

  constructor(
    private couchService: CouchService,
    private router: Router,
    private userService: UserService
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
    Object.assign(this, this.userService.get());
    this.languages = (<any>languages);
  }

  switchLanguage(lang) {
    this.selected_flag = lang.flag;
    this.selected_lang = lang.name;
  }

  logoutClick() {
    this.couchService.delete('_session', { withCredentials: true }).subscribe((data: any) => {
      if (data.ok === true) {
        this.router.navigate([ '/login' ], {});
      }
    });
  }

}
