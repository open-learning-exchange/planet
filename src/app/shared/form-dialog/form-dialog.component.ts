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
  selector: 'form-dialog',
  templateUrl: './form-dialog.component.html'
})
export class FormDialogComponent{

  public title: string;
  public fields: any;
  public message: string;
  public modalForm: FormGroup;
  
  constructor(public dialogRef: MatDialogRef<FormDialogComponent>, public fb: FormBuilder) { }

}
