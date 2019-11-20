import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormBuilder, FormGroup } from '@angular/forms';

@Component({
  templateUrl: './health-list.component.html',
})
export class HealthListComponent {

  healthForm: FormGroup;

}
