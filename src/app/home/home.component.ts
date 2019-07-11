import { Component, OnInit, ViewChild, ElementRef, DoCheck, AfterViewChecked, HostListener, OnDestroy } from '@angular/core';
import { trigger, state, style, animate, transition } from '@angular/animations';
import { environment } from '../../environments/environment';
import { UserService } from '../shared/user.service';
import { CouchService } from '../shared/couchdb.service';
import { Router } from '@angular/router';
import { Subject, interval, of } from 'rxjs';
import { switchMap, takeUntil, tap, catchError } from 'rxjs/operators';
import { debug } from '../debug-operator';
import { findDocuments } from '../shared/mangoQueries';
import { PouchAuthService } from '../shared/database';
import { StateService } from '../shared/state.service';

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
export class HomeComponent implements OnInit, DoCheck, AfterViewChecked, OnDestroy {

  notifications = [];
  user: any = {};
  userImgSrc = '';
  layout = 'classic';
  forceModern: boolean;
  sidenavState = 'closed';
  classicToolbarWidth = 0;
  @ViewChild('content') private mainContent;
  @ViewChild('toolbar', { read: ElementRef }) private toolbar: ElementRef;
  planetName;

  // Sets the margin for the main content to match the sidenav width
  animObs = interval(15).pipe(
    debug('Menu animation'),
    tap(() => {
      this.mainContent._updateContentMargins();
      this.mainContent._changeDetectorRef.markForCheck();
    }
  ));
  // For disposable returned by observer to unsubscribe
  animDisp: any;
  onlineStatus = 'offline';

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
    this.onlineStatus = this.stateService.configuration.registrationRequest;
  }

  ngOnInit() {
    this.getNotification();
    this.onUserUpdate();
    this.userService.notificationStateChange$.pipe(takeUntil(this.onDestroy$)).subscribe(() => {
      this.getNotification();
    });
    this.planetName = this.stateService.configuration.name;
    this.stateService.couchStateListener('configurations').subscribe((res) => {
      if (res !== undefined) {
        this.planetName = this.stateService.configuration.name;
      }
    });
  }

  ngDoCheck() {
    this.onResize();
  }

  ngAfterViewChecked() {
    const toolbarElement = this.toolbar.nativeElement;
    const toolbarStyle = window.getComputedStyle(toolbarElement);
    const navbarCenter = toolbarElement.querySelector('.navbar-center');
    if (navbarCenter !== null) {
      this.classicToolbarWidth =
        toolbarElement.querySelector('.navbar-left').offsetWidth +
        navbarCenter.offsetWidth +
        toolbarElement.querySelector('.navbar-right').offsetWidth +
        parseInt(toolbarStyle.paddingLeft, 10) +
        parseInt(toolbarStyle.paddingRight, 10);
      this.mainContent._updateContentMargins();
      this.mainContent._changeDetectorRef.markForCheck();
    }
  }

  ngOnDestroy() {
    this.onDestroy$.next();
    this.onDestroy$.complete();
  }

  @HostListener('window:resize') onResize() {
    const isScreenTooNarrow = window.innerWidth < this.classicToolbarWidth;
    if (this.forceModern !== isScreenTooNarrow) {
      this.forceModern = isScreenTooNarrow;
    }
  }

  // Used to swap in different background.
  // Should remove when background is finalized.
  backgroundRoute() {
    const url = this.router.url;
    const routesWithBackground = [
      'resources', 'courses', 'feedback', 'users', 'meetups', 'requests', 'associated', 'submissions', 'teams', 'surveys', 'news',
      'mySurveys'
    ];
    // Leaving the exception variable in so we can easily use this while still testing backgrounds
    const routesWithoutBackground = [];
    const isException = routesWithoutBackground
      .findIndex((route) => url.indexOf(route) > -1) > -1;
    const isRoute = routesWithBackground
      .findIndex((route) => url.indexOf(route) > -1) > -1;
    return url === '/' && this.userService.isBetaEnabled() || isRoute && !isException;
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
    const configuration = this.stateService.configuration;
    const errorCatch = error => {
      console.log(error);
      return of({});
    };
    this.userService.endSessionLog().pipe(
      catchError(errorCatch),
      switchMap(() => this.pouchAuthService.logout()),
      switchMap(() => {
        const localAdminName = configuration.adminName.split('@')[0];
        if (localAdminName === this.userService.get().name) {
          return this.couchService.delete('_session', { withCredentials: true, domain: configuration.parentDomain });
        }
        return of({});
      }),
      catchError(errorCatch)
    ).subscribe((response: any) => {
      this.userService.unset();
      this.router.navigate([ '/login' ], {});
    });
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

  readNotification(notification) {
    const updateNotificaton = { ...notification, 'status': 'read' };
    this.couchService.put('notifications/' + notification._id, updateNotificaton).subscribe((data) => {
      this.userService.setNotificationStateChange();
    }, (err) => console.log(err));
  }

  sizeChange(forceModern: boolean) {
    this.forceModern = forceModern;
  }

  toggleNav() {
    this.sidenavState = this.sidenavState === 'open' ? 'closed' : 'open';
    this.animDisp = this.animObs.subscribe();
  }

  endAnimation() {
    if (this.animDisp) {
      this.animDisp.unsubscribe();
    }
  }

}
