import { Injectable } from '@angular/core';
import { CouchService } from '../shared/couchdb.service';
import { findDocuments } from '../shared/mangoQueries';
import { UserService } from '../shared/user.service';
import { Subject } from 'rxjs/Subject';
import { of } from 'rxjs/observable/of';
import { forkJoin } from 'rxjs/observable/forkJoin';
import { switchMap, catchError, map } from 'rxjs/operators';
import { PlanetMessageService } from '../shared/planet-message.service';
import { Router } from '@angular/router';

@Injectable()
export class MeetupService {

  private meetupUpdated = new Subject<any[]>();
  meetupUpdated$ = this.meetupUpdated.asObservable();
  parentLink = false;

  constructor(
    private couchService: CouchService,
    private userService: UserService,
    private router: Router,
    private planetMessageService: PlanetMessageService
  ) {}

  showMeetup(meetupIds: string[] = []) {
    const resourceQuery = meetupIds.length > 0 ?
      this.getMeetups(meetupIds) : this.getAllMeetups();
    forkJoin(resourceQuery, this.getUserMeetups()).subscribe((response: any) => {
      const shelfMeetupIds = (response[1].docs[0] && response[1].docs[0].meetupIds) ? response[1].docs[0].meetupIds : [];
      const listAllMeetups = response[0].docs ? response[0].docs : response[0];
      this.meetupUpdated.next(this.meetupList(listAllMeetups, shelfMeetupIds));
    }, (err) => console.log(err));
  }

  // getAllMeetups() {
  //   // meetups form meetup table

  //   return this.couchService.allDocs('meetups')
  //   .subscribe((data) =>{
  //     return data;
  //   })
  // }
  getAllMeetups() {
    let opts: any = {};
    if (this.router.url === '/meetups/parent') {
      this.parentLink = true;
      opts = { domain: this.userService.getConfig().parent_domain };
    }
    return this.couchService.allDocs('meetups', opts);
  }

  getMeetups(meetupIds: string[]) {
    // find meetupId on meetup table
    return this.couchService.post('meetups/_find', findDocuments({
      '_id': { '$in': meetupIds }
    }, 0));
  }

  getUserMeetups() {
    // get meetup from user shelf
    return this.couchService.post('shelf/_find', { 'selector': { '_id': this.userService.get()._id } })
    .pipe(catchError(err => {
      // If there's an error, return a fake couchDB empty response so meetups can be displayed.
      return of({ docs: [] });
    }));
  }

  meetupList(meetupRes, userMeetupRes) {
    return  meetupRes.map((res: any) => {
      const meetup = res.doc || res;
      const meetupIndex = userMeetupRes.findIndex(meetupIds => {
        return meetup._id === meetupIds;
      });
      if (meetupIndex > -1) {
        return { ...meetup, participate: true };
      }
      return { ...meetup,  participate: false };
    });
  }

  attendMeetup(meetupId, participate) {
    this.couchService.post(`shelf/_find`, { 'selector': { '_id': this.userService.get()._id } })
      .pipe(map(data => {
          return { rev: { _rev: data.docs[0]._rev }, meetupIds: data.docs[0].meetupIds || [],
            resourceIds: data.docs[0].resourceIds || [], courseIds: data.docs[0].courseIds || [],
            myTeamIds: data.docs[0].myTeamIds || [] };
        }),
        // If there are no matches, CouchDB throws an error
        // User has no "shelf", and it needs to be created
        catchError(err => {
          // Observable of continues stream
          return of({ rev: {}, meetupIds: [], resourceIds: [], courseIds: [], myTeamIds: [] });
        }),
        switchMap(data => {
          const meetupIds = participate ? data.meetupIds.splice(meetupId, 1) && data.meetupIds
            : data.meetupIds.push(meetupId) && data.meetupIds;
          return this.couchService.put('shelf/' + this.userService.get()._id,
            Object.assign(data.rev, { meetupIds, resourceIds: data.resourceIds, courseIds: data.courseIds, myTeamIds: data.myTeamIds }));
        })
      ).subscribe((res) =>  {
        this.showMeetup();
        const msg = participate ? 'left' : 'join';
        this.planetMessageService.showAlert('You have ' + msg + ' selected meetup.');
    }, (error) => (error));
  }

}
