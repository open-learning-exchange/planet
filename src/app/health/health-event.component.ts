import { Component, OnInit, HostListener } from '@angular/core';
import { ActivatedRoute, Router, ParamMap } from '@angular/router';
import { FormBuilder, FormGroup, Validators, ValidatorFn, AsyncValidatorFn } from '@angular/forms';
import { HealthService } from './health.service';
import { conditions, conditionAndTreatmentFields } from './health.constants';
import { UserService } from '../shared/user.service';
import { StateService } from '../shared/state.service';
import { CouchService } from '../shared/couchdb.service';
import { CustomValidators } from '../validators/custom-validators';
import { MatLegacyDialog as MatDialog, MatLegacyDialogRef as MatDialogRef } from '@angular/material/legacy-dialog';
import { DialogsPromptComponent } from '../shared/dialogs/dialogs-prompt.component';
import { switchMap } from 'rxjs/operators';
import { of, forkJoin, interval, race } from 'rxjs';
import { PlanetMessageService } from '../shared/planet-message.service';
import { CanComponentDeactivate } from '../shared/unsaved-changes.guard';
import { warningMsg } from '../shared/unsaved-changes.component';
import { debounce } from 'rxjs/operators';

interface HealthEventFormControls {
  temperature: [ number | null, ValidatorFn? ];
  pulse: [ number | null, ValidatorFn? ];
  bp: [ string, ValidatorFn? ];
  height: [ number | null, ValidatorFn? ];
  weight: [ number | null, ValidatorFn? ];
  vision: [ string ];
  hearing: [ string ];
  notes: [ string ];
  diagnosis: [ string ];
  treatments: [ string ];
  medications: [ string ];
  immunizations: [ string ];
  allergies: [ string ];
  xrays: [ string ];
  tests: [ string ];
  referrals: [ string ];
  conditions: [ Record<string, boolean> ];
}

type HealthEventFormFields = keyof HealthEventFormControls;

@Component({
  templateUrl: './health-event.component.html',
  styleUrls: [ './health-update.scss' ]
})
export class HealthEventComponent implements OnInit, CanComponentDeactivate {

