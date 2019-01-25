import { Component, Inject } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material';
import { FormGroup, FormBuilder } from '@angular/forms';
import { DialogsLoadingService } from './dialogs-loading.service';

@Component({
  templateUrl: './dialogs-form.component.html'
})
export class DialogsFormComponent {

  public title: string;
  public fields: any;
  public modalForm: any;
  passwordVisibility = new Map();
  isSpinnerOk = true;

  private markFormAsTouched (formGroup: FormGroup) {
    (<any>Object).values(formGroup.controls).forEach(control => {
      control.markAsTouched();
      if (control.controls) {
        this.markFormAsTouched(control);
      }
    });
  }

  constructor(
    public dialogRef: MatDialogRef<DialogsFormComponent>,
    private fb: FormBuilder,
    @Inject(MAT_DIALOG_DATA) public data,
    private dialogsLoadingService: DialogsLoadingService
  ) {
    if (this.data.formGroup) {
      this.modalForm = this.data.formGroup instanceof FormGroup ? this.data.formGroup : this.fb.group(this.data.formGroup);
      this.title = this.data.title;
      this.fields = this.data.fields;
      this.isSpinnerOk = false;
    }
  }

  onSubmit(mForm, dialog) {
    if (!mForm.valid) {
      this.markFormAsTouched(mForm);
      return;
    }
    this.dialogsLoadingService.start();
    if (this.data.onSubmit) {
      this.data.onSubmit(mForm.value);
    } else {
      dialog.close(mForm.value);
    }
  }

  togglePasswordVisibility(fieldName) {
    const visibility = this.passwordVisibility.get(fieldName) || false;
    this.passwordVisibility.set(fieldName, !visibility);
  }

}
