import { Component, Inject } from '@angular/core';
import { MatLegacyDialog as MatDialog, MatLegacyDialogRef as MatDialogRef, MAT_LEGACY_DIALOG_DATA as MAT_DIALOG_DATA } from '@angular/material/legacy-dialog';
import { UntypedFormGroup, UntypedFormBuilder } from '@angular/forms';
import { DialogsLoadingService } from './dialogs-loading.service';
import { DialogsListService } from './dialogs-list.service';
import { DialogsListComponent } from './dialogs-list.component';
import { UserService } from '../user.service';

@Component({
  templateUrl: './dialogs-form.component.html',
  styles: [ `
    .checkbox-wrapper:last-child {
      margin: 0 0 20px 0;
    }

    .mat-radio-group.ng-touched.ng-invalid label {
      border-bottom: 2px solid red;
    }

    .ng-touched.ng-valid {
      border: none;
    }
  ` ]
})
export class DialogsFormComponent {

  public title: string;
  public fields: any;
  public modalForm: UntypedFormGroup;
  passwordVisibility = new Map();
  isSpinnerOk = true;
  errorMessage = '';
  dialogListRef: MatDialogRef<DialogsListComponent>;
  disableIfInvalid = false;

  private markFormAsTouched (formGroup: UntypedFormGroup) {
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
    private fb: UntypedFormBuilder,
    @Inject(MAT_DIALOG_DATA) public data,
    private dialogsLoadingService: DialogsLoadingService,
    private dialogsListService: DialogsListService,
    private userService: UserService
  ) {
    if (this.data && this.data.formGroup) {
      this.modalForm = this.data.formGroup instanceof UntypedFormGroup ?
        this.data.formGroup :
        this.fb.group(this.data.formGroup, this.data.formOptions || {});
      this.title = this.data.title;
      this.fields = this.data.fields.filter(field => !field.planetBeta || this.userService.isBetaEnabled());
      this.isSpinnerOk = false;
      this.disableIfInvalid = this.data.disableIfInvalid || this.disableIfInvalid;
      this.fields.forEach(field => {
        if (field.disabled) {
          this.modalForm.get(field.name)?.disable({ emitEvent: false });
        }
      });
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
