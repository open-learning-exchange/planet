import { Component, OnInit, OnDestroy, HostBinding } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { finalize, map, catchError, switchMap, auditTime, takeUntil } from 'rxjs/operators';
import { of, forkJoin, Subject, combineLatest, Observable } from 'rxjs';
import { NgClass, DecimalPipe, DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatCard } from '@angular/material/card';
import { MatTooltip } from '@angular/material/tooltip';
import { MatIcon } from '@angular/material/icon';
import { MatMenu, MatMenuItem, MatMenuTrigger } from '@angular/material/menu';

import { UserService } from '@shared/auth/user.service';
import { CouchService } from '@shared/database/couchdb.service';
import { findDocuments } from '@shared/database/mango-queries';
import { StateService } from '@shared/state.service';
import { dedupeShelfReduce, dedupeObjectArray, fullName } from '@shared/utils';
import { CertificationsService } from '@shared/certifications/certifications.service';
import { DeviceInfoService, DeviceType } from '@shared/ui/device-info.service';
import { PlanetRoleComponent } from '@shared/auth/planet-role.component';
import { TruncateTextPipe } from '@shared/text/truncate-text.pipe';

import { environment } from '../../environments/environment';
import { SubmissionsService } from '../submissions/submissions.service';
import { CoursesService } from '../courses/courses.service';
import { CoursesViewDetailDialogComponent } from '../courses/view-courses/courses-view-detail.component';
import { DashboardTileComponent } from './dashboard-tile.component';

@Component({
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.scss'],
  imports: [
    RouterLink,
    MatCard,
    PlanetRoleComponent,
    MatTooltip,
    MatIcon,
    MatMenu,
    MatMenuItem,
    MatMenuTrigger,
    NgClass,
    DashboardTileComponent,
    DecimalPipe,
    DatePipe,
    TruncateTextPipe
  ]
})
export class DashboardComponent implements OnInit, OnDestroy {

  user = this.userService.get();
  data = { resources: [], courses: [], myTeams: [] };
  loading = { resources: true, courses: true, myTeams: true };
  loadedShelf: any = {};
  urlPrefix = environment.couchAddress + '/_users/org.couchdb.user:' + this.user.name + '/';
  displayName: string;
  roles: string[];
  planetName: string;
  completedCourses: any[] = [];
  dateNow: any;
  visits: number;
  surveysCount = 0;
  examsCount = 0;
  leaderIds = [];
  onDestroy$ = new Subject<void>();
  showBanner = false;
  readonly deviceType = this.deviceInfoService.deviceType;
  readonly isMobile = this.deviceInfoService.isMobile;
  myLifeItems: any[] = [];
  cardTitles = { myLibrary: $localize`myLibrary`, myCourses: $localize`myCourses`, myTeams: $localize`myTeams`, myLife: $localize`myLife` };

  @HostBinding('class.accordion-mode') get isAccordionMode() {
    return this.deviceType() === DeviceType.MOBILE;
  }

  constructor(
    private userService: UserService,
    private couchService: CouchService,
    private submissionsService: SubmissionsService,
    private coursesService: CoursesService,
    private stateService: StateService,
    private certificationsService: CertificationsService,
    private dialog: MatDialog,
    private deviceInfoService: DeviceInfoService
  ) {
    const currRoles = this.user.roles;
    this.roles = currRoles.reduce(dedupeShelfReduce, currRoles.length ? [ 'learner' ] : [ 'Inactive' ]);
    this.couchService.currentTime().subscribe((date) => this.dateNow = date);
    this.coursesService.requestCourses();
    combineLatest(
      this.coursesService.coursesListener$(),
      this.certificationsService.getCertifications()
    ).pipe(auditTime(500), takeUntil(this.onDestroy$)).subscribe(([ courses, certifications ]) => {
      this.setCompletedCourses(courses, certifications);
    });
    this.initMyLifeItems();
    this.deviceInfoService.watchDeviceType().pipe(takeUntil(this.onDestroy$)).subscribe(() => {
      this.updateMyLifeItemsFormat();
    });
  }

