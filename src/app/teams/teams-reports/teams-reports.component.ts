import { Component, Inject, Input, LOCALE_ID, Output, EventEmitter, OnChanges, OnDestroy } from '@angular/core';
import { Validators } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { finalize, map, switchMap, takeUntil, tap } from 'rxjs/operators';
import { forkJoin, of, Subject } from 'rxjs';
import { formatDate, NgClass, DatePipe, CurrencyPipe } from '@angular/common';
import { MatButton, MatIconButton } from '@angular/material/button';
import { MatTooltip } from '@angular/material/tooltip';
import { MatCard, MatCardContent, MatCardActions } from '@angular/material/card';
import { MatIcon } from '@angular/material/icon';
import { MatMenu, MatMenuItem, MatMenuTrigger } from '@angular/material/menu';
import { MatFormField, MatLabel, MatSuffix } from '@angular/material/form-field';
import { MatInput } from '@angular/material/input';
import { FormsModule } from '@angular/forms';

import { DialogsFormService } from '@shared/dialogs/dialogs-form.service';
import { CouchService } from '@shared/database/couchdb.service';
import { DialogsLoadingService } from '@shared/dialogs/dialogs-loading.service';
import { DialogGuardService } from '@shared/dialogs/dialog-guard.service';
import { DialogsPromptComponent } from '@shared/dialogs/dialogs-prompt.component';
import { CsvService } from '@shared/export/csv.service';
import { StateService } from '@shared/state.service';
import { PlanetMessageService } from '@shared/ui/planet-message.service';
import { AttachmentInputState } from '@shared/forms/file-upload.component';
import { PlanetLoadingSpinnerComponent } from '@shared/ui/planet-loading-spinner.component';
import { filterSpecificFieldsHybrid } from '@shared/tables/table.helpers';

import { CustomValidators } from '../../validators/custom-validators';
import { TeamsService } from '../teams.service';
import { TeamsReportsDialogComponent } from './teams-reports-dialog.component';
import { convertUtcDate } from '../teams.utils';
import { fullLabel } from '../../manager-dashboard/reports/reports.utils';
import { TeamsAttachmentsService } from '../teams-attachments.service';
import { PdfImageSection, TeamsTablePdfExportService } from '../teams-table-pdf-export.service';

interface NewReportForm {
  _id?: string;
  _rev?: string;
  beginningBalance: string;
  description: string;
  endDate: Date;
  label?: string;
  otherExpenses: number;
  otherIncome: number;
  receiptImages?: AttachmentInputState;
  sales: number;
  startDate: Date;
  wages: string;
}

@Component({
  selector: 'planet-teams-reports',
  styleUrls: ['./teams-reports.scss'],
  templateUrl: './teams-reports.component.html',
  imports: [
    NgClass,
    MatButton,
    MatIconButton,
    MatIcon,
    MatTooltip,
    PlanetLoadingSpinnerComponent,
    MatCard,
    MatCardContent,
    MatCardActions,
    MatMenu,
    MatMenuItem,
    MatMenuTrigger,
    MatFormField,
    MatLabel,
    MatSuffix,
    MatInput,
    FormsModule,
    DatePipe,
    CurrencyPipe
  ]
})
export class TeamsReportsComponent implements OnChanges, OnDestroy {

  @Input() reports: any[];
  @Input() editable = false;
  @Input() isLoading = false;
  @Input() team;
  @Output() reportsChanged = new EventEmitter<void>();
  configuration = this.stateService.configuration;
  curCode = this.stateService.configuration.currency || {};
  reportCards: any[] = [];
  filteredCards: any[] = [];
  filter = '';
  private onDestroy$ = new Subject<void>();

  ngOnChanges() {
    this.reportCards = (this.reports || [])
      .filter(report => report.status !== 'archived')
      .sort((a, b) => b.startDate - a.startDate || b.createdDate - a.createdDate)
      .map(report => {
        const income = (+report.sales || 0) + (+report.otherIncome || 0);
        const expenses = (+report.wages || 0) + (+report.otherExpenses || 0);
        const net = income - expenses;
        return {
          report,
          searchText: this.searchableText(report),
          receiptImageCount: this.teamsAttachmentsService.receiptAttachments(report).length,
          income,
          expenses,
          net,
          endingBalance: net + (+report.beginningBalance || 0),
          isLoss: net < 0
        };
      });
    this.applyFilter(this.filter);
  }

