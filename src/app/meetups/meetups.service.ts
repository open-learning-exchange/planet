import { OnDestroy } from '@angular/core';
import { Injectable } from '@angular/core';
import { CouchService } from '../shared/couchdb.service';
import { findDocuments } from '../shared/mangoQueries';
import { UserService } from '../shared/user.service';
import { Subject, of, forkJoin } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { dedupeShelfReduce } from '../shared/utils';

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
    const newMeetupIds = [ ...this.userShelf.meetupIds ];
    if (participate) {
      newMeetupIds.splice(meetupId, 1);
    } else {
      newMeetupIds.push(meetupId);
    }
    return this.updateMeetupShelf(newMeetupIds, participate);
  }

  attendMeetups(meetups) {
    const newMeetupIds = meetups.concat(this.userShelf.meetupIds).reduce(dedupeShelfReduce, []);
    return this.updateMeetupShelf(newMeetupIds, true);
  }

  updateMeetupShelf(meetupIds, participate) {
    const newShelf = { ...this.userShelf, meetupIds };
    return this.couchService.put('shelf/' + this.userService.get()._id, newShelf)
      .pipe(map((response) => {
        this.userShelf = newShelf;
        this.userShelf._rev = response.rev;
        this.userService.shelf = this.userShelf;
        return { response, participate };
    }));
  }

}
