import { Component, Inject } from '@angular/core';
import { MatDialogRef } from '@angular/material';
import { FormGroup } from '@angular/forms';

@Component({
  templateUrl: './dialogs-form.component.html'
})
export class DialogsFormComponent {

  public title: string;
  public fields: any;
  public modalForm: any;
  passwordVisibility = new Map();

  private markFormAsTouched (formGroup: FormGroup) {
    (<any>Object).values(formGroup.controls).forEach(control => {
      control.markAsTouched();
      if (control.controls) {
        this.markFormAsTouched(control);
      }
    });
  }

  constructor(public dialogRef: MatDialogRef<DialogsFormComponent>) { }

  onSubmit(mForm, dialog) {
    if (mForm.valid) {
      dialog.close(mForm.value);
    } else {
      this.markFormAsTouched(mForm);
    }
  }

  onRatingChange(fieldName: string) {
    console.log(fieldName);
  }

  togglePasswordVisibility(fieldName) {
    const visibility = this.passwordVisibility.get(fieldName) || false;
    this.passwordVisibility.set(fieldName, !visibility);
  }

}
