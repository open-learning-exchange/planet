import { Component, Inject, OnInit, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatStepper } from '@angular/material/stepper';
import { switchMap, tap } from 'rxjs/operators';

import { CustomValidators } from '../../validators/custom-validators';
import { ValidatorService } from '../../validators/validator.service';
import { CouchService } from '../../shared/couchdb.service';
import { NewsService } from '../../news/news.service';
import { TeamsService } from '../../teams/teams.service';

@Component({
  templateUrl: './dialogs-chat-share.component.html',
  styles: [ `
    .mat-expansion-panel {
      box-shadow: 0px 3px 10px rgba(0, 0, 0, 0.1);
    }
  ` ]
})
export class DialogsChatShareComponent implements OnInit {
  conversation: any;
  teamInfo: any;
  membersInfo: any;
  showForm: boolean;
  teamForm: FormGroup;
  communityForm: FormGroup;

  @ViewChild('linkStepper') linkStepper: MatStepper;
  selectedLink: { db, title, selector? };
  links: { db, title, selector? }[] = [
    { db: 'teams', title: $localize`Teams`, selector: { type: 'team' } },
    { db: 'teams', title: $localize`Enterprises`, selector: { type: 'enterprise' } }
  ];

  constructor(
    public dialogRef: MatDialogRef<DialogsChatShareComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any,
    private formBuilder: FormBuilder,
    private couchService: CouchService,
    private newsService: NewsService,
    private teamsService: TeamsService,
    private validatorService: ValidatorService
  ) {
    this.conversation = data || this.conversation;
    console.log(this.links);

  }

  ngOnInit() {
    this.communityForm = this.formBuilder.group({
      message: [ '' ]
    });
    this.teamForm = this.formBuilder.group({
      message: [ '', CustomValidators.required, ac => this.validatorService.isUnique$('teams', 'title', ac, {}) ],
      route: [ '', CustomValidators.required ],
      linkId: '',
      teamType: ''
    });
  }

  teamSelect({ mode, teamId, teamType }) {
    this.teamForm.controls.route.setValue(this.teamsService.teamLinkRoute(mode, teamId));
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

  // sendNotifications(type, { members, newMembersLength = 0 }: { members?, newMembersLength? } = {}) {
  //   return this.teamsService.sendNotifications(type, members || this.members, {
  //     newMembersLength, url: this.router.url, team: { ...this.teamInfo }
  //   });
  // }

  getTeam(linkId: string) {
    return this.couchService.get(`teams/${linkId}`);
  }

  getTeamMembers(team: any) {
    return this.teamsService.getTeamMembers(team, true);
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
      this.membersInfo = membersData;
      this.showForm = true;

      this.newsService.postNews({
        viewIn: [ { '_id': linkId, section: 'teams' } ],
        messageType: teamType,
        messagePlanetCode: this.teamInfo.planetCode,
        ...this.conversation
      }, $localize`Chat has been shared to ${this.teamInfo.type} ${this.teamInfo.title}`).subscribe();
    });
  }

  shareWithCommunity() {
    if (this.communityForm.valid) {
      const message = this.communityForm.get('message').value;
      this.conversation.message = message ? { text: message, images: [] } : { text: '</br>', images: [] };
    }
    this.conversation.chat = true;
    this.newsService.shareNews(this.conversation, null, $localize`Chat has been successfully shared to community`).subscribe(() => {});
  }

}
