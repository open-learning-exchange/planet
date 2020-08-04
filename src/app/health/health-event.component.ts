import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router, ParamMap } from '@angular/router';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { HealthService } from './health.service';
import { conditions, conditionAndTreatmentFields } from './health.constants';
import { UserService } from '../shared/user.service';
import { StateService } from '../shared/state.service';
import { CouchService } from '../shared/couchdb.service';
import { CustomValidators } from '../validators/custom-validators';
import { MatDialog, MatDialogRef } from '@angular/material';
import { DialogsPromptComponent } from '../shared/dialogs/dialogs-prompt.component';
import { switchMap } from 'rxjs/operators';
import { of, forkJoin } from 'rxjs';
import { PlanetMessageService } from '../shared/planet-message.service';

@Component({
  templateUrl: './health-event.component.html',
  styleUrls: [ './health-update.scss' ]
})
export class HealthEventComponent implements OnInit {

  healthForm: FormGroup;
  conditions = conditions;
  dialogPrompt: MatDialogRef<DialogsPromptComponent>;
  event: any = {};

  constructor(
    private fb: FormBuilder,
    private healthService: HealthService,
    private router: Router,
    private route: ActivatedRoute,
    private userService: UserService,
    private stateService: StateService,
    private couchService: CouchService,
    private dialog: MatDialog,
    private planetMessageService: PlanetMessageService
  ) {
    this.healthForm = this.fb.group({
      temperature: [ '', Validators.min(1) ],
      pulse: [ '', Validators.min(1) ],
      bp: [ '', CustomValidators.bpValidator ],
      height: [ '', Validators.min(1) ],
      weight: [ '', Validators.min(1) ],
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

  ngOnInit() {
    this.route.paramMap.pipe(switchMap((params: ParamMap) => {
      const eventId = params.get('eventId');
      if (!eventId) {
        return of([ [ 'new' ], 0 ]);
      }
      return forkJoin([
        this.healthService.getHealthData(params.get('id'), { docId: eventId }),
        this.couchService.currentTime()
      ]);
    })).subscribe(([ [ event ], time ]: [ any[], number ]) => {
      if (event !== 'new' && (time - event.updatedDate) > 300000) {
        this.planetMessageService.showAlert('This examination can no longer be changed.');
        this.goBack();
        return;
      }
      this.event = event === 'new' ? {} : event;
      this.healthForm.patchValue(this.event);
    });
  }

  onSubmit() {
    if (!this.healthForm.valid) {
      return;
    }
    const checkFields = [ 'temperature', 'pulse', 'bp', 'height', 'weight' ];
    const promptFields = checkFields.filter((field) => !this.isFieldValueExpected(field))
      .map(field => ({ field, value: this.healthForm.controls[field].value }));
    if (promptFields.length) {
      this.showWarning(promptFields);
    } else {
      this.saveEvent().subscribe(() => this.goBack());
    }
  }

  isEmptyForm() {
    const isConditionsEmpty = (values) => typeof values === 'object' && Object.values(values).every(value => !value);
    return Object.values(this.healthForm.controls)
      .every(({ value }) => value === null || /^\s*$/.test(value) || isConditionsEmpty(value));
  }

  goBack() {
    this.router.navigate([ '..' ], { relativeTo: this.route });
  }

  conditionChange(condition) {
    const currentConditions = this.healthForm.controls.conditions.value;
    this.healthForm.controls.conditions.setValue({ ...currentConditions, [condition]: currentConditions[condition] !== true });
  }

  showWarning(invalidFields) {
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
        extraMessage: 'The value(s) of the following are not in the normal range. Click <b>Cancel</b> to fix or click <b>OK</b> to submit.',
        showLabels: invalidFields
      }
    });
  }

  isFieldValueExpected(field) {
    const value = this.healthForm.controls[field].value;
    const limits = {
      'temperature': { min: 30, max: 40 },
      'pulse': { min: 40, max: 120 },
      'height': { min: 1, max: 250 },
      'weight': { min: 1, max: 150 },
      'bp': 'n/a'
    };
    if (value === null || value === '' || !limits[field]) {
      return true;
    }
    if (field === 'bp') {
      return /^(([6-9])(\d)|([1-2])(\d){2}|(300))\/(([4-9])(\d)|(1)(\d){2}|(200))$/.test(value);
    }
    return value >= limits[field].min && value <= limits[field].max;
  }

  saveEvent() {
    return this.healthService.addEvent(
      this.route.snapshot.params.id,
      this.userService.get()._id,
      this.event,
      {
        ...this.healthForm.value,
        selfExamination: this.route.snapshot.params.id === this.userService.get()._id,
        createdBy: this.userService.get()._id,
        planetCode: this.stateService.configuration.code,
        hasInfo: conditionAndTreatmentFields.some(key => this.healthForm.value[key] !== '')
      }
    );
  }

}
