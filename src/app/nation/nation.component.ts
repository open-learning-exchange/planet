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
  templateUrl: './nation.component.html'
})

export class NationComponent implements OnInit {
  message = '';
  nation = [];
  readonly dbName = 'nations';
  nationForm: FormGroup;
  i;
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
  event(i) {
    this.i = i + 1;
  }
  createForm() {
    this.nationForm = this.fb.group({
      adminName: ['', Validators.required,
        // an arrow function is for lexically binding 'this' otherwise 'this' would be undefined
        ac => this.nationValidatorService.nationCheckerService$(ac)
      ],
      name: ['', Validators.required],
      nationUrl: ['', Validators.required],
      type: ['', Validators.required]
    });
  }

  cancel() {
    this.location.back();
  }

  getNationList() {
    this.i = 0;
    this.couchService.get('nations/_all_docs?include_docs=true')
      .then((data) => {
        this.nation = data.rows;
      }, (error) => this.message = 'There was a problem getting NationList');
  }

  deleteNation(nationId, nationRev, index){
    const nationDelete = confirm('Are you sure you want to delete?')
    if (nationDelete){
      this.couchService.delete('nations/' + nationId + '?rev=' + nationRev)
      .then((data) => {
        this.nation.splice(index,1);
      }, (error) => this.message = 'There was a problem deleting this meetup');
    }
  }

  onSubmit(nation) {
    this.i = 0;
    if (nation.nation_name !== '' && nation.nationurl !== '' && nation.type !== '') {
      this.couchService.post('nations', {
          'admin_name': nation.adminName,
          'name': nation.name,
          'nationurl': nation.nationUrl,
          'type': nation.type
        })
        .then((data) => {
          alert('Nation has been sucessfully created');
          this.router.navigate(['nation']);
          location.reload();
        }, (error) => this.message = 'Error');
    } else {
      this.message = 'Please complete the form';
    }
  }
}
