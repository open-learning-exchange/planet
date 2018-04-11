import { Component, OnInit, ViewChild, AfterViewInit, OnDestroy } from '@angular/core';
import { environment } from '../../environments/environment';
import { UserService } from '../shared/user.service';
import { CouchService } from '../shared/couchdb.service';
import { Router } from '@angular/router';
import { trigger, state, style, animate, transition } from '@angular/animations';
import { languages } from '../shared/languages';
import { interval } from 'rxjs/observable/interval';
import { tap, switchMap, takeUntil } from 'rxjs/operators';
import { Subject } from 'rxjs/Subject';
import { forkJoin } from 'rxjs/observable/forkJoin';

@Component({
  templateUrl: './home.component.html',
  styleUrls: [ './home.scss' ],
  animations: [
    trigger('sidenavState', [
      state('closed', style({
        width: '72px'
      })),
      state('open', style({
        width: '150px'
      })),
      transition('closed <=> open', animate('500ms ease'))
    ])
  ]
})
export class HomeComponent implements OnInit, AfterViewInit, OnDestroy {
  languages = [];
  currentFlag = 'en';
  currentLang = 'English';
  sidenavState = 'closed';
  notifications = [];
  @ViewChild('content') private mainContent;
  user: any = {};

  // Sets the margin for the main content to match the sidenav width
  animObs = interval(15).debug('Menu animation').pipe(tap(() => {
    this.mainContent._updateContentMargins();
    this.mainContent._changeDetectorRef.markForCheck();
  }));
  // For disposable returned by observer to unsubscribe
  animDisp: any;

  private onDestroy$ = new Subject<void>();

  constructor(
    private couchService: CouchService,
    private router: Router,
    private userService: UserService
  ) {
    this.userService.userChange$.pipe(takeUntil(this.onDestroy$))
      .subscribe(() => {
        this.user = this.userService.get();
      });
  }

  ngOnInit() {
    this.getNotification();
    this.user = this.userService.get();
    this.languages = (<any>languages).map(language => {
      if (language.served_url === document.baseURI) {
        this.currentFlag = language.short_code;
        this.currentLang = language.name;
      }
      return language;
    }).filter(lang  => {
      return lang['active'] !== 'N';
    });
  }

  ngAfterViewInit() {
    this.mainContent._updateContentMargins();
    this.mainContent._changeDetectorRef.markForCheck();
  }

  ngOnDestroy() {
    this.onDestroy$.next();
    this.onDestroy$.complete();
  }

  // Used to swap in different background.
  // Should remove when background is finalized.
  backgroundRoute() {
    const routesWithBackground = [ 'resources', 'courses', 'feedback', 'users', 'meetups', 'requests' ];
    // Leaving the exception variable in so we can easily use this while still testing backgrounds
    const routesWithoutBackground = [];
    const isException = routesWithoutBackground
      .findIndex((route) => this.router.url.indexOf(route) > -1) > -1;
    const isRoute = routesWithBackground
      .findIndex((route) => this.router.url.indexOf(route) > -1) > -1;
    return isRoute && !isException;
  }

  toggleNav() {
    this.sidenavState = this.sidenavState === 'open' ? 'closed' : 'open';
    this.animDisp = this.animObs.subscribe();
  }

  userImageSrc() {
    if (this.user._attachments) {
      const filename = Object.keys(this.user._attachments)[0];
      return environment.couchAddress + '_users/org.couchdb.user:' + this.user.name + '/' + filename;
    }
    return '';
  }

  endAnimation() {
    if (this.animDisp) {
      this.animDisp.unsubscribe();
    }
  }

  switchLanguage(servedUrl) {
    alert('You are going to switch in ' + servedUrl + ' environment');
  }

  logoutClick() {
    this.userService.endSessionLog().pipe(switchMap(() => {
      const obsArr = [ this.couchService.delete('_session', { withCredentials: true }) ];
      if (this.userService.getConfig().name === this.userService.get().name) {
        obsArr.push(
          this.couchService.delete('_session', { withCredentials: true, domain: this.userService.getConfig().parent_domain }),
        );
      }
      return forkJoin(obsArr);
    })).subscribe((response: any) => {
        this.userService.unset();
        this.router.navigate([ '/login' ], {});
    }, err => console.log(err));
  }

  getNotification() {
    const userId = 'org.couchdb.user:' + this.userService.get().name;
    this.couchService.allDocs('notifications')
      .subscribe((data) => {
        let cnt = 0;
        data.sort((a, b) => 0 - (new Date(a.time) > new Date(b.time) ? 1 : -1));
        this.notifications = data.map(notifications => {
          if (notifications.status === 'unread') {
            cnt ++;
          }
          return notifications;
        }).filter(nt  => {
          return nt['user'] === userId;
        });
        this.notifications['count_unread'] =  cnt;
      }, (error) => console.log(error));
  }

  readNotification(notification) {
    const updateNotificaton =  { ...notification, 'status': 'read' };
    this.couchService.put('notifications/' + notification._id, updateNotificaton).subscribe((data) => {
      console.log(data);
    },  (err) => console.log(err));
  }

}
