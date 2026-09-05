import { Component, Inject } from '@angular/core';
import { FormArray, FormControl, FormGroup, NonNullableFormBuilder, ReactiveFormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogActions, MatDialogContent, MatDialogRef, MatDialogTitle } from '@angular/material/dialog';
import { CdkScrollable } from '@angular/cdk/scrolling';
import { MatButton, MatIconButton } from '@angular/material/button';
import { MatFormField, MatLabel, MatError, MatHint } from '@angular/material/form-field';
import { MatIcon } from '@angular/material/icon';
import { MatInput } from '@angular/material/input';
import { MatOption } from '@angular/material/autocomplete';
import { MatSelect, MatSelectTrigger } from '@angular/material/select';
import { MatTooltip } from '@angular/material/tooltip';
import { CustomValidators } from '../validators/custom-validators';
import { FormErrorMessagesComponent } from '../shared/forms/form-error-messages.component';
import { findPlatform, maxMemberLinks, MemberLink, memberLinkPlatforms, sanitizeMemberLinks } from '../shared/social-platforms.constants';

interface MemberLinkForm {
  platform: FormControl<string>;
  url: FormControl<string>;
  label: FormControl<string>;
}

@Component({
  templateUrl: './users-links-dialog.component.html',
  styleUrls: [ './users-links-dialog.scss' ],
  imports: [
    MatDialogTitle,
    CdkScrollable,
    MatDialogContent,
    ReactiveFormsModule,
    MatFormField,
    MatLabel,
    MatHint,
    MatError,
    MatSelect,
    MatSelectTrigger,
    MatOption,
    MatInput,
    MatIcon,
    MatIconButton,
    MatTooltip,
    FormErrorMessagesComponent,
    MatDialogActions,
    MatButton
  ]
})
export class UsersLinksDialogComponent {

  platforms = memberLinkPlatforms;
  maxLinks = maxMemberLinks;
  linksForm: FormGroup<{ links: FormArray<FormGroup<MemberLinkForm>> }>;

  constructor(
    private dialogRef: MatDialogRef<UsersLinksDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { links: MemberLink[] },
    private fb: NonNullableFormBuilder
  ) {
    const existingLinks = sanitizeMemberLinks(this.data?.links);
    this.linksForm = this.fb.group({
      links: this.fb.array((existingLinks.length > 0 ? existingLinks : [ { platform: '', url: '', label: '' } ])
        .map(link => this.linkGroup(link)))
    });
  }

  get links(): FormArray<FormGroup<MemberLinkForm>> {
    return this.linksForm.controls.links;
  }

  private linkGroup(link: Partial<MemberLink> = {}): FormGroup<MemberLinkForm> {
    return this.fb.group({
      platform: this.fb.control(link.platform || '', { validators: [ CustomValidators.required ] }),
      url: this.fb.control(link.url || '', { validators: [ CustomValidators.required, CustomValidators.memberLinkValue ] }),
      label: this.fb.control(link.label || '')
    });
  }

  platformIcon(platform: string) {
    return findPlatform(platform)?.icon || 'link';
  }

  isSvgIcon(platform: string) {
    return findPlatform(platform)?.isSvgIcon === true;
  }

  platformLabel(platform: string) {
    return findPlatform(platform)?.label || '';
  }

  valuePlaceholder(platform: string) {
    return findPlatform(platform)?.placeholder || 'https://...';
  }

  valueLabel(platform: string) {
    const { scheme } = findPlatform(platform) || {};
    return scheme === 'mailto' ? $localize`Email Address` : scheme === 'tel' ? $localize`Phone Number` : $localize`Link URL`;
  }

  platformChange(group: FormGroup<MemberLinkForm>) {
    group.controls.url.updateValueAndValidity();
  }

  addLink() {
    if (this.links.length < this.maxLinks) {
      this.links.push(this.linkGroup());
    }
  }

  removeLink(index: number) {
    this.links.removeAt(index);
    if (this.links.length === 0) {
      this.addLink();
    }
    this.linksForm.markAsDirty();
  }

  submitForm() {
    // A row left completely blank is treated as "no link", so the form is still submittable
    // when the member clears their last entry.
    this.dialogRef.close(sanitizeMemberLinks(this.links.getRawValue()));
  }

  cancelForm() {
    this.dialogRef.close();
  }

  get isSubmitDisabled(): boolean {
    return this.links.controls.some(group => {
      const { platform, url } = group.getRawValue();
      return (platform !== '' || url !== '') && group.invalid;
    });
  }

}
