import { Component, Inject, OnInit, ViewChild } from '@angular/core';
import { StepperSelectionEvent } from '@angular/cdk/stepper';
import { MatStepper, MatStep } from '@angular/material/stepper';
import { NonNullableFormBuilder, FormControl, FormGroup, FormsModule, ReactiveFormsModule } from '@angular/forms';
import {
  MAT_DIALOG_DATA, MatDialogRef, MatDialogContent, MatDialogClose, MatDialogActions, MatDialogTitle
} from '@angular/material/dialog';
import { forkJoin, Observable } from 'rxjs';
import { switchMap, map } from 'rxjs/operators';
import { CdkScrollable } from '@angular/cdk/scrolling';
import {
  MatAccordion, MatExpansionPanel, MatExpansionPanelHeader, MatExpansionPanelTitle, MatExpansionPanelContent
} from '@angular/material/expansion';
import { MatCheckbox } from '@angular/material/checkbox';
import { MatFormField, MatLabel, MatError } from '@angular/material/form-field';
import { MatInput } from '@angular/material/input';
import { MatButton } from '@angular/material/button';
import { MatSelect } from '@angular/material/select';
import { MatOption } from '@angular/material/autocomplete';
import { MatRadioButton, MatRadioGroup } from '@angular/material/radio';

import { CouchService } from '@shared/database/couchdb.service';
import { UserService } from '@shared/auth/user.service';
import { ChallengesProgressService } from '@shared/challenges/challenges-progress.service';
import { FormErrorMessagesComponent } from '@shared/forms/form-error-messages.component';
import { AiChatService } from '@shared/ai/ai-chat.service';
import { PlanetMessageService } from '@shared/ui/planet-message.service';
import { TimeAgoPipe } from '@shared/text/time-ago.pipe';

import { NewsService } from '../news/news.service';
import { ChatShare, Conversation } from './chat.model';
import { TeamsService } from '../teams/teams.service';
import { TeamsComponent } from '../teams/teams.component';

interface TeamForm {
  message: FormControl<string>;
  linkId: FormControl<string>;
  teamType: FormControl<string>;
}

interface CommunityForm {
  message: FormControl<string>;
}

@Component({
  templateUrl: './chat-share-dialog.component.html',
  styleUrls: [ './chat-share-dialog.component.scss' ],
  imports: [
    CdkScrollable,
    MatDialogContent,
    MatAccordion,
    MatExpansionPanel,
    MatExpansionPanelHeader,
    MatExpansionPanelTitle,
    MatExpansionPanelContent,
    MatCheckbox,
    FormsModule,
    ReactiveFormsModule,
    MatFormField,
    MatLabel,
    MatInput,
    MatButton,
    MatDialogClose,
    MatSelect,
    MatOption,
    MatStepper,
    MatStep,
    TeamsComponent,
    MatError,
    FormErrorMessagesComponent,
    MatDialogActions,
    MatDialogTitle,
    MatRadioGroup,
    MatRadioButton,
    TimeAgoPipe
  ]
})
export class ChatShareDialogComponent implements OnInit {
  user = this.userService.get();
  conversation: Conversation;
  live = false;
  teamInfo: any;
  membersInfo: any;
  excludeIds: any[] = [];
  teamNames = new Map<string, string>();
  teamLabel = $localize`Team`;
  showForm: boolean;
  teamForm: FormGroup<TeamForm>;
  communityForm: FormGroup<CommunityForm>;

  @ViewChild('linkStepper') linkStepper: MatStepper;
  selectedLink: { db, title, selector? };
  links: { db, title, selector? }[] = [
    { db: 'teams', title: $localize`Teams`, selector: { type: 'team' } },
    { db: 'teams', title: $localize`Enterprises`, selector: { type: 'enterprise' } }
  ];

  constructor(
    public dialogRef: MatDialogRef<ChatShareDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any,
    private couchService: CouchService,
    private fb: NonNullableFormBuilder,
    private newsService: NewsService,
    private teamsService: TeamsService,
    private userService: UserService,
    private challengesProgressService: ChallengesProgressService,
    private aiChatService: AiChatService,
    private planetMessageService: PlanetMessageService
  ) {
    this.conversation = data.conversation;
  }

  get messageCount() {
    return this.conversation.conversations.length * 2;
  }

