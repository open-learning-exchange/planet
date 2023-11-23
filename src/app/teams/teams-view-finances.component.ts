import { Component, Input, OnChanges, EventEmitter, Output, OnInit } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MatTableDataSource } from '@angular/material/table';
import { Validators } from '@angular/forms';
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

@Component({
  selector: 'planet-teams-view-finances',
  styleUrls: [ './teams-view-finances.scss' ],
  templateUrl: './teams-view-finances.component.html',
})
export class TeamsViewFinancesComponent implements OnInit, OnChanges {

  @Input() finances: any[] = [];
  @Input() team: any = {};
  @Input() getMembers;
  @Input() editable = true;
  @Output() financesChanged = new EventEmitter<void>();
  table = new MatTableDataSource<any>();
  displayedColumns = [ 'date', 'description', 'credit', 'debit', 'balance' ];
  deleteDialog: any;
  dateNow: any;
  startDate: Date;
  endDate: Date;
  emptyTable = true;
  showBalanceWarning = false;
  curCode = this.stateService.configuration.currency;

  constructor(
    private teamsService: TeamsService,
    private couchService: CouchService,
    private planetMessageService: PlanetMessageService,
    private dialogsFormService: DialogsFormService,
    private dialogsLoadingService: DialogsLoadingService,
    private dialog: MatDialog,
    private stateService: StateService
  ) {
    this.couchService.currentTime().subscribe((date) => this.dateNow = date);
  }

  ngOnInit() {
    this.table.filterPredicate = (data: any, filter) => {
      const fromDate = this.startDate || -Infinity;
      const toDate = this.endDate ? this.endDate.getTime() + millisecondsToDay : Infinity;
      return data.date >= fromDate && data.date < toDate || data.date === $localize`Total`;
    };
    this.table.connect().subscribe(transactions => {
      if (transactions.length > 0 && transactions[0].filter !== this.filterString()) {
        transactions[0] = this.setTransactionsTable(transactions)[0];
      }
      this.showBalanceWarning = (this.finances && this.finances.length) === (this.table.filteredData.length - 1) &&
        transactions[0].balance < 0;
    });
  }

  ngOnChanges() {
    if (this.editable !== this.displayedColumns.indexOf('action') > -1) {
      this.displayedColumns = [ ...this.displayedColumns, this.editable ? 'action' : [] ].flat();
    }
    if (this.finances) {
      this.table.data = this.setTransactionsTable(this.finances);
    }
  }

  private setTransactionsTable(transactions: any[]): any[] {
    const financeData = transactions.filter(transaction => transaction.status !== 'archived' && transaction.date !== 'Total')
      // Overwrite values for credit and debit from early document versions on database
      .map(transaction => ({ ...transaction, credit: 0, debit: 0, [transaction.type]: transaction.amount }))
      .sort((a, b) => a.date - b.date).reduce(this.combineTransactionData, []).reverse();
    if (financeData.length === 0) {
      this.emptyTable = true;
      return [ { date: $localize`Total` } ];
    }
    this.emptyTable = false;
    const { totalCredits: credit, totalDebits: debit, balance } = financeData[0];
    return [ { date: 'Total', credit, debit, balance, filter: this.filterString() }, ...financeData ];
  }

  private filterString() {
    return (this.startDate || '').toString() + (this.endDate || '').toString();
  }

  transactionFilter() {
    this.table.filter = ' ';
  }

  private combineTransactionData(newArray: any[], transaction: any, index: number) {
    const undefinedToNumber = (value: number | undefined) => value || 0;
    const previousValue = index !== 0 ? newArray[index - 1] : { balance: 0, totalCredits: 0, totalDebits: 0 };
    return [
      ...newArray,
      {
        ...transaction,
        balance: previousValue.balance + undefinedToNumber(transaction.credit) - undefinedToNumber(transaction.debit),
        totalCredits: previousValue.totalCredits + undefinedToNumber(transaction.credit),
        totalDebits: previousValue.totalDebits + undefinedToNumber(transaction.debit),
      }
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
          { name: 'amount', placeholder: $localize`Amount`, type: 'textbox', inputType: 'number', required: true },
          { name: 'date', placeholder: $localize`Date`, type: 'date', required: true }
        ],
        {
          type: [ transaction.type || 'credit', CustomValidators.required ],
          description: [ transaction.description || '', CustomValidators.required ],
          amount: [ transaction.amount || '', [ CustomValidators.integerValidator, CustomValidators.positiveNumberValidator ] ],
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
        this.planetMessageService.showMessage('You have deleted a transaction.');
      },
      onError: () => this.planetMessageService.showAlert('There was a problem deleting this transaction.')
    };
  }

  resetDateFilter() {
    this.startDate = undefined;
    this.endDate = undefined;
    this.table.filter = '';
    this.emptyTable = this.table.data.length <= 1;
  }

}