  ngOnInit() {
    this.displayName = fullName(this.user) || this.user.name;
    this.planetName = this.stateService.configuration.name;
    this.getSurveys();
    // Same roles as the Submissions item's authorization
    if (this.userService.doesUserHaveRole([ '_admin', 'manager', 'leader' ])) {
      this.getExams();
    }
    // shelfChange$ replays its latest value on subscribe, so this also does the first load
    this.userService.shelfChange$.pipe(takeUntil(this.onDestroy$)).subscribe(() => this.loadTiles());
    this.couchService.findAll('login_activities', findDocuments({ user: this.user.name }, [ 'user' ], [], 1000))
      .pipe(
        catchError(() => {
          console.warn('Error fetching login activities');
          return of([]);
        })
      ).subscribe((res: any) => {
        this.visits = res.length;
      });
    this.reminderBanner();
  }

  ngOnDestroy() {
    this.onDestroy$.next();
    this.onDestroy$.complete();
  }

  initMyLifeItems() {
    this.myLifeItems = [
      { baseFirstLine: $localize`my`, title: $localize`Submissions`, link: 'submissions', authorization: 'leader,manager',
        badge: this.examsCount },
      { baseFirstLine: $localize` my `, title: $localize`Chat`, link: '/chat', returnState: { route: 'myDashboard' } },
      { baseFirstLine: $localize` my `, title: $localize`Progress`, link: 'myProgress' },
      { baseFirstLine: $localize`my`, title: $localize`Personals`, link: 'myPersonals' },
      { baseFirstLine: $localize`my`, title: $localize`Achievements`, link: 'myAchievements' },
      { baseFirstLine: $localize`my`, title: $localize`Surveys`, link: 'mySurveys', badge: this.surveysCount },
      { baseFirstLine: $localize` my `, title: $localize`Health`, link: 'myHealth' }
    ];
    this.updateMyLifeItemsFormat();
  }

  updateMyLifeItemsFormat() {
    this.myLifeItems = this.myLifeItems.map(item => ({
      ...item,
      firstLine: this.isMobile() ? item.baseFirstLine + item.title : item.baseFirstLine
    }));
  }

  loadTiles() {
    const shelf = this.userService.shelf;
    const loadedShelf = this.loadedShelf;
    this.loadedShelf = shelf;
    // A shelf update replaces only the changed id array, so an unchanged tile keeps the same array
    if (shelf.resourceIds !== loadedShelf.resourceIds) {
      this.loadTile('resources', this.getData('resources', shelf.resourceIds, { linkPrefix: '/resources/view/', addId: true }));
    }
    if (shelf.courseIds !== loadedShelf.courseIds) {
      this.loadTile(
        'courses', this.getData('courses', shelf.courseIds, { titleField: 'courseTitle', linkPrefix: '/courses/view/', addId: true })
      );
    }
    if (shelf.myTeamIds !== loadedShelf.myTeamIds) {
      this.loadTile('myTeams', this.getTeams(shelf.myTeamIds));
    }
  }

  loadTile(tile: 'resources' | 'courses' | 'myTeams', request: Observable<any[]>) {
    this.loading[tile] = true;
    request.pipe(finalize(() => this.loading[tile] = false), takeUntil(this.onDestroy$)).subscribe(items => {
      this.data[tile] = items;
    });
  }

  getTeams(myTeamIds: string[]) {
    return forkJoin([
      this.getData('teams', myTeamIds, { titleField: 'name', linkPrefix: '/teams/view/', addId: true }),
      this.getTeamMembership()
    ]).pipe(map(([ shelfTeams, membershipTeams ]) =>
      dedupeObjectArray([ ...shelfTeams.map(team => ({ ...team, fromShelf: true })), ...membershipTeams ], [ '_id' ])
        .filter(team => team.status !== 'archived')
    ));
  }

