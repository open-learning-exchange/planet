import { OnDestroy } from '@angular/core';
import { Injectable } from '@angular/core';
import { CouchService } from '../shared/couchdb.service';
import { findDocuments } from '../shared/mangoQueries';
import { UserService } from '../shared/user.service';
import { Subject, of, forkJoin } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { dedupeShelfReduce } from '../shared/utils';
import { PlanetMessageService } from '../shared/planet-message.service';
import { MatDialog, MatDialogRef } from '@angular/material';
import { DialogsPromptComponent } from '../shared/dialogs/dialogs-prompt.component';

@Injectable()
export class MeetupService {

  private meetupUpdated = new Subject<any[]>();
  deleteDialog: MatDialogRef<DialogsPromptComponent>;
  meetupUpdated$ = this.meetupUpdated.asObservable();
  meetups = [];
  userShelf = this.userService.shelf;

  constructor(
    private dialog: MatDialog,
    private couchService: CouchService,
    private userService: UserService,
    private planetMessageService: PlanetMessageService
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
    return this.couchService.findAll('meetups', findDocuments({ '_id': { '$gt': null } }, 0 ), opts);
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
      newMeetupIds.splice(newMeetupIds.indexOf(meetupId), 1);
    } else {
      newMeetupIds.push(meetupId);
    }
    return this.updateMeetupShelf(newMeetupIds, participate);
  }

  attendMeetups(meetupIds, type) {
    return this.userService.changeShelf(meetupIds, 'meetupIds', type).pipe(map(({ shelf, countChanged }) => {
      const message = type === 'remove' ?
        'You have left ' + countChanged + ' meetups' : 'You have joined ' + countChanged + ' meetups';
      this.planetMessageService.showMessage(message);
      return shelf;
    }));
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

  openDeleteDialog(meetups: any[] | any, callback) {
    const isMany = meetups.length > 1;
    const displayName = isMany ? '' : (meetups[0] || meetups).title;
    this.deleteDialog = this.dialog.open(DialogsPromptComponent, {
      data: {
        okClick: this.deleteMeetups([ meetups ].flat(), displayName, callback),
        changeType: 'delete',
        type: 'event',
        amount: isMany ? 'many' : 'single',
        displayName
      }
    });
  }

  deleteMeetups(meetups: any[], displayName, callback) {
    return {
      request: this.couchService.bulkDocs('meetups', meetups.map(m => ({ ...m, _deleted: true }))),
      onNext: (data) => {
        callback(data.res);
        this.deleteDialog.close();
        this.planetMessageService.showMessage(`You have deleted the ${displayName ? `${displayName} event` : 'selected events'}`);
      },
      onError: (error) => this.planetMessageService.showAlert('There was a problem deleting this meetup')
    };
  }

}
