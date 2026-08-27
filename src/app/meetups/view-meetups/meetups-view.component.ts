import { Component, OnInit, OnDestroy, Input, Output, EventEmitter, Inject, Optional } from '@angular/core';
import { CouchService } from '../../shared/couchdb.service';
import { Router, ActivatedRoute, ParamMap, RouterLink } from '@angular/router';
import { map, takeUntil } from 'rxjs/operators';
import { MeetupService } from '../meetups.service';
import { Subject } from 'rxjs';
import { UserService } from '../../shared/user.service';
import { MatDialog, MatDialogRef, MAT_DIALOG_DATA, MatDialogContent, MatDialogActions, MatDialogClose } from '@angular/material/dialog';
import { PlanetMessageService } from '../../shared/planet-message.service';
import { DialogsListService } from '../../shared/dialogs/dialogs-list.service';
import { DialogGuardService } from '../../shared/dialogs/dialog-guard.service';
import { DialogsListComponent } from '../../shared/dialogs/dialogs-list.component';
import { filterSpecificFields } from '../../shared/table-helpers';
import { findDocuments } from '../../shared/mangoQueries';
import { StateService } from '../../shared/state.service';
import { UsersProfileDialogService } from '../../users/users-profile/users-profile-dialog.service';
import { NgClass, NgTemplateOutlet, TitleCasePipe, DatePipe } from '@angular/common';
import { MatToolbar } from '@angular/material/toolbar';
import { MatIconAnchor, MatButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { MatTooltip } from '@angular/material/tooltip';
import { PlanetMarkdownComponent } from '../../shared/planet-markdown.component';
import { CdkScrollable } from '@angular/cdk/scrolling';

@Component({
  selector: 'planet-meetups-view',
  templateUrl: './meetups-view.component.html',
  styleUrls: ['./meetups-view.scss'],
  imports: [
    MatToolbar,
    MatIconAnchor,
    RouterLink,
    MatIcon,
    MatButton,
    MatTooltip,
    NgClass,
    PlanetMarkdownComponent,
    CdkScrollable,
    MatDialogContent,
    NgTemplateOutlet,
    MatDialogActions,
    MatDialogClose,
    TitleCasePipe,
    DatePipe
  ]
})

export class MeetupsViewComponent implements OnInit, OnDestroy {

  @Input() meetupDetail: any;
  @Input() isDialog = false;
  @Input() editable = true;
  @Output() switchView = new EventEmitter<'close' | 'add'>();
  private onDestroy$ = new Subject<void>();
  canManage = false;
  members = [];
  parent = this.route.snapshot.data.parent;
  listDialogRef: MatDialogRef<DialogsListComponent>;
  currentUserName = this.userService.get().name;
  dateNow: any;

  constructor(
    public dialog: MatDialog,
    private usersProfileDialogService: UsersProfileDialogService,
    @Optional() public dialogRef: MatDialogRef<MeetupsViewComponent>,
    @Optional() @Inject(MAT_DIALOG_DATA) public data: any,
    private couchService: CouchService,
    private router: Router,
    private route: ActivatedRoute,
    private meetupService: MeetupService,
    private planetMessageService: PlanetMessageService,
    private userService: UserService,
    private dialogsListService: DialogsListService,
    private stateService: StateService,
    private dialogGuard: DialogGuardService
  ) {
    this.couchService.currentTime().subscribe((date) => this.dateNow = date);
  }

  ngOnInit() {
    this.canManage = this.userService.get()?._id;
    this.getEnrolledUsers();
    this.meetupService.meetupUpdated$.pipe(takeUntil(this.onDestroy$))
      .subscribe((meetupArray) => {
        this.meetupDetail = meetupArray[0];
      });
    if (this.meetupDetail === undefined) {
      this.route.paramMap
        .pipe(takeUntil(this.onDestroy$))
        .subscribe((params: ParamMap) => {
          const meetupId = params.get('id');
          const getOpts: any = { meetupIds: [ meetupId ] };
          if (this.parent) {
            getOpts.opts = { domain: this.stateService.configuration.parentDomain };
          }
          this.meetupService.updateMeetups(getOpts);
        }, error => console.log(error), () => console.log('complete getting meetup id'));
    }
  }

  ngOnDestroy() {
    this.onDestroy$.next();
    this.onDestroy$.complete();
  }

  joinMeetupTooltip() {
    return this.isMeetupDisabled() ? $localize`You cannot join old meetup` : '';
  }

  getEnrolledUsers() {
    // find meetupId on User shelf
    return this.couchService.post('shelf/_find', findDocuments({
      meetupIds: { $in: [ this.route.snapshot.paramMap.get('id') ] }
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
      const msg = res.participate ? $localize`left` : $localize`joined`;
      this.meetupDetail.participate = !res.participate;
      this.planetMessageService.showMessage($localize`You have ${msg} meetup.`);
      this.fixEnrolledList(res.participate, this.userService.get().name);
    });
  }

  openInviteMemberDialog() {
    this.dialogGuard.open('invite-member', () =>
      this.dialogsListService.getListAndColumns('_users').pipe(
        map(res => {
          res.tableData = res.tableData.filter((tableValue: any) => this.members.indexOf(tableValue.name) === -1);
          return this.dialog.open(DialogsListComponent, {
            data: {
              okClick: this.sendInvitations.bind(this),
              filterPredicate: filterSpecificFields([ 'name' ]),
              allowMulti: true,
              itemDescription: 'members',
              nameProperty: 'name',
              ...res
            },
            maxHeight: '500px',
            width: '600px',
            autoFocus: false
          });
        })
      )
    ).pipe(takeUntil(this.onDestroy$)).subscribe(ref => this.listDialogRef = ref);
  }

  sendInvitations(selected: string[]) {
    const invites = selected.map((user: any) => {
      return this.inviteNotification(user._id, this.meetupDetail);
    });
    this.couchService.updateDocument('notifications/_bulk_docs', { docs: invites }).subscribe(res => {
      this.listDialogRef.close();
      this.planetMessageService.showMessage($localize`Invitation${(invites.length > 1 ? 's' : '')} sent successfully`);
    });
  }

  inviteNotification(userId, meetupDetail) {
    return {
      user: userId,
      message: $localize`<b>${this.userService.get().name}</b> would like you to join <b>"${meetupDetail.title}"</b> meetup
        ${(meetupDetail.meetupLocation ? ' at ' + meetupDetail.meetupLocation : '')}`,
      link: this.router.url,
      item: meetupDetail._id,
      type: 'meetup',
      priority: 1,
      status: 'unread',
      time: this.couchService.datePlaceholder
    };
  }

  isMeetupDisabled() {
    const meetupDate = this.meetupDetail && (this.meetupDetail.endDate ? this.meetupDetail.endDate : this.meetupDetail.startDate);
    return (this.dateNow > meetupDate) && !this.meetupDetail.participate ? true : false;
  }

  routeToEdit() {
    if (this.isDialog) {
      this.switchView.emit('add');
    }
  }

  deleteMeetup() {
    const callback = () => {
      if (this.isDialog) {
        this.switchView.emit('close');
      }
    };
    this.meetupService.openDeleteDialog(this.meetupDetail, callback);
  }

  openCreatorProfile(event?: Event) {
    this.openProfile(this.meetupDetail?.createdBy, this.meetupDetail?.sourcePlanet || this.meetupDetail?.sync?.planetCode, event);
  }

  openAssigneeProfile(event?: Event) {
    this.openProfile(this.meetupDetail?.assignee?.name, this.meetupDetail?.assignee?.userPlanetCode, event);
  }

  openProfile(username, planetCode, event?: Event) {
    if (event) {
      event.stopPropagation();
      event.preventDefault();
      if ((event as KeyboardEvent).repeat) {
        return;
      }
    }
    this.usersProfileDialogService.open({
      member: { name: username, userPlanetCode: planetCode },
      dialogRef: this.dialogRef
    });
  }

  editTask() {
    if (this.dialogRef && this.data && this.data.onEditTask) {
      this.dialogRef.close();
      this.data.onEditTask();
    }
  }

  deleteTask() {
    if (this.dialogRef && this.data && this.data.onDeleteTask) {
      this.dialogRef.close();
      this.data.onDeleteTask();
    }
  }

}
