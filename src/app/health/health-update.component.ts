import { Component, OnInit, HostListener } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';
import { CustomValidators } from '../validators/custom-validators';
import { ValidatorService } from '../validators/validator.service';
import { UserService } from '../shared/user.service';
import { HealthService } from './health.service';
import { forkJoin } from 'rxjs';
import { showFormErrors } from '../shared/table-helpers';
import { languages } from '../shared/languages';
import { CanComponentDeactivate } from '../shared/unsaved-changes.guard';
import { warningMsg } from '../shared/unsaved-changes.component';
import { interval, of, race } from 'rxjs';
import { debounce } from 'rxjs/operators';

interface ProfileForm {
  name: FormControl<string>;
  firstName: FormControl<string>;
  middleName: FormControl<string>;
  lastName: FormControl<string>;
  email: FormControl<string>;
  language: FormControl<string>;
  phoneNumber: FormControl<string>;
  birthDate: FormControl<string>;
  birthplace: FormControl<string>;
}

interface HealthForm {
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

  profileForm: FormGroup<ProfileForm>;
  healthForm: FormGroup<HealthForm>;
  existingData: any = {};
  languages = languages;
  minBirthDate: Date = this.userService.minBirthDate;
  initialFormValues: any;
  hasUnsavedChanges = false;

  constructor(
    private fb: FormBuilder,
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
      profile: this.profileForm.value,
      health: this.healthForm.value
    });
  }

  onFormChanges() {
    this.profileForm.valueChanges
      .pipe(
        debounce(() => race(interval(200), of(true)))
      )
      .subscribe(() => {
        const currentState = JSON.stringify({
          profile: this.profileForm.value,
          health: this.healthForm.value
        });
        this.hasUnsavedChanges = currentState !== this.initialFormValues;
      });

    this.healthForm.valueChanges
      .pipe(
        debounce(() => race(interval(200), of(true)))
      )
      .subscribe(() => {
        const currentState = JSON.stringify({
          profile: this.profileForm.value,
          health: this.healthForm.value
        });
        this.hasUnsavedChanges = currentState !== this.initialFormValues;
      });
  }

  initProfileForm() {
    this.profileForm = this.fb.nonNullable.group({
      name: '',
      firstName: [ '', CustomValidators.required ],
      middleName: '',
      lastName: [ '', CustomValidators.required ],
      email: [ '', [ Validators.required, Validators.email ] ],
      language: [ '', Validators.required ],
      phoneNumber: [ '', CustomValidators.required ],
      birthDate: [
        '',
        CustomValidators.dateValidRequired,
        ac => this.validatorService.notDateInFuture$(ac)
      ],
      birthplace: ''
    });
  }

  initHealthForm() {
    this.healthForm = this.fb.nonNullable.group({
      emergencyContactName: '',
      emergencyContactType: '',
      emergencyContact: '',
      specialNeeds: '',
      immunizations: '',
      allergies: '',
      notes: ''
    });
    this.healthForm.controls.emergencyContactType.valueChanges.subscribe(value => {
      this.healthForm.controls.emergencyContact.setValidators(value === 'email' ? Validators.email : null);
      this.healthForm.controls.emergencyContact.updateValueAndValidity();
    });
  }

  onSubmit() {
    if (!(this.profileForm.valid && this.healthForm.valid)) {
      showFormErrors(Object.values(this.profileForm.controls));
      showFormErrors(Object.values(this.healthForm.controls));
      return;
    }
    forkJoin([
      this.userService.updateUser({ ...this.userService.get(), ...this.profileForm.value }),
      this.healthService.postHealthProfileData({
        _id: this.existingData._id || this.userService.get()._id,
        _rev: this.existingData._rev,
        profile: this.healthForm.value
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
