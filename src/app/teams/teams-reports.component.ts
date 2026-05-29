import { Component, Input, Output, EventEmitter } from '@angular/core';
import { Validators } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { DialogsFormService } from '../shared/dialogs/dialogs-form.service';
import { CustomValidators } from '../validators/custom-validators';
import { CouchService } from '../shared/couchdb.service';
import { TeamsService } from './teams.service';
import { DialogsLoadingService } from '../shared/dialogs/dialogs-loading.service';
import { TeamsReportsDialogComponent } from './teams-reports-dialog.component';
import { DialogsPromptComponent } from '../shared/dialogs/dialogs-prompt.component';
import { tap } from 'rxjs/operators';
import { convertUtcDate } from './teams.utils';
import { CsvService } from '../shared/csv.service';
import { StateService } from '../shared/state.service';
import { PlanetMessageService } from '../shared/planet-message.service';
import { fullLabel } from '../manager-dashboard/reports/reports.utils';
import { NgIf, NgFor, NgClass, CurrencyPipe, DatePipe } from '@angular/common';
import { MatButton, MatIconButton } from '@angular/material/button';
import { MatCard, MatCardContent } from '@angular/material/card';
import { PlanetLoadingSpinnerComponent } from '../shared/planet-loading-spinner.component';
import { MatIcon } from '@angular/material/icon';

interface NewReportForm {
  _id?: string,
  _rev?: string,
  beginningBalance: string,
  description: string,
  endDate: Date,
  otherExpenses: number,
  otherIncome: number,
  sales: number,
  startDate: Date,
  wages: string
}

@Component({
  selector: 'planet-teams-reports',
  styleUrls: ['./teams-reports.scss'],
  templateUrl: './teams-reports.component.html',
  imports: [
    NgIf, NgFor, NgClass, MatButton, MatCard, MatCardContent, PlanetLoadingSpinnerComponent, MatIconButton, MatIcon, CurrencyPipe, DatePipe
  ]
})
export class TeamsReportsComponent {

  @Input() reports: any[];
  @Input() editable = false;
  @Input() isLoading = false;
  @Input() team;
  @Output() reportsChanged = new EventEmitter<void>();
  configuration: any = {};
  planetName: any;
  curCode = this.stateService.configuration.currency || {};

  constructor(
    private couchService: CouchService,
    private dialog: MatDialog,
    private dialogsFormService: DialogsFormService,
    private dialogsLoadingService: DialogsLoadingService,
    private teamsService: TeamsService,
    private csvService: CsvService,
    private stateService: StateService,
    private planetMessageService: PlanetMessageService,
  ) {}

  private num(value: any): number {
    const n = Number(value);
    return Number.isFinite(n) ? n : 0;
  }

  reportIncome(report: any): number {
    return this.num(report?.sales) + this.num(report?.otherIncome);
  }

  reportExpenses(report: any): number {
    return this.num(report?.wages) + this.num(report?.otherExpenses);
  }

  reportNet(report: any): number {
    return this.reportIncome(report) - this.reportExpenses(report);
  }

  reportEnding(report: any): number {
    return this.num(report?.beginningBalance) + this.reportNet(report);
  }

