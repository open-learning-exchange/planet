import { Component, OnInit, OnDestroy } from '@angular/core';
import { CouchService } from '../../shared/couchdb.service';
import { Router, ActivatedRoute, ParamMap } from '@angular/router';
import { takeUntil } from 'rxjs/operators';
import { DatePipe } from '@angular/common';
import { MeetupService } from '../meetups.service';
import { Subject } from 'rxjs';
import { UserService } from '../../shared/user.service';
import { MatDialog, MatDialogRef } from '@angular/material';
import { PlanetMessageService } from '../../shared/planet-message.service';
import { DialogsListService } from '../../shared/dialogs/dialogs-list.service';
import { DialogsListComponent } from '../../shared/dialogs/dialogs-list.component';
import { filterSpecificFields } from '../../shared/table-helpers';
import { findDocuments } from '../../shared/mangoQueries';
import { debug } from '../../debug-operator';

@Component({
  templateUrl: './meetups-view.component.html',
  styleUrls: [ './meetups-view.scss' ]
})

export class MeetupsViewComponent implements OnInit, OnDestroy {
  private onDestroy$ = new Subject<void>();
  meetupDetail: any = {};
  members = [];
  parent = this.route.snapshot.data.parent;
  dialogRef: MatDialogRef<DialogsListComponent>;
  currentUserName = this.userService.get().name;

  constructor(
    public dialog: MatDialog,
    private couchService: CouchService,
    private router: Router,
    private route: ActivatedRoute,
    // meetupService made public because of error Property is private and only accessible within class during prod build
    public meetupService: MeetupService,
    public planetMessageService: PlanetMessageService,
    private userService: UserService,
    private dialogsListService: DialogsListService
  ) { }

  ngOnInit() {
    this.getEnrolledUsers();
    this.route.paramMap
      .pipe(debug('Getting meetup id from parameters'), takeUntil(this.onDestroy$))
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

  getEnrolledUsers() {
    // find meetupId on User shelf
    return this.couchService.post('shelf/_find', findDocuments({
      'meetupIds': { '$in': [ this.route.snapshot.paramMap.get('id') ] }
    }, 0)). subscribe((data) => {
      this.members = data.docs.map((res) => {
        return res._id.split(':')[1];
      });
    });
  }

  fixEnrolledList(remove: boolean, userName: string) {
    if (remove) {
      this.members = this.members.filter(name => name !== userName);
    } else {
      this.members.push(userName);
    }
  }

  joinMeetup() {
    this.meetupService.attendMeetup(this.meetupDetail._id, this.meetupDetail.participate).subscribe((res) => {
      const msg = res.participate ? 'left' : 'joined';
      this.meetupDetail.participate = !res.participate;
      this.planetMessageService.showMessage('You have ' + msg + ' meetup.');
      this.fixEnrolledList(res.participate, this.userService.get().name);
    });
  }

  openInviteMemberDialog() {
    this.dialogsListService.getListAndColumns('_users').pipe(takeUntil(this.onDestroy$)).subscribe((res) => {
      res.tableData = res.tableData.filter((tableValue: any) => this.members.indexOf(tableValue.name) === -1);
      const data = {
        okClick: this.sendInvitations.bind(this),
        filterPredicate: filterSpecificFields([ 'name' ]),
        allowMulti: true,
        ...res
      };
      this.dialogRef = this.dialog.open(DialogsListComponent, {
        data: data,
        height: '500px',
        width: '600px',
        autoFocus: false
      });
    });
  }

  sendInvitations(selected: string[]) {
    const invites = selected.map((user: any) => {
      return this.inviteNotification(user._id, this.meetupDetail);
    });
    this.couchService.post('notifications/_bulk_docs', { docs: invites }).subscribe(res => {
      this.dialogRef.close();
      this.planetMessageService.showMessage('Invitation' + (invites.length > 1 ? 's' : '') + ' sent successfully');
    });
  }

  inviteNotification(userId, meetupDetail) {
    return {
      'user': userId,
      'message': this.userService.get().name + ' would like you to join ' + meetupDetail.title + ' at ' + meetupDetail.meetupLocation,
      'link': this.router.url,
      'item': meetupDetail._id,
      'type': 'meetup',
      'priority': 1,
      'status': 'unread',
      'time': Date.now()
    };
  }

}
