import { Component, OnInit, OnDestroy, HostBinding, HostListener } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';

import { UserService } from '../shared/user.service';
import { CouchService } from '../shared/couchdb.service';

import { map, catchError, switchMap, auditTime, takeUntil } from 'rxjs/operators';
import { of, forkJoin, Subject, combineLatest } from 'rxjs';
import { findDocuments } from '../shared/mangoQueries';
import { environment } from '../../environments/environment';
import { SubmissionsService } from '../submissions/submissions.service';
import { StateService } from '../shared/state.service';
import { dedupeShelfReduce, dedupeObjectArray } from '../shared/utils';
import { CoursesService } from '../courses/courses.service';
import { CoursesViewDetailDialogComponent } from '../courses/view-courses/courses-view-detail.component';
import { foundations, foundationIcons } from '../courses/constants';
import { CertificationsService } from '../manager-dashboard/certifications/certifications.service';
import { DeviceInfoService, DeviceType } from '../shared/device-info.service';

@Component({
  templateUrl: './dashboard.component.html',
  styleUrls: [ './dashboard.scss' ]
})
export class DashboardComponent implements OnInit, OnDestroy {

  user = this.userService.get();
  data = { resources: [], courses: [], meetups: [], myTeams: [] };
  urlPrefix = environment.couchAddress + '/_users/org.couchdb.user:' + this.user.name + '/';
  displayName: string;
  roles: string[];
  planetName: string;
  badgesCourses: { [key: string]: any[] } = {};
  badgeGroups = [ ...foundations, 'none' ];
  badgeIcons = foundationIcons;

  dateNow: any;
  visits = 0;
  surveysCount = 0;
  examsCount = 0;
  leaderIds = [];
  onDestroy$ = new Subject<void>();
  showBanner = false;
  isLoading = true;
  deviceType: DeviceType;
  isMobile = false;

  myLifeItems: any[] = [];
  cardTitles = { myLibrary: $localize`myLibrary`, myCourses: $localize`myCourses`, myTeams: $localize`myTeams`, myLife: $localize`myLife` };

  @HostBinding('class.accordion-mode') get isAccordionMode() {
    return this.deviceType === DeviceType.MOBILE;
  }

  @HostListener('window:resize')
  onResize() {
    this.deviceType = this.deviceInfoService.getDeviceType();
    this.isMobile = this.deviceType === DeviceType.SMALL_MOBILE || this.deviceType === DeviceType.MOBILE;
    this.updateMyLifeItemsFormat();
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
    this.userService.shelfChange$.pipe()
      .subscribe(() => {
        this.ngOnInit();
      });
    this.couchService.currentTime().subscribe((date) => this.dateNow = date);
    this.coursesService.requestCourses();
    combineLatest(
      this.coursesService.coursesListener$(),
      this.certificationsService.getCertifications()
    ).pipe(auditTime(500), takeUntil(this.onDestroy$)).subscribe(([ courses, certifications ]) => {
      this.setBadgesCourses(courses, certifications);
    });
    this.deviceType = this.deviceInfoService.getDeviceType();
    this.isMobile = this.deviceType === DeviceType.SMALL_MOBILE || this.deviceType === DeviceType.MOBILE;
    this.initMyLifeItems();
  }

  ngOnInit() {
    this.isLoading = true;
    this.displayName = this.user.firstName !== undefined ? `${this.user.firstName} ${this.user.lastName}` : this.user.name;
    this.planetName = this.stateService.configuration.name;
    this.getSurveys();
    this.getExams();
    this.initDashboard();
    this.couchService.findAll('login_activities', findDocuments({ 'user': this.user.name }, [ 'user' ], [], 1000))
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
      { baseFirstLine: $localize` my `, title: $localize`Chat`, link: '/chat' },
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
      firstLine: this.isMobile ? item.baseFirstLine + item.title : item.baseFirstLine
    }));
  }

  initDashboard() {

    const userShelf = this.userService.shelf;
    if (this.isEmptyShelf(userShelf)) {
      this.data = { resources: [], courses: [], meetups: [], myTeams: [] };
    }

    forkJoin([
      this.getData('resources', userShelf.resourceIds, { linkPrefix: '/resources/view/', addId: true }),
      this.getData('courses', userShelf.courseIds, { titleField: 'courseTitle', linkPrefix: '/courses/view/', addId: true }),
      this.getData('meetups', userShelf.meetupIds, { linkPrefix: '/meetups/view/', addId: true }),
      this.getData('teams', userShelf.myTeamIds, { titleField: 'name', linkPrefix: '/teams/view/', addId: true }),
      this.getTeamMembership()
    ]).subscribe(dashboardItems => {
      this.data.resources = dashboardItems[0];
      this.data.courses = dashboardItems[1];
      this.data.meetups = dashboardItems[2];
      const allTeams = [ ...dashboardItems[3].map(team => ({ ...team, fromShelf: true })), ...dashboardItems[4] ];
      this.data.myTeams = dedupeObjectArray(allTeams, [ '_id' ])
        .filter(team => team.status !== 'archived');
      this.isLoading = false;
    });
  }

  getData(db: string, shelf: string[] = [], { linkPrefix, addId = false, titleField = 'title' }) {
    return this.couchService.bulkGet(db, shelf.filter(id => id))
      .pipe(
        catchError(() => {
          return of([]);
        }),
        map(docs => {
          return docs.map((item) => ({ ...item, title: item[titleField], link: linkPrefix + (addId ? item._id : '') }));
        })
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

  isEmptyShelf(shelf) {
    return shelf.courseIds.length === 0
      && shelf.meetupIds.length === 0
      && shelf.myTeamIds.length === 0
      && shelf.resourceIds.length === 0;
  }

  getSubmissions(type: string, status: string, username?: string) {
    return this.submissionsService.getSubmissions(findDocuments({
      type,
      status,
      'user.name': username || { '$gt': null }
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

  setBadgesCourses(courses, certifications) {
    this.badgesCourses = courses
      .filter(course => course.progress.filter(step => step.passed === true).length === course.doc.steps.length
        && course.doc.steps.length > 0)
      .map(course => ({
        ...course, inCertification: certifications.some(certification => certification.courseIds.indexOf(course._id) > -1)
      }))
      .sort((a, b) => a.inCertification ? -1 : b.inCertification ? 1 : 0)
      .reduce((badgesCourses, course) => ({
        ...badgesCourses, [course.doc.foundation || 'none']: [ ...(badgesCourses[course.doc.foundation || 'none'] || []), course ]
      }), { none: [] });
    this.badgeGroups = [ ...foundations, 'none' ].filter(group => this.badgesCourses[group] && this.badgesCourses[group].length);
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
