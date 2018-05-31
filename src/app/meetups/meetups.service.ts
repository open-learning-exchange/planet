import { OnDestroy } from '@angular/core';
import { Injectable } from '@angular/core';
import { CouchService } from '../shared/couchdb.service';
import { findDocuments } from '../shared/mangoQueries';
import { UserService } from '../shared/user.service';
import { Subject } from 'rxjs/Subject';
import { of } from 'rxjs/observable/of';
import { forkJoin } from 'rxjs/observable/forkJoin';
import { switchMap, catchError, map } from 'rxjs/operators';

@Injectable()
export class MeetupService {

  private meetupUpdated = new Subject<any[]>();
  meetupUpdated$ = this.meetupUpdated.asObservable();
  meetups = [];
  userShelf = this.userService.shelf;

  constructor(
    private couchService: CouchService,
    private userService: UserService,
  ) {
    this.userService.shelfChange$
      .subscribe((shelf: any) => {
        this.userShelf = shelf;
        this.meetupUpdated.next(this.meetupList(this.meetups, shelf.meetupIds || []));
      });
    }

  updateMeetups({ meetupIds = [], opts = {} }: { meetupIds?: string[], opts?: any } = {}) {
    const meetupQuery = meetupIds.length > 0 ?
      this.getMeetups(meetupIds, opts) : this.getAllMeetups(opts);
    meetupQuery.subscribe((meetups: any) => {
      this.meetups = meetups.docs ? meetups.docs : meetups;
      this.meetupUpdated.next(this.meetupList(this.meetups, this.userShelf.meetupIds));
    }, (err) => console.log(err));
  }

  getAllMeetups(opts: any) {
    return this.couchService.allDocs('meetups', opts);
  }

  getMeetups(meetupIds: string[], opts: any) {
    // find meetupId on meetup table
    return this.couchService.post('meetups/_find', findDocuments({
      '_id': { '$in': meetupIds }
    }, 0), opts);
  }

  meetupList(meetupRes, userMeetupRes) {
    return meetupRes.map((res: any) => {
      const meetup = res.doc || res;
      const meetupIndex = userMeetupRes.findIndex(meetupIds => {
        return meetup._id === meetupIds;
      });
      if (meetupIndex > -1) {
        return { ...meetup, participate: true };
      }
      return { ...meetup, participate: false };
    });
  }

  attendMeetup(meetupId, participate) {
    participate ? this.userShelf.meetupIds.splice(meetupId, 1)
      : this.userShelf.meetupIds.push(meetupId);
    return this.couchService.put('shelf/' + this.userService.get()._id, this.userShelf)
      .pipe(map((response) => {
        this.userShelf._rev = response.rev;
        this.userService.shelf = this.userShelf;
        return { response, participate };
    }));
  }

}
