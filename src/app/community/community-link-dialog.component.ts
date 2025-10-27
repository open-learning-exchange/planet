import { Component, ViewChild, Inject } from '@angular/core';
import { UntypedFormBuilder, UntypedFormGroup } from '@angular/forms';
import { MatLegacyDialogRef as MatDialogRef, MAT_LEGACY_DIALOG_DATA as MAT_DIALOG_DATA } from '@angular/material/legacy-dialog';
import { MatStepper } from '@angular/material/stepper';
import { CustomValidators } from '../validators/custom-validators';
import { TeamsService } from '../teams/teams.service';
import { switchMap } from 'rxjs/operators';
import { ValidatorService } from '../validators/validator.service';
import { PlanetMessageService } from '../shared/planet-message.service';

@Component({
  templateUrl: './community-link-dialog.component.html',
})
export class CommunityLinkDialogComponent {

  @ViewChild('linkStepper') linkStepper: MatStepper;
  selectedLink: { db, title, selector? };
  links: { db, title, selector? }[] = [
    { db: 'teams', title: $localize`Teams`, selector: { type: 'team' } },
    { db: 'teams', title: $localize`Enterprises`, selector: { type: 'enterprise' } },
    { db: 'social', title: $localize`Web & Social` }
  ];
  linkForm: UntypedFormGroup;
  socialPlatforms = [
    { value: 'instagram', label: 'Instagram' },
    { value: 'facebook', label: 'Facebook' },
    { value: 'whatsapp', label: 'WhatsApp' },
    { value: 'discord', label: 'Discord' },
    { value: 'x', label: 'X (Twitter)' },
    { value: 'youtube', label: 'YouTube' },
    { value: 'tiktok', label: 'TikTok' },
    { value: 'website', label: 'Website' }
  ];

  constructor(
    private dialogRef: MatDialogRef<CommunityLinkDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any,
    private fb: UntypedFormBuilder,
    private teamsService: TeamsService,
    private planetMessageService: PlanetMessageService,
    private validatorService: ValidatorService
  ) {
    this.linkForm = this.fb.group({
      title: [ '', CustomValidators.required, ac => this.validatorService.isUnique$('teams', 'title', ac, {}) ],
      route: [ '', CustomValidators.required ],
      linkId: '',
      teamType: '',
      icon: '',
      platform: ''
    });
  }

  teamSelect({ mode, teamId, teamType }) {
    this.linkForm.controls.route.setValue(this.teamsService.teamLinkRoute(mode, teamId));
    this.linkForm.controls.linkId.setValue(teamId);
    this.linkForm.controls.teamType.setValue(teamType);
    this.linkForm.controls.icon.setValue(mode === 'team' ? 'groups' : 'work');
    this.linkStepper.selected.completed = true;
    this.linkStepper.next();
  }

  linkStepperChange({ selectedIndex }) {
    if (selectedIndex === 0 && this.linkForm.pristine !== true) {
      this.linkForm.reset();
    }
  }

  linkSubmit() {
    const linkTitle = this.linkForm.get('title')?.value;
    this.teamsService.createServicesLink(this.linkForm.value).pipe(
      switchMap(() => this.data.getLinks())
    ).subscribe({
      next: () => {
        this.dialogRef.close();
        this.planetMessageService.showMessage($localize`Added link: ${linkTitle}`);
      },
      error: () => {
        this.planetMessageService.showAlert($localize`Error adding link`);
      }
    });
  }

  cancelForm() {
    this.dialogRef.close();
  }

  onPlatformSelect(platform: string) {
    this.linkForm.controls.icon.setValue(this.socialPlatforms.find(p => p.value === platform)?.value || '');
    this.linkForm.controls.teamType.setValue('social');

    // Apply URL validator for generic Website entries
    const routeCtrl = this.linkForm.controls.route;
    routeCtrl.setAsyncValidators(platform === 'website' ? [CustomValidators.validLink] : []);
    routeCtrl.updateValueAndValidity();
  }

  getPlatformLabel(platform: string): string {
    return this.socialPlatforms.find(p => p.value === platform)?.label || '';
  }
}
