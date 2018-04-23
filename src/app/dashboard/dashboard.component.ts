import { Component, OnInit } from '@angular/core';

import { UserService } from '../shared/user.service';
import { CouchService } from '../shared/couchdb.service';

import { map, switchMap } from 'rxjs/operators';
import { findDocuments } from '../shared/mangoQueries';
import { forkJoin } from 'rxjs/observable/forkJoin';

// Main page once logged in.  At this stage is more of a placeholder.
@Component({
  template: `
    <planet-dashboard-tile [cardTitle]="'myLibrary'" class="planet-library-theme" [itemData]="data.resources"></planet-dashboard-tile>
    <planet-dashboard-tile [cardTitle]="'myCourses'" class="planet-courses-theme" [itemData]="data.courses"></planet-dashboard-tile>
    <planet-dashboard-tile [cardTitle]="'myMeetups'" class="planet-meetups-theme" [itemData]="data.meetups"></planet-dashboard-tile>
    <planet-dashboard-tile [cardTitle]="'myTeams'" class="planet-teams-theme" [itemData]="data.myTeams"></planet-dashboard-tile>
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
    this.getShelf().pipe(switchMap(shelf => {
      return forkJoin([
        this.getData('resources', shelf.docs[0].resourceIds, { linkPrefix: 'resources/view/', addId: true }),
        this.getData('courses', shelf.docs[0].courseIds, { titleField: 'courseTitle', linkPrefix: 'courses/view/', addId: true }),
        this.getData('meetups', shelf.docs[0].meetupIds, { linkPrefix: 'meetups/view/', addId: true }),
        this.getData('_users', shelf.docs[0].myTeamIds, { titleField: 'name' , linkPrefix: 'users' })
      ]);
    })).subscribe(dashboardItems => {
      this.data.resources = dashboardItems[0];
      this.data.courses = dashboardItems[1];
      this.data.meetups = dashboardItems[2];
      this.data.myTeams = dashboardItems[3];
    });
  }

  getShelf() {
    return this.couchService.post(`shelf/_find`, findDocuments({ '_id': this.userService.get()._id }, 0 ));
  }

  getData(db: string, shelf: string[], { linkPrefix, addId = false, titleField = 'title' }) {
    return this.couchService.post(db + '/_find', findDocuments({ '_id': { '$in': shelf } }, 0 ))
      .pipe(map(response => {
        return response.docs.map((item) => ({ ...item, title: item[titleField], link: linkPrefix + (addId ? item._id : '') }));
      }));
  }
}
