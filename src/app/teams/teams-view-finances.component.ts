import { Component, Input, OnChanges } from '@angular/core';
import { MatTableDataSource } from '@angular/material';
import { TeamsService } from './teams.service';
import { CouchService } from '../shared/couchdb.service';
import { CustomValidators } from '../validators/custom-validators';
import { PlanetMessageService } from '../shared/planet-message.service';
import { DialogsFormService } from '../shared/dialogs/dialogs-form.service';
import { DialogsLoadingService } from '../shared/dialogs/dialogs-loading.service';
import { switchMap } from 'rxjs/operators';

@Component({
  selector: 'planet-teams-view-finances',
  templateUrl: './teams-view-finances.component.html'
})
export class TeamsViewFinancesComponent implements OnChanges {

  @Input() finances: any[] = [];
  @Input() team: any = {};
  @Input() getMembers;
  table = new MatTableDataSource();

  constructor(
    private teamsService: TeamsService,
    private couchService: CouchService,
    private planetMessageService: PlanetMessageService,
    private dialogsFormService: DialogsFormService,
    private dialogsLoadingService: DialogsLoadingService
  ) {}

  ngOnChanges() {
    this.table.data = this.finances.sort((a, b) => a.time > b.time ? 1 : a.time < b.time ? -1 : 0)
      .reduce((newArray: any[], t: any, index) => [
        ...newArray,
        { ...t, balance: (index !== 0 ? newArray[index - 1].balance : 0) + (t.credit || 0) - (t.debit || 0) }
      ], []);
  }

  openTransactionDialog() {
    this.couchService.currentTime().subscribe((time: number) => {
      this.dialogsFormService.openDialogsForm(
        'Add Transaction',
        [
          {
            name: 'type', placeholder: 'Type', type: 'selectbox',
            options: [ { value: 'credit', name: 'Credit' }, { value: 'debit', name: 'Debit' } ], required: true
          },
          { name: 'description', placeholder: 'Note', type: 'textbox', required: true },
          { name: 'amount', placeholder: 'Amount', type: 'textbox', inputType: 'number', required: true },
          { name: 'date', placeholder: 'Date', type: 'date', required: true }
        ],
        {
          type: [ 'credit', CustomValidators.required ],
          description: [ '', CustomValidators.required ],
          amount: [ '', CustomValidators.required ],
          date: [ new Date(time), CustomValidators.required ]
        },
        { onSubmit: this.submitTransaction.bind(this) }
      );
    });
  }

  submitTransaction(transaction) {
    const { _id: teamId, teamType, teamPlanetCode } = this.team;
    const amount = +(transaction.amount);
    return this.teamsService.updateTeam(
      { ...transaction, amount, [transaction.type]: amount, docType: 'transaction', teamId, teamType, teamPlanetCode }
    ).subscribe(() => {
      this.planetMessageService.showMessage('Transaction added');
      this.dialogsFormService.closeDialogsForm();
      this.dialogsLoadingService.stop();
    });
  }

}
