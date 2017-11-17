import { Component, OnInit, AfterViewInit, ViewChild } from '@angular/core';
import { Location } from '@angular/common';
import { Router } from '@angular/router';
import { MatTableDataSource, MatSort, MatPaginator, MatFormField, MatFormFieldControl } from '@angular/material';
import { MatButtonModule } from '@angular/material/button';

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
  styleUrls: [ './nation.scss' ]
})

export class NationComponent implements OnInit, AfterViewInit {

  allNations = new MatTableDataSource();
  @ViewChild(MatSort) sort: MatSort;
  @ViewChild(MatPaginator) paginator: MatPaginator;
  _id: string;
  name: string;
  admin_name: string;
  nationurl: string;
  action: string;
  displayedColumns = [ 'name', 'admin_name', 'nationurl', '_id' ];
  readonly dbName = 'nations';
  message = '';
  nations = [];
  nationForm: FormGroup;
  deleteItem = {};

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

  ngAfterViewInit() {
    this.allNations.sort = this.sort;
    this.allNations.paginator = this.paginator;
  }

  applyFilter(filterValue: string) {
    filterValue = filterValue.trim();
    filterValue = filterValue.toLowerCase();
    this.allNations.filter = filterValue;
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
        // _all_docs returns object with rows array of objects with 'doc' property that has an object with the data.
        // Map over data.rows to remove the 'doc' property layer
        this.allNations.data = data.rows.map(nation => nation.doc);
      }, (error) => this.message = 'There was a problem getting NationList');
  }

  deleteClick(nation, index) {
    // The ... is the spread operator. The below sets deleteItem a copy of the nation.doc
    // object with an additional index property that is the index within the nations array
    this.deleteItem = { ...nation, index };
    jQuery('#planetDelete').modal('show');
  }

  deleteNation(nation) {
    const { _id: nationId, _rev: nationRev, index } = nation;
    this.couchService.delete('nations/' + nationId + '?rev=' + nationRev)
      .then((data) => {
        this.nations.splice(index, 1);
        jQuery('#planetDelete').modal('hide');
      }, (error) => this.message = 'There was a problem deleting this nation');
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
