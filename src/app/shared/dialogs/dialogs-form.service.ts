import { Observable } from 'rxjs';
import { DialogsFormComponent } from './dialogs-form.component';
import { MatLegacyDialogRef as MatDialogRef, MatLegacyDialog as MatDialog } from '@angular/material/legacy-dialog';
import { Injectable } from '@angular/core';
import { AbstractControlOptions, FormBuilder, FormGroup } from '@angular/forms';

type DialogFieldType = | 'checkbox' | 'textbox' | 'password' | 'selectbox' | 'radio'
  | 'rating' | 'textarea' | 'markdown' | 'dialog' | 'date' | 'time' | 'toggle' | string;

export interface DialogField {
  name: string;
  type: DialogFieldType;
  placeholder?: string;
  label?: string;
  required?: boolean;
  disabled?: boolean;
  multiple?: boolean;
  options?: Array<{ name: string; value?: unknown } | string>;
  planetBeta?: boolean;
  tooltip?: string;
  reset?: boolean;
  text?: string;
  authorizedRoles?: string | string[];
  imageGroup?: unknown;
  db?: string;
  [key: string]: unknown;
}

export interface DialogsFormOptions {
  autoFocus?: boolean;
  disableIfInvalid?: boolean;
  onSubmit?: (value: any, form: FormGroup) => void;
  formOptions?: AbstractControlOptions;
  closeOnSubmit?: boolean;
  [key: string]: unknown;
}

export interface DialogsFormData extends DialogsFormOptions {
  title: string;
  fields: DialogField[];
  formGroup: FormGroup | any;
}

@Injectable()
export class DialogsFormService {

  private dialogRef?: MatDialogRef<DialogsFormComponent>;

  constructor(private dialog: MatDialog, private fb: FormBuilder) { }

  public confirm(title: string, fields: DialogField[], formGroup: FormGroup | any, autoFocus = false): Observable<any> {
    const dialogRef = this.dialog.open<DialogsFormComponent, DialogsFormData>(DialogsFormComponent, {
      width: '600px',
      autoFocus,
      data: { title, fields, formGroup, closeOnSubmit: true }
    });
    return dialogRef.afterClosed();
  }

  openDialogsForm(title: string, fields: DialogField[], formGroup: FormGroup | any, options: DialogsFormOptions = {}) {
    this.dialogRef = this.dialog.open<DialogsFormComponent, DialogsFormData>(DialogsFormComponent, {
      width: '600px',
      autoFocus: options.autoFocus,
      data: { title, formGroup, fields, ...options }
    });
  }

  closeDialogsForm() {
    this.dialogRef?.close();
  }

  showErrorMessage(errorMessage: string) {
    if (this.dialogRef?.componentInstance) {
      this.dialogRef.componentInstance.errorMessage = errorMessage;
    }
  }

}