  applyFilter(filter: string) {
    this.filter = filter;
    const matchesFilter = filterSpecificFieldsHybrid([ 'searchText' ]);
    this.filteredCards = this.reportCards.filter(card => matchesFilter(card, filter));
  }

  private searchableText(report) {
    const dates = [ report.startDate, report.endDate ].filter(date => date);
    const dateText = [ 'mediumDate', 'MMMM yyyy', 'yyyy-MM' ]
      .map(format => dates.map(date => formatDate(date, format, this.localeId, 'UTC')).join(' '));
    return [ report.label, ...dateText ].filter(text => !!text).join(' ');
  }

  private reportLabels() {
    const labels = new Map<string, string>();
    this.reportCards.forEach(({ report }) => {
      const label = (report.label || '').trim();
      if (label && !labels.has(label.toLowerCase())) {
        labels.set(label.toLowerCase(), label);
      }
    });
    return Array.from(labels.values()).sort((a, b) => a.localeCompare(b));
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
    private teamsTablePdfExportService: TeamsTablePdfExportService,
    private stateService: StateService,
    private planetMessageService: PlanetMessageService,
    @Inject(LOCALE_ID) private localeId: string,
    private dialogGuard: DialogGuardService
  ) {}

  ngOnDestroy() {
    this.onDestroy$.next();
    this.onDestroy$.complete();
  }

