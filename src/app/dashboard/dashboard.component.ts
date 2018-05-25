import { Component, OnInit } from '@angular/core';

import { UserService } from '../shared/user.service';
import { CouchService } from '../shared/couchdb.service';

import { map, switchMap, catchError } from 'rxjs/operators';
import { of } from 'rxjs/observable/of';
import { findDocuments } from '../shared/mangoQueries';
import { forkJoin } from 'rxjs/observable/forkJoin';
import { environment } from '../../environments/environment';

@Component({
  templateUrl: './dashboard.component.html',
  styleUrls: [ './dashboard.scss' ]
})
export class DashboardComponent implements OnInit {
  data = { resources: [], courses: [], meetups: [], myTeams: [] };
  urlPrefix = environment.couchAddress + '/_users/org.couchdb.user:' + this.userService.get().name + '/';
  displayName = this.userService.get().firstName + ' ' + this.userService.get().lastName;
  dateNow = Date.now();
  visits = 0;

  constructor(
    private userService: UserService,
    private couchService: CouchService
  ) {}

  ngOnInit() {
    const userShelf = this.userService.shelf;
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
    this.couchService.post('login_activities/_find', findDocuments({ 'user': this.userService.get().name }, [ 'user' ], [], 1000))
      .pipe(
        catchError(() => {
          return of({ docs: [] });
        })
      ).subscribe((res: any) => {
        this.visits = res.docs.length;
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

  get profileImg() {
    const attachments = this.userService.get()._attachments;
    if (attachments) {
      return this.urlPrefix + Object.keys(attachments)[0];
    }
    return 'assets/image.png';
  }
}