  openAddReportDialog(oldReport = {}, isEdit: boolean) {
    const actionType = isEdit ? $localize`:@@report-edited:edited` : $localize`:@@report-added:added`;
    const dialogTitle = isEdit ? $localize`:@@edit-report-dialog-title:Edit Report` : $localize`:@@add-report-dialog-title:Add Report`;

    this.couchService.currentTime().subscribe((time: number) => {
      const currentDate = new Date(time);
      const lastMonthStart = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1);
      const lastMonthEnd = currentDate.setDate(0);
      this.dialogsFormService.openDialogsForm(
        dialogTitle,
        [
          { name: 'startDate', placeholder: $localize`Start Date`, type: 'date', required: true },
          { name: 'endDate', placeholder: $localize`End Date`, type: 'date', required: true },
          { name: 'description', placeholder: $localize`Summary`, type: 'markdown', required: true },
          { name: 'beginningBalance', placeholder: $localize`Beginning Balance`, type: 'textbox', inputType: 'number', required: true },
          { name: 'sales', placeholder: $localize`Sales`, type: 'textbox', inputType: 'number', required: true, min: 0 },
          { name: 'otherIncome', placeholder: $localize`Other Income`, type: 'textbox', inputType: 'number', required: true, min: 0 },
          { name: 'wages', placeholder: $localize`Personnel`, type: 'textbox', inputType: 'number', required: true, min: 0 },
          { name: 'otherExpenses', placeholder: $localize`Non-Personnel`, type: 'textbox', inputType: 'number', required: true, min: 0 }
        ],
        this.addFormInitialValues(oldReport, { startDate: lastMonthStart, endDate: lastMonthEnd }),
        {
          disableIfInvalid: true,
          onSubmit: (newReport) => this.updateReport(oldReport, newReport).subscribe(() => {
            this.dialogsFormService.closeDialogsForm();
            const action = isEdit ? $localize`:@@report-edited:edited` : $localize`:@@report-added:added`;
            this.planetMessageService.showMessage($localize`Report ${action}`);
          })
        }
      );
    });
  }

  openDeleteReportDialog(report) {
    const deleteDialog = this.dialog.open(DialogsPromptComponent, {
      data: {
        changeType: 'delete',
        type: 'report',
        displayName: `${$localize`Report from`} ${new Date(report.startDate).toLocaleDateString('en-US', { timeZone: 'UTC' })}
          ${$localize`to`} ${new Date(report.endDate).toLocaleDateString('en-US', { timeZone: 'UTC' })}`,
        okClick: {
          request: this.updateReport(report),
          onNext: () => {
            this.planetMessageService.showMessage($localize`Report deleted`);
            this.dialogsLoadingService.stop();
            deleteDialog.close();
          },
          onError: () => {
            this.planetMessageService.showAlert($localize`There was a problem deleting the report.`);
            this.dialogsLoadingService.stop();
          }
        },
        isDateUtc: true
      }
    });
  }

  addFormInitialValues(oldReport, { startDate, endDate }) {
    const initialValues = {
      description: '',
      beginningBalance: 0,
      sales: 0,
      otherIncome: 0,
      wages: 0,
      otherExpenses: 0,
      ...oldReport,
      startDate: new Date(convertUtcDate(oldReport.startDate) || startDate),
      endDate: new Date(convertUtcDate(oldReport.endDate) || endDate)
    };
    const formControl = (initialValue, fieldName: string) => [
      initialValue,
      [ CustomValidators.required, this.addFormValidator(fieldName) ]
    ];
    return Object.entries(initialValues).reduce(
      (formObj, [ key, value ]) => ({ ...formObj, [key]: formControl(value, key) }), {}
    );
  }

  addFormValidator(fieldName) {
    return fieldName === 'endDate' ?
      CustomValidators.endDateValidator() :
      [ 'sales', 'otherIncome', 'wages', 'otherExpenses' ].indexOf(fieldName) > -1 ?
        Validators.min(0) :
        () => {};
  }

  updateReport(oldReport, newReport: NewReportForm | {} = {}) {
    const dateFields = [ 'startDate', 'endDate' ];
    const numberFields = [ 'beginningBalance', 'sales', 'otherIncome', 'wages', 'otherExpenses' ];
    const transformFields = (key: string, value: string | Date | number) => dateFields.indexOf(key) > -1 ?
      (value as Date).getTime() :
      numberFields.indexOf(key) > -1 ?
        +value :
        value;
    const { _id, _rev, ...newDoc } = Object.entries(newReport).reduce(
      (obj, [ key, value ]: [ string, string | Date | number ]) => {
        return {
          ...obj,
          [key]: transformFields(key, value)
        };
      },
      {}
    ) as any;
    const docs = [ { ...oldReport, status: 'archived' }, newDoc ].filter(doc => doc.startDate !== undefined);
    return this.teamsService.updateAdditionalDocs(docs, this.team, 'report', { utcKeys: dateFields }).pipe(tap(() => {
      this.reportsChanged.emit();
      this.dialogsLoadingService.stop();
    }));
  }

  openReportDialog(report) {
    this.dialog.open(TeamsReportsDialogComponent, {
      data: { report, team: this.team },
      width: '70ch'
    });
  }

  exportReports() {
    const exportData = this.reports.map(report => ({
      [$localize`Start Date`]: fullLabel(report.startDate),
      [$localize`End Date`]: fullLabel(report.endDate),
      [$localize`Created Date`]: fullLabel(report.createdDate),
      [$localize`Updated Date`]: fullLabel(report.updatedDate),
      [$localize`Beginning Balance`]: report.beginningBalance,
      [$localize`Sales`]: report.sales,
      [$localize`Other Income`]: report.otherIncome,
      [$localize`Wages`]: report.wages,
      [$localize`Other Expenses`]: report.otherExpenses,
      [$localize`Profit/Loss`]: report.sales + report.otherIncome - report.wages - report.otherExpenses,
      [$localize`Ending Balance`]: report.beginningBalance + report.sales + report.otherIncome - report.wages - report.otherExpenses
    }));
    const planetName = this.stateService.configuration.name || 'Unnamed';
    const entityLabel = this.configuration.planetType === 'nation' ? 'Nation' : 'Community';
    const titleName = this.team.name || `${entityLabel} ${planetName}`;
    this.csvService.exportCSV({
      data: exportData,
      title: $localize`Financial Summary for ${titleName}`
    });
  }

}
