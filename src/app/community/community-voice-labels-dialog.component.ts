import { Component, OnInit, Inject } from '@angular/core';
import {
  MatDialogRef, MAT_DIALOG_DATA, MatDialogTitle, MatDialogContent, MatDialogActions, MatDialogClose
} from '@angular/material/dialog';
import { MatChipSet, MatChip, MatChipRemove } from '@angular/material/chips';
import { MatFormField, MatLabel, MatError } from '@angular/material/form-field';
import { MatInput } from '@angular/material/input';
import { MatIcon } from '@angular/material/icon';
import { MatButton } from '@angular/material/button';
import { FormsModule } from '@angular/forms';
import { StateService } from '../shared/state.service';
import { CouchService } from '../shared/couchdb.service';
import { NewsService } from '../news/news.service';
import { PlanetMessageService } from '../shared/planet-message.service';
import { DialogsLoadingService } from '../shared/dialogs/dialogs-loading.service';
import { LabelComponent } from '../shared/label.component';
import { finalize, switchMap } from 'rxjs/operators';

@Component({
  selector: 'planet-community-voice-labels-dialog',
  templateUrl: './community-voice-labels-dialog.component.html',
  styleUrl: './community-voice-labels-dialog.component.scss',
  imports: [
    MatDialogTitle,
    MatDialogContent,
    MatDialogActions,
    MatDialogClose,
    MatChipSet,
    MatChip,
    MatChipRemove,
    MatFormField,
    MatLabel,
    MatInput,
    MatError,
    MatIcon,
    MatButton,
    FormsModule,
    LabelComponent
  ]
})
export class CommunityVoiceLabelsDialogComponent implements OnInit {

  systemLabels = [ 'help', 'offer', 'advice' ];
  initialCustomLabels: string[] = [];
  customLabels: string[] = [];
  newLabelInput = '';
  errorMessage = '';
  isSaving = false;
  target: 'community' | 'team' | 'enterprise' = 'community';
  team: any;

  constructor(
    private dialogRef: MatDialogRef<CommunityVoiceLabelsDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any,
    private stateService: StateService,
    private couchService: CouchService,
    private newsService: NewsService,
    private planetMessageService: PlanetMessageService,
    private dialogsLoadingService: DialogsLoadingService
  ) {}

  ngOnInit() {
    this.target = this.data?.target || 'community';
    this.team = this.data?.team;

    let configCustomLabels: string[] = [];
    if (this.target === 'community') {
      configCustomLabels = this.stateService.configuration?.customVoiceLabels || [];
    } else if (this.team && Array.isArray(this.team.customVoiceLabels)) {
      configCustomLabels = this.team.customVoiceLabels;
    }

    this.initialCustomLabels = [ ...configCustomLabels ];
    this.customLabels = [ ...configCustomLabels ];
  }

  get sectionHeader(): string {
    if (this.target === 'enterprise') {
      return $localize`Custom Enterprise Labels`;
    }
    if (this.target === 'team') {
      return $localize`Custom Team Labels`;
    }
    return $localize`Custom Community Labels`;
  }

  addLabel(): void {
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

    if (this.customLabels.some(l => l.toLowerCase() === lowerValue)) {
      this.errorMessage = $localize`"${value}" already exists in custom labels.`;
      return;
    }

    if (value.length > 30) {
      this.errorMessage = $localize`Label cannot exceed 30 characters.`;
      return;
    }

    this.customLabels.push(value);
    this.newLabelInput = '';
  }

  removeLabel(label: string): void {
    const index = this.customLabels.indexOf(label);
    if (index >= 0) {
      this.customLabels.splice(index, 1);
    }
    this.errorMessage = '';
  }

  save(): void {
    this.isSaving = true;
    this.dialogsLoadingService.start();
    const deletedLabels = this.initialCustomLabels.filter(label => !this.customLabels.includes(label));

    if (this.target === 'community') {
      const currentConfig = this.stateService.configuration || {};
      const updatedConfig = {
        ...currentConfig,
        keys: this.stateService.keys,
        customVoiceLabels: [ ...this.customLabels ]
      };

      this.couchService.updateDocument('configurations', updatedConfig)
        .pipe(
          switchMap(() => this.newsService.scrubDeletedLabels(deletedLabels, 'community')),
          finalize(() => {
            this.isSaving = false;
            this.dialogsLoadingService.stop();
          })
        )
        .subscribe({
          next: () => {
            this.stateService.requestData('configurations', 'local');
            this.planetMessageService.showMessage($localize`Voice labels updated successfully.`);
            this.dialogRef.close(true);
          },
          error: () => {
            this.planetMessageService.showAlert($localize`There was a problem saving custom voice labels.`);
          }
        });
    } else if (this.team) {
      const updatedTeam = {
        ...this.team,
        customVoiceLabels: [ ...this.customLabels ]
      };

      this.couchService.updateDocument('teams', updatedTeam)
        .pipe(
          switchMap(() => this.newsService.scrubDeletedLabels(deletedLabels, 'group', this.team._id)),
          finalize(() => {
            this.isSaving = false;
            this.dialogsLoadingService.stop();
          })
        )
        .subscribe({
          next: () => {
            this.planetMessageService.showMessage($localize`Voice labels updated successfully.`);
            this.dialogRef.close(true);
          },
          error: () => {
            this.planetMessageService.showAlert($localize`There was a problem saving custom voice labels.`);
          }
        });
    }
  }
}
