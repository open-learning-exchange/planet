import { Component, OnInit } from '@angular/core';
import { FormControl, FormGroup, NonNullableFormBuilder, Validators, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { CouchService } from '../shared/couchdb.service';
import { DialogsLoadingService } from '../shared/dialogs/dialogs-loading.service';
import { forkJoin } from 'rxjs';
import { finalize } from 'rxjs/operators';
import { MatToolbar } from '@angular/material/toolbar';
import { MatIconButton, MatButton } from '@angular/material/button';
import { RouterLink } from '@angular/router';
import { MatIcon } from '@angular/material/icon';
import { SyncDirective } from './sync.directive';
import { MatList, MatListItem, MatListItemTitle, MatListItemMeta, MatListItemLine, MatDivider } from '@angular/material/list';
import { MatCard, MatCardHeader, MatCardTitle, MatCardContent } from '@angular/material/card';
import { MatFormField, MatLabel, MatError } from '@angular/material/form-field';
import { MatInput } from '@angular/material/input';
import { MatSelect } from '@angular/material/select';
import { MatOption } from '@angular/material/autocomplete';
import { MatSlideToggle } from '@angular/material/slide-toggle';
import { DatePipe, NgClass } from '@angular/common';
import { ConfigurationService } from '../configuration/configuration.service';
import { PlanetMessageService } from '../shared/planet-message.service';
import { StateService } from '../shared/state.service';
import { FormErrorMessagesComponent } from '../shared/forms/form-error-messages.component';
import { SubmitDirective } from '../shared/submit.directive';
import { SyncScheduleService } from './sync-schedule.service';
import {
  SyncSchedulePreset, TimedSyncStatus, maxSyncIntervalHours, minSyncIntervalHours, normalizeSyncSchedule, syncSchedulePresets
} from '../shared/sync-schedule';

@Component({
  templateUrl: './manager-sync.component.html',
  styleUrls: [ './manager-settings.shared.scss' ],
  imports: [
    MatToolbar,
    MatIconButton,
    RouterLink,
    MatIcon,
    MatButton,
    SyncDirective,
    MatList,
    MatListItem,
    NgClass,
    DatePipe,
    MatListItemTitle,
    MatListItemMeta,
    MatListItemLine,
    MatDivider,
    FormsModule,
    ReactiveFormsModule,
    MatCard,
    MatCardHeader,
    MatCardTitle,
    MatCardContent,
    MatFormField,
    MatLabel,
    MatInput,
    MatError,
    MatSelect,
    MatOption,
    MatSlideToggle,
    FormErrorMessagesComponent,
    SubmitDirective
  ]
})

export class ManagerSyncComponent implements OnInit {

  replicators = [];
  configuration: any = {};
  presets = syncSchedulePresets;
  minIntervalHours = minSyncIntervalHours;
  maxIntervalHours = maxSyncIntervalHours;
  status: TimedSyncStatus = null;
  spinnerOn = true;
  form: FormGroup<{
    enabled: FormControl<boolean>,
    preset: FormControl<SyncSchedulePreset>,
    intervalHours: FormControl<number>
  }>;

  constructor(
    private couchService: CouchService,
    private dialogsLoadingService: DialogsLoadingService,
    private configurationService: ConfigurationService,
    private stateService: StateService,
    private planetMessageService: PlanetMessageService,
    private syncScheduleService: SyncScheduleService,
    private formBuilder: NonNullableFormBuilder
  ) {
    this.form = this.formBuilder.group({
      enabled: this.formBuilder.control(false),
      preset: this.formBuilder.control<SyncSchedulePreset>('daily'),
      intervalHours: this.formBuilder.control(24, {
        validators: [ Validators.required, Validators.min(minSyncIntervalHours), Validators.max(maxSyncIntervalHours) ]
      })
    });
  }

  ngOnInit() {
    this.configuration = this.stateService.configuration;
    this.form.patchValue(normalizeSyncSchedule(this.configuration.syncSchedule));
    this.getReplicators();
    this.getStatus();
  }

  getReplicators() {
    this.dialogsLoadingService.start();
    forkJoin([
      this.couchService.get('_scheduler/docs'),
      this.couchService.findAll('_replicator')
    ]).subscribe(([ reps, data ]) => {
      const jobs = reps.docs.filter(replicator => replicator.database === '_replicator');
      this.replicators = data.map((rep: any) => ({ ...rep, ...jobs.find(n => n.doc_id === rep._id) }));
      this.dialogsLoadingService.stop();
    });
  }

  getStatus() {
    this.syncScheduleService.getStatus().subscribe(status => this.status = status);
  }

  saveSchedule() {
    const spinnerOff = () => this.spinnerOn = false;
    if (this.form.controls.preset.value === 'custom' && this.form.controls.intervalHours.invalid) {
      spinnerOff();
      return;
    }
    this.spinnerOn = true;
    const syncSchedule = normalizeSyncSchedule(this.form.getRawValue());
    this.configurationService.patchLocalConfiguration({ syncSchedule })
      .pipe(finalize(spinnerOff))
      .subscribe(() => {
        this.configuration = { ...this.configuration, syncSchedule };
        this.stateService.requestData('configurations', 'local');
        this.getStatus();
        this.planetMessageService.showMessage(
          syncSchedule.enabled ? $localize`Timed sync scheduled` : $localize`Timed sync turned off`
        );
      }, () => this.planetMessageService.showAlert($localize`There was an error updating the sync schedule`));
  }

}
