import { Component, OnInit, OnDestroy } from '@angular/core';
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

@Component({
  templateUrl: './dashboard.component.html',
  styleUrls: [ './dashboard.scss' ]
})
export class DashboardComponent implements OnInit, OnDestroy {

  data = { resources: [], courses: [], meetups: [], myTeams: [] };
  urlPrefix = environment.couchAddress + '/_users/org.couchdb.user:' + this.userService.get().name + '/';
  displayName: string = this.userService.get().firstName !== undefined ?
    this.userService.get().firstName + ' ' + this.userService.get().lastName : this.userService.get().name;
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

  myLifeItems: any[] = [
    { firstLine: 'my', title: 'Submissions', link: 'submissions', authorization: 'leader,manager', badge: this.examsCount },
    { firstLine: 'my', title: 'Personals', link: 'myPersonals' },
    { firstLine: 'my', title: 'Achievements', link: 'myAchievements' },
    { firstLine: 'our', title: 'News', link: 'news' },
    { firstLine: 'my', title: 'Surveys', link: 'mySurveys', badge: this.surveysCount }
  ];

  constructor(
    private userService: UserService,
    private couchService: CouchService,
    private submissionsService: SubmissionsService,
    private coursesService: CoursesService,
    private stateService: StateService,
    private certificationsService: CertificationsService,
    private dialog: MatDialog
  ) {
    const currRoles = this.userService.get().roles;
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
  }

  ngOnInit() {

    this.planetName = this.stateService.configuration.name;
    this.getSurveys();
    this.getExams();
    this.initDashboard();

    this.couchService.findAll('login_activities', findDocuments({ 'user': this.userService.get().name }, [ 'user' ], [], 1000))
      .pipe(
        catchError(() => {
          return of([]);
        })
      ).subscribe((res: any) => {
        this.visits = res.length;
      });

    if (
      this.userService.isBetaEnabled()
      && this.stateService.configuration.planetType === 'community'
      && this.myLifeItems.findIndex(item => item.title === 'Health') === -1
    ) {
      this.myLifeItems.push({ firstLine: 'my', title: 'Health', link: 'myHealth' });
    }

  }

  ngOnDestroy() {
    this.onDestroy$.next();
    this.onDestroy$.complete();
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
      this.data.myTeams = [ ...dashboardItems[3].map(team => ({ ...team, fromShelf: true })), ...dashboardItems[4] ]
        .filter(team => team.status !== 'archived');
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
      'teams', findDocuments({ userPlanetCode: configuration.code, userId: this.userService.get()._id, docType: 'membership' })
    ).pipe(
      switchMap((memberships) => forkJoin([
        of(memberships),
        this.getData('teams', memberships.map((doc: any) => doc.teamId), { titleField: 'name', linkPrefix: '/teams/view/', addId: true })
      ])),
      map(([ memberships, teams ]: any[]) =>
        teams.filter(team => team.type === undefined || team.type === 'team').map(team => ({
          ...team, canRemove: memberships.some(membership => membership.teamId === team._id && membership.isLeader)
        }))
      )
    );
  }

  get profileImg() {
    const attachments = this.userService.get()._attachments;
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
    this.getSubmissions('survey', 'pending', this.userService.get().name).subscribe((surveys) => {
      this.surveysCount = dedupeObjectArray(surveys, [ 'parentId' ]).length;
      this.myLifeItems = this.myLifeItems.map(item => item.title === 'Surveys' ? { ...item, badge: this.surveysCount } : item);
    });
  }

  getExams() {
    this.getSubmissions('exam', 'requires grading').subscribe((exams) => {
      this.examsCount = exams.length;
      this.myLifeItems = this.myLifeItems.map(item => item.title === 'Submissions' ? { ...item, badge: this.examsCount } : item);
    });
  }

  teamRemoved(team: any) {
    this.data.myTeams = this.data.myTeams.filter(myTeam => team._id !== myTeam._id);
  }

  openCourseDialog(course: any) {
    this.dialog.open(CoursesViewDetailDialogComponent, {
      data: { courseId: course._id },
      minWidth: '600px',
      maxWidth: '90vw',
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

}
