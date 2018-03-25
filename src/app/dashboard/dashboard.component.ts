import { Component, OnInit } from '@angular/core';

import { UserService } from '../shared/user.service';
import { CouchService } from '../shared/couchdb.service';

import { map } from 'rxjs/operators';

// Main page once logged in.  At this stage is more of a placeholder.
@Component({
  template: `
    <planet-dashboard-tile [cardTitle]="'myLibrary'" class="planet-library-theme" [itemData]="data.resources"></planet-dashboard-tile>
    <planet-dashboard-tile [cardTitle]="'myCourses'" class="planet-courses-theme" [itemData]="data.courses"></planet-dashboard-tile>
    <planet-dashboard-tile [cardTitle]="'myMeetups'" class="planet-meetups-theme" [itemData]="data.meetups"></planet-dashboard-tile>
    <planet-dashboard-tile [cardTitle]="'myTeams'" class="planet-teams-theme"></planet-dashboard-tile>
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
  data = { resources: [], courses: [], meetups: [] };
  courseArray = [];

  constructor(
    private userService: UserService,
    private couchService: CouchService
  ) {}

  ngOnInit() {
    this.getData('resources', { linkPrefix: 'resources/view/', addId: true }).subscribe((res) => {
      this.data.resources = res;
    });
    this.getData('courses', { linkPrefix: 'courses', titleField: 'courseTitle' }). subscribe((res) => {
      this.data.courses = this.filterResigned(res);
    });
    this.getData('meetups', { linkPrefix: 'meetups' }). subscribe((res) => {
      this.data.meetups = res;
    });
  }

  getData(db: string, { linkPrefix, addId = false, titleField = 'title' }) {
    return this.couchService.get(db + '/_all_docs?include_docs=true').pipe(map((response) => {
      // Sets data, adding the text to display in the dashboard as the 'title' field and
      // link with or without doc id based on addId
      return response.rows.map((item) => ({ ...item.doc, title: item.doc[titleField], link: linkPrefix + (addId ? item.id : '') }));
    }));
  }

  filterResigned(res) {
    res.forEach(course => {
      if (!course.resign) {
        this.courseArray.push(course);
      }
    });
    return this.courseArray;
  }
}
