import { Injectable } from '@angular/core';
import { CouchService } from '../shared/couchdb.service';
import { findDocuments } from '../shared/mangoQueries';
import { UserService } from '../shared/user.service';
import { Subject } from 'rxjs/Subject';
import { of } from 'rxjs/observable/of';
import { forkJoin } from 'rxjs/observable/forkJoin';
import { switchMap, catchError, map } from 'rxjs/operators';
import { PlanetMessageService } from '../shared/planet-message.service';
import { resetFakeAsyncZone } from '@angular/core/testing';
import { UsersRouterModule } from '../users/users-router.module';

@Injectable()
export class MeetupService {

  private meetupUpdated = new Subject<any[]>();
  meetupUpdated$ = this.meetupUpdated.asObservable();

  constructor(
    private couchService: CouchService,
    private userService: UserService,
    private planetMessageService: PlanetMessageService
  ) {}

  updateMeetup(meetupIds: string[] = []) {
    const resourceQuery = meetupIds.length > 0 ?
      this.getMeetups(meetupIds) : this.getAllMeetups();
    forkJoin(resourceQuery, this.getUserMeetups()).subscribe((results) => {
      const shelfMeetupIds = (results[1].docs[0] && results[1].docs[0].meetupIds) ? results[1].docs[0].meetupIds : [];
      this.meetupUpdated.next(this.setupList(results[0].rows || results[0].docs, shelfMeetupIds));
    }, (err) => console.log(err));
  }

  getAllMeetups() {
    return this.couchService.get('meetups/_all_docs?include_docs=true');
  }

  getMeetups(meetupIds: string[]) {
    return this.couchService.post('meetups/_find', findDocuments({
      '_id': { '$in': meetupIds }
    }, 0, [], 1000));
  }

  getUserMeetups() {
    return this.couchService.post('shelf/_find', { 'selector': { '_id': this.userService.get()._id } })
    .pipe(catchError(err => {
      // If there's an error, return a fake couchDB empty response
      // so resources can be displayed.
      return of({ docs: [] });
    }));
  }

  setupList(meetupRes, userMeetupRes) {
    return  meetupRes.map((m: any) => {
      const meetup = m.doc || m;
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
          return { rev: { _rev: data.docs[0]._rev }, meetupIds: data.docs[0].meetupIds || [], resourceIds: data.docs[0].resourceIds || [] };
        }),
        // If there are no matches, CouchDB throws an error
        // User has no "shelf", and it needs to be created
        catchError(err => {
          // Observable of continues stream
          return of({ rev: {}, meetupIds: [], resourceIds: [] });
        }),
        switchMap(data => {
          const meetupIds = participate ? data.meetupIds.splice(meetupId, 1) && data.meetupIds
            : data.meetupIds.push(meetupId) && data.meetupIds;
          return this.couchService.put('shelf/' + this.userService.get()._id,
            Object.assign(data.rev, { meetupIds, resourceIds: data.resourceIds }));
        })
      ).subscribe((res) =>  {
        this.updateMeetup();
        const msg = participate ? 'left' : 'join';
        this.planetMessageService.showAlert('You have ' + msg + ' selected meetup.');
    }, (error) => (error));
  }

}
