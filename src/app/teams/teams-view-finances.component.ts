import { Component, Input, OnChanges, EventEmitter, Output } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import {
  MatTableDataSource, MatTable, MatColumnDef, MatHeaderCellDef, MatHeaderCell, MatCellDef,
  MatCell, MatHeaderRowDef, MatHeaderRow, MatRowDef, MatRow
} from '@angular/material/table';
import { finalize, map, switchMap, tap } from 'rxjs/operators';
import { TeamsService } from './teams.service';
import { CouchService } from '../shared/couchdb.service';
import { CustomValidators } from '../validators/custom-validators';
import { PlanetMessageService } from '../shared/planet-message.service';
import { DialogsFormService } from '../shared/dialogs/dialogs-form.service';
import { DialogsLoadingService } from '../shared/dialogs/dialogs-loading.service';
import { DialogsPromptComponent } from '../shared/dialogs/dialogs-prompt.component';
import { StateService } from '../shared/state.service';
import { CsvService } from '../shared/csv.service';
import { endOfDay, fullLabel } from '../manager-dashboard/reports/reports.utils';
import { NgClass, CurrencyPipe, DatePipe } from '@angular/common';
import { MatButton, MatIconButton } from '@angular/material/button';
import { MatFormField, MatLabel, MatSuffix, MatError } from '@angular/material/form-field';
import { MatInput } from '@angular/material/input';
import { MatDatepickerInput, MatDatepickerToggle, MatDatepicker } from '@angular/material/datepicker';
import { FormsModule } from '@angular/forms';
import { MatCard, MatCardContent } from '@angular/material/card';
import { MatIcon } from '@angular/material/icon';
import { PlanetLoadingSpinnerComponent } from '../shared/planet-loading-spinner.component';
import { AttachmentInputState } from '../shared/forms/file-upload.component';
import { TeamsAttachmentsService } from './teams-attachments.service';
import { forkJoin, of } from 'rxjs';
import { MatMenu, MatMenuItem, MatMenuTrigger } from '@angular/material/menu';
import { PdfImageSection, TeamsTablePdfExportService } from './teams-table-pdf-export.service';

interface TransactionForm {
  amount: number | string;
  date: Date | number;
  description: string;
  receiptImages?: AttachmentInputState;
  type: 'credit' | 'debit';
  [key: string]: any;
}

@Component({
  selector: 'planet-teams-view-finances',
  styleUrls: ['./teams-view-finances.scss'],
  templateUrl: './teams-view-finances.component.html',
  imports: [
    MatButton,
    MatFormField,
    MatLabel,
    MatInput,
    MatDatepickerInput,
    FormsModule,
    MatDatepickerToggle,
    MatSuffix,
    MatDatepicker,
    MatError,
    MatCard,
    MatCardContent,
    MatIcon,
    MatTable,
    MatColumnDef,
    MatHeaderCellDef,
    MatHeaderCell,
    MatCellDef,
    MatCell,
    NgClass,
    MatIconButton,
    MatHeaderRowDef,
    MatHeaderRow,
    MatRowDef,
    MatRow,
    MatMenu,
    MatMenuItem,
    MatMenuTrigger,
    PlanetLoadingSpinnerComponent,
    CurrencyPipe,
    DatePipe
  ]
})
export class TeamsViewFinancesComponent implements OnChanges {

  @Input() finances: any[] = [];
  @Input() team: any = {};
  @Input() getMembers;
  @Input() editable = true;
  @Input() isLoading = false;
  @Output() financesChanged = new EventEmitter<void>();
  allTransactions: any[] = [];
  table = new MatTableDataSource<any>();
  displayedColumns = [ 'date', 'description', 'credit', 'debit', 'balance' ];
  deleteDialog: any;
  startDate: Date;
  endDate: Date;
  emptyTable = true;
  curCode = this.stateService.configuration.currency || {};
  configuration: any = {};
  planetName: any;
  totals = { credit: 0, debit: 0, balance: 0 };

  get stats() {
    const { credit, debit, balance } = this.totals;
    const negative = balance < 0;
    return [
      { label: $localize`Total Credits`, icon: 'trending_up', tone: 'credit', value: credit },
      { label: $localize`Total Debits`, icon: 'trending_down', tone: 'debit', value: debit },
      {
        label: $localize`Balance (Net change)`, icon: 'account_balance_wallet',
        tone: negative ? 'warn' : 'net', value: balance, alert: negative
      }
    ];
  }

  constructor(
    private csvService: CsvService,
    private couchService: CouchService,
    private dialog: MatDialog,
    private dialogsFormService: DialogsFormService,
    private dialogsLoadingService: DialogsLoadingService,
    private planetMessageService: PlanetMessageService,
    private teamsTablePdfExportService: TeamsTablePdfExportService,
    private stateService: StateService,
    private teamsService: TeamsService,
    private teamsAttachmentsService: TeamsAttachmentsService
  ) {}

