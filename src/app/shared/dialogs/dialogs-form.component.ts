import { Component, Inject, Input } from '@angular/core';
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
  ` ]
})
export class DialogsFormComponent {
  message = '';

  public title: string;
  public type: string;
  public fields: any;
  public validation: any;
  public message: string;
  public modalForm: FormGroup;
  readonly dbName = 'nations';

  constructor( public dialogRef: MatDialogRef<DialogsFormComponent>, public fb: FormBuilder ) { }

  onSubmit(mForm, dialog) {
    if (dialog.componentInstance.modalForm.valid) {
      dialog.close(mForm);
    } else {
    this.message = 'Please complete the form';
    }
  }

  valueChange(event) {
    if (event.key) {
      this.message = '';
    }
  }

}
