import { Component, OnInit, OnDestroy, Inject } from '@angular/core';
import {
  MatDialog, MatDialogRef, MAT_DIALOG_DATA, MatDialogTitle, MatDialogContent, MatDialogActions
} from '@angular/material/dialog';
import { MatChipSet, MatChip, MatChipRemove } from '@angular/material/chips';
import { MatFormField, MatLabel } from '@angular/material/form-field';
import { MatInput } from '@angular/material/input';
import { MatIcon } from '@angular/material/icon';
import { MatButton } from '@angular/material/button';
import { FormsModule } from '@angular/forms';
import { ConfigurationService } from '../../configuration/configuration.service';
import { StateService } from '../state.service';
import { CouchService } from '../couchdb.service';
import { PlanetMessageService } from '../planet-message.service';
import { DialogsLoadingService } from './dialogs-loading.service';
import { LabelComponent } from '../label.component';
import {
  CustomVoiceLabel,
  DEFAULT_VOICE_LABELS,
  SHARED_CHAT_LABEL,
  DEFAULT_LABEL_COLOR,
  LABEL_TINT_COLORS,
  dedupeCustomVoiceLabels,
  getVoiceLabelName
} from '../voice-labels';
import { UnsavedChangesPromptComponent } from '../unsaved-changes.component';
import { Subject } from 'rxjs';
import { filter, finalize, switchMap, take, takeUntil } from 'rxjs/operators';

@Component({
  templateUrl: './dialogs-voice-labels.component.html',
  styleUrl: './dialogs-voice-labels.component.scss',
  imports: [
    MatDialogTitle,
    MatDialogContent,
    MatDialogActions,
    MatChipSet,
    MatChip,
    MatChipRemove,
    MatFormField,
    MatLabel,
    MatInput,
    MatIcon,
    MatButton,
    FormsModule,
    LabelComponent
  ]
})
export class DialogsVoiceLabelsComponent implements OnInit, OnDestroy {

  systemLabels = DEFAULT_VOICE_LABELS;
  initialCustomLabels: CustomVoiceLabel[] = [];
  customLabels: CustomVoiceLabel[] = [];
  newLabelInput = '';
  selectedColor: string = DEFAULT_LABEL_COLOR;
  colorPalette = [
    { value: '#bbdefb', name: $localize`Blue` },
    { value: '#c8e6c9', name: $localize`Green` },
    { value: '#ffecb3', name: $localize`Amber` },
    { value: '#ffcdd2', name: $localize`Coral` },
    { value: '#e1bee7', name: $localize`Purple` },
    { value: '#b2dfdb', name: $localize`Teal` },
    { value: '#b2ebf2', name: $localize`Cyan` },
    { value: '#ffe0b2', name: $localize`Orange` },
    { value: '#f8bbd0', name: $localize`Pink` }
  ];
  defaultColor = DEFAULT_LABEL_COLOR;
  errorMessage = '';
  isSaving = false;
  isConfirmingClose = false;
  target: 'community' | 'team' | 'enterprise' | 'services' = 'community';
  team: any;
  private onDestroy$ = new Subject<void>();

  constructor(
    private dialogRef: MatDialogRef<DialogsVoiceLabelsComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any,
    private stateService: StateService,
    private configurationService: ConfigurationService,
    private couchService: CouchService,
    private planetMessageService: PlanetMessageService,
    private dialogsLoadingService: DialogsLoadingService,
    private dialog: MatDialog
  ) {
    this.dialogRef.disableClose = true;
    this.dialogRef.backdropClick().pipe(takeUntil(this.onDestroy$)).subscribe(() => this.requestClose());
    this.dialogRef.keydownEvents().pipe(
      filter(event => event.key === 'Escape'),
      takeUntil(this.onDestroy$)
    ).subscribe(() => this.requestClose());
  }

  ngOnInit() {
    this.target = this.data?.target || 'community';
    this.team = this.data?.team;

    let configuredLabels: any[] = [];
    if (Array.isArray(this.data?.customLabels)) {
      configuredLabels = this.data.customLabels;
    } else if (this.target === 'community') {
      configuredLabels = this.stateService.configuration?.customVoiceLabels || [];
    } else if (this.team && Array.isArray(this.team.customVoiceLabels)) {
      configuredLabels = this.team.customVoiceLabels;
    }

    const uniqueLabels = dedupeCustomVoiceLabels(configuredLabels);
    this.initialCustomLabels = [ ...uniqueLabels ];
    this.customLabels = [ ...uniqueLabels ];
  }

