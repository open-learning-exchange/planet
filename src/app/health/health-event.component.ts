import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormBuilder, FormGroup } from '@angular/forms';
import { HealthService } from './health.service';
import { conditions } from './health.constants';
import { UserService } from '../shared/user.service';
import { StateService } from '../shared/state.service';
import { CustomValidators } from '../validators/custom-validators';

@Component({
  templateUrl: './health-event.component.html',
  styleUrls: [ './health-update.scss' ]
})
export class HealthEventComponent implements OnInit {

  healthForm: FormGroup;
  conditions = conditions;

  constructor(
    private fb: FormBuilder,
    private healthService: HealthService,
    private router: Router,
    private route: ActivatedRoute,
    private userService: UserService,
    private stateService: StateService
  ) {
    this.healthForm = this.fb.group({
      temperature: [ '', CustomValidators.positiveNumberValidator ],
      pulse: [ '', CustomValidators.positiveNumberValidator ],
      bp: [ '', CustomValidators.bpValidator ],
      height: [ '', CustomValidators.positiveNumberValidator ],
      weight: [ '', CustomValidators.positiveNumberValidator ],
      vision: [ '' ],
      hearing: [ '' ],
      notes: '',
      diagnosis: '',
      treatments: '',
      medications: '',
      immunizations: '',
      allergies: '',
      xrays: '',
      tests: '',
      referrals: '',
      conditions: {}
    });
  }

  ngOnInit() {
  }

  onSubmit() {
    this.healthService.addEvent(
      this.route.snapshot.params.id,
      {
        ...this.healthForm.value,
        date: Date.now(),
        selfExamination: this.route.snapshot.params.id === this.userService.get()._id,
        createdBy: this.userService.get()._id,
        planetCode: this.stateService.configuration.code
      }
    ).subscribe(() => {
      this.goBack();
    });
  }

  isEmptyForm() {
    return Object.values(this.healthForm.controls).every(control => control.value === '');
  }

  goBack() {
    this.router.navigate([ '..' ], { relativeTo: this.route });
  }

  conditionChange(condition) {
    const currentConditions = this.healthForm.controls.conditions.value;
    this.healthForm.controls.conditions.setValue({ ...currentConditions, [condition]: currentConditions[condition] !== true });
  }

}
