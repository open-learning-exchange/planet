import { Component } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormBuilder, FormGroup } from '@angular/forms';
import { HealthService } from './health.service';
import { conditions, conditionAndTreatmentFields } from './health.constants';
import { UserService } from '../shared/user.service';
import { StateService } from '../shared/state.service';
import { CustomValidators } from '../validators/custom-validators';
import { MatDialog, MatDialogRef } from '@angular/material';
import { DialogsPromptComponent } from '../shared/dialogs/dialogs-prompt.component';

@Component({
  templateUrl: './health-event.component.html',
  styleUrls: [ './health-update.scss' ]
})
export class HealthEventComponent {

  healthForm: FormGroup;
  conditions = conditions;
  dialogPrompt: MatDialogRef<DialogsPromptComponent>;

  constructor(
    private fb: FormBuilder,
    private healthService: HealthService,
    private router: Router,
    private route: ActivatedRoute,
    private userService: UserService,
    private stateService: StateService,
    private dialog: MatDialog
  ) {
    this.healthForm = this.fb.group({
      temperature: [ '', CustomValidators.positiveNumberValidator ],
      pulse: [ '', CustomValidators.positiveNumberValidator ],
      bp: [ '', CustomValidators.bpValidator ],
      height: [ '', CustomValidators.positiveNumberValidator ],
      weight: [ '', CustomValidators.positiveNumberValidator ],
      vision: [ '' ],
      hearing: [ '' ],
      notes: '',
      diagnosis: '',
      treatments: '',
      medications: '',
      immunizations: '',
      allergies: '',
      xrays: '',
      tests: '',
      referrals: '',
      conditions: {}
    });
  }

  onSubmit() {
    if (!this.healthForm.valid) {
      return;
    }
    const fields = [ 'temperature', 'pulse', 'bp', 'height', 'weight' ];
    const invalidFields = fields.reduce((invalid, field) => this.validateMeasure(field) ? invalid : invalid.concat([ field ]), []);
    if (invalidFields.length) {
      this.showWarning(invalidFields);
    } else {
      this.saveEvent().subscribe(() => this.goBack());
    }
  }

  isEmptyForm() {
    const isConditionsEmpty = (values) => typeof values === 'object' && Object.values(values).every(value => !value);
    return Object.values(this.healthForm.controls).every(({ value }) => value === '' || value === null || isConditionsEmpty(value));
  }

  goBack() {
    this.router.navigate([ '..' ], { relativeTo: this.route });
  }

  conditionChange(condition) {
    const currentConditions = this.healthForm.controls.conditions.value;
    this.healthForm.controls.conditions.setValue({ ...currentConditions, [condition]: currentConditions[condition] !== true });
  }

  showWarning(invalidFields) {
      const extraMessage = 'The following measurement(s) may be incorrect. Click cancel to fix or click ok to submit.';
      this.dialogPrompt = this.dialog.open(DialogsPromptComponent, {
        data: {
          okClick: {
            request: this.saveEvent(),
            onNext: (data) => {
              this.dialogPrompt.close();
              this.goBack();
            }
          },
          showMainParagraph: false,
          extraMessage,
          showLabels: invalidFields
        }
      });
  }

  validateMeasure(type) {
    const value = this.healthForm.controls[type].value;
    const limits = {
      'temperature': { min: 30, max: 40 },
      'pulse': { min: 40, max: 120 },
      'height': { min: 1, max: 250 },
      'weight': { min: 1, max: 150 },
      'bp': 'n/a'
    };
    if (!value || !limits[type]) {
      return true;
    }
    if (type === 'bp') {
      return /^(([6-9])(\d)|([1-2])(\d){2}|(300))\/(([4-9])(\d)|(1)(\d){2}|(200))$/.test(value);
    }
    return value >= limits[type].min && value <= limits[type].max;
  }

  saveEvent() {
    return this.healthService.addEvent(
      this.route.snapshot.params.id,
      {
        ...this.healthForm.value,
        date: Date.now(),
        selfExamination: this.route.snapshot.params.id === this.userService.get()._id,
        createdBy: this.userService.get()._id,
        planetCode: this.stateService.configuration.code,
        hasInfo: conditionAndTreatmentFields.some(key => this.healthForm.value[key] !== '')
      }
    );
  }

}