  ngOnChanges() {
    if (this.editable !== this.displayedColumns.indexOf('action') > -1) {
      this.displayedColumns = [ ...this.displayedColumns, this.editable ? 'action' : [] ].flat();
    }
    if (!this.isLoading && this.finances) {
      this.allTransactions = this.setTransactionsTable(this.finances);
      this.applyDateFilter();
    }
  }

  private setTransactionsTable(transactions: any[]): any[] {
    return transactions.filter(transaction => transaction.status !== 'archived')
      // Overwrite values for credit and debit from early document versions on database
      .map(transaction => ({
        ...transaction,
        credit: 0,
        debit: 0,
        receiptImages: this.teamsAttachmentsService.receiptAttachments(transaction),
        [transaction.type]: transaction.amount
      }))
      .sort((a, b) => a.date - b.date).reduce(this.combineTransactionData, []).reverse();
  }

  transactionFilter() {
    this.applyDateFilter();
  }

  private combineTransactionData(newArray: any[], transaction: any, index: number) {
    const previousBalance = index !== 0 ? newArray[index - 1].balance : 0;
    return [
      ...newArray,
      { ...transaction, balance: previousBalance + (transaction.credit || 0) - (transaction.debit || 0) }
    ];
  }


  openEditTransactionDialog(transaction: any = {}) {
    this.couchService.currentTime().subscribe((time: number) => {
      this.dialogsFormService.openDialogsForm(
        transaction._id ? $localize`Edit Transaction` : $localize`Add Transaction`,
        [
          {
            name: 'type', placeholder: $localize`Type`, type: 'selectbox',
            options: [ { value: 'credit', name: $localize`Credit` }, { value: 'debit', name: $localize`Debit` } ], required: true
          },
          { name: 'description', placeholder: $localize`Note`, type: 'textbox', required: true },
          { name: 'amount', placeholder: $localize`Amount`, type: 'textbox', inputType: 'number', required: true, step: '0.01' },
          { name: 'date', placeholder: $localize`Date`, type: 'date', required: true },
          {
            name: 'receiptImages',
            placeholder: $localize`Attached Images`,
            type: 'file-upload',
            fileUpload: {
              accept: this.teamsAttachmentsService.receiptImageAccept,
              existingAttachments: this.teamsAttachmentsService.receiptAttachments(transaction),
              hint: this.teamsAttachmentsService.receiptImageHint,
              imagePreview: true,
              maxFiles: this.teamsAttachmentsService.maxReceiptImages,
              multiple: true,
              typePills: this.teamsAttachmentsService.receiptImagePills
            }
          }
        ],
        {
          type: [ transaction.type || 'credit', CustomValidators.required ],
          description: [ transaction.description || '', CustomValidators.required ],
          amount: [ transaction.amount || '', [ CustomValidators.nonNegativeNumberValidator ] ],
          date: [ transaction.date ? new Date(new Date(transaction.date).setHours(0, 0, 0)) : new Date(time), CustomValidators.required ],
          receiptImages: [ this.teamsAttachmentsService.attachmentStateForDoc(transaction) ]
        },
        {
          onSubmit: (newTransaction: TransactionForm) => this.submitTransaction(newTransaction, transaction).subscribe({
            next: (result: any) => {
              this.planetMessageService.showMessage(transaction._id ? $localize`Transaction Updated` : $localize`Transaction Added`);
              if (result?.failedAttachments?.length) {
                this.planetMessageService.showAlert($localize`Transaction saved, but some attached images could not be uploaded.`);
              }
              this.dialogsFormService.closeDialogsForm();
            },
            error: () => {
              this.dialogsLoadingService.stop();
              this.dialogsFormService.showErrorMessage($localize`There was a problem saving the transaction.`);
            }
          })
        }
      );
    });
  }

  submitTransaction(newTransaction: TransactionForm, oldTransaction: any) {
    const { _id: teamId, teamType, teamPlanetCode } = this.team;
    const { receiptImages, ...transactionFields } = newTransaction;
    const oldTransactionFields = this.transactionDocFields(oldTransaction);
    const newTransactionFields = this.transactionDocFields(transactionFields);
    const amount = +(transactionFields.amount);
    const date = new Date(transactionFields.date).getTime();
    const transaction = {
      ...oldTransactionFields,
      ...newTransactionFields,
      date,
      amount,
      docType: 'transaction',
      teamId,
      teamType,
      teamPlanetCode
    };
    if (receiptImages) {
      transaction._attachments = this.teamsAttachmentsService.retainSelectedAttachments(oldTransaction, receiptImages);
    }
    return this.teamsService.updateTeam(transaction).pipe(
      switchMap(savedTransaction => receiptImages ?
        this.teamsAttachmentsService.uploadReceiptImages(savedTransaction._id, savedTransaction._rev, receiptImages, false) :
        of({ failedAttachments: [] })
      ),
      tap(() => {
        this.financesChanged.emit();
        this.dialogsLoadingService.stop();
      }),
      map(uploadResult => ({ failedAttachments: uploadResult.failedAttachments }))
    );
  }

