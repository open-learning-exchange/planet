import { OnDestroy } from '@angular/core';
import { Injectable } from '@angular/core';
import { CouchService } from '../shared/couchdb.service';
import { findDocuments } from '../shared/mangoQueries';
import { UserService } from '../shared/user.service';
import { Subject } from 'rxjs/Subject';
import { of } from 'rxjs/observable/of';
import { forkJoin } from 'rxjs/observable/forkJoin';
import { switchMap, catchError, map, takeUntil } from 'rxjs/operators';
import { PlanetMessageService } from '../shared/planet-message.service';
import { Router } from '@angular/router';

@Injectable()
export class MeetupService {

  private meetupUpdated = new Subject<any[]>();
  meetupUpdated$ = this.meetupUpdated.asObservable();
  meetups = [];
  userShelf = this.userService.getUserShelf();
  private onDestroy$ = new Subject<void>();

  constructor(
    private couchService: CouchService,
    private userService: UserService,
    private router: Router,
    private planetMessageService: PlanetMessageService
  ) {
    this.userService.shelfChange$.pipe(takeUntil(this.onDestroy$))
      .subscribe(() => {
        this.userShelf = this.userService.getUserShelf();
        this.meetupUpdated.next(this.meetupList(this.meetups, this.userShelf.meetupIds));
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
    this.couchService.put('shelf/' + this.userService.get()._id, this.userShelf)
      .subscribe((res) => {
        this.userShelf._rev = res.rev;
        this.userService.setShelf(this.userShelf);
        const msg = participate ? 'left' : 'joined';
        this.planetMessageService.showMessage('You have ' + msg + ' selected meetup.');
    }, (error) => (error));
  }

}
