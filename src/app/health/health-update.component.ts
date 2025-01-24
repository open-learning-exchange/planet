import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { CustomValidators } from '../validators/custom-validators';
import { ValidatorService } from '../validators/validator.service';
import { UserService } from '../shared/user.service';
import { HealthService } from './health.service';
import { forkJoin } from 'rxjs';
import { showFormErrors } from '../shared/table-helpers';
import { languages } from '../shared/languages';

@Component({
  templateUrl: './health-update.component.html',
  styleUrls: [ './health-update.scss' ]
})
export class HealthUpdateComponent implements OnInit {

  profileForm: FormGroup;
  healthForm: FormGroup;
  existingData: any = {};
  languages = languages;
  minBirthDate: Date = this.userService.minBirthDate;

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
      notes: '',
      allergies: ''
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
    ]).subscribe(() => this.goBack());
  }

  goBack() {
    this.router.navigate([ '..' ], { relativeTo: this.route });
  }

}
