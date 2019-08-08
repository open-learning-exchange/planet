import { Component, OnInit } from '@angular/core';

import { UserService } from '../shared/user.service';
import { CouchService } from '../shared/couchdb.service';

import { map, catchError, switchMap } from 'rxjs/operators';
import { of, forkJoin } from 'rxjs';
import { findDocuments } from '../shared/mangoQueries';
import { environment } from '../../environments/environment';
import { SubmissionsService } from '../submissions/submissions.service';
import { StateService } from '../shared/state.service';
import { dedupeShelfReduce } from '../shared/utils';

@Component({
  templateUrl: './dashboard.component.html',
  styleUrls: [ './dashboard.scss' ]
})
export class DashboardComponent implements OnInit {
  data = { resources: [], courses: [], meetups: [], myTeams: [] };
  urlPrefix = environment.couchAddress + '/_users/org.couchdb.user:' + this.userService.get().name + '/';
  displayName: string = this.userService.get().firstName !== undefined ?
    this.userService.get().firstName + ' ' + this.userService.get().lastName : this.userService.get().name;
  displayRole: string;
  planetName: string;

  dateNow: any;
  visits = 0;
  surveysCount = 0;
  examsCount = 0;
  leaderIds = [];

  myLifeItems: any[] = [
    { firstLine: 'my', title: 'Submissions', link: '/submissions', authorization: 'leader,manager', badge: this.examsCount },
    { firstLine: 'my', title: 'Achievements', link: '/myAchievements' },
    { firstLine: 'our', title: 'News', link: '/news' },
    { firstLine: 'my', title: 'Surveys', link: '/mySurveys', badge: this.surveysCount }
  ];

  constructor(
    private userService: UserService,
    private couchService: CouchService,
    private submissionsService: SubmissionsService,
    private stateService: StateService
  ) {
    const currRoles = this.userService.get().roles;
    this.displayRole = currRoles.reduce(dedupeShelfReduce, currRoles.length ? [ 'learner' ] : [ 'Inactive' ]).join(', ').replace('_', '');
    this.userService.shelfChange$.pipe()
      .subscribe(() => {
        this.ngOnInit();
      });
    this.couchService.currentTime().subscribe((date) => this.dateNow = date);
  }

  ngOnInit() {

    this.planetName = this.stateService.configuration.name;
    this.getSurveys();
    this.getExams();
    this.initDashboard();

    this.couchService.post('login_activities/_find', findDocuments({ 'user': this.userService.get().name }, [ 'user' ], [], 1000))
      .pipe(
        catchError(() => {
          return of({ docs: [] });
        })
      ).subscribe((res: any) => {
        this.visits = res.docs.length;
      });

    if (this.userService.isBetaEnabled() && this.myLifeItems.findIndex(item => item.title === 'Health') === -1) {
      this.myLifeItems.push({ firstLine: 'my', title: 'Health', link: '/myHealth' });
    }

  }

  initDashboard() {

    const userShelf = this.userService.shelf;
    if (this.isEmptyShelf(userShelf)) {
      this.data = { resources: [], courses: [], meetups: [], myTeams: [] };
    }

    forkJoin([
      this.getData('resources', userShelf.resourceIds, { linkPrefix: 'resources/view/', addId: true }),
      this.getData('courses', userShelf.courseIds, { titleField: 'courseTitle', linkPrefix: 'courses/view/', addId: true }),
      this.getData('meetups', userShelf.meetupIds, { linkPrefix: 'meetups/view/', addId: true }),
      this.getData('teams', userShelf.myTeamIds, { titleField: 'name', linkPrefix: 'teams/view/', addId: true }),
      this.getTeamMembership().pipe(
        switchMap((myTeamIds) => this.getData('teams', myTeamIds, { titleField: 'name', linkPrefix: 'teams/view/', addId: true }))
      )
    ]).subscribe(dashboardItems => {
      this.data.resources = dashboardItems[0];
      this.data.courses = dashboardItems[1];
      this.data.meetups = dashboardItems[2];
      this.data.myTeams = [ ...dashboardItems[3].map(team => ({ ...team, fromShelf: true })), ...dashboardItems[4] ]
        .filter(team => team.status !== 'archived');
    });
  }

  getData(db: string, shelf: string[] = [], { linkPrefix, addId = false, titleField = 'title' }) {
    return this.couchService.bulkGet(db, shelf)
      .pipe(
        catchError(() => {
          return of([]);
        }),
        map(docs => {
          return docs.map((item) => ({
            ...item, title: item[titleField], link: linkPrefix + ( addId ? item._id : '' ),
            canRemove: this.leaderIds.find(id => item._id === id) }));
        })
      );
  }

  getTeamMembership() {
    const configuration = this.stateService.configuration;
    return this.couchService.findAll(
      'teams', findDocuments({ userPlanetCode: configuration.code, userId: this.userService.get()._id, docType: 'membership' })
    ).pipe(map(docs => docs.map((doc: any) => {
      if (doc.isLeader) {
        this.leaderIds.push(doc.teamId);
      }
      return doc.teamId;
    })));
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
      this.surveysCount = surveys.filter((survey: any, index: number) => {
        return surveys.findIndex((s: any) => (s.parentId === survey.parentId)) === index;
      }).length;
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

}