  getData(db: string, shelf: string[] = [], { linkPrefix, addId = false, titleField = 'title' }) {
    return this.couchService.bulkGet(db, shelf.filter(id => id))
      .pipe(
        map(docs => docs.map((item) => ({ ...item, title: item[titleField], link: linkPrefix + (addId ? item._id : '') }))),
        catchError(() => of([]))
      );
  }

  getTeamMembership() {
    const configuration = this.stateService.configuration;
    return this.couchService.findAll(
      'teams', findDocuments({ userPlanetCode: configuration.code, userId: this.user._id, docType: 'membership' })
    ).pipe(
      switchMap((memberships) => forkJoin([
        of(memberships),
        this.getData('teams', memberships.map((doc: any) => doc.teamId), { titleField: 'name', linkPrefix: '/teams/view/', addId: true })
      ])),
      map(([ memberships, teams ]: any[]) =>
        teams.filter(team => team.type === undefined || team.type === 'team' || team.type === 'enterprise').map(team => ({
          ...team, canRemove: memberships.some(membership => membership.teamId === team._id && membership.isLeader)
        }))
      )
    );
  }

  get profileImg() {
    const attachments = this.user._attachments;
    if (attachments) {
      return this.urlPrefix + Object.keys(attachments)[0];
    }
    return 'assets/image.png';
  }

  getSubmissions(type: string, status: string, username?: string) {
    return this.submissionsService.getSubmissions(findDocuments({
      type,
      status,
      'user.name': username || { $gt: null }
    }));
  }

  getSurveys() {
    this.getSubmissions('survey', 'pending', this.user.name).subscribe((surveys) => {
      this.surveysCount = dedupeObjectArray(surveys, [ 'parentId' ]).length;
      this.myLifeItems = this.myLifeItems.map(item =>
        item.link === 'mySurveys' ? { ...item, badge: this.surveysCount } : item
      );
    });
  }

  getExams() {
    this.getSubmissions('exam', 'requires grading').subscribe((exams) => {
      this.examsCount = exams.length;
      this.myLifeItems = this.myLifeItems.map(item =>
        item.link === 'submissions' ? { ...item, badge: this.examsCount } : item
      );
    });
  }

  teamRemoved(team: any) {
    this.data.myTeams = this.data.myTeams.filter(myTeam => team._id !== myTeam._id);
  }

  openCourseView(course: any) {
    this.dialog.open(CoursesViewDetailDialogComponent, {
      data: { courseId: course._id, returnState: { route: 'myDashboard' } },
      minWidth: '50vw',
      maxWidth: '80vw',
      maxHeight: '80vh',
      autoFocus: false
    });
  }

  setCompletedCourses(courses, certifications) {
    this.completedCourses = courses
      .filter(course => course.doc.steps?.length > 0 && this.certificationsService.isCourseCompleted(course, this.user))
      .map(course => ({
        ...course, inCertification: certifications.some(certification => certification.courseIds.indexOf(course._id) > -1)
      }))
      .sort((a, b) => Number(b.inCertification) - Number(a.inCertification));
  }

  get maxVisibleBadges(): number {
    return this.deviceType() === DeviceType.DESKTOP ? 8 : 6;
  }

  get visibleBadges(): any[] {
    return this.completedCourses.slice(0, this.maxVisibleBadges);
  }

  get remainingBadgesCount(): number {
    return Math.max(0, this.completedCourses.length - this.maxVisibleBadges);
  }

  get hiddenBadges(): any[] {
    return this.completedCourses.slice(this.maxVisibleBadges);
  }

  get moreBadgesLabel(): string {
    const count = this.remainingBadgesCount;
    return count === 1 ?
      $localize`Show ${count}:count: more completed course` :
      $localize`Show ${count}:count: more completed courses`;
  }

  reminderBanner() {
    this.userService.isProfileComplete();
    combineLatest([
      this.userService.profileBanner,
      this.userService.profileComplete$
    ]).pipe(takeUntil(this.onDestroy$)).subscribe(([ profileBanner, profileComplete ]) => {
      this.showBanner = profileBanner && !profileComplete;
    });
  }

  closeBanner() {
    this.userService.profileBanner.next(false);
    this.showBanner = false;
  }

}
