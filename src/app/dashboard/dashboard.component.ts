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
    this.getShelf().pipe(switchMap(shelf => {
      console.log(shelf);
      return forkJoin([
        this.getDataShelf('resources', shelf.docs[0].resourceIds),
        this.getData('courses', { linkPrefix: 'courses', titleField: 'courseTitle' }),
        this.getData('meetups', { linkPrefix: 'meetups' })
      ]);
    })).subscribe(dashboardItems => {
      this.data.resources = dashboardItems[0];
      this.data.courses = dashboardItems[1];
      this.data.meetups = dashboardItems[2];
    });
  }

  myMeetups() {
    return this.couchService.post(`usermeetups/_find`,
      findDocuments({ 'memberId':  {'$in': [
        this.userService.get().name
        ]} }, 0 ))
      .pipe(
        map(data => {
          const meetupIds = [];
          Object.keys(data.docs).forEach(field => {
            meetupIds.push(data.docs[field].meetupId);
          });
          return meetupIds;
        }),
        switchMap(meetupIds => {
          return this.couchService.post(`meetups/_find`,
            findDocuments({ '_id':  {'$in':
              meetupIds
              } }, 0 ))
              .pipe(switchMap(meetup => {
                console.log('Meetups', meetup);
                return meetup.docs.map((item) => ({ ...item, link: 'meetups/view/' + item._id  }));
              }));
        })
      );
  }

  getData(db: string, { linkPrefix, addId = false, titleField = 'title' }) {
    return this.couchService.get(db + '/_all_docs?include_docs=true').pipe(map((response) => {
      // Sets data, adding the text to display in the dashboard as the 'title' field and
      // link with or without doc id based on addId
      return response.rows.map((item) => ({ ...item.doc, title: item.doc[titleField], link: linkPrefix + (addId ? item.id : '') }));
    }));
  }

  getShelf() {
    return this.couchService.post(`shelf/_find`, findDocuments({ '_id': this.userService.get()._id }, 0 ));
  }

  getDataShelf(db: string, shelf: string[]) {
    return this.couchService.post(db + '/_find', findDocuments({ '_id': { '$in': shelf } }, 0 ))
      .pipe(map(response => {
        return response.docs.map((item) => ({ ...item, link: db + '/view/' + item._id }));
      }));
  }

}
