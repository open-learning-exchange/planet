import { Component, Inject } from '@angular/core';
import { MatDialog, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { FormGroup, FormBuilder } from '@angular/forms';
import { DialogsLoadingService } from './dialogs-loading.service';
import { DialogsListService } from './dialogs-list.service';
import { DialogsListComponent } from './dialogs-list.component';

@Component({
  templateUrl: './dialogs-form.component.html',
  styles: [ `
    .checkbox-wrapper:last-child {
      margin: 0 0 20px 0;
    }
  ` ]
})
export class DialogsFormComponent {

  public title: string;
  public fields: any;
  public modalForm: FormGroup;
  passwordVisibility = new Map();
  isSpinnerOk = true;
  errorMessage = '';
  dialogListRef: MatDialogRef<DialogsListComponent>;
  disableIfInvalid = false;

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
    private dialog: MatDialog,
    private fb: FormBuilder,
    @Inject(MAT_DIALOG_DATA) public data,
    private dialogsLoadingService: DialogsLoadingService,
    private dialogsListService: DialogsListService
  ) {
    if (this.data && this.data.formGroup) {
      this.modalForm = this.data.formGroup instanceof FormGroup ?
        this.data.formGroup :
        this.fb.group(this.data.formGroup, this.data.formOptions || {});
      this.title = this.data.title;
      this.fields = this.data.fields;
      this.isSpinnerOk = false;
      this.disableIfInvalid = this.data.disableIfInvalid || this.disableIfInvalid;
    }
  }

  onSubmit(mForm, dialog) {
    if (!mForm.valid) {
      this.markFormAsTouched(mForm);
      return;
    }
    if (this.data && this.data.onSubmit) {
      this.dialogsLoadingService.start();
      this.data.onSubmit(mForm.value, mForm);
    }
    if (!this.data || this.data.closeOnSubmit === true) {
      this.dialogsLoadingService.stop();
      dialog.close(mForm.value);
    }
  }

  togglePasswordVisibility(fieldName) {
    const visibility = this.passwordVisibility.get(fieldName) || false;
    this.passwordVisibility.set(fieldName, !visibility);
  }

  openDialog(field) {
    const initialSelection = this.modalForm.controls[field.name].value.map((value: any) => value._id);
    this.dialogsLoadingService.start();
    this.dialogsListService.attachDocsData(field.db, 'title', this.dialogOkClick(field).bind(this), initialSelection).subscribe((data) => {
      this.dialogsLoadingService.stop();
      this.dialogListRef = this.dialog.open(DialogsListComponent, {
        data: data,
        maxHeight: '500px',
        width: '600px',
        autoFocus: false
      });
    });
  }

  dialogOkClick(field) {
    return (selection) => {
      this.modalForm.controls[field.name].setValue(selection);
      this.dialogListRef.close();
      this.modalForm.markAsDirty();
    };
  }

  isValid() {
    return this.modalForm.status === 'VALID';
  }

  isDirty() {
    return this.modalForm.dirty;
  }

}
