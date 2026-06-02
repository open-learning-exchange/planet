import { Component, Input, Output, EventEmitter, OnChanges } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { catchError, map, switchMap, tap } from 'rxjs/operators';
import { forkJoin, of, throwError } from 'rxjs';
import { CouchService } from '../shared/couchdb.service';
import { TeamsService } from './teams.service';
import { DialogsLoadingService } from '../shared/dialogs/dialogs-loading.service';
import { TeamsReportsDialogComponent } from './teams-reports-dialog.component';
import { DialogsPromptComponent } from '../shared/dialogs/dialogs-prompt.component';
import { CsvService } from '../shared/csv.service';
import { StateService } from '../shared/state.service';
import { PlanetMessageService } from '../shared/planet-message.service';
import { fullLabel } from '../manager-dashboard/reports/reports.utils';
import { convertUtcDate } from './teams.utils';
import { NgIf, NgFor, NgClass, DatePipe, CurrencyPipe } from '@angular/common';
import { MatButton, MatIconButton } from '@angular/material/button';
import { PlanetLoadingSpinnerComponent } from '../shared/planet-loading-spinner.component';
import { MatCard, MatCardContent, MatCardActions } from '@angular/material/card';
import { MatIcon } from '@angular/material/icon';
import { TeamsReportEditorDialogComponent } from './teams-report-editor-dialog.component';

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

  readonly maxReportImages = 2;
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
          receiptImageCount: Object.values(report._attachments || {})
            .filter((attachment: any) => attachment?.content_type?.startsWith('image/')).length,
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
    private dialogsLoadingService: DialogsLoadingService,
    private teamsService: TeamsService,
    private csvService: CsvService,
    private stateService: StateService,
    private planetMessageService: PlanetMessageService,
  ) {}

  openAddReportDialog(oldReport: any = {}, isEdit = false) {
    const dialogTitle = isEdit ? $localize`:@@edit-report-dialog-title:Edit Report` : $localize`:@@add-report-dialog-title:Add Report`;
    this.couchService.currentTime().subscribe((time: number) => {
      const currentDate = new Date(time);
      const lastMonthStart = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1);
      const lastMonthEnd = new Date(currentDate.getFullYear(), currentDate.getMonth(), 0);
      this.dialog.open(TeamsReportEditorDialogComponent, {
        data: {
          defaultDates: { startDate: lastMonthStart, endDate: lastMonthEnd },
          maxImages: this.maxReportImages,
          report: this.reportFormInitialValues(oldReport, { startDate: lastMonthStart, endDate: lastMonthEnd }),
          saveReport: (result: any) => this.saveReport(oldReport, result, isEdit),
          title: dialogTitle
        },
        maxWidth: '90vw',
        width: '72ch'
      });
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
          request: this.archiveReport(report),
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

  openReportDialog(report) {
    this.dialog.open(TeamsReportsDialogComponent, {
      data: { report, team: this.team },
      maxWidth: '90vw',
      width: '80ch'
    });
  }

  exportReports() {
    const exportData = this.reportCards.map(({ report, net, endingBalance }) => ({
      [$localize`Start Date`]: fullLabel(report.startDate),
      [$localize`End Date`]: fullLabel(report.endDate),
      [$localize`Created Date`]: fullLabel(report.createdDate),
      [$localize`Updated Date`]: fullLabel(report.updatedDate),
      [$localize`Beginning Balance`]: this.num(report.beginningBalance),
      [$localize`Sales`]: this.num(report.sales),
      [$localize`Other Income`]: this.num(report.otherIncome),
      [$localize`Wages`]: this.num(report.wages),
      [$localize`Other Expenses`]: this.num(report.otherExpenses),
      [$localize`Profit/Loss`]: net,
      [$localize`Ending Balance`]: endingBalance
    }));
    const planetName = this.stateService.configuration.name || 'Unnamed';
    const entityLabel = this.configuration.planetType === 'nation' ? 'Nation' : 'Community';
    const titleName = this.team.name || `${entityLabel} ${planetName}`;
    this.csvService.exportCSV({
      data: exportData,
      title: $localize`Financial Summary for ${titleName}`
    });
  }

  private reportFormInitialValues(oldReport, { startDate, endDate }) {
    return {
      description: oldReport.description || '',
      beginningBalance: this.num(oldReport.beginningBalance),
      sales: this.num(oldReport.sales),
      otherIncome: this.num(oldReport.otherIncome),
      wages: this.num(oldReport.wages),
      otherExpenses: this.num(oldReport.otherExpenses),
      ...oldReport,
      startDate: new Date(convertUtcDate(oldReport.startDate) || startDate),
      endDate: new Date(convertUtcDate(oldReport.endDate) || endDate)
    };
  }

  private archiveReport(report) {
    return this.teamsService.updateAdditionalDocs([ { ...report, status: 'archived' } ], this.team, 'report').pipe(tap(() => {
      this.reportsChanged.emit();
      this.dialogsLoadingService.stop();
    }));
  }

  private saveReport(oldReport, { report, receiptImages }: any, isEdit: boolean) {
    const dateFields = [ 'startDate', 'endDate' ];
    const newDoc = this.transformReport(report);
    const docs = [ { ...oldReport, status: 'archived' }, newDoc ].filter(doc => doc.startDate !== undefined);
    const newDocIndex = docs.length - 1;

    return this.teamsService.updateAdditionalDocs(docs, this.team, 'report', { utcKeys: dateFields }).pipe(
      switchMap((response: any) => {
        const newDocResponse = response.res[newDocIndex];
        return this.prepareReceiptUploads(receiptImages).pipe(
          switchMap((uploads) => uploads.length === 0 ?
            of(undefined) :
            this.uploadReceiptImages(newDocResponse.id, newDocResponse.rev, uploads)
              .pipe(catchError(() => {
                this.planetMessageService.showAlert($localize`Report saved, but there was a problem uploading receipt images.`);
                return of(undefined);
              }))
          )
        );
      }),
      tap(() => {
        this.reportsChanged.emit();
        const action = isEdit ? $localize`:@@report-edited:edited` : $localize`:@@report-added:added`;
        this.planetMessageService.showMessage($localize`Report ${action}`);
      }),
      catchError((error) => {
        this.planetMessageService.showAlert(isEdit ?
          $localize`There was a problem updating the report.` :
          $localize`There was a problem adding the report.`
        );
        return throwError(error);
      })
    );
  }

  private transformReport(report: any) {
    return {
      ...report,
      startDate: report.startDate.getTime(),
      endDate: report.endDate.getTime(),
      beginningBalance: +report.beginningBalance,
      sales: +report.sales,
      otherIncome: +report.otherIncome,
      wages: +report.wages,
      otherExpenses: +report.otherExpenses
    };
  }

  private prepareReceiptUploads(receiptImages: any[]) {
    return receiptImages.length === 0 ?
      of([]) :
      forkJoin(receiptImages.map((image, index) =>
        this.resolveReceiptFile(image, this.attachmentKey(image, index, receiptImages))
      ));
  }

  private resolveReceiptFile(image: any, key: string) {
    if (image.file) {
      return of({ contentType: image.contentType || image.file.type, file: image.file, key });
    }

    return this.couchService.getAttachment(image.previewUrl).pipe(map((blob: Blob) => ({
      contentType: image.contentType || blob.type,
      file: new File([ blob ], key, { type: image.contentType || blob.type }),
      key
    })));
  }

  private uploadReceiptImages(reportId: string, startingRev: string, uploads: any[]) {
    return uploads.reduce((request$, upload) => request$.pipe(
      switchMap((rev) => this.couchService.putAttachment(
        `teams/${reportId}/${upload.key}?rev=${rev}`,
        upload.file,
        { headers: { 'Content-Type': upload.contentType || upload.file.type } }
      ).pipe(map((response: any) => response.rev)))
    ), of(startingRev));
  }

  private attachmentKey(image: any, index: number, images: any[]) {
    const key = this.sanitizeAttachmentName(image.name, image.contentType);
    const duplicateIndex = images
      .slice(0, index)
      .filter((existingImage) => this.sanitizeAttachmentName(existingImage.name, existingImage.contentType) === key)
      .length;
    return duplicateIndex === 0 ? key : key.replace(/(\.[^.]+)?$/, `-${duplicateIndex + 1}$1`);
  }

  private sanitizeAttachmentName(name: string, contentType: string) {
    const extension = (name.split('.').pop() || '').toLowerCase();
    const typeMap = {
      'image/jpeg': 'jpeg',
      'image/png': 'png',
      'image/webp': 'webp'
    };
    const safeExtension = [ 'jpg', 'jpeg', 'png', 'webp' ].indexOf(extension) > -1 ? extension : typeMap[contentType] || 'jpeg';
    const baseName = name
      .replace(/\.[^.]*$/, '')
      .trim()
      .replace(/[\\/?#%:*|"<>]/g, '-')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '') || 'image';
    return `${baseName}.${safeExtension}`;
  }

  private num(value: any): number {
    const n = Number(value);
    return Number.isFinite(n) ? n : 0;
  }

}
