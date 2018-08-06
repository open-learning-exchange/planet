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

  constructor(public dialogRef: MatDialogRef<DialogsFormComponent>, @Inject(MAT_DIALOG_DATA) public data: any) { }

  onSubmit(formGroup: FormGroup) {
    if (this.data.submitForm && formGroup.valid) {
      return this.data.submitForm(formGroup.value);
    }
    // default behavior
    if (formGroup.valid) {
      this.dialogRef.close(formGroup.value);
    } else {
      this.markFormAsTouched(formGroup);
    }
  }

  onRatingChange(fieldName: string) {
    console.log(fieldName);
  }

}
