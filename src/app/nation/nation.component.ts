import { Component, OnInit, AfterViewInit, ViewChild } from '@angular/core';
import { Location } from '@angular/common';
import { Router } from '@angular/router';
import { MatTableDataSource, MatSort, MatPaginator, MatFormField, MatFormFieldControl, MatDialog } from '@angular/material';
import { DialogsDeleteComponent } from '../shared/dialogs/dialogs-delete.component';
import { DialogsFormService } from '../shared/dialogs/dialogs-form.service';

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

  nations = new MatTableDataSource();
  @ViewChild(MatSort) sort: MatSort;
  @ViewChild(MatPaginator) paginator: MatPaginator;
  displayedColumns = [ 'name', 'admin_name', 'nationurl', 'action' ];
  readonly dbName = 'nations';
  message = '';
  nationForm: FormGroup;
  deleteDialog: any;
  formDialog: any;
  valid_data: {};
  result: any;

  constructor(
    private location: Location,
    private router: Router,
    private fb: FormBuilder,
    private couchService: CouchService,
    private nationValidatorService: NationValidatorService,
    private dialog: MatDialog,
    private dialogsFormService: DialogsFormService
  ) {
    this.createForm();
  }

  ngOnInit() {
    this.getNationList();
  }

  ngAfterViewInit() {
    this.nations.sort = this.sort;
    this.nations.paginator = this.paginator;
  }

  applyFilter(filterValue: string) {
    filterValue = filterValue.trim();
    filterValue = filterValue.toLowerCase();
    this.nations.filter = filterValue;
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
    this.couchService.get(this.dbName + '/_all_docs?include_docs=true')
      .then((data) => {
        // _all_docs returns object with rows array of objects with 'doc' property that has an object with the data.
        // Map over data.rows to remove the 'doc' property layer
        this.nations.data = data.rows.map(nation => nation.doc);
      }, (error) => this.message = 'There was a problem getting NationList');
  }

  deleteClick(nation) {
    this.deleteDialog = this.dialog.open(DialogsDeleteComponent, {
      data: {
        okClick: this.deleteNation(nation),
        type: 'nation',
        displayName: nation.name
      }
    });
    // Reset the message when the dialog closes
    this.deleteDialog.afterClosed().subscribe(() => {
      this.message = '';
    });
  }

  deleteNation(nation) {
    // Return a function with nation on its scope so it can be called from the dialog
    return () => {
      const { _id: nationId, _rev: nationRev } = nation;
      this.couchService.delete(this.dbName + '/' + nationId + '?rev=' + nationRev)
        .then((data) => {
          // It's safer to remove the item from the array based on its id than to splice based on the index
          this.nations.data = this.nations.data.filter((nat: any) => data.id !== nat._id);
          this.deleteDialog.close();
        }, (error) => this.deleteDialog.componentInstance.message = 'There was a problem deleting this nation');
    };
  }

  onSubmit(nation) {
    console.log(this.nationForm.valid);
    if (nation) {
      const formdata = {
        'admin_name': nation.adminName,
        'name': nation.name,
        'nationurl': nation.nationUrl,
        'type': 'nation'
      };
      this.couchService.post(this.dbName, formdata)
        .then((data) => {
          formdata[ '_id' ] = data.id;
          formdata[ '_rev' ] = data.rev;
          this.nations.data.push(formdata);
          console.log(this.nations.data);
        }, (error) => this.message = 'Error');
    } else {
      // Using (<any>Object) allows you to iterate over the actual object refs rather than the keys in TypeScript
      (<any>Object).values(this.nationForm.controls).forEach(control => {
        control.markAsTouched({ onlySelf: true });
      });
    }
  }

  openNationAddForm() {
    const title = 'Add Nation';
    const type = 'nation';
    const fields =
      [
        { 'label': 'Admin Name', 'type': 'textbox', 'name': 'adminName', 'placeholder': 'Admin Name', 'required': true },
        { 'label': 'Nation Name', 'type': 'textbox', 'name': 'name', 'placeholder': 'Nation Name', 'required': true },
        { 'label': 'Nation URL', 'type': 'textbox', 'name': 'nationUrl', 'placeholder': 'Nation URL', 'required': true }
      ];
    const validation = {
      adminName: [ '', Validators.required,
        // an arrow function is for lexically binding 'this' otherwise 'this' would be undefined
        ac => this.nationValidatorService.nationCheckerService$(ac)
      ],
      name: [ '', Validators.required ],
      nationUrl: [ '', Validators.required ],
    };
    this.dialogsFormService
      .confirm(title, type, fields, validation, '')
      .subscribe((res) => {
        console.log('Res', res);
        this.onSubmit(res);
      });
  }

}
