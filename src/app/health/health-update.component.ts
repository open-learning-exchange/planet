import { Component, OnInit, HostListener } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormControl, FormGroup, NonNullableFormBuilder, Validators } from '@angular/forms';
import { interval, of, race, forkJoin, merge } from 'rxjs';
import { debounce } from 'rxjs/operators';
import { CustomValidators } from '../validators/custom-validators';
import { ValidatorService } from '../validators/validator.service';
import { UserService } from '../shared/user.service';
import { HealthService } from './health.service';
import { showFormErrors } from '../shared/table-helpers';
import { languages } from '../shared/languages';
import { CanComponentDeactivate } from '../shared/unsaved-changes.guard';
import { warningMsg } from '../shared/unsaved-changes.component';

interface ProfileFormGroup {
  name: FormControl<string>;
  firstName: FormControl<string>;
  middleName: FormControl<string>;
  lastName: FormControl<string>;
  email: FormControl<string>;
  language: FormControl<string>;
  phoneNumber: FormControl<string>;
  birthDate: FormControl<string | Date | null>;
  birthplace: FormControl<string>;
}

interface HealthFormGroup {
  emergencyContactName: FormControl<string>;
  emergencyContactType: FormControl<string>;
  emergencyContact: FormControl<string>;
  specialNeeds: FormControl<string>;
  immunizations: FormControl<string>;
  allergies: FormControl<string>;
  notes: FormControl<string>;
}

@Component({
  templateUrl: './health-update.component.html',
  styleUrls: [ './health-update.scss' ]
})
export class HealthUpdateComponent implements OnInit, CanComponentDeactivate {

  profileForm: FormGroup<ProfileFormGroup>;
  healthForm: FormGroup<HealthFormGroup>;
  existingData: any = {};
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
    this.initialFormValues = this.getCurrentState();
  }

  private getCurrentState(): string {
    return JSON.stringify({
      profile: this.profileForm.getRawValue(),
      health: this.healthForm.getRawValue()
    });
  }

  onFormChanges() {
    merge(this.profileForm.valueChanges, this.healthForm.valueChanges)
      .pipe(
        debounce(() => race(interval(200), of(true)))
      )
      .subscribe(() => {
        this.hasUnsavedChanges = this.getCurrentState() !== this.initialFormValues;
      });
  }

  initProfileForm() {
    this.profileForm = this.fb.group<ProfileFormGroup>({
      name: this.fb.control(''),
      firstName: this.fb.control('', CustomValidators.required),
      middleName: this.fb.control(''),
      lastName: this.fb.control('', CustomValidators.required),
      email: this.fb.control('', [ Validators.required, Validators.email ]),
      language: this.fb.control('', Validators.required),
      phoneNumber: this.fb.control('', CustomValidators.required),
      birthDate: new FormControl<string | Date | null>(
        '',
        {
          validators: CustomValidators.dateValidRequired,
          asyncValidators: ac => this.validatorService.notDateInFuture$(ac)
        }
      ),
      birthplace: this.fb.control('')
    });
  }

  initHealthForm() {
    this.healthForm = this.fb.group<HealthFormGroup>({
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
    forkJoin([
      this.userService.updateUser({ ...this.userService.get(), ...this.profileForm.getRawValue() }),
      this.healthService.postHealthProfileData({
        _id: this.existingData._id || this.userService.get()._id,
        _rev: this.existingData._rev,
        profile: this.healthForm.getRawValue()
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
    return !this.getHasUnsavedChanges();
  }

  isFormPristine(): boolean {
    return this.getCurrentState() === this.initialFormValues;
  }

  @HostListener('window:beforeunload', [ '$event' ])
  unloadNotification($event: BeforeUnloadEvent): void {
    if (this.getHasUnsavedChanges()) {
      $event.returnValue = warningMsg;
    }
  }

  private getHasUnsavedChanges(): boolean {
    return !this.isFormPristine();
  }

}
