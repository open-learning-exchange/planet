import { Component, Inject } from '@angular/core';
import {
  MatLegacyDialog as MatDialog, MatLegacyDialogRef as MatDialogRef, MAT_LEGACY_DIALOG_DATA as MAT_DIALOG_DATA
} from '@angular/material/legacy-dialog';
import {
  AbstractControl,
  FormArray,
  FormBuilder,
  FormGroup
} from '@angular/forms';
import { DialogsLoadingService } from './dialogs-loading.service';
import { DialogsListService } from './dialogs-list.service';
import { DialogsListComponent } from './dialogs-list.component';
import { UserService } from '../user.service';

export interface DialogFieldOption {
  name: string;
  value: unknown;
}

export interface DialogSelection {
  _id: string;
  [key: string]: unknown;
}

export interface DialogField {
  name: string;
  type:
  | 'checkbox'
  | 'textbox'
  | 'password'
  | 'selectbox'
  | 'radio'
  | 'rating'
  | 'textarea'
  | 'markdown'
  | 'dialog'
  | 'date'
  | 'time'
  | 'toggle';
  placeholder?: string;
  label?: string;
  text?: string;
  options?: DialogFieldOption[];
  required?: boolean;
  disabled?: boolean;
  min?: number | string;
  max?: number | string;
  minLength?: number;
  maxLength?: number;
  inputType?: string;
  multiple?: boolean;
  reset?: boolean;
  planetBeta?: boolean;
  db?: string;
  authorizedRoles?: string | string[];
  imageGroup?: string;
}

export type DialogFormControls = { [key: string]: AbstractControl<unknown> };
export type DialogFormGroup = FormGroup<DialogFormControls>;
export type DialogFormSubmit = (value: Record<string, unknown>, form: DialogFormGroup) => void;

export interface DialogFormData {
  formGroup: DialogFormGroup | Record<string, unknown>;
  fields: DialogField[];
  title: string;
  disableIfInvalid?: boolean;
  closeOnSubmit?: boolean;
  formOptions?: Parameters<FormBuilder['group']>[1];
  autoFocus?: boolean;
  onSubmit?: DialogFormSubmit;
}

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
  public fields: DialogField[];
  public modalForm: DialogFormGroup;
  passwordVisibility = new Map<string, boolean>();
  isSpinnerOk = true;
  errorMessage = '';
  dialogListRef: MatDialogRef<DialogsListComponent>;
  disableIfInvalid = false;

  private markFormAsTouched (formGroup: DialogFormGroup) {
    Object.values(formGroup.controls).forEach((control) => {
      control.markAsTouched();
      if (control instanceof FormGroup) {
        this.markFormAsTouched(control as DialogFormGroup);
      }
      if (control instanceof FormArray) {
        control.controls.forEach((childControl) => {
          if (childControl instanceof FormGroup) {
            this.markFormAsTouched(childControl as DialogFormGroup);
          } else {
            childControl.markAsTouched();
          }
        });
      }
    });
  }

  constructor(
    public dialogRef: MatDialogRef<DialogsFormComponent>,
    private dialog: MatDialog,
    private fb: FormBuilder,
    @Inject(MAT_DIALOG_DATA) public data: DialogFormData,
    private dialogsLoadingService: DialogsLoadingService,
    private dialogsListService: DialogsListService,
    private userService: UserService
  ) {
    if (this.data && this.data.formGroup) {
      this.modalForm = this.data.formGroup instanceof FormGroup ?
        this.data.formGroup as DialogFormGroup :
        this.fb.group(this.data.formGroup, this.data.formOptions || {}) as DialogFormGroup;
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

  onSubmit(mForm: DialogFormGroup, dialog: MatDialogRef<DialogsFormComponent>) {
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

  togglePasswordVisibility(fieldName: string) {
    const visibility = this.passwordVisibility.get(fieldName) || false;
    this.passwordVisibility.set(fieldName, !visibility);
  }

  openDialog(field: DialogField) {
    const formControl = this.modalForm.controls[field.name];
    const selection = formControl?.value as DialogSelection[];
    const initialSelection = Array.isArray(selection) ? selection.map((value: DialogSelection) => value._id) : [];
    this.dialogsLoadingService.start();
    this.dialogsListService.attachDocsData(field.db as string, 'title', this.dialogOkClick(field).bind(this), initialSelection).subscribe(
(data) => {
      this.dialogsLoadingService.stop();
      this.dialogListRef = this.dialog.open(DialogsListComponent, {
        data: data,
        maxHeight: '500px',
        width: '600px',
        autoFocus: false
      });
    });
  }

  dialogOkClick(field: DialogField) {
    return (selection: DialogSelection[]) => {
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
