import { Component, OnInit, ViewChild } from '@angular/core';
import { trigger, state, style, animate, transition } from '@angular/animations';
import { environment } from '../../environments/environment';
import { UserService } from '../shared/user.service';
import { CouchService } from '../shared/couchdb.service';
import { Router } from '@angular/router';
import { Subject, forkJoin, interval } from 'rxjs';
import { switchMap, takeUntil, tap } from 'rxjs/operators';
import { debug } from '../debug-operator';
import { findDocuments } from '../shared/mangoQueries';
import { PouchAuthService } from '../shared/database';
import { StateService } from '../shared/state.service';
import { HomeModernComponent } from './home-modern.component';

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
export class HomeComponent implements OnInit {

  notifications = [];
  user: any = {};
  userImgSrc = '';
  layout: string;
  forceModern: boolean;
  sidenavState = 'closed';
  @ViewChild('content') private mainContent;
  @ViewChild(HomeModernComponent) private homeModernComponent: HomeModernComponent;

  // Sets the margin for the main content to match the sidenav width
  animObs = interval(15).pipe(
    debug('Menu animation'),
    tap(() => {
      this.mainContent._updateContentMargins();
      this.mainContent._changeDetectorRef.markForCheck();
    }
  ));

  private onDestroy$ = new Subject<void>();

  constructor(
    private couchService: CouchService,
    private router: Router,
    private userService: UserService,
    private pouchAuthService: PouchAuthService,
    private stateService: StateService
  ) {
    this.userService.userChange$.pipe(takeUntil(this.onDestroy$))
      .subscribe(() => {
        this.onUserUpdate();
      });
    this.couchService.get('_node/nonode@nohost/_config/planet').subscribe((res: any) => this.layout = res.layout || 'classic');
  }

  ngOnInit() {
    this.getNotification();
    this.onUserUpdate();
    this.userService.notificationStateChange$.pipe(takeUntil(this.onDestroy$)).subscribe(() => {
      this.getNotification();
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
    const router = this.router;
    return () => {
      const routesWithBackground = [
        'resources', 'courses', 'feedback', 'users', 'meetups', 'requests', 'associated', 'submissions', 'teams'
      ];
      // Leaving the exception variable in so we can easily use this while still testing backgrounds
      const routesWithoutBackground = [];
      const isException = routesWithoutBackground
        .findIndex((route) => router.url.indexOf(route) > -1) > -1;
      const isRoute = routesWithBackground
        .findIndex((route) => router.url.indexOf(route) > -1) > -1;
      return isRoute && !isException;
    };
  }

  onUserUpdate() {
    this.user = this.userService.get();
    if (this.user._attachments) {
      const filename = Object.keys(this.user._attachments)[0];
      this.userImgSrc = environment.couchAddress + '/_users/org.couchdb.user:' + this.user.name + '/' + filename;
    } else {
      this.userImgSrc = '';
    }
  }

  logoutClick() {
    return () => {
      const configuration = this.stateService.configuration;
      this.userService.endSessionLog().pipe(switchMap(() => {
        const obsArr = [ this.pouchAuthService.logout() ];
        const localAdminName = configuration.adminName.split('@')[0];
        if (localAdminName === this.userService.get().name) {
          obsArr.push(
            this.couchService.delete('_session', { withCredentials: true, domain: configuration.parentDomain }),
          );
        }
        return forkJoin(obsArr);
      })).subscribe((response: any) => {
          this.userService.unset();
          this.router.navigate([ '/login' ], {});
      }, err => console.log(err));
    };
  }

  getNotification() {
    const userFilter = [ {
      'user': 'org.couchdb.user:' + this.userService.get().name
    } ];
    if (this.userService.get().isUserAdmin) {
      userFilter.push({ 'user': 'SYSTEM' });
    }
    this.couchService.findAll('notifications', findDocuments(
      { '$or': userFilter,
      // The sorted item must be included in the selector for sort to work
        'time': { '$gt': 0 },
        'status': 'unread'
      },
      0,
      [ { 'time': 'desc' } ]))
    .subscribe(data => {
      this.notifications = data;
    }, (error) => console.log(error));
  }

  readNotification() {
    return (notification) => {
      const updateNotificaton =  { ...notification, 'status': 'read' };
      this.couchService.put('notifications/' + notification._id, updateNotificaton).subscribe((data) => {
        this.userService.setNotificationStateChange();
      },  (err) => console.log(err));
    };
  }

  sizeChange(forceModern: boolean) {
    this.forceModern = forceModern;
  }

  endAnimation() {
    if (this.homeModernComponent) {
      this.homeModernComponent.endAnimation();
    }
  }

}
