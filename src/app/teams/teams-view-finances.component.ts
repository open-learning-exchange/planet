import { Component, Input, OnChanges, EventEmitter, Output, OnInit } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import {
  MatTableDataSource, MatTable, MatColumnDef, MatHeaderCellDef, MatHeaderCell, MatCellDef,
  MatCell, MatHeaderRowDef, MatHeaderRow, MatRowDef, MatRow
} from '@angular/material/table';
import { map } from 'rxjs/operators';
import { TeamsService } from './teams.service';
import { CouchService } from '../shared/couchdb.service';
import { CustomValidators } from '../validators/custom-validators';
import { PlanetMessageService } from '../shared/planet-message.service';
import { DialogsFormService } from '../shared/dialogs/dialogs-form.service';
import { DialogsLoadingService } from '../shared/dialogs/dialogs-loading.service';
import { DialogsPromptComponent } from '../shared/dialogs/dialogs-prompt.component';
import { millisecondsToDay } from '../meetups/constants';
import { StateService } from '../shared/state.service';
import { CsvService } from '../shared/csv.service';
import { fullLabel } from '../manager-dashboard/reports/reports.utils';
import { NgIf, NgFor, NgClass, CurrencyPipe, DatePipe } from '@angular/common';
import { MatButton, MatIconButton } from '@angular/material/button';
import { MatFormField, MatLabel, MatSuffix, MatError } from '@angular/material/form-field';
import { MatInput } from '@angular/material/input';
import { MatDatepickerInput, MatDatepickerToggle, MatDatepicker } from '@angular/material/datepicker';
import { FormsModule } from '@angular/forms';
import { MatCard, MatCardContent } from '@angular/material/card';
import { MatIcon } from '@angular/material/icon';
import { PlanetLoadingSpinnerComponent } from '../shared/planet-loading-spinner.component';

@Component({
  selector: 'planet-teams-view-finances',
  styleUrls: ['./teams-view-finances.scss'],
  templateUrl: './teams-view-finances.component.html',
  imports: [
    NgIf, NgFor, MatButton, MatFormField, MatLabel, MatInput, MatDatepickerInput, FormsModule, MatDatepickerToggle,
    MatSuffix, MatDatepicker, MatError, MatCard, MatCardContent, MatIcon, MatTable, MatColumnDef, MatHeaderCellDef,
    MatHeaderCell, MatCellDef, MatCell, NgClass, MatIconButton, MatHeaderRowDef, MatHeaderRow, MatRowDef, MatRow,
    PlanetLoadingSpinnerComponent, CurrencyPipe, DatePipe
  ]
})
export class TeamsViewFinancesComponent implements OnInit, OnChanges {

  @Input() finances: any[] = [];
  @Input() team: any = {};
  @Input() getMembers;
  @Input() editable = true;
  @Input() isLoading = false;
  @Output() financesChanged = new EventEmitter<void>();
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
        label: $localize`Current Balance`, icon: 'account_balance_wallet',
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
    private stateService: StateService,
    private teamsService: TeamsService
  ) {}

  ngOnInit() {
    this.table.filterPredicate = (data: any, filter) => {
      const fromDate = this.startDate || -Infinity;
      const toDate = this.endDate ? this.endDate.getTime() + millisecondsToDay : Infinity;
      return data.date >= fromDate && data.date < toDate;
    };
    this.table.connect().subscribe(() => this.updateTotals());
  }

  ngOnChanges() {
    if (this.editable !== this.displayedColumns.indexOf('action') > -1) {
      this.displayedColumns = [ ...this.displayedColumns, this.editable ? 'action' : [] ].flat();
    }
    if (!this.isLoading && this.finances) {
      this.table.data = this.setTransactionsTable(this.finances);
    }
  }

  private setTransactionsTable(transactions: any[]): any[] {
    return transactions.filter(transaction => transaction.status !== 'archived')
      // Overwrite values for credit and debit from early document versions on database
      .map(transaction => ({ ...transaction, credit: 0, debit: 0, [transaction.type]: transaction.amount }))
      .sort((a, b) => a.date - b.date).reduce(this.combineTransactionData, []).reverse();
  }

  transactionFilter() {
    this.table.filter = ' ';
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
          { name: 'date', placeholder: $localize`Date`, type: 'date', required: true }
        ],
        {
          type: [ transaction.type || 'credit', CustomValidators.required ],
          description: [ transaction.description || '', CustomValidators.required ],
          amount: [ transaction.amount || '', [ CustomValidators.nonNegativeNumberValidator ] ],
          date: [ transaction.date ? new Date(new Date(transaction.date).setHours(0, 0, 0)) : new Date(time), CustomValidators.required ]
        },
        {
          onSubmit: (newTransaction) => this.submitTransaction(newTransaction, transaction).subscribe(() => {
            this.planetMessageService.showMessage(transaction._id ? $localize`Transaction Updated` : $localize`Transaction Added`);
            this.dialogsFormService.closeDialogsForm();
          })
        }
      );
    });
  }

  submitTransaction(newTransaction, oldTransaction) {
    const { _id: teamId, teamType, teamPlanetCode } = this.team;
    const amount = +(newTransaction.amount);
    const date = new Date(newTransaction.date).getTime();
    const transaction = {
      ...oldTransaction,
      ...newTransaction,
      date,
      amount,
      docType: 'transaction',
      teamId,
      teamType,
      teamPlanetCode
    };
    return this.teamsService.updateTeam(transaction).pipe(map(() => {
      this.financesChanged.emit();
      this.dialogsLoadingService.stop();
    }));
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
    return {
      request: this.submitTransaction(transaction, { status: 'archived' }),
      onNext: () => {
        this.deleteDialog.close();
        this.planetMessageService.showMessage($localize`You have deleted a transaction.`);
      },
      onError: () => this.planetMessageService.showAlert($localize`There was a problem deleting this transaction.`)
    };
  }

  resetDateFilter() {
    this.startDate = undefined;
    this.endDate = undefined;
    this.table.filter = '';
  }

  private updateTotals() {
    const rows = this.table.filteredData || [];
    const credit = rows.reduce((sum, r) => sum + (r.credit || 0), 0);
    const debit = rows.reduce((sum, r) => sum + (r.debit || 0), 0);
    this.totals = { credit, debit, balance: credit - debit };
    this.emptyTable = rows.length === 0;
  }

  exportTableData() {
    const updatedData = this.table.filteredData.map(row => ({
      [$localize`date`]: fullLabel(row.date),
      [$localize`description`]: row.description,
      [$localize`credit`]: row.credit,
      [$localize`debit`]: row.debit,
      [$localize`balance`]: row.balance
    }));
    const planetName = this.stateService.configuration.name || $localize`Unnamed`;
    const entityLabel = this.configuration.planetType === 'nation' ? $localize`Nation` : $localize`Community`;
    const titleName = this.team.name || `${entityLabel} ${planetName}`;
    this.csvService.exportCSV({
      data: updatedData,
      title: $localize`Financial Transactions for ${titleName}`
    });
  }

}
