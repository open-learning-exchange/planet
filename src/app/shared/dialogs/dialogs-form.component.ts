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
  templateUrl: './dialogs-form.component.html'
})
export class DialogsFormComponent {

  public title: string;
  public type: string;
  public fields: any;
  public validation: any;
  public message: string;
  public modalForm: FormGroup;

  private markFormAsTouched (formGroup: FormGroup) {
    (<any>Object).values(formGroup.controls).forEach(control => {
      control.markAsTouched();
      if (control.controls) {
        this.markFormAsTouched(control);
      }
    });
  }

  constructor( public dialogRef: MatDialogRef<DialogsFormComponent>, public fb: FormBuilder ) { }

  onSubmit(mForm, dialog) {
    if (dialog.componentInstance.modalForm.valid) {
      dialog.close(mForm);
    } else {
      this.markFormAsTouched(this.modalForm);
    }
  }

  valueChange(event) {
    if (event.key) {
      this.message = '';
    }
  }

}
