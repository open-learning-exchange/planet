import { Component, Inject, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatStepper } from '@angular/material/stepper';

import { CustomValidators } from '../../validators/custom-validators';
import { ValidatorService } from '../../validators/validator.service';
import { NewsService } from '../../news/news.service';
import { TeamsService } from '../../teams/teams.service';

@Component({
  templateUrl: './dialogs-chat-share.component.html',
  styles: [ `
    .share-box {
      margin-left: 1.5rem;
    }
  `]
})
export class DialogsChatShareComponent {
  conversation: any;
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
    private newsService: NewsService,
    private teamsService: TeamsService,
    private validatorService: ValidatorService
  ) {
    this.conversation = data || this.conversation;
  }

  ngOnInit() {
    this.communityForm = this.formBuilder.group({
      message: ['']
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

  shareWithTeam() {
    if (this.teamForm.valid) {
      const team = this.teamForm.value;

      this.conversation.message = team.message ? team.message : '</br>';
      this.conversation.team = team;
    }
    this.conversation.chat = true;
    console.log(this.conversation);
  }

  shareWithCommunity() {
    if (this.communityForm.valid) {
      const message = this.communityForm.get('message').value;
      this.conversation.message = message ? message : '</br>';
    }
    this.conversation.chat = true;
    this.newsService.shareNews(this.conversation).subscribe(() => {});
  }

}
