import { Component, OnInit } from '@angular/core';

import { UserService } from '../shared/user.service';
import { CouchService } from '../shared/couchdb.service';

import { map, switchMap, catchError } from 'rxjs/operators';
import { of } from 'rxjs/observable/of';
import { findDocuments } from '../shared/mangoQueries';
import { forkJoin } from 'rxjs/observable/forkJoin';

// Main page once logged in.  At this stage is more of a placeholder.
@Component({
  template: `
    <planet-dashboard-tile [cardTitle]="'myLibrary'" class="planet-library-theme" [itemData]="data.resources" [emptyLink]="'/resources'"></planet-dashboard-tile>
    <planet-dashboard-tile [cardTitle]="'myCourses'" class="planet-courses-theme" [itemData]="data.courses" [emptyLink]="'/courses'"></planet-dashboard-tile>
    <planet-dashboard-tile [cardTitle]="'myMeetups'" class="planet-meetups-theme" [itemData]="data.meetups" [emptyLink]="'/meetups'"></planet-dashboard-tile>
    <planet-dashboard-tile [cardTitle]="'myTeams'" class="planet-teams-theme" [itemData]="data.myTeams" [emptyLink]="'/users'"></planet-dashboard-tile>
  `,
  styles: [ `
    :host {
      padding: 2rem;
      display: grid;
      grid-auto-columns: 100%;
      grid-gap: 1rem;
    }
  ` ]
})
export class DashboardComponent implements OnInit {
  data = { resources: [], courses: [], meetups: [], myTeams: [] };

  constructor(
    private userService: UserService,
    private couchService: CouchService
  ) {}

  ngOnInit() {
    const userShelf = this.userService.getUserShelf();
    forkJoin([
      this.getData('resources', userShelf.resourceIds, { linkPrefix: 'resources/view/', addId: true }),
      this.getData('courses', userShelf.courseIds, { titleField: 'courseTitle', linkPrefix: 'courses/view/', addId: true }),
      this.getData('meetups', userShelf.meetupIds, { linkPrefix: 'meetups/view/', addId: true }),
      this.getData('_users', userShelf.myTeamIds, { titleField: 'name' , linkPrefix: 'users' })
    ]).subscribe(dashboardItems => {
      this.data.resources = dashboardItems[0];
      this.data.courses = dashboardItems[1];
      this.data.meetups = dashboardItems[2];
      this.data.myTeams = dashboardItems[3];
    });
  }

  getData(db: string, shelf: string[] = [], { linkPrefix, addId = false, titleField = 'title' }) {
    return this.couchService.post(db + '/_find', findDocuments({ '_id': { '$in': shelf } }, 0 ))
      .pipe(
        catchError(() => {
          return of({ docs: [] });
        }),
        map(response => {
          return response.docs.map((item) => ({ ...item, title: item[titleField], link: linkPrefix + (addId ? item._id : '') }));
        })
      );
  }
}
