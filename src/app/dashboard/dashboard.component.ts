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

  constructor(
    private userService: UserService,
    private couchService: CouchService
  ) {}

  ngOnInit() {
    forkJoin(this.myLibrary()).subscribe((res) => {
      this.data.resources = res[0];
    });
    this.getData('courses', { linkPrefix: 'courses', titleField: 'courseTitle' }). subscribe((res) => {
      this.data.courses = res;
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

  myLibrary() {
    return this.couchService.post(`shelf/_find`, findDocuments({ '_id': this.userService.get()._id }, 0 ))
    .pipe(switchMap(resId => {
      return this.couchService.post(`resources/_find`, findDocuments({ '_id': { '$in': resId.docs[0].resourceIds } }, 0 ))
      .pipe(map(resopnse => {
        return resopnse.docs.map((item) => ({ ...item, link: 'resources/view/' + item._id }));
      }));
    }));
  }

}
