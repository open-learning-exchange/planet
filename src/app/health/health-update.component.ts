import { Component, OnInit, HostListener } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { UntypedFormBuilder, UntypedFormGroup, Validators } from '@angular/forms';
import { CustomValidators } from '../validators/custom-validators';
import { ValidatorService } from '../validators/validator.service';
import { UserService } from '../shared/user.service';
import { HealthService } from './health.service';
import { forkJoin } from 'rxjs';
import { showFormErrors } from '../shared/table-helpers';
import { languages } from '../shared/languages';
import { CanComponentDeactivate } from '../shared/unsaved-changes.guard';
import { UnsavedChangesService } from '../shared/unsaved-changes.service';
import { interval, of, race } from 'rxjs';
import { debounce } from 'rxjs/operators';

@Component({
  templateUrl: './health-update.component.html',
  styleUrls: [ './health-update.scss' ]
})
export class HealthUpdateComponent implements OnInit, CanComponentDeactivate {

  profileForm: UntypedFormGroup;
  healthForm: UntypedFormGroup;
  existingData: any = {};
  languages = languages;
  minBirthDate: Date = this.userService.minBirthDate;
  initialFormValues: any;
  hasUnsavedChanges = false;

  constructor(
    private fb: UntypedFormBuilder,
    private validatorService: ValidatorService,
    private userService: UserService,
    private healthService: HealthService,
    private router: Router,
    private route: ActivatedRoute,
    private unsavedChangesService: UnsavedChangesService
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
        this.unsavedChangesService.setHasUnsavedChanges(this.hasUnsavedChanges);
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
        this.unsavedChangesService.setHasUnsavedChanges(this.hasUnsavedChanges);
      });
  }

  initProfileForm() {
    this.profileForm = this.fb.group({
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
    this.healthForm = this.fb.group({
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
      this.unsavedChangesService.setHasUnsavedChanges(false);
      this.goBack();
    });
  }

  goBack() {
    if (this.hasUnsavedChanges) {
      const confirmLeave = window.confirm($localize`You have unsaved changes. Are you sure you want to leave?`);
      if (!confirmLeave) {
        return;
      }
    }
    this.hasUnsavedChanges = false;
    this.unsavedChangesService.setHasUnsavedChanges(false);
    this.router.navigate([ '..' ], { relativeTo: this.route });
  }

  canDeactivate(): boolean {
    if (this.hasUnsavedChanges) {
      return window.confirm($localize`You have unsaved changes. Are you sure you want to leave?`);
    }
    return true;
  }

  @HostListener('window:beforeunload', [ '$event' ])
  unloadNotification($event: BeforeUnloadEvent): void {
    if (this.hasUnsavedChanges) {
      $event.returnValue = $localize`You have unsaved changes. Are you sure you want to leave?`;
    }
  }

}