  ngOnInit() {
    this.communityForm = this.fb.group({
      message: ''
    });
    this.teamForm = this.fb.group({
      message: '',
      linkId: '',
      teamType: ''
    });
    this.getTeams();
  }

  teamSelect({ teamId, teamType }: { teamId: string, teamType: string }) {
    this.teamForm.controls.linkId.setValue(teamId);
    this.teamForm.controls.teamType.setValue(teamType);
    this.linkStepper.selected.completed = true;
    this.linkStepper.next();
  }

  linkStepperChange({ selectedIndex }: StepperSelectionEvent) {
    if (selectedIndex === 0 && this.teamForm.pristine !== true) {
      this.teamForm.reset({
        message: '',
        linkId: '',
        teamType: ''
      });
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
    const allTeams$ = this.couchService.findAll('teams', { selector: { status: 'active' } });
    const userTeams$ = this.couchService.findAll('teams', {
      selector: { userId: this.user._id, userPlanetCode: this.user.planetCode }
    });

    forkJoin([ allTeams$, userTeams$ ]).pipe(
      map(([ allTeams, userTeams ]) => this.compareTeams(allTeams, userTeams))
    ).subscribe();
  }

  compareTeams(allTeams, userTeams) {
    this.teamNames = new Map(allTeams.map(team => [ team._id, team.name ]));
    const difference = allTeams.filter(team => !userTeams.some(userTeam => userTeam.teamId === team._id));
    this.excludeIds = [ ...this.excludeIds, ...difference.map(team => team._id) ];
  }

  sendNotifications(type, members) {
    const section = this.teamInfo.type === 'enterprise' ? 'enterprises' : 'teams';
    return this.teamsService.sendNotifications(type, members, {
      url: `/${section}/view/${this.teamInfo._id}`, team: { ...this.teamInfo }
    });
  }

  private share(audience: { audience: 'community' } | { audience: 'team', teamId: string }): Observable<{ chat: true, news: object }> {
    return this.aiChatService.shareConversation(this.conversation._id, audience, this.live).pipe(
      map((share: ChatShare) => {
        this.conversation.shares = [ ...(this.conversation.shares || []), share ];
        return { chat: true, news: { shareId: share.id, title: this.conversation.title } };
      })
    );
  }

  private shareFailed() {
    this.planetMessageService.showAlert($localize`There was a problem sharing this chat.`);
  }

  stopSharing(share: ChatShare) {
    const removeShare = () => {
      this.conversation.shares = this.conversation.shares.filter(({ id }) => id !== share.id);
    };
    this.aiChatService.stopSharing(share.id).subscribe({
      next: removeShare,
      // Already stopped, e.g. by deleting its voice
      error: (error) => error.status === 404 ?
        removeShare() :
        this.planetMessageService.showAlert($localize`There was a problem stopping this share.`)
    });
  }

  shareWithTeam() {
    if (!this.teamForm.valid) {
      return;
    }

    const { message, linkId, teamType } = this.teamForm.getRawValue();
    this.getTeam(linkId).pipe(
      switchMap((teamData) => {
        this.teamInfo = teamData;
        return forkJoin([ this.share({ audience: 'team', teamId: linkId }), this.getTeamMembers(teamData) ]);
      }),
      switchMap(([ chatVoice, membersData ]) => this.newsService.postNews({
        viewIn: [ { _id: linkId, section: 'teams', public: false, name: this.teamInfo.name, mode: this.teamInfo.type } ],
        messageType: teamType,
        messagePlanetCode: this.teamInfo.teamPlanetCode,
        message: message || '</br>',
        ...chatVoice
      }, $localize`Chat has been shared to ${this.teamInfo.type} ${this.teamInfo.name}`).pipe(
        switchMap(() => this.sendNotifications('message', membersData))
      ))
    ).subscribe({ error: () => this.shareFailed() });
    this.interact();
  }

  shareWithCommunity() {
    const message = this.communityForm.controls.message.value;
    this.share({ audience: 'community' }).pipe(
      switchMap((chatVoice) => this.newsService.shareNews(
        { message: { text: message || '</br>', images: [] }, ...chatVoice }, null, $localize`Chat has been successfully shared to community`
      )),
      switchMap(() => this.challengesProgressService.record('voice_post'))
    ).subscribe({ error: () => this.shareFailed() });
    this.interact();
  }

  interact() {
    this.dialogRef.close({  interacted: true });
  }
}
