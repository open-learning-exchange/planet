import { Component, OnInit, HostListener } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { UntypedFormBuilder, UntypedFormGroup, Validators } from '@angular/forms';
import { interval, of, race, forkJoin } from 'rxjs';
import { debounce } from 'rxjs/operators';
import { CustomValidators } from '../validators/custom-validators';
import { UserService } from '../shared/user.service';
import { HealthService } from './health.service';
import { showFormErrors } from '../shared/table-helpers';
import { languages } from '../shared/languages';
import { CanComponentDeactivate } from '../shared/unsaved-changes.guard';
import { warningMsg } from '../shared/unsaved-changes.component';

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
        CustomValidators.dateValidRequired
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