  healthForm: FormGroup;
  conditions = conditions;
  dialogPrompt: MatDialogRef<DialogsPromptComponent>;
  event: any = {};
  initialFormValues: any;
  hasUnsavedChanges = false;

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
      temperature: [ null, Validators.min(1) ],
      pulse: [ null, Validators.min(1) ],
      bp: [ '', CustomValidators.bpValidator ],
      height: [ null, Validators.min(1) ],
      weight: [ null, Validators.min(1) ],
      vision: [ '' ],
      hearing: [ '' ],
      notes: [ '' ],
      diagnosis: [ '' ],
      treatments: [ '' ],
      medications: [ '' ],
      immunizations: [ '' ],
      allergies: [ '' ],
      xrays: [ '' ],
      tests: [ '' ],
      referrals: [ '' ],
      conditions: [ {} ]
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
        this.planetMessageService.showAlert($localize`This examination can no longer be changed.`);
        this.goBack();
        return;
      }
      this.event = event === 'new' ? {} : event;
      this.healthForm.patchValue(this.event);
      this.onFormChanges();
      this.captureInitialState();
    });
  }

  private captureInitialState() {
    const formValue = this.healthForm.getRawValue();
    const processedForm = this.transformFormValue(formValue);

    this.initialFormValues = JSON.stringify(processedForm);
  }

  private processConditions(inputConditions: Record<string, boolean> | null | undefined): Record<string, boolean> {
    const processedConditions = Object.keys(inputConditions || {}).reduce<Record<string, boolean>>((acc, key) => {
      if (inputConditions && inputConditions[key]) {
        acc[key] = true;
      }
      return acc;
    }, {});
    return processedConditions;
  }

  onFormChanges() {
    this.healthForm.valueChanges
      .pipe(
        debounce(() => race(interval(200), of(true)))
      )
      .subscribe((formValue) => {
        const processedForm = this.transformFormValue(formValue);

        const currentState = JSON.stringify(processedForm);
        this.hasUnsavedChanges = currentState !== this.initialFormValues;
      });
  }

  onSubmit() {
    if (!this.healthForm.valid) {
      return;
    }
    const checkFields: HealthEventFormFields[] = [ 'temperature', 'pulse', 'bp', 'height', 'weight' ];
    const promptFields = checkFields.filter((field) => !this.isFieldValueExpected(field))
      .map(field => ({ field, value: this.healthForm.controls[field].value }));
    if (promptFields.length) {
      this.showWarning(promptFields);
    } else {
      this.saveEvent().subscribe(() => {
        this.hasUnsavedChanges = false;
        this.goBack();
      });
    }
  }

  isEmptyForm() {
    const isConditionsEmpty = (values) => typeof values === 'object' && Object.values(values).every(value => !value);
    return Object.values(this.healthForm.controls)
      .every(({ value }) => value === null || /^\s*$/.test(value) || isConditionsEmpty(value));
  }

  goBack() {
    // Let the router guard handle the unsaved changes prompt
    this.router.navigate([ '..' ], { relativeTo: this.route });
  }

  conditionChange(condition: string) {
    const currentConditions = this.healthForm.controls.conditions.value || {};
    this.healthForm.controls.conditions.setValue({
      ...currentConditions,
      [condition]: currentConditions[condition] !== true
    });
  }

  showWarning(invalidFields) {
    this.hasUnsavedChanges = false;
    this.dialogPrompt = this.dialog.open(DialogsPromptComponent, {
      data: {
        okClick: {
          request: this.saveEvent(),
          onNext: (data) => {
            this.dialogPrompt.close(true);
            this.goBack();
          }
        },
        displayName: '',
        showMainParagraph: false,
        extraMessage: $localize`The value(s) of the following are not in the normal range.
         Click <b>Cancel</b> to fix or click <b>OK</b> to submit.`,
        showLabels: invalidFields
      }
    });
    this.dialogPrompt.afterClosed().subscribe(result => {
      this.hasUnsavedChanges = !result;
    });
  }

  isFieldValueExpected(field: HealthEventFormFields) {
    const value = this.healthForm.controls[field].value;
    const limits = {
      'temperature': { min: 30, max: 45 },
      'pulse': { min: 30, max: 300 },
      'height': { min: 30, max: 275 },
      'weight': { min: 0, max: 500 },
      'bp': 'n/a'
    };
    if (value === null || value === '' || !limits[field]) {
      return true;
    }
    if (field === 'bp') {
      return typeof value === 'string'
        ? /^(([6-9])(\d)|([1-2])(\d){2}|(300))\/(([4-9])(\d)|(1)(\d){2}|(200))$/.test(value)
        : true;
    }
    const fieldLimit = limits[field] as { min: number; max: number };
    return (value as number) >= fieldLimit.min && (value as number) <= fieldLimit.max;
  }

  saveEvent() {
    const formValue = this.healthForm.getRawValue();

    return this.healthService.addEvent(
      this.route.snapshot.params.id,
      this.userService.get()._id,
      this.event,
      {
        ...formValue,
        selfExamination: this.route.snapshot.params.id === this.userService.get()._id,
        createdBy: this.userService.get()._id,
        planetCode: this.stateService.configuration.code,
        hasInfo: conditionAndTreatmentFields.some(key => {
          const value = formValue[key as HealthEventFormFields];
          return typeof value === 'string' ? value !== null && value !== '' : value !== null;
        })
      }
    );
  }

  private transformFormValue(formValue: Partial<ReturnType<typeof this.healthForm.getRawValue>>) {
    const numericFieldSet = new Set<HealthEventFormFields>([ 'temperature', 'pulse', 'height', 'weight' ]);

    return (Object.keys(formValue) as Array<HealthEventFormFields>).reduce((acc, key) => {
      const value = formValue[key];
      if (numericFieldSet.has(key)) {
        acc[key] = value === null ? undefined : Number(value);
      } else if (key === 'conditions') {
        acc[key] = this.processConditions(value as Record<string, boolean> | null | undefined);
      } else {
        acc[key] = value;
      }
      return acc;
    }, {} as Record<HealthEventFormFields, unknown>);
  }

  canDeactivate(): boolean {
    return !this.hasUnsavedChanges;
  }

  @HostListener('window:beforeunload', [ '$event' ])
  unloadNotification($event: BeforeUnloadEvent): void {
    if (this.hasUnsavedChanges) {
      $event.returnValue = warningMsg;
    }
  }
}
