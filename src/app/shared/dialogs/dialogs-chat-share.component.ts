import { Component, Inject, OnInit } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialog } from '@angular/material/dialog';
import { forkJoin } from 'rxjs';
import { switchMap, map } from 'rxjs/operators';

import { CouchService } from '../../shared/couchdb.service';
import { NewsService } from '../../news/news.service';
import { TeamsService } from '../../teams/teams.service';
import { UserService } from '../../shared/user.service';
import { UserChallengeStatusService } from '../user-challenge-status.service';
import { DialogsAnnouncementSuccessComponent } from '../../shared/dialogs/dialogs-announcement.component';
import { DialogsAddTableComponent } from './dialogs-add-table.component';
import { DialogsLoadingService } from './dialogs-loading.service';

@Component({
  templateUrl: './dialogs-chat-share.component.html',
  styles: [ `
    .mat-expansion-panel {
      box-shadow: 0px 3px 10px rgba(0, 0, 0, 0.1);
    }
    .team-selection {
      margin: 1rem 0;
    }
    .selected-team {
      margin-top: 0.5rem;
      padding: 0.5rem;
      background-color: #f5f5f5;
      border-radius: 4px;
    }
  ` ]
})
export class DialogsChatShareComponent implements OnInit {
  user = this.userService.get();
  conversation: any;
  teamInfo: any;
  excludeIds: any[] = [];
  showForm: boolean;
  teamForm: FormGroup;
  communityForm: FormGroup;
  selectedTeam: any = {};

  constructor(
    public dialogRef: MatDialogRef<DialogsChatShareComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any,
    private couchService: CouchService,
    private formBuilder: FormBuilder,
    private newsService: NewsService,
    private teamsService: TeamsService,
    private userService: UserService,
    private dialog: MatDialog,
    private dialogsLoadingService: DialogsLoadingService,
    private userStatusService: UserChallengeStatusService
  ) {
    this.conversation = data?.news || this.conversation;
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

  openTeamSelectionDialog(mode: 'team' | 'enterprise') {
    const dialogRef = this.dialog.open(DialogsAddTableComponent, {
      width: '80vw',
      height: '80vh',
      data: {
        mode: 'teams',
        excludeIds: this.excludeIds,
        singleSelect: true,
        noSpinner: true,
        okClick: (teams) => {
          if (teams.length > 0) {
            const team = teams[0];
            this.selectedTeam = {
              name: team.doc.name,
              teamId: team.doc._id,
              teamType: team.doc.teamType
            };
            this.teamForm.controls.linkId.setValue(team.doc._id);
            this.teamForm.controls.teamType.setValue(team.doc.teamType);
          }
          dialogRef.close();
        }
      }
    });
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

  getTeam(linkId: string) {
    return this.couchService.get(`teams/${linkId}`);
  }

  getTeamMembers(team: any) {
    return this.teamsService.getTeamMembers(team, true).pipe(
      map(memberships => memberships.filter(membership => membership.docType === 'membership'))
    );
  }

  sendNotifications(type, members, teamType) {
    return this.teamsService.sendNotifications(type, members, {
      url: `${teamType}/view/${this.teamInfo._id}`, team: { ...this.teamInfo }
    });
  }

  shareWithTeam() {
    if (this.teamForm.valid && this.selectedTeam?.teamId) {
      const teamValue = this.teamForm.value;
      const linkId = this.selectedTeam.teamId;
      const teamType = this.selectedTeam.teamType;
      this.conversation.message = teamValue.message ? teamValue.message : '</br>';

      this.dialogsLoadingService.start();

      this.getTeam(linkId).pipe(
        switchMap((teamData) => {
          this.teamInfo = teamData;
          return this.getTeamMembers(teamData);
        })
      ).subscribe({
        next: (membersData) => {
          this.conversation.chat = true;
          this.newsService.postNews({
            viewIn: [ { '_id': linkId, section: 'teams', public: false } ],
            messageType: teamType,
            messagePlanetCode: this.teamInfo.planetCode,
            ...this.conversation
          }, $localize`Chat has been shared to ${this.teamInfo.type} ${this.teamInfo.name}`).pipe(
            switchMap(() => this.sendNotifications('message', membersData, teamType)),
          ).subscribe({
            next: () => {
              this.dialogsLoadingService.stop();
              this.interact();
            },
            error: () => this.dialogsLoadingService.stop()
          });
        },
        error: () => this.dialogsLoadingService.stop()
      });
    }
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
    this.dialogRef.close({ interacted: true });
  }
}