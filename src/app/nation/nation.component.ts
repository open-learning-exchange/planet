import { Component, OnInit } from '@angular/core';
import { Location } from '@angular/common';
import { Router } from '@angular/router';
declare var jQuery:any;
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
import {ViewChild, ElementRef} from '@angular/core';

@Component({
  templateUrl: './nation.component.html'
})

export class NationComponent implements OnInit {
  @ViewChild('closeBtn') closeBtn: ElementRef;
  readonly dbName = 'nations';
  message = '';
  nation = [];
  nationdata = [];
  nationForm: FormGroup;

  constructor(
    private location: Location,
    private router: Router,
    private fb: FormBuilder,
    private couchService: CouchService,
    private nationValidatorService: NationValidatorService
  ) {
      this.createForm();
    }
  ngOnInit() {
    this.getNationList();
  }

  createForm() {
    this.nationForm = this.fb.group({
      adminName: ['', Validators.required,
        // an arrow function is for lexically binding 'this' otherwise 'this' would be undefined
        ac => this.nationValidatorService.nationCheckerService$(ac)
      ],
      name: ['', Validators.required],
      nationUrl: ['', Validators.required] 
    });
  }

  getNationList() {
    this.couchService.get('nations/_all_docs?include_docs=true')
      .then((data) => {
        this.nation = data.rows;
        console.log(this.nation)
      }, (error) => this.message = 'There was a problem getting NationList');
  }
  onSubmit(nation) {
    if (nation.nation_name !== '' && nation.nationurl !== '') {
      let formdata = {
        'admin_name': nation.adminName,
        'nation_name': nation.name,
        'nationurl': nation.nationUrl,
        'type': 'nation'
      };
      this.couchService.post('nations', formdata)
        .then((data) => {
          formdata['_id'] = data.id;
          formdata['_rev'] = data.rev;
          this.nation.push({doc:formdata});
          jQuery('#myModal').modal("hide");
        },(error) => this.message = 'Error');
    } else {
      this.message = 'Please complete the form';
    }
  }
  refresh(){
    jQuery(".form-control").val('').trigger("change");
  }
}
