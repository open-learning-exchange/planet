import { Component, Inject, OnInit, ViewChild } from '@angular/core';
import { MatStepper } from '@angular/material/stepper';
import { UntypedFormBuilder, UntypedFormGroup } from '@angular/forms';
import {
  MAT_LEGACY_DIALOG_DATA as MAT_DIALOG_DATA, MatLegacyDialogRef as MatDialogRef, MatLegacyDialog as MatDialog
} from '@angular/material/legacy-dialog';
import { forkJoin } from 'rxjs';
import { switchMap, map } from 'rxjs/operators';

import { CouchService } from '../../shared/couchdb.service';
import { NewsService } from '../../news/news.service';
import { TeamsService } from '../../teams/teams.service';
import { UserService } from '../../shared/user.service';
import { UserChallengeStatusService } from '../user-challenge-status.service';
import { DialogsAnnouncementSuccessComponent } from '../../shared/dialogs/dialogs-announcement.component';

@Component({
  templateUrl: './dialogs-chat-share.component.html',
  styles: [ `
    .mat-expansion-panel {
      box-shadow: 0px 3px 10px rgba(0, 0, 0, 0.1);
    }
  ` ]
})
export class DialogsChatShareComponent implements OnInit {
  user = this.userService.get();
  conversation: any;
  teamInfo: any;
  membersInfo: any;
  excludeIds: any[] = [];
  showForm: boolean;
  teamForm: UntypedFormGroup;
  communityForm: UntypedFormGroup;

  @ViewChild('linkStepper') linkStepper: MatStepper;
  selectedLink: { db, title, selector? };
  links: { db, title, selector? }[] = [
    { db: 'teams', title: $localize`Teams`, selector: { type: 'team' } },
    { db: 'teams', title: $localize`Enterprises`, selector: { type: 'enterprise' } }
  ];

  constructor(
    public dialogRef: MatDialogRef<DialogsChatShareComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any,
    private couchService: CouchService,
    private formBuilder: UntypedFormBuilder,
    private newsService: NewsService,
    private teamsService: TeamsService,
    private userService: UserService,
    private dialog: MatDialog,
    private userStatusService: UserChallengeStatusService,
  ) {
    this.conversation = data || this.conversation;
  }

  ngOnInit() {
    this.communityForm = this.formBuilder.group({
      message: ''
    });
    this.teamForm = this.formBuilder.group({
      message: '',
      linkId: '',
      teamType: ''
    });
    this.getTeams();
  }

  teamSelect({ teamId, teamType }) {
    this.teamForm.controls.linkId.setValue(teamId);
    this.teamForm.controls.teamType.setValue(teamType);
    this.linkStepper.selected.completed = true;
    this.linkStepper.next();
  }

  linkStepperChange({ selectedIndex }) {
    if (selectedIndex === 0 && this.teamForm.pristine !== true) {
      this.teamForm.reset();
    }
  }

  getTeam(linkId: string) {
    return this.couchService.get(`teams/${linkId}`);
  }

  getTeamMembers(team: any) {
    return this.teamsService.getTeamMembers(team, true).pipe(
      map(memberships => memberships.filter(membership => membership.docType === 'membership'))
    );
  }

  getTeams() {
    const allTeams$ = this.couchService.findAll('teams', { 'selector': { 'status': 'active' } });
    const userTeams$ = this.couchService.findAll('teams', {
      'selector': { 'userId': this.user._id, 'userPlanetCode': this.user.planetCode }
    });

    forkJoin([ allTeams$, userTeams$ ]).pipe(
      map(([ allTeams, userTeams ]) => this.compareTeams(allTeams, userTeams))
    ).subscribe();
  }

  compareTeams(allTeams, userTeams) {
    const difference = allTeams.filter(team => !userTeams.some(userTeam => userTeam.teamId === team._id));
    this.excludeIds = [ ...this.excludeIds, ...difference.map(team => team._id) ];
  }

  sendNotifications(type, members, teamType) {
    return this.teamsService.sendNotifications(type, members, {
      url: `${teamType}/view/${this.teamInfo._id}`, team: { ...this.teamInfo }
    });
  }

  shareWithTeam() {
    let linkId, teamType;
    if (this.teamForm.valid) {
      const team = this.teamForm.value;
      this.conversation.message = team.message ? team.message : '</br>';
      ({ linkId, teamType } = team);
    }

    this.getTeam(linkId).pipe(
      switchMap((teamData) => {
        this.teamInfo = teamData;
        return this.getTeamMembers(teamData);
      })
    ).subscribe((membersData) => {
      this.conversation.chat = true;
      this.newsService.postNews({
        viewIn: [ { '_id': linkId, section: 'teams', public: false } ],
        messageType: teamType,
        messagePlanetCode: this.teamInfo.planetCode,
        ...this.conversation
      }, $localize`Chat has been shared to ${this.teamInfo.type} ${this.teamInfo.name}`).pipe(
        switchMap(() => this.sendNotifications('message', membersData, teamType)),
      ).subscribe();
    });
    this.interact();
  }

  shareWithCommunity() {
    if (this.communityForm.valid) {
      const message = this.communityForm.get('message').value;
      this.conversation.message = message ? { text: message, images: [] } : { text: '</br>', images: [] };
    }
    this.conversation.chat = true;
    this.interact();
    this.newsService.shareNews(this.conversation, null, $localize`Chat has been successfully shared to community`).subscribe(() => {});
    if (
      this.userStatusService.getStatus('joinedCourse') &&
      this.userStatusService.getStatus('surveyComplete') &&
      !this.userStatusService.getStatus('hasPost')
    ) {
      this.dialog.open(DialogsAnnouncementSuccessComponent, {
        width: '50vw',
        maxHeight: '100vh'
      });
    }
  }

  interact() {
    this.dialogRef.close({  interacted: true });
  }
}
