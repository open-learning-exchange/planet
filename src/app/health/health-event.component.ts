import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormBuilder, FormGroup } from '@angular/forms';
import { HealthService } from './health.service';
import { conditions } from './health.constants';

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
    private route: ActivatedRoute
  ) {
    this.healthForm = this.fb.group({
      temperature: [ '' ],
      pulse: [ '' ],
      bp: [ '' ],
      height: [ '' ],
      weight: [ '' ],
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
    this.healthService.addEvent(this.route.snapshot.params.id, { ...this.healthForm.value, date: Date.now() }).subscribe(() => {
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
