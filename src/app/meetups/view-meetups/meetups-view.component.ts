import { Component, OnInit, OnDestroy } from '@angular/core';
import { CouchService } from '../../shared/couchdb.service';
import { ActivatedRoute, ParamMap } from '@angular/router';
import { takeUntil, switchMap } from 'rxjs/operators';
import { DatePipe } from '@angular/common';
import { MeetupService } from '../meetups.service';
import { Subject } from 'rxjs/Subject';
import { UserService } from '../../shared/user.service';
import { MatDialog, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material';
import { PlanetMessageService } from '../../shared/planet-message.service';
import { map } from 'rxjs/operators';

@Component({
  templateUrl: './meetups-view.component.html'
})

export class MeetupsViewComponent implements OnInit, OnDestroy {
  private onDestroy$ = new Subject<void>();
  meetupDetail: any = {};
  parent = this.route.snapshot.data.parent;
  constructor(
    public dialog: MatDialog,
    private couchService: CouchService,
    private route: ActivatedRoute,
    // meetupService made public because of error Property is private and only accessible within class during prod build
    public meetupService: MeetupService,
    public planetMessageService: PlanetMessageService,
    private userService: UserService
  ) { }

  ngOnInit() {
    this.route.paramMap
      .debug('Getting meetup id from parameters')
      .pipe(takeUntil(this.onDestroy$))
      .subscribe((params: ParamMap) => {
        const meetupId = params.get('id');
        const getOpts: any = { meetupIds: [ meetupId ] };
        if (this.parent) {
          getOpts.opts = { domain: this.userService.getConfig().parentDomain };
        }
        this.meetupService.updateMeetups(getOpts);
      }, error => console.log(error), () => console.log('complete getting meetup id'));
    this.meetupService.meetupUpdated$.pipe(takeUntil(this.onDestroy$))
      .subscribe((meetupArray) => {
        this.meetupDetail = meetupArray[0];
      });
  }

  ngOnDestroy() {
    this.onDestroy$.next();
    this.onDestroy$.complete();
  }

  inviteMemberDialog() {
    this.meetupService
    .inviteMember()
    .subscribe((res: any) => {
      if (res !== undefined) {
        if (res.invitemember === 'All') {
          this.sendInvitationToAllUser(this.meetupDetail);
        } else {
          res.myselectedMember.forEach((userId) => {
            this.sendInviteNotification(userId, this.meetupDetail);
          });
        }
      }
    });
  }

  sendInvitationToAllUser(meetupDetail) {
    this.couchService.allDocs('_users').subscribe(users => {
      const filterusers = users.filter((user: any) => {
        return user._id !== this.userService.get()._id;
      });
      filterusers.forEach((user) => {
        this.sendInviteNotification(user._id, meetupDetail);
      });
    });
  }

  sendInviteNotification(userId, meetupDetail) {
    const data = {
      'user': userId,
      'message': 'Meet up notification of ' + meetupDetail.title + ' at ' + meetupDetail.meetupLocation,
      'link': window.location.href,
      'item': meetupDetail._id,
      'type': 'meetup',
      'priority': 1,
      'status': 'unread',
      'time': Date.now()
    };
    this.couchService.post('notifications', data)
      .subscribe(() => {
        this.planetMessageService.showAlert('Invitation send sucessfully.');
      }, error => this.planetMessageService.showAlert('Sorry,there is a problem with sending request.'));
  }


}
