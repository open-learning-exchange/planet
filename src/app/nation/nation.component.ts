import { Component, OnInit } from '@angular/core';
import { Location } from '@angular/common';
import { Router } from '@angular/router';
declare var jQuery: any;
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
  templateUrl: './nation.component.html',
})

export class NationComponent implements OnInit {
  readonly dbName = 'nations';
  message = '';
  nations = [];
  nationForm: FormGroup;
  searchText='';

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
      adminName: [ '', Validators.required,
        // an arrow function is for lexically binding 'this' otherwise 'this' would be undefined
        ac => this.nationValidatorService.nationCheckerService$(ac)
      ],
      name: [ '', Validators.required ],
      nationUrl: [ '', Validators.required ],
    });
  }

  getNationList() {
    this.couchService.get('nations/_all_docs?include_docs=true')
      .then((data) => {
        this.nations = data.rows;
        console.log(this.nations);
      }, (error) => this.message = 'There was a problem getting NationList');
  }

  deleteNation(nationId, nationRev, index) {
    const nationDelete = confirm('Are you sure you want to delete?');
    if (nationDelete) {
      this.couchService.delete('nations/' + nationId + '?rev=' + nationRev)
      .then((data) => {
        this.nations.splice(index, 1);
      }, (error) => this.message = 'There was a problem deleting this meetup');
    }
  }

  onSubmit(nation) {
    if (this.nationForm.valid) {
      const formdata = {
        'admin_name': nation.adminName,
        'name': nation.name,
        'nationurl': nation.nationUrl,
        'type': 'nation'
      };
      this.couchService.post('nations', formdata)
        .then((data) => {
          formdata[ '_id' ] = data.id;
          formdata[ '_rev' ] = data.rev;
          this.nations.push({ doc: formdata });
          jQuery('#nationAdd').modal('hide');
        }, (error) => this.message = 'Error');
    } else {
      // Using (<any>Object) allows you to iterate over the actual object refs rather than the keys in TypeScript
      (<any>Object).values(this.nationForm.controls).forEach(control => {
        control.markAsTouched({ onlySelf: true });
      });
    }
  }

  openNationAddForm() {
    this.createForm();
  }

}