  openAddReportDialog(oldReport = {}, isEdit: boolean) {
    const dialogTitle = isEdit ? $localize`:@@edit-report-dialog-title:Edit Report` : $localize`:@@add-report-dialog-title:Add Report`;

    this.dialogGuard.open('team-report', () => this.couchService.currentTime().pipe(map((time: number) => {
      const currentDate = new Date(time);
      const lastMonthStart = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1);
      const lastMonthEnd = currentDate.setDate(0);
      return this.dialogsFormService.openDialogsForm(
        dialogTitle,
        [
          {
            name: 'label',
            placeholder: $localize`Label (optional)`,
            type: 'textbox',
            maxLength: 50,
            suggestions: this.reportLabels()
          },
          { name: 'startDate', placeholder: $localize`Start Date`, type: 'date', required: true },
          { name: 'endDate', placeholder: $localize`End Date`, type: 'date', required: true },
          { name: 'description', placeholder: $localize`Summary`, type: 'markdown', required: true },
          { name: 'beginningBalance', placeholder: $localize`Beginning Balance`, type: 'textbox', inputType: 'number', required: true },
          { name: 'sales', placeholder: $localize`Sales (Income)`, type: 'textbox', inputType: 'number', required: true, min: 0 },
          { name: 'otherIncome', placeholder: $localize`Other (Income)`, type: 'textbox', inputType: 'number', required: true, min: 0 },
          { name: 'wages', placeholder: $localize`Personnel (Expenses)`, type: 'textbox', inputType: 'number', required: true, min: 0 },
          {
            name: 'otherExpenses',
            placeholder: $localize`Non-Personnel (Expenses)`,
            type: 'textbox',
            inputType: 'number',
            required: true,
            min: 0
          },
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
    }))).pipe(takeUntil(this.onDestroy$)).subscribe();
  }

  openDeleteReportDialog(report) {
    const dateRange = `${$localize`Report from`} ${formatDate(report.startDate, 'mediumDate', this.localeId, 'UTC')}
      ${$localize`to`} ${formatDate(report.endDate, 'mediumDate', this.localeId, 'UTC')}`;
    const deleteDialog = this.dialog.open(DialogsPromptComponent, {
      data: {
        changeType: 'delete',
        type: 'report',
        displayName: report.label ? `${report.label} (${dateRange})` : dateRange,
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
      label: '',
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
        key === 'label' ?
          ((value as string) || '').trim() :
          value;
    const { receiptImages = this.teamsAttachmentsService.emptyAttachmentState(), ...reportFields } = newReport as NewReportForm;
    const { _id, _rev, _attachments, ...newDoc } = Object.entries(reportFields).reduce(
      (obj, [ key, value ]: [ string, string | Date | number ]) => ({
        ...obj,
        [key]: transformFields(key, value)
      }),
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
    const { data, title } = this.reportsExportData();
    this.csvService.exportCSV({ data, title, markdown: false });
  }

  exportReportsPdf() {
    const { data, title } = this.reportsExportData();
    const totalIncome = this.filteredCards.reduce((sum, card) => sum + card.income, 0);
    const totalExpenses = this.filteredCards.reduce((sum, card) => sum + card.expenses, 0);
    this.dialogsLoadingService.start();
    this.receiptImageSections()
      .pipe(finalize(() => this.dialogsLoadingService.stop()))
      .subscribe(imageSections => this.teamsTablePdfExportService.exportTable({
        data,
        title,
        currencyCode: this.curCode?.code,
        currencySymbol: this.curCode?.symbol,
        moneyColumns: [
          $localize`Beginning Balance`,
          $localize`Sales`,
          $localize`Other Income`,
          $localize`Wages`,
          $localize`Other Expenses`,
          $localize`Profit/Loss`,
          $localize`Ending Balance`
        ],
        summary: [
          { label: $localize`Reports`, value: this.filteredCards.length },
          { label: $localize`Total Credit`, value: totalIncome, format: 'currency' },
          { label: $localize`Total Debit`, value: totalExpenses, format: 'currency' },
          { label: $localize`Net Profit/Loss`, value: totalIncome - totalExpenses, format: 'currency' }
        ],
        imageSections,
        filename: `${title}.pdf`
      }));
  }

  private reportsExportData() {
    const hasLabels = this.filteredCards.some(({ report }) => !!report.label);
    const data = this.filteredCards.map(({ report, income, expenses, net, endingBalance }) => ({
      ...(hasLabels ? { [$localize`Label`]: report.label || '' } : {}),
      [$localize`Start Date`]: fullLabel(report.startDate, this.localeId),
      [$localize`End Date`]: fullLabel(report.endDate, this.localeId),
      [$localize`Created Date`]: fullLabel(report.createdDate, this.localeId),
      [$localize`Updated Date`]: fullLabel(report.updatedDate, this.localeId),
      [$localize`Beginning Balance`]: report.beginningBalance,
      [$localize`Sales`]: report.sales,
      [$localize`Other Income`]: report.otherIncome,
      [$localize`Wages`]: report.wages,
      [$localize`Other Expenses`]: report.otherExpenses,
      [$localize`Profit/Loss`]: net,
      [$localize`Ending Balance`]: endingBalance
    }));
    const planetName = this.stateService.configuration.name || $localize`Unnamed`;
    const entityLabel = this.configuration.planetType === 'nation' ? $localize`Nation` : $localize`Community`;
    const titleName = this.team.name || `${entityLabel} ${planetName}`;
    const filter = this.filter.trim();
    return {
      data,
      title: filter ?
        $localize`Financial Summary for ${titleName} filtered by ${filter}` :
        $localize`Financial Summary for ${titleName}`
    };
  }

  private receiptImageSections() {
    const reportsWithReceipts = this.filteredCards
      .map(({ report }) => report)
      .filter(report => this.teamsAttachmentsService.receiptAttachments(report).length > 0);
    if (reportsWithReceipts.length === 0) {
      return of([]);
    }
    return forkJoin(reportsWithReceipts.map(report => this.teamsAttachmentsService.receiptAttachmentImages(report).pipe(
      map(images => ({
        title: $localize`Receipt images for ${fullLabel(report.startDate, this.localeId)} - ${fullLabel(report.endDate, this.localeId)}`,
        images
      }))
    ))).pipe(map((sections: PdfImageSection[]) => sections.filter(section => section.images.length > 0)));
  }

}
