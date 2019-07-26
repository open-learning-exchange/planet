import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { CustomValidators } from '../validators/custom-validators';
import { ValidatorService } from '../validators/validator.service';
import { UserService } from '../shared/user.service';
import { HealthService } from './health.service';

@Component({
  templateUrl: './health-event.component.html',
  styleUrls: [ './health-update.scss' ]
})
export class HealthEventComponent implements OnInit {

  healthForm: FormGroup;

  constructor(
    private fb: FormBuilder,
    private validatorService: ValidatorService,
    private userService: UserService,
    private healthService: HealthService,
    private router: Router,
    private route: ActivatedRoute
  ) {
    this.healthForm = this.fb.group({
      temperature: [ '', CustomValidators.required ],
      pulse: [ '', CustomValidators.required ],
      bp: [ '', CustomValidators.required ],
      height: [ '', CustomValidators.required ],
      weight: [ '', CustomValidators.required ],
      vision: [ '', CustomValidators.required ],
      hearing: [ '', CustomValidators.required ],
      notes: '',
      diagnosis: '',
      treatments: '',
      medications: '',
      immunizations: '',
      allergies: '',
      xrays: '',
      tests: '',
      referrals: ''
    });
  }

  ngOnInit() {
  }

  onSubmit() {
    this.healthService.addEvent({ ...this.healthForm.value, date: Date.now() });
    this.goBack();
  }

  goBack() {
    this.router.navigate([ '..' ], { relativeTo: this.route });
  }

}
