import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormBuilder, FormGroup } from '@angular/forms';
import { HealthService } from './health.service';

@Component({
  templateUrl: './health-event.component.html',
  styleUrls: [ './health-update.scss' ]
})
export class HealthEventComponent implements OnInit {

  healthForm: FormGroup;

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
      referrals: ''
    });
  }

  ngOnInit() {
  }

  onSubmit() {
    this.healthService.addEvent(this.route.snapshot.params.id, { ...this.healthForm.value, date: Date.now() }).subscribe(() => {
      this.goBack();
    });
  }

  isEmptyForm() {
    return this.healthForm.controls.temperature.value === '' && this.healthForm.controls.pulse.value === '' &&
            this.healthForm.controls.bp.value === '' && this.healthForm.controls.height.value === '' &&
            this.healthForm.controls.weight.value === '' && this.healthForm.controls.vision.value === '' &&
            this.healthForm.controls.hearing.value === '' && this.healthForm.controls.notes.value === '' &&
            this.healthForm.controls.diagnosis.value === '' && this.healthForm.controls.treatments.value === '' &&
            this.healthForm.controls.medications.value === '' && this.healthForm.controls.immunizations.value === ''
            && this.healthForm.controls.allergies.value === '' && this.healthForm.controls.xrays.value === '' &&
            this.healthForm.controls.tests.value === '' && this.healthForm.controls.referrals.value === '';
  }

  goBack() {
    this.router.navigate([ '..' ], { relativeTo: this.route });
  }

}
