import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormBuilder, FormGroup } from '@angular/forms';
import { CustomValidators } from '../validators/custom-validators';
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
    this.healthService.addEvent({ ...this.healthForm.value, date: Date.now() });
    this.goBack();
  }

  goBack() {
    this.router.navigate([ '..' ], { relativeTo: this.route });
  }

}
