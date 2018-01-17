import { Component, OnInit } from '@angular/core';
import { UserService } from '../shared/user.service';
import { CouchService } from '../shared/couchdb.service';
import { Router } from '@angular/router';
import { languages } from '../shared/languages';

@Component({
  selector: 'planet-navigation',
  template: `
    <ul>
      <li *ngFor="let comp of components"><a [routerLink]="'/' + comp.link">{{comp.name.toUpperCase()}}</a></li>
      <li><a href="#" class="km-logout" (click)="logoutClick()">LOGOUT</a></li>
      <li><a routerLink="/manager"><mat-icon>person</mat-icon></a></li>
      <li>
        <button mat-icon-button [matMenuTriggerFor]="language_menu">
          <img *ngIf="current_flag" src="assets/flags/{{current_flag}}.png" i18n-alt alt="{{current_lang}}" i18n-title
        title="{{current_lang}}" />
        </button>
        <mat-menu #language_menu="matMenu">
          <button mat-menu-item *ngFor="let language of languages" (click)="switchLanguage(language.served_url)">
            <img src="assets/flags/{{language.short_code}}.png" i18n-title title="{{language.name}}" i18n-alt alt="{{language.name}}" />
            <span>{{language.short_code}}</span>
          </button>
        </mat-menu>
      </li>
      <li><a routerLink="/manager"><i class="material-icons">settings</i></a></li>
      <li *ngIf="roles.indexOf('_admin') === -1"><a routerLink="/users/profile/{{name}}"><mat-icon>person</mat-icon></a></li>
      <li>
        <mat-icon [matMenuTriggerFor]="notification" *ngIf="notifications.length > 0" title="Notification">
        notifications</mat-icon>({{notifications.count_unread}})
        <mat-icon *ngIf="notifications.length === 0" title="No Notification">notifications</mat-icon>
      </li>
    </ul>
    <mat-menu #notification="matMenu" [overlapTrigger]="false">
      <span mat-menu-item *ngFor="let notification of notifications" (click)="readNotification(notification.doc)">
        <mat-divider></mat-divider>
        <p [ngStyle]="{'color': 'green'}" *ngIf="notification.doc.status==='unread' && notification.doc.link">
          <a href="{{notification.doc.link}}">{{notification.doc.message}} {{notification.doc.time | date: 'MMM d, yyyy'}}</a>
        </p>
        <p [ngStyle]="{'color': 'green'}" *ngIf="notification.doc.status==='unread' && notification.doc.link ===''">
          {{notification.doc.message}} {{notification.doc.time | date: 'MMM d, yyyy'}}
        </p>
        <p *ngIf="notification.status!=='unread' && notification.doc.link">
          <a href="{{notification.doc.link}}">{{notification.doc.message}} {{notification.doc.time | date: 'MMM d, yyyy'}}</a>
        </p>
        <p *ngIf="notification.status!=='unread' && notification.doc.link===''">
          {{notification.doc.message}} {{notification.doc.time | date: 'MMM d, yyyy'}}
        </p>
      </span>
    </mat-menu>
  `,
  styleUrls: [ './navigation.scss' ]
})

export class NavigationComponent implements OnInit {

  languages = [];
  current_flag = 'en';
  current_lang = 'English';
  name = '';
  roles: string[] = [];
  notifications = [];

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
    { link: 'feedback', name: 'Feedback' },
  ];

  ngOnInit() {
    this.getNotification();
    Object.assign(this, this.userService.get());
    this.languages = (<any>languages).map(language => {
      if (language.served_url === document.baseURI) {
        this.current_flag = language.short_code;
        this.current_lang = language.name;
      }
      return language;
    }).filter(lang  => {
      return lang['active'] !== 'N';
    });
  }

  switchLanguage(served_url) {
    alert('You are going to switch in ' + served_url + ' environment');
  }

  logoutClick() {
    this.couchService.delete('_session', { withCredentials: true }).subscribe((data: any) => {
      if (data.ok === true) {
        this.router.navigate([ '/login' ], {});
      }
    });
  }

  getNotification() {
    const user_id = 'org.couchdb.user:' + this.userService.get().name;
    this.couchService.get('notifications/_all_docs?include_docs=true')
      .subscribe((data) => {
        let cnt = 0;
        data.rows.sort((a, b) => 0 - (new Date(a.doc.time) > new Date(b.doc.time) ? 1 : -1));
        this.notifications = data.rows.map(notifications => {
          if (notifications.doc.status === 'unread') {
            cnt ++;
          }
          return notifications;
        }).filter(nt  => {
          return nt.doc['user'] === user_id;
        });
        this.notifications['count_unread'] =  cnt;
        console.log('NOtificaiton', this.notifications);
      }, (error) => console.log(error));
  }

  readNotification(notification) {
    const update_notificaton =  { ...notification, 'status': 'read' };
    this.couchService.put('notifications/' + notification._id, update_notificaton).subscribe((data) => {
      console.log(data);
    },  (err) => console.log(err));
  }

}
