import { Component, OnInit } from '@angular/core';
import { Location } from '@angular/common';
import { Router } from '@angular/router';

import {
  FormBuilder,
  FormControl,
  FormGroup,
  FormArray,
  Validators
} from '@angular/forms';

import { CouchService } from '../shared/couchdb.service';
import { CustomValidators } from '../validators/custom-validators';
import { NationValidatorService } from '../validators/nation-validator.service';

@Component({
  selector: 'app-nation',
  templateUrl: './nation.component.html',
  styleUrls: ['./nation.component.scss']
})
export class NationComponent{
  message = '';
  readonly dbName = 'nations';
  nationForm : FormGroup;

  constructor(
    private location: Location,
    private router: Router,
    private fb: FormBuilder,
    private couchService: CouchService,
    private nationValidatorService: NationValidatorService
  ) {
      this.createForm();
    }

  createForm() {
    this.nationForm = this.fb.group({
      adminName: ['', Validators.required,
        // an arrow function is for lexically binding 'this' otherwise 'this' would be undefined
        ac => this.nationValidatorService.nationCheckerService$(ac)
      ],
      name: ['', Validators.required],
      nationUrl: ['', Validators.required],
      type:['', Validators.required]
    });
  }

  cancel() {
    this.location.back();
  }

  onSubmit(nation) {
    if(nation.nation_name !== "" && nation.nationurl !== "" && nation.type !=="") {
      this.couchService.post('nations', {'adminname':nation.adminName, 'nationname': nation.name,'nationurl':nation.nationUrl, 'type':nation.type}, )
        .then((data) => {
        alert('Nation has been sucessfully created');
        this.router.navigate(['']);
      }, (error) => this.message = 'Error');
    }else{
      this.message = 'Please complete the form';
    }
  }
}