  openArchiveTransactionDialog(transaction) {
    this.deleteDialog = this.dialog.open(DialogsPromptComponent, {
      data: {
        okClick: this.archiveTransaction(transaction),
        changeType: 'delete',
        type: 'transaction',
        displayName: transaction.description
      }
    });
  }

  archiveTransaction(transaction) {
    const { receiptImages, ...transactionDoc } = transaction;
    return {
      request: this.submitTransaction({ ...transactionDoc, status: 'archived' }, {}),
      onNext: () => {
        this.deleteDialog.close();
        this.planetMessageService.showMessage($localize`You have deleted a transaction.`);
      },
      onError: () => this.planetMessageService.showAlert($localize`There was a problem deleting this transaction.`)
    };
  }

  private transactionDocFields(transaction: any = {}) {
    const { receiptImages, credit, debit, balance, ...docFields } = transaction;
    return docFields;
  }

  resetDateFilter() {
    this.startDate = undefined;
    this.endDate = undefined;
    this.applyDateFilter();
  }

  private updateTotals() {
    const rows = this.table.data || [];
    const credit = rows.reduce((sum, r) => sum + (r.credit || 0), 0);
    const debit = rows.reduce((sum, r) => sum + (r.debit || 0), 0);
    const balance = credit - debit;
    this.totals = { credit, debit, balance };
    this.emptyTable = rows.length === 0;
  }

  private applyDateFilter() {
    const fromDate = this.startDate ? this.startDate.getTime() : -Infinity;
    const toDate = this.endDate ? endOfDay(this.endDate).getTime() : Infinity;
    this.table.data = this.allTransactions.filter(transaction => transaction.date >= fromDate && transaction.date <= toDate);
    this.updateTotals();
  }

  exportTableData() {
    const { data, title } = this.financeExportData();
    this.csvService.exportCSV({ data, title });
  }

  exportTablePdf() {
    const { data, title, titleName } = this.financeExportData();
    this.dialogsLoadingService.start();
    this.receiptImageSections(this.table.data)
      .pipe(finalize(() => this.dialogsLoadingService.stop()))
      .subscribe(imageSections => this.teamsTablePdfExportService.exportTable({
        data,
        title,
        subtitle: this.exportSubtitle(),
        currencyCode: this.curCode?.code,
        flexibleColumns: [ $localize`description` ],
        moneyColumns: [ $localize`credit`, $localize`debit`, $localize`balance` ],
        summary: [
          { label: $localize`Total Credits`, value: this.totals.credit, format: 'currency' },
          { label: $localize`Total Debits`, value: this.totals.debit, format: 'currency' },
          { label: $localize`Balance`, value: this.totals.balance, format: 'currency' }
        ],
        imageSections,
        filename: $localize`Financial Transactions for ${titleName}.pdf`
      }));
  }

  private financeExportData() {
    const data = this.table.data.map(row => ({
      [$localize`date`]: fullLabel(row.date),
      [$localize`description`]: row.description,
      [$localize`credit`]: row.credit,
      [$localize`debit`]: row.debit,
      [$localize`balance`]: row.balance
    }));
    const planetName = this.stateService.configuration.name || $localize`Unnamed`;
    const entityLabel = this.stateService.configuration.planetType === 'nation' ? $localize`Nation` : $localize`Community`;
    const titleName = this.team.name || `${entityLabel} ${planetName}`;
    return {
      data,
      title: $localize`Financial Transactions for ${titleName}`,
      titleName
    };
  }

  private exportSubtitle() {
    if (!this.startDate && !this.endDate) {
      return '';
    }
    const start = this.startDate ? fullLabel(this.startDate.getTime()) : $localize`Beginning`;
    const end = this.endDate ? fullLabel(this.endDate.getTime()) : $localize`Today`;
    return $localize`Date range: ${start} - ${end}`;
  }

  private receiptImageSections(transactions: any[]) {
    const docsWithReceipts = transactions.filter(transaction => this.teamsAttachmentsService.receiptAttachments(transaction).length > 0);
    if (docsWithReceipts.length === 0) {
      return of([]);
    }
    return forkJoin(docsWithReceipts.map(transaction => this.teamsAttachmentsService.receiptAttachmentImages(transaction).pipe(
      map(images => ({
        title: $localize`Receipt images for ${fullLabel(transaction.date)} - ${transaction.description}`,
        images
      }))
    ))).pipe(map((sections: PdfImageSection[]) => sections.filter(section => section.images.length > 0)));
  }

}
