import { Component, OnChanges, Inject, Input } from '@angular/core';
import { MatDialogRef } from '@angular/material';
import {
  FormBuilder,
  FormControl,
  FormGroup,
  FormArray,
  Validators
} from '@angular/forms';

@Component({
  templateUrl: './form-dialog.component.html',
  styleUrls: [ './form-dialog.scss' ]
})
export class FormDialogComponent {

  public title: string;
  public type: string;
  public fields: any;
  public validation: any;
  public message: string;
  public modalForm: FormGroup;

  constructor(public dialogRef: MatDialogRef<FormDialogComponent>, public fb: FormBuilder) { }

}