  get sectionHeader(): string {
    if (this.target === 'enterprise') {
      return $localize`Enterprise labels`;
    }
    if (this.target === 'team') {
      return $localize`Team labels`;
    }
    if (this.target === 'services') {
      return $localize`Services labels`;
    }
    return $localize`Community labels`;
  }

  get hasUnsavedChanges(): boolean {
    return this.newLabelInput.trim().length > 0 || this.labelsChanged;
  }

  get labelsChanged(): boolean {
    if (this.initialCustomLabels.length !== this.customLabels.length) {
      return true;
    }
    return this.initialCustomLabels.some((label, index) => {
      const current = this.customLabels[index];
      return label.name !== current?.name || (label.color || DEFAULT_LABEL_COLOR) !== (current?.color || DEFAULT_LABEL_COLOR);
    });
  }

  addLabel(): void {
    if (this.isSaving) {
      return;
    }
    const value = (this.newLabelInput || '').trim();
    this.errorMessage = '';

    if (!value) {
      return;
    }

    const lowerValue = value.toLowerCase();

    if (this.systemLabels.includes(lowerValue)) {
      this.errorMessage = $localize`"${value}" is already a default system label.`;
      return;
    }
    if (lowerValue === SHARED_CHAT_LABEL) {
      this.errorMessage = $localize`"${value}" is reserved and cannot be used as a custom label.`;
      return;
    }

    if (this.customLabels.some(l => l.name.toLowerCase() === lowerValue)) {
      this.errorMessage = $localize`"${value}" already exists in custom labels.`;
      return;
    }

    if (value.length > 30) {
      this.errorMessage = $localize`Label cannot exceed 30 characters.`;
      return;
    }

    this.customLabels.push({ name: value, color: this.selectedColor || DEFAULT_LABEL_COLOR });
    this.newLabelInput = '';
  }

  removeLabel(label: CustomVoiceLabel | string): void {
    if (this.isSaving) {
      return;
    }
    const labelName = getVoiceLabelName(label).toLowerCase();
    const index = this.customLabels.findIndex(l => l.name.toLowerCase() === labelName);
    if (index >= 0) {
      this.customLabels.splice(index, 1);
    }
    this.errorMessage = '';
  }

  requestClose(): void {
    if (this.isSaving || this.isConfirmingClose) {
      return;
    }
    if (!this.hasUnsavedChanges) {
      this.dialogRef.close();
      return;
    }

    this.isConfirmingClose = true;
    UnsavedChangesPromptComponent.open(this.dialog).pipe(
      take(1),
      finalize(() => this.isConfirmingClose = false)
    ).subscribe(confirmed => {
      if (confirmed) {
        this.dialogRef.close();
      }
    });
  }

  save(): void {
    if (this.isSaving) {
      return;
    }
    if (this.newLabelInput.trim()) {
      this.addLabel();
      if (this.newLabelInput.trim()) {
        return;
      }
    }
    if (!this.labelsChanged) {
      return;
    }
    const isCommunity = this.target === 'community';
    const currentConfig = this.stateService.configuration;
    const targetDocument = isCommunity ? currentConfig : this.team;
    if (!targetDocument?._id) {
      this.planetMessageService.showAlert($localize`Label settings are not available. Please try again.`);
      return;
    }

    this.isSaving = true;
    this.dialogsLoadingService.start();
    const customVoiceLabels = [ ...this.customLabels ];
    const updateRequest = isCommunity ?
      this.configurationService.patchLocalConfiguration({ customVoiceLabels }) :
      this.couchService.get(`teams/${targetDocument._id}`).pipe(
        switchMap(currentDocument => this.couchService.updateDocument('teams', { ...currentDocument, customVoiceLabels }))
      );

    updateRequest.pipe(
      finalize(() => {
        this.isSaving = false;
        this.dialogsLoadingService.stop();
      })
    ).subscribe({
      next: (savedDocument) => {
        if (isCommunity) {
          this.stateService.requestData('configurations', 'local');
        } else if (savedDocument?.doc) {
          Object.assign(this.team, savedDocument.doc);
        }
        this.planetMessageService.showMessage($localize`Voice labels updated successfully.`);
        this.dialogRef.close(customVoiceLabels);
      },
      error: () => {
        this.planetMessageService.showAlert($localize`There was a problem saving custom voice labels.`);
      }
    });
  }

  ngOnDestroy(): void {
    this.onDestroy$.next();
    this.onDestroy$.complete();
  }
}
