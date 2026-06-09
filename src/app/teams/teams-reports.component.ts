import { Component, Input, Output, EventEmitter, OnChanges } from '@angular/core';
import { Validators } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { DialogsFormService } from '../shared/dialogs/dialogs-form.service';
import { CustomValidators } from '../validators/custom-validators';
import { CouchService } from '../shared/couchdb.service';
import { TeamsService } from './teams.service';
import { DialogsLoadingService } from '../shared/dialogs/dialogs-loading.service';
import { TeamsReportsDialogComponent } from './teams-reports-dialog.component';
import { DialogsPromptComponent } from '../shared/dialogs/dialogs-prompt.component';
import { map, switchMap, tap } from 'rxjs/operators';
import { of } from 'rxjs';
import { convertUtcDate } from './teams.utils';
import { CsvService } from '../shared/csv.service';
import { StateService } from '../shared/state.service';
import { PlanetMessageService } from '../shared/planet-message.service';
import { fullLabel } from '../manager-dashboard/reports/reports.utils';
import { AttachmentInputState } from '../shared/forms/file-upload.component';
import { TeamsAttachmentsService } from './teams-attachments.service';
import { NgIf, NgFor, NgClass, DatePipe, CurrencyPipe } from '@angular/common';
import { MatButton, MatIconButton } from '@angular/material/button';
import { PlanetLoadingSpinnerComponent } from '../shared/planet-loading-spinner.component';
import { MatCard, MatCardContent, MatCardActions } from '@angular/material/card';
import { MatIcon } from '@angular/material/icon';

interface NewReportForm {
  _id?: string,
  _rev?: string,
  beginningBalance: string,
  description: string,
  endDate: Date,
  otherExpenses: number,
  otherIncome: number,
  receiptImages?: AttachmentInputState,
  sales: number,
  startDate: Date,
  wages: string
}

@Component({
  selector: 'planet-teams-reports',
  styleUrls: ['./teams-reports.scss'],
  templateUrl: './teams-reports.component.html',
  imports: [
    NgIf, NgFor, NgClass, MatButton, MatIconButton, MatIcon, PlanetLoadingSpinnerComponent,
    MatCard, MatCardContent, MatCardActions, DatePipe, CurrencyPipe
  ]
})
export class TeamsReportsComponent implements OnChanges {

  @Input() reports: any[];
  @Input() editable = false;
  @Input() isLoading = false;
  @Input() team;
  @Output() reportsChanged = new EventEmitter<void>();
  configuration = this.stateService.configuration;
  curCode = this.stateService.configuration.currency || {};
  reportCards: any[] = [];

  ngOnChanges() {
    this.reportCards = (this.reports || [])
      .filter(report => report.status !== 'archived')
      .map(report => {
        const income = (+report.sales || 0) + (+report.otherIncome || 0);
        const expenses = (+report.wages || 0) + (+report.otherExpenses || 0);
        const net = income - expenses;
        return {
          report,
          receiptImageCount: this.teamsAttachmentsService.receiptAttachments(report).length,
          income,
          expenses,
          net,
          endingBalance: net + (+report.beginningBalance || 0),
          isLoss: net < 0
        };
      });
  }

  trackByReport(index: number, card: any) {
    return card.report._id || index;
  }

  openReportCard(event: MouseEvent | KeyboardEvent, report: any) {
    const target = event.target as HTMLElement;
    if (target.closest('button, a, input, select, textarea, [tabindex]:not(.report-card)')) {
      return;
    }
    if (event instanceof KeyboardEvent && event.key === ' ') {
      event.preventDefault();
    }
    this.openReportDialog(report);
  }

  constructor(
    private couchService: CouchService,
    private dialog: MatDialog,
    private dialogsFormService: DialogsFormService,
    private dialogsLoadingService: DialogsLoadingService,
    private teamsService: TeamsService,
    private teamsAttachmentsService: TeamsAttachmentsService,
    private csvService: CsvService,
    private stateService: StateService,
    private planetMessageService: PlanetMessageService,
  ) {}

