import { Component, Inject } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material';
import { FormGroup } from '@angular/forms';

@Component({
  templateUrl: './dialogs-form.component.html'
})
export class DialogsFormComponent {

  public title: string;
  public fields: any;
  public modalForm: any;

  private markFormAsTouched (formGroup: FormGroup) {
    (<any>Object).values(formGroup.controls).forEach(control => {
      control.markAsTouched();
      if (control.controls) {
        this.markFormAsTouched(control);
      }
    });
  }

  constructor(public dialogRef: MatDialogRef<DialogsFormComponent>, @Inject(MAT_DIALOG_DATA) public data: any) {
    console.log(`DATA: ${data}`);
  }

  onSubmit(mForm, dialog) {
    if (data) {
      return this.data.okSubmit();
    }
    // default behavior
    if (mForm.valid) {
      dialog.close(mForm.value);
    } else {
      this.markFormAsTouched(mForm);
    }
  }

  onRatingChange(fieldName: string) {
    console.log(fieldName);
  }

}
