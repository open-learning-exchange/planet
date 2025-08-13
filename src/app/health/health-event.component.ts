import { Component, OnInit, HostListener } from '@angular/core';
import { ActivatedRoute, Router, ParamMap } from '@angular/router';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { HealthService } from './health.service';
import { conditions, conditionAndTreatmentFields } from './health.constants';
import { UserService } from '../shared/user.service';
import { StateService } from '../shared/state.service';
import { CouchService } from '../shared/couchdb.service';
import { CustomValidators } from '../validators/custom-validators';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { DialogsPromptComponent } from '../shared/dialogs/dialogs-prompt.component';
import { switchMap } from 'rxjs/operators';
import { of, forkJoin, interval, race } from 'rxjs';
import { PlanetMessageService } from '../shared/planet-message.service';
import { CanComponentDeactivate } from '../shared/unsaved-changes.guard';
import { warningMsg } from '../shared/unsaved-changes.component';
import { debounce } from 'rxjs/operators';
import { HealthEventForm, HealthEventFormValue } from './health.forms';

@Component({
  templateUrl: './health-event.component.html',
  styleUrls: [ './health-update.scss' ]
})
export class HealthEventComponent implements OnInit, CanComponentDeactivate {

  healthForm: FormGroup<HealthEventForm>;
  conditions = conditions;
  dialogPrompt: MatDialogRef<DialogsPromptComponent>;
  event: Record<string, unknown> = {};
  initialFormValues: string;
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
    this.healthForm = this.fb.group<HealthEventForm>({
      temperature: this.fb.control<number | ''>('', Validators.min(1)),
      pulse: this.fb.control<number | ''>('', Validators.min(1)),
      bp: this.fb.control('', CustomValidators.bpValidator),
      height: this.fb.control<number | ''>('', Validators.min(1)),
      weight: this.fb.control<number | ''>('', Validators.min(1)),
      vision: this.fb.control(''),
      hearing: this.fb.control(''),
      notes: this.fb.control(''),
      diagnosis: this.fb.control(''),
      treatments: this.fb.control(''),
      medications: this.fb.control(''),
      immunizations: this.fb.control(''),
      allergies: this.fb.control(''),
      xrays: this.fb.control(''),
      tests: this.fb.control(''),
      referrals: this.fb.control(''),
      conditions: this.fb.control<Record<string, boolean>>({})
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
    })).subscribe(([ [ event ], time ]: [ unknown[], number ]) => {
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
    const formValue = this.healthForm.value as HealthEventFormValue;
    const numericFields: Array<keyof HealthEventFormValue> = [ 'temperature', 'pulse', 'height', 'weight' ];
    const processedForm = (Object.keys(formValue) as Array<keyof HealthEventFormValue>).reduce((acc, key) => {
      const value = formValue[key];
      if (numericFields.includes(key)) {
        acc[key] = value === '' || value === null ? undefined : Number(value);
      } else if (key === 'conditions') {
        acc[key] = this.processConditions(value || {});
      } else {
        acc[key] = value;
      }
      return acc;
    }, {} as Partial<HealthEventFormValue>);

    this.initialFormValues = JSON.stringify(processedForm);
  }

  private processConditions(inputConditions: Record<string, boolean>) {
    return Object.keys(inputConditions || {}).reduce<Record<string, boolean>>((acc, key) => {
      if (inputConditions[key]) {
        acc[key] = true;
      }
      return acc;
    }, {});
  }

  onFormChanges() {
    this.healthForm.valueChanges
      .pipe(
        debounce(() => race(interval(200), of(true)))
      )
      .subscribe(formValue => {
        const value = formValue as HealthEventFormValue;
        const numericFields: Array<keyof HealthEventFormValue> = [ 'temperature', 'pulse', 'height', 'weight' ];
        const processedForm = (Object.keys(value) as Array<keyof HealthEventFormValue>).reduce((acc, key) => {
          const current = value[key];
          if (numericFields.includes(key)) {
            acc[key] = current === '' || current === null ? undefined : Number(current);
          } else if (key === 'conditions') {
            acc[key] = this.processConditions(current || {});
          } else {
            acc[key] = current;
          }
          return acc;
        }, {} as Partial<HealthEventFormValue>);

        const currentState = JSON.stringify(processedForm);
        this.hasUnsavedChanges = currentState !== this.initialFormValues;
      });
  }

  onSubmit() {
    if (!this.healthForm.valid) {
      return;
    }
    const checkFields: Array<keyof HealthEventForm> = [ 'temperature', 'pulse', 'bp', 'height', 'weight' ];
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
    const isConditionsEmpty = (values: Record<string, boolean>) =>
      typeof values === 'object' && Object.values(values).every(v => !v);
    return Object.values(this.healthForm.controls)
      .every(({ value }) => value === null || /^\s*$/.test(String(value)) || isConditionsEmpty(value as Record<string, boolean>));
  }

  goBack() {
    // Let the router guard handle the unsaved changes prompt
    this.router.navigate([ '..' ], { relativeTo: this.route });
  }

  conditionChange(condition: string) {
    const currentConditions = this.healthForm.controls.conditions.value;
    this.healthForm.controls.conditions.setValue({ ...currentConditions, [condition]: currentConditions[condition] !== true });
  }

  showWarning(invalidFields: Array<{ field: keyof HealthEventForm; value: unknown }>) {
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
        extraMessage: $localize`The value(s) of the following are not in the normal range. Click <b>Cancel</b> to fix or click <b>OK</b> to submit.`,
        showLabels: invalidFields
      }
    });
    this.dialogPrompt.afterClosed().subscribe(result => {
      this.hasUnsavedChanges = !result;
    });
  }

  isFieldValueExpected(field: keyof HealthEventForm) {
    const value = this.healthForm.controls[field].value as number | string | null;
    const limits: Record<string, { min: number; max: number } | 'n/a'> = {
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
