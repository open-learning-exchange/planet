import { Component, OnInit, HostListener } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormControl, FormGroup, NonNullableFormBuilder, Validators } from '@angular/forms';
import { interval, of, race, forkJoin } from 'rxjs';
import { debounce } from 'rxjs/operators';
import { CustomValidators } from '../validators/custom-validators';
import { ValidatorService } from '../validators/validator.service';
import { UserService } from '../shared/user.service';
import { HealthService } from './health.service';
import { showFormErrors } from '../shared/table-helpers';
import { languages } from '../shared/languages';
import { CanComponentDeactivate } from '../shared/unsaved-changes.guard';
import { warningMsg } from '../shared/unsaved-changes.component';

interface ProfileFormValue {
  name: string;
  firstName: string;
  middleName: string;
  lastName: string;
  email: string;
  language: string;
  phoneNumber: string;
  birthDate: Date | null;
  birthplace: string;
}

interface HealthFormValue {
  emergencyContactName: string;
  emergencyContactType: string;
  emergencyContact: string;
  specialNeeds: string;
  immunizations: string;
  allergies: string;
  notes: string;
}

type ProfileFormGroup = {
  [Key in keyof ProfileFormValue]: FormControl<ProfileFormValue[Key]>;
};

type HealthFormGroup = {
  [Key in keyof HealthFormValue]: FormControl<HealthFormValue[Key]>;
};


@Component({
  templateUrl: './health-update.component.html',
  styleUrls: [ './health-update.scss' ]
})
export class HealthUpdateComponent implements OnInit, CanComponentDeactivate {

  profileForm: FormGroup<ProfileFormGroup>;
  healthForm: FormGroup<HealthFormGroup>;
  existingData: { _id?: string; _rev?: string; profile?: HealthFormValue } = {};
  languages = languages;
  minBirthDate: Date = this.userService.minBirthDate;
  initialFormValues: string;
  hasUnsavedChanges = false;

  constructor(
    private fb: NonNullableFormBuilder,
    private validatorService: ValidatorService,
    private userService: UserService,
    private healthService: HealthService,
    private router: Router,
    private route: ActivatedRoute
  ) {
    this.initProfileForm();
    this.initHealthForm();
  }

  ngOnInit() {
    this.profileForm.patchValue(this.userService.get());
    this.healthService.getHealthData(this.userService.get()._id).subscribe(([ data ]: any[]) => {
      this.existingData = data;
      this.healthForm.patchValue(data.profile);
      this.captureInitialState();
      this.onFormChanges();
    });
  }

  private captureInitialState() {
    this.initialFormValues = JSON.stringify({
      profile: this.profileForm.getRawValue(),
      health: this.healthForm.getRawValue()
    });
  }

  onFormChanges() {
    this.profileForm.valueChanges
      .pipe(
        debounce(() => race(interval(200), of(true)))
      )
      .subscribe(() => {
        const currentState = JSON.stringify({
          profile: this.profileForm.getRawValue(),
          health: this.healthForm.getRawValue()
        });
        this.hasUnsavedChanges = currentState !== this.initialFormValues;
      });

    this.healthForm.valueChanges
      .pipe(
        debounce(() => race(interval(200), of(true)))
      )
      .subscribe(() => {
        const currentState = JSON.stringify({
          profile: this.profileForm.getRawValue(),
          health: this.healthForm.getRawValue()
        });
        this.hasUnsavedChanges = currentState !== this.initialFormValues;
      });
  }

  initProfileForm() {
    this.profileForm = this.fb.group({
      name: this.fb.control(''),
      firstName: this.fb.control('', { validators: [ CustomValidators.required ] }),
      middleName: this.fb.control(''),
      lastName: this.fb.control('', { validators: [ CustomValidators.required ] }),
      email: this.fb.control('', { validators: [ Validators.required, Validators.email ] }),
      language: this.fb.control('', { validators: [ Validators.required ] }),
      phoneNumber: this.fb.control('', { validators: [ CustomValidators.required ] }),
      birthDate: new FormControl<Date | null>(null, {
        validators: [ CustomValidators.dateValidRequired ],
        asyncValidators: [ ac => this.validatorService.notDateInFuture$(ac) ]
      }),
      birthplace: this.fb.control('')
    });
  }

  initHealthForm() {
    this.healthForm = this.fb.group({
      emergencyContactName: this.fb.control(''),
      emergencyContactType: this.fb.control(''),
      emergencyContact: this.fb.control(''),
      specialNeeds: this.fb.control(''),
      immunizations: this.fb.control(''),
      allergies: this.fb.control(''),
      notes: this.fb.control('')
    });
    this.healthForm.controls.emergencyContactType.valueChanges.subscribe(value => {
      this.updateEmergencyContactValidators(value);
    });
  }

  private updateEmergencyContactValidators(contactType: string) {
    const validators = contactType ? [ Validators.required ] : [];
    if (contactType === 'email') {
      validators.push(Validators.email);
    }
    this.healthForm.controls.emergencyContact.setValidators(validators);
    this.healthForm.controls.emergencyContact.updateValueAndValidity({ emitEvent: false });
  }

  onSubmit() {
    if (!(this.profileForm.valid && this.healthForm.valid)) {
      showFormErrors(this.profileForm.controls);
      showFormErrors(this.healthForm.controls);
      return;
    }
    const profileValue = this.profileForm.getRawValue();
    const healthValue = this.healthForm.getRawValue();
    forkJoin([
      this.userService.updateUser({ ...this.userService.get(), ...profileValue }),
      this.healthService.postHealthProfileData({
        _id: this.existingData._id || this.userService.get()._id,
        _rev: this.existingData._rev,
        profile: healthValue
      })
    ]).subscribe(() => {
      this.hasUnsavedChanges = false;
      this.goBack();
    });
  }

  goBack() {
    this.router.navigate([ '..' ], { relativeTo: this.route });
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
