import { Component, ViewChild, Inject } from '@angular/core';
import { NonNullableFormBuilder, FormControl, FormGroup } from '@angular/forms';
import { MatLegacyDialogRef as MatDialogRef, MAT_LEGACY_DIALOG_DATA as MAT_DIALOG_DATA } from '@angular/material/legacy-dialog';
import { MatStepper } from '@angular/material/stepper';
import { StepperSelectionEvent } from '@angular/cdk/stepper';
import { CustomValidators } from '../validators/custom-validators';
import { TeamsService } from '../teams/teams.service';
import { switchMap } from 'rxjs/operators';
import { ValidatorService } from '../validators/validator.service';
import { PlanetMessageService } from '../shared/planet-message.service';

interface CommunityLinkForm {
  title: FormControl<string>;
  route: FormControl<string>;
  linkId: FormControl<string>;
  teamType: FormControl<string>;
  icon: FormControl<string>;
  platform: FormControl<string>;
}

interface CommunityLinkSelection {
  db: 'teams' | 'social';
  title: string;
  selector?: { type: 'team' | 'enterprise' };
};

interface TeamSelectionEvent {
  mode: 'team' | 'enterprise';
  teamId: string;
  teamType: string;
};

@Component({
  templateUrl: './community-link-dialog.component.html',
})
export class CommunityLinkDialogComponent {

  @ViewChild('linkStepper') linkStepper: MatStepper;
  selectedLink?: CommunityLinkSelection;
  links: CommunityLinkSelection[] = [
    { db: 'teams', title: $localize`Teams`, selector: { type: 'team' } },
    { db: 'teams', title: $localize`Enterprises`, selector: { type: 'enterprise' } },
    { db: 'social', title: $localize`Web & Social` }
  ];
  linkForm: FormGroup<CommunityLinkForm>;
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
    private fb: NonNullableFormBuilder,
    private teamsService: TeamsService,
    private planetMessageService: PlanetMessageService,
    private validatorService: ValidatorService
  ) {
    this.linkForm = this.fb.group({
      title: this.fb.control('', {
        validators: [CustomValidators.required],
        asyncValidators: [ac => this.validatorService.isUnique$('teams', 'title', ac, {})]
      }),
      route: this.fb.control('', { validators: [CustomValidators.required] }),
      linkId: this.fb.control(''),
      teamType: this.fb.control(''),
      icon: this.fb.control(''),
      platform: this.fb.control('')
    });
  }

  get linkTitleForm(): FormControl<string> {
    return this.linkForm.controls.title;
  }

  teamSelect({ mode, teamId, teamType }: TeamSelectionEvent) {
    this.linkForm.controls.route.setValue(this.teamsService.teamLinkRoute(mode, teamId));
    this.linkForm.controls.linkId.setValue(teamId);
    this.linkForm.controls.teamType.setValue(teamType);
    this.linkForm.controls.icon.setValue(mode === 'team' ? 'groups' : 'work');
    this.linkStepper.selected.completed = true;
    this.linkStepper.next();
  }

  linkStepperChange({ selectedIndex }: StepperSelectionEvent) {
    if (selectedIndex === 0 && this.linkForm.pristine !== true) {
      this.linkForm.reset({
        title: '',
        route: '',
        linkId: '',
        teamType: '',
        icon: '',
        platform: ''
      });
    }
  }

  linkSubmit() {
    const linkTitle = this.linkForm.controls.title.value;
    const link = this.linkForm.getRawValue();

    this.teamsService.createServicesLink(link).pipe(
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
