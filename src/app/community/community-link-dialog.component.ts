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
    // Set sensible defaults for social links
    const defaults = {
      instagram: { title: 'Instagram', icon: 'instagram', route: 'https://instagram.com/' },
      facebook: { title: 'Facebook', icon: 'facebook', route: 'https://facebook.com/' },
  whatsapp: { title: 'WhatsApp', icon: 'whatsapp', route: 'https://wa.me/' },
  discord: { title: 'Discord', icon: 'discord', route: 'https://discord.com/invite/' },
  x: { title: 'X', icon: 'x', route: 'https://twitter.com/' },
  youtube: { title: 'YouTube', icon: 'youtube', route: 'https://youtube.com/' },
  tiktok: { title: 'TikTok', icon: 'tiktok', route: 'https://tiktok.com/@' },
  website: { title: 'Website', icon: 'web', route: 'https://' }
    } as any;
    const def = defaults[platform] || {};
    if (!this.linkForm.get('title')?.value) {
      this.linkForm.controls.title.setValue(def.title || '');
    }
    this.linkForm.controls.icon.setValue(def.icon || '');
    if (!this.linkForm.get('route')?.value) {
      this.linkForm.controls.route.setValue(def.route || '');
    }
    this.linkForm.controls.teamType.setValue('social');

    // Apply URL validator only for generic Website entries
    const routeCtrl = this.linkForm.controls.route;
    if (platform === 'website') {
      routeCtrl.setAsyncValidators([ CustomValidators.validLink ]);
    } else {
      routeCtrl.setAsyncValidators([]);
    }
    routeCtrl.updateValueAndValidity();
  }

  onLinkTypeChange(linkType: { db; title; selector? }) {
    this.selectedLink = linkType;
    const routeCtrl = this.linkForm.controls.route;
    // For teams/enterprises, clear URL async validation; for Web & Social, keep it only if platform is website
    if (linkType?.db === 'teams') {
      routeCtrl.setAsyncValidators([]);
    } else {
      routeCtrl.setAsyncValidators(this.linkForm.get('platform')?.value === 'website' ? [ CustomValidators.validLink ] : []);
    }
    routeCtrl.updateValueAndValidity();
  }

  getPlatformIcon(platform: string): string {
    const map: any = {
      instagram: 'instagram',
      facebook: 'facebook',
      whatsapp: 'whatsapp',
      discord: 'discord',
      x: 'x',
      youtube: 'youtube',
      tiktok: 'tiktok',
      website: 'web'
    };
    return map[platform] || 'web';
  }

  platformLabel(platform?: string): string {
    const match = this.socialPlatforms.find(p => p.value === platform);
    return match ? match.label : '';
  }
}
