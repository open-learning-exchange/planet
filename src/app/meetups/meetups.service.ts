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
      const meetupsRes = results[0],
        Res = results[1];
      this.meetupUpdated.next(this.setupList(meetupsRes.rows || meetupsRes.docs, Res.docs));
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

  shelfReduce(ids, id) {
    if (ids.indexOf(id) > -1) {
      return ids;
    }
    return ids.concat(id);
  }

  setupList(meetupRes, userMeetupRes) {
    return  meetupRes.map((m: any) => {
      const meetup = m.doc || m;
      const meetupIndex = userMeetupRes.findIndex(meetupIds => {
        return (meetup._id === meetupIds && meetupIds.indexOf(this.userService.get()._id) > -1)
        //return meetup._id === meetupIds;
      });
      if (meetupIndex > -1) {

        return { ...meetup, participate: true };
      }
      return { ...meetup,  participate: false };
    });
  }

  attendMeetup(meetupIds) {
    const meetupIdArray = meetupIds.map((data) => {
      return data._id;
    });
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
          const meetupIds = meetupIdArray.concat(data.meetupIds).reduce(this.shelfReduce, []);
          return this.couchService.put('shelf/' + this.userService.get()._id,
            Object.assign(data.rev, { meetupIds, resourceIds: data.resourceIds }));
        })
      ).subscribe((res) =>  {
        this.updateMeetup();
        const msg = meetupIds.participate ? 'left' : 'join';
        this.planetMessageService.showAlert('You have ' + msg + ' selected meetup.');
    }, (error) => (error));
  }

}

/*attendMeetup(meetupId) {
    this.couchService.post(`usermeetups/_find`,
      findDocuments({ 'meetupId': meetupId }, 0 ))
      .pipe(switchMap(data => {
        const meetupInfo = { ...data.docs[0] };
        const memberId = meetupInfo.memberId;
        const username: string = this.userService.get().name;
        (memberId.indexOf(username) > -1) ? memberId.splice(memberId.indexOf(username), 1) : memberId.push(username);
        return this.couchService.put('usermeetups/' + meetupInfo._id , { ...meetupInfo, memberId });
      })).subscribe((res) => {
        (this.meetupDetail.participate) ? this.meetupDetail.participate = false : this.meetupDetail.participate = true;
        const msg = this.meetupDetail.participate ? 'join' : 'left';
        this.planetMessageService.showAlert('You have ' + msg + ' selected meetup.');
      });
  }*/