import { Component, Inject, OnInit } from '@angular/core';
import {
  MAT_DIALOG_DATA, MatDialogRef, MatDialogTitle, MatDialogContent, MatDialogActions
} from '@angular/material/dialog';
import { FormControl, FormGroup, NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButton } from '@angular/material/button';
import { MatDatepicker, MatDatepickerInput, MatDatepickerToggle } from '@angular/material/datepicker';
import { MatError, MatFormField, MatLabel, MatSuffix } from '@angular/material/form-field';
import { MatIcon } from '@angular/material/icon';
import { MatInput } from '@angular/material/input';
import { MatOption } from '@angular/material/core';
import { MatSelect } from '@angular/material/select';
import { CustomValidators } from '../../validators/custom-validators';
import { FormErrorMessagesComponent } from '../../shared/forms/form-error-messages.component';
import { sortingOptionsMap } from './reports.utils';

export type ReportExportAction = 'download' | 'preview';

export interface ReportExportOption {
  name: string;
  value: string;
}

export interface ReportExportValue {
  report: string;
  startDate: Date;
  endDate: Date;
  team: any;
  sortBy: string | null;
}

export interface ReportsExportDialogData {
  title: string;
  reports: ReportExportOption[];
  teamOptions: Array<{ name: string, value: any }>;
  team: any;
  startDate: Date;
  endDate: Date;
  minDate: Date;
  maxDate: Date;
  onSubmit: (value: ReportExportValue, action: ReportExportAction) => void;
}

interface ExportForm {
  report: FormControl<string>;
  startDate: FormControl<Date>;
  endDate: FormControl<Date>;
  team: FormControl<any>;
  sortBy: FormControl<string | null>;
}

@Component({
  templateUrl: './reports-export-dialog.component.html',
  styleUrl: './reports-export-dialog.component.scss',
  imports: [
    MatDialogTitle,
    MatDialogContent,
    MatDialogActions,
    ReactiveFormsModule,
    FormErrorMessagesComponent,
    MatFormField,
    MatLabel,
    MatError,
    MatSelect,
    MatOption,
    MatInput,
    MatDatepickerInput,
    MatDatepickerToggle,
    MatDatepicker,
    MatSuffix,
    MatButton,
    MatIcon
  ]
})
export class ReportsExportDialogComponent implements OnInit {

  exportForm: FormGroup<ExportForm>;
  sortingOptions: ReportExportOption[] = [];

  constructor(
    public dialogRef: MatDialogRef<ReportsExportDialogComponent>,
    private fb: NonNullableFormBuilder,
    @Inject(MAT_DIALOG_DATA) public data: ReportsExportDialogData
  ) {}

  ngOnInit() {
    this.exportForm = this.fb.group<ExportForm>({
      report: this.fb.control(this.data.reports[0].value, Validators.required),
      startDate: this.fb.control(this.data.startDate, Validators.required),
      endDate: this.fb.control(this.data.endDate, [ Validators.required, CustomValidators.endDateValidator() ]),
      team: this.fb.control(this.data.team || 'All'),
      sortBy: this.fb.control<string | null>(null)
    });
    this.setSortingOptions(this.exportForm.controls.report.value);
    this.exportForm.controls.report.valueChanges.subscribe(report => this.setSortingOptions(report));
  }

  get selectedReport(): string {
    return this.exportForm.controls.report.value;
  }

  // Health examinations are not tied to team membership, so filtering them by team would be misleading
  get showTeam(): boolean {
    return this.selectedReport !== 'health';
  }

  export(action: ReportExportAction) {
    if (this.exportForm.invalid) {
      return;
    }
    const { report, startDate, endDate, team, sortBy } = this.exportForm.getRawValue();
    this.dialogRef.close();
    this.data.onSubmit({ report, startDate, endDate, team: this.showTeam ? team : 'All', sortBy }, action);
  }

  private setSortingOptions(report: string) {
    this.sortingOptions = sortingOptionsMap[report] || [];
    this.exportForm.controls.sortBy.setValue(this.sortingOptions.length ? this.sortingOptions[0].value : null);
  }

}
