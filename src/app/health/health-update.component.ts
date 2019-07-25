import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { CustomValidators } from '../validators/custom-validators';
import { ValidatorService } from '../validators/validator.service';
import { UserService } from '../shared/user.service';
import { HealthService } from './health.service';

@Component({
  templateUrl: './health-update.component.html',
  styleUrls: [ './health-update.scss' ]
})
export class HealthUpdateComponent implements OnInit {

  profileForm: FormGroup;
  healthForm: FormGroup;

  constructor(
    private fb: FormBuilder,
    private validatorService: ValidatorService,
    private userService: UserService,
    private healthService: HealthService,
    private router: Router,
    private route: ActivatedRoute
  ) {
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
    this.healthForm = this.fb.group({
      emergencyContactName: '',
      emergencyContactType: '',
      emergencyContact: '',
      specialNeeds: '',
      notes: ''
    });
  }

  ngOnInit() {
    const serviceMatchesUser = this.healthService.userDetail.name === this.userService.get().name;
    this.profileForm.patchValue(serviceMatchesUser ? this.healthService.userDetail : this.userService.get());
    this.healthForm.patchValue(serviceMatchesUser ? this.healthService.healthDetail : {});
  }

  onSubmit() {
    this.healthService.userDetail = this.profileForm.value;
    this.healthService.healthDetail = this.healthForm.value;
    this.goBack();
  }

  goBack() {
    this.router.navigate([ '..' ], { relativeTo: this.route });
  }

}
