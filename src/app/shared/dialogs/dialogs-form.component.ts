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
  templateUrl: './dialogs-form.component.html',
  styles: [ `.modalForm-full-width {
      width: 28em;
    }
  `]
})
export class DialogsFormComponent {

  public title: string;
  public type: string;
  public fields: any;
  public validation: any;
  public message: string;
  public modalForm: FormGroup;

  constructor(public dialogRef: MatDialogRef<DialogsFormComponent>, public fb: FormBuilder) { }

}
