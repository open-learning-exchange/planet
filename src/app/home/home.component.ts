import { Component, OnInit, ViewChild, ElementRef, DoCheck, AfterViewChecked, HostListener, OnDestroy } from '@angular/core';
import { Router, NavigationStart } from '@angular/router';
import { trigger, state, style, animate, transition } from '@angular/animations';
import { MatDialog } from '@angular/material/dialog';
import { Subject, interval, of, Subscription } from 'rxjs';
import { switchMap, takeUntil, tap, catchError } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { UserService } from '../shared/user.service';
import { CouchService } from '../shared/couchdb.service';
import { debug } from '../debug-operator';
import { findDocuments } from '../shared/mangoQueries';
import { PouchAuthService } from '../shared/database/pouch-auth.service';
import { UnsavedChangesService } from '../shared/unsaved-changes.service';
import { StateService } from '../shared/state.service';
import { DeviceInfoService } from '../shared/device-info.service';
import { NotificationsService } from '../notifications/notifications.service';
import { DialogsAnnouncementComponent, includedCodes, challengePeriod } from '../shared/dialogs/dialogs-announcement.component';
import { LoginDialogComponent } from '../login/login-dialog.component';
import { PlanetLanguageComponent } from '../shared/planet-language.component';

@Component({
  templateUrl: './home.component.html',
  styleUrls: [ './home.scss' ],
  animations: [
    trigger('sidenavState', [
      state('closed', style({
        width: '72px'
      })),
      state('open', style({
        width: '175px'
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
  @ViewChild(PlanetLanguageComponent) languageComponent: PlanetLanguageComponent;
  planetName;
  isAndroid: boolean;
  showBanner = true;
  isLoggedIn = false;

  // Sets the margin for the main content to match the sidenav width
  animObs = interval(15).pipe(
    debug('Menu animation'),
    tap(() => {
      this.mainContent.updateContentMargins();
      this.mainContent._changeDetectorRef.markForCheck();
    }
  ));
  // For disposable returned by observer to unsubscribe
  animDisp: any;
  onlineStatus = 'offline';
  configuration = this.stateService.configuration;
  planetType = this.stateService.configuration.planetType;

  private onDestroy$ = new Subject<void>();
  private hasUnsavedChangesSubscription: Subscription;
  hasUnsavedChanges = false;
  private routerSubscription: Subscription;

  constructor(
    private dialog: MatDialog,
    private couchService: CouchService,
    private router: Router,
    private userService: UserService,
    private pouchAuthService: PouchAuthService,
    private unsavedChangesService: UnsavedChangesService,
    private stateService: StateService,
    private deviceInfoService: DeviceInfoService,
    private notificationsService: NotificationsService,
  ) {
    this.userService.userChange$.pipe(takeUntil(this.onDestroy$))
      .subscribe(() => {
        this.onUserUpdate();
        this.getNotification();
      });
    this.couchService.get('_node/nonode@nohost/_config/planet').subscribe((res: any) => this.layout = res.layout || 'classic');
    this.onlineStatus = this.stateService.configuration.registrationRequest;
    this.isAndroid = this.deviceInfoService.isAndroid();
  }

  ngOnInit() {
    this.getNotification();
    this.onUserUpdate();
    this.userService.notificationStateChange$.pipe(takeUntil(this.onDestroy$)).subscribe(() => {
      this.getNotification();
    });
    this.planetName = this.stateService.configuration.name;
    this.stateService.couchStateListener('configurations').pipe(takeUntil(this.onDestroy$)).subscribe((res) => {
      if (res !== undefined) {
        this.configuration = this.stateService.configuration;
        this.planetType = this.stateService.configuration.planetType;
        this.planetName = this.stateService.configuration.name;
      }
    });
    this.subscribeToLogoutClick();
    this.routerSubscription = this.router.events.subscribe(event => {
      if (event instanceof NavigationStart) {
        if (this.unsavedChangesService.getHasUnsavedChanges()) {
          const confirmLeave = window.confirm(UnsavedChangesService.warningMsg);
          if (confirmLeave) {
            this.unsavedChangesService.setHasUnsavedChanges(false);
          } else {
            this.router.navigateByUrl(this.router.url);
          }
        }
      }
    });
  }

  ngDoCheck() {
    this.onResize();
  }

  ngAfterViewChecked() {
    const toolbarElement = this.toolbar.nativeElement;
    if (!toolbarElement) { return; }
    const toolbarStyle = window.getComputedStyle(toolbarElement);
    const navbarCenter = toolbarElement.querySelector('.navbar-center');
    if (navbarCenter !== null) {
      this.classicToolbarWidth =
        toolbarElement.querySelector('.navbar-left').offsetWidth +
        navbarCenter.offsetWidth +
        toolbarElement.querySelector('.navbar-right').offsetWidth +
        parseInt(toolbarStyle.paddingLeft, 10) +
        parseInt(toolbarStyle.paddingRight, 10);
      this.mainContent._changeDetectorRef.markForCheck();
    }
  }

  ngOnDestroy() {
    if (this.hasUnsavedChangesSubscription) {
      this.hasUnsavedChangesSubscription.unsubscribe();
    }
    if (this.routerSubscription) {
      this.routerSubscription.unsubscribe();
    }
    this.onDestroy$.next();
    this.onDestroy$.complete();
  }

  openLanguageSelector(): void {
    this.languageComponent?.openMenu();
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
      'mySurveys', 'myHealth', 'myCourses', 'myLibrary', 'myTeams', 'enterprises', 'certifications', 'myDashboard', 'nation', 'earth',
      'health', 'myPersonals', 'community', 'voices'
    ];
    // Leaving the exception variable in so we can easily use this while still testing backgrounds
    const routesWithoutBackground = [];
    const isException = routesWithoutBackground
      .findIndex((route) => url.indexOf(route) > -1) > -1;
    const isRoute = routesWithBackground
      .findIndex((route) => url.indexOf(route) > -1) > -1;
    return url === '/' || isRoute && !isException;
  }

  onUserUpdate() {
    this.user = this.userService.get();
    this.isLoggedIn = this.user._id !== undefined;
    if (this.user._attachments) {
      const filename = Object.keys(this.user._attachments)[0];
      this.userImgSrc = environment.couchAddress + '/_users/org.couchdb.user:' + this.user.name + '/' + filename;
    } else {
      this.userImgSrc = '';
    }
  }

  subscribeToLogoutClick() {
    this.userService.userLogout$
      .pipe(takeUntil(this.onDestroy$))
      .subscribe(() => this.logoutClick());
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
      this.router.navigate([ '/' ], {});
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

  /**
   * Used for marking all notifications as read from navigation bar
   */
  readAllNotification() {
    this.notificationsService.setNotificationsAsRead(this.notifications);
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

  openLoginDialog() {
    this.dialog.open(LoginDialogComponent);
  }

  openAnnouncementDialog(notification) {
    this.readNotification(notification);
    const challengeActive = includedCodes.includes(this.configuration.code) && challengePeriod;
    if (challengeActive) {
      this.dialog.open(DialogsAnnouncementComponent, {
        width: '50vw',
        maxHeight: '100vh'
      });
    }
  }
}
