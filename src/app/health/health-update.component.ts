import { Component, OnInit, HostListener } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
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
import { HealthProfileForm, UserProfileForm } from './health.forms';

@Component({
  templateUrl: './health-update.component.html',
  styleUrls: [ './health-update.scss' ]
})
export class HealthUpdateComponent implements OnInit, CanComponentDeactivate {

  profileForm: FormGroup<UserProfileForm>;
  healthForm: FormGroup<HealthProfileForm>;
  existingData: { _id?: string; _rev?: string; profile?: Record<string, unknown> } = {};
  languages = languages;
  minBirthDate: Date = this.userService.minBirthDate;
  initialFormValues: string;
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
    this.healthService.getHealthData(this.userService.get()._id).subscribe(([ data ]: [Record<string, unknown>]) => {
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
    this.profileForm = this.fb.group<UserProfileForm>({
      name: this.fb.control(''),
      firstName: this.fb.control('', CustomValidators.required),
      middleName: this.fb.control(''),
      lastName: this.fb.control('', CustomValidators.required),
      email: this.fb.control('', [ Validators.required, Validators.email ]),
      language: this.fb.control('', Validators.required),
      phoneNumber: this.fb.control('', CustomValidators.required),
      birthDate: this.fb.control('', {
        validators: [ CustomValidators.dateValidRequired ],
        asyncValidators: [ ac => this.validatorService.notDateInFuture$(ac) ]
      }),
      birthplace: this.fb.control('')
    });
  }

  initHealthForm() {
    this.healthForm = this.fb.group<HealthProfileForm>({
      emergencyContactName: this.fb.control(''),
      emergencyContactType: this.fb.control(''),
      emergencyContact: this.fb.control(''),
      specialNeeds: this.fb.control(''),
      immunizations: this.fb.control(''),
      allergies: this.fb.control(''),
      notes: this.fb.control('')
    });
    this.healthForm.controls.emergencyContactType.valueChanges.subscribe(value => {
      this.healthForm.controls.emergencyContact.setValidators(value === 'email' ? Validators.email : null);
      this.healthForm.controls.emergencyContact.updateValueAndValidity();
    });
  }

  onSubmit() {
    if (!(this.profileForm.valid && this.healthForm.valid)) {
      showFormErrors(this.profileForm.controls);
      showFormErrors(this.healthForm.controls);
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
