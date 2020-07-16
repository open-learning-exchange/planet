import { Component, Input, Output, EventEmitter } from '@angular/core';
import { DialogsFormService } from '../shared/dialogs/dialogs-form.service';
import { CustomValidators } from '../validators/custom-validators';
import { TeamsService } from './teams.service';
import { DialogsLoadingService } from '../shared/dialogs/dialogs-loading.service';

@Component({
  selector: 'planet-teams-view-reports',
  styleUrls: [ './teams-view-reports.scss' ],
  templateUrl: './teams-view-reports.component.html'
})
export class PlanetTeamsViewReportsComponent {

  @Input() reports: any[];
  @Input() editable = false;
  @Input() team;
  @Output() reportsChanged = new EventEmitter<void>();

  constructor(
    private dialogsFormService: DialogsFormService,
    private dialogsLoadingService: DialogsLoadingService,
    private teamsService: TeamsService
  ) {}

  openAddReportDialog() {
    const formControl = (initialValue, endDate = false) => [
      initialValue,
      [ CustomValidators.required, endDate ? CustomValidators.endDateValidator : () => {} ]
    ];
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
      {
        startDate: formControl(Date.now()),
        endDate: formControl(Date.now(), true),
        description: formControl(''),
        beginningBalance: formControl(0),
        sales: formControl(0),
        otherIncome: formControl(0),
        wages: formControl(0),
        otherExpenses: formControl(0)
      },
      { onSubmit: this.updateReport.bind(this) }
    );
  }

  updateReport(newReport) {
    const dateFields = [ 'startDate', 'endDate' ];
    const numberFields = [ 'beginningBalance', 'sales', 'otherIncome', 'wages', 'otherExpenses' ];
    const transformFields = (key: string, value: Date | string) => dateFields.indexOf(key) > -1 ?
      (<Date>value).getTime() :
      numberFields.indexOf(key) > -1 ?
      +value :
      value;
    this.teamsService.updateAdditionalDoc(
      Object.entries(newReport).reduce(
        (obj, [ key, value ]: [ string, Date | string ]) => ({ ...obj, [key]: transformFields(key, value) }),
        {}
      ),
      this.team,
      'report'
    ).subscribe(() => {
      this.reportsChanged.emit();
      this.dialogsFormService.closeDialogsForm();
      this.dialogsLoadingService.stop();
    });
  }

}