  openAddReportDialog(oldReport = {}, isEdit: boolean) {
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
          { name: 'otherExpenses', placeholder: $localize`Non-Personnel`, type: 'textbox', inputType: 'number', required: true, min: 0 },
          {
            name: 'receiptImages',
            placeholder: $localize`Attached Images`,
            type: 'file-upload',
            fileUpload: {
              accept: this.teamsAttachmentsService.receiptImageAccept,
              existingAttachments: this.teamsAttachmentsService.receiptAttachments(oldReport),
              hint: this.teamsAttachmentsService.receiptImageHint,
              imagePreview: true,
              maxFiles: this.teamsAttachmentsService.maxReceiptImages,
              multiple: true,
              typePills: this.teamsAttachmentsService.receiptImagePills
            }
          }
        ],
        this.addFormInitialValues(oldReport, { startDate: lastMonthStart, endDate: lastMonthEnd }),
        {
          disableIfInvalid: true,
          onSubmit: (newReport) => this.updateReport(oldReport, newReport).subscribe({
            next: (result: any) => {
              this.dialogsFormService.closeDialogsForm();
              const action = isEdit ? $localize`:@@report-edited:edited` : $localize`:@@report-added:added`;
              this.planetMessageService.showMessage($localize`Report ${action}`);
              if (result?.failedAttachments?.length) {
                this.planetMessageService.showAlert($localize`Report saved, but some attached images could not be uploaded.`);
              }
            },
            error: () => {
              this.dialogsLoadingService.stop();
              this.dialogsFormService.showErrorMessage($localize`There was a problem saving the report.`);
            }
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
    // Only these fields are shown in the dialog, so only these get validators.
    const formFields = [
      'startDate', 'endDate', 'description', 'beginningBalance', 'sales', 'otherIncome', 'wages', 'otherExpenses'
    ];
    const initialValues = {
      description: '',
      beginningBalance: 0,
      sales: 0,
      otherIncome: 0,
      wages: 0,
      otherExpenses: 0,
      ...oldReport,
      receiptImages: this.teamsAttachmentsService.attachmentStateForDoc(oldReport),
      startDate: new Date(convertUtcDate(oldReport.startDate) || startDate),
      endDate: new Date(convertUtcDate(oldReport.endDate) || endDate)
    };
    const formControl = (initialValue, fieldName: string) => formFields.indexOf(fieldName) > -1 ?
      [ initialValue, [ CustomValidators.required, this.addFormValidator(fieldName) ] ] :
      [ initialValue ];
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
    const { receiptImages = this.teamsAttachmentsService.emptyAttachmentState(), ...reportFields } = newReport as NewReportForm;
    const { _id, _rev, _attachments, ...newDoc } = Object.entries(reportFields).reduce(
      (obj, [ key, value ]: [ string, string | Date | number ]) => {
        return {
          ...obj,
          [key]: transformFields(key, value)
        };
      },
      {}
    ) as any;
    const docs = [ { ...oldReport, status: 'archived' }, newDoc ].filter(doc => doc.startDate !== undefined);
    const newDocIndex = docs.length - 1;
    return this.teamsService.updateAdditionalDocs(docs, this.team, 'report', { utcKeys: dateFields }).pipe(
      switchMap((response: any) => {
        const savedReport = response.res?.[newDocIndex];
        return savedReport ?
          this.teamsAttachmentsService.uploadReceiptImages(savedReport.id, savedReport.rev, receiptImages)
            .pipe(map(uploadResult => ({ uploadResult }))) :
          of({ uploadResult: { failedAttachments: [] } });
      }),
      tap(() => {
        this.reportsChanged.emit();
        this.dialogsLoadingService.stop();
      }),
      map(({ uploadResult }) => ({ failedAttachments: uploadResult.failedAttachments }))
    );
  }

  openReportDialog(report) {
    this.dialog.open(TeamsReportsDialogComponent, {
      data: { report, team: this.team },
      width: '70ch'
    });
  }

  exportReports() {
    const exportData = this.reportCards.map(({ report }) => ({
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
