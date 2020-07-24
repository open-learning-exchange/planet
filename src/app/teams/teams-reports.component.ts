import { Component, Input, Output, EventEmitter, OnChanges } from '@angular/core';
import { MatDialog } from '@angular/material';
import { DialogsFormService } from '../shared/dialogs/dialogs-form.service';
import { CustomValidators } from '../validators/custom-validators';
import { CouchService } from '../shared/couchdb.service';
import { TeamsService } from './teams.service';
import { DialogsLoadingService } from '../shared/dialogs/dialogs-loading.service';
import { TeamsReportsDialogComponent } from './teams-reports-dialog.component';
import { DialogsPromptComponent } from '../shared/dialogs/dialogs-prompt.component';

@Component({
  selector: 'planet-teams-reports',
  styleUrls: [ './teams-reports.scss' ],
  templateUrl: './teams-reports.component.html'
})
export class TeamsReportsComponent implements OnChanges {

  @Input() reports: any[];
  @Input() editable = false;
  @Input() team;
  @Input() containerElement: any;
  @Output() reportsChanged = new EventEmitter<void>();
  rowHeight = '300px';

  constructor(
    private couchService: CouchService,
    private dialog: MatDialog,
    private dialogsFormService: DialogsFormService,
    private dialogsLoadingService: DialogsLoadingService,
    private teamsService: TeamsService
  ) {}

  ngOnChanges() {
    if (this.containerElement) {
      this.rowHeight = `${this.containerElement.offsetHeight - 160}px`;
    }
  }

  openAddReportDialog(oldReport = {}) {
    this.couchService.currentTime().subscribe((time: number) => {
      const currentDate = new Date(time);
      const lastMonthStart = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1);
      const lastMonthEnd = currentDate.setDate(0);
      this.dialogsFormService.openDialogsForm(
        'Add Report',
        [
          { name: 'startDate', placeholder: 'Start Date', type: 'date', required: true },
          { name: 'endDate', placeholder: 'End Date', type: 'date', required: true },
          { name: 'description', placeholder: 'Summary', type: 'markdown', required: true },
          { name: 'beginningBalance', placeholder: 'Beginning Balance', type: 'textbox', inputType: 'number' },
          { name: 'sales', placeholder: 'Sales', type: 'textbox', inputType: 'number' },
          { name: 'otherIncome', placeholder: 'Other Income', type: 'textbox', inputType: 'number' },
          { name: 'wages', placeholder: 'Personnel', type: 'textbox', inputType: 'number' },
          { name: 'otherExpenses', placeholder: 'Non-Personnel', type: 'textbox', inputType: 'number' }
        ],
        this.addFormInitialValues(oldReport, { startDate: lastMonthStart, endDate: lastMonthEnd }),
        { onSubmit: (newReport) => this.updateReport(oldReport, newReport) }
      );
    });
  }

  openDeleteReportDialog(report) {
    const okClick = {
      request: () => this.updateReport(report),
      onNext: () => this.dialogsLoadingService.stop()
    };
    this.dialog.open(DialogsPromptComponent, {
      data: { changeType: 'delete', type: 'report', displayDates: report, okClick }
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
      startDate: new Date(oldReport.startDate || startDate),
      endDate: new Date(oldReport.endDate || endDate)
    };
    const formControl = (initialValue, isEndDate = false) => [
      initialValue,
      [ CustomValidators.required, isEndDate ? CustomValidators.endDateValidator : () => {} ]
    ];
    return Object.entries(initialValues).reduce(
      (formObj, [ key, value ]) => ({ ...formObj, [key]: formControl(value, key === 'endDate') }), {}
    );
  }

  updateReport(oldReport, newReport: any = {}) {
    const dateFields = [ 'startDate', 'endDate' ];
    const numberFields = [ 'beginningBalance', 'sales', 'otherIncome', 'wages', 'otherExpenses' ];
    const transformFields = (key: string, value: Date | string) => dateFields.indexOf(key) > -1 ?
      (<Date>value).getTime() :
      numberFields.indexOf(key) > -1 ?
      +value :
      value;
    const { _id, _rev, ...newDoc } = <any>Object.entries(newReport).reduce(
      (obj, [ key, value ]: [ string, Date | string ]) => ({ ...obj, [key]: transformFields(key, value) }),
      {}
    );
    const docs = [ { ...oldReport, status: 'archived' }, newDoc ].filter(doc => doc.startDate !== undefined);
    this.teamsService.updateAdditionalDocs(docs, this.team, 'report', { utcKeys: dateFields }).subscribe(() => {
      this.reportsChanged.emit();
      this.dialogsFormService.closeDialogsForm();
      this.dialogsLoadingService.stop();
    });
  }

  openReportDialog(report) {
    this.dialog.open(TeamsReportsDialogComponent, {
      data: { report, team: this.team }
    });
  }

}
