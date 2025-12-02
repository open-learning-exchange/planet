import { Observable } from 'rxjs';
import { DialogsFormComponent } from './dialogs-form.component';
import { MatLegacyDialogRef as MatDialogRef, MatLegacyDialog as MatDialog } from '@angular/material/legacy-dialog';
import { Injectable } from '@angular/core';
import { AbstractControlOptions, AsyncValidatorFn, FormArray, FormControl, FormControlState, FormGroup, ValidatorFn } from '@angular/forms';

type DialogFieldType = | 'checkbox' | 'textbox' | 'password'| 'selectbox' | 'radio'
  | 'rating' | 'textarea' | 'markdown' | 'dialog' | 'date' | 'time' | 'toggle' | string;

export interface DialogField<TName extends string = string> {
  name: TName;
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

export interface DialogFormValueMap {
  [key: string]: unknown;
}

type DialogControlConfig<TValue> = | TValue | FormControlState<TValue> | FormControl<TValue> | FormGroup<any> | FormArray<any>
  | [
    TValue | FormControlState<TValue>,
    (ValidatorFn | ValidatorFn[] | null | undefined)?,
    (AsyncValidatorFn | AsyncValidatorFn[] | null | undefined)?
  ]
  | Array< | TValue | FormControlState<TValue> | ValidatorFn | ValidatorFn[] | AsyncValidatorFn | AsyncValidatorFn[]>;

export type DialogFormGroupConfig<T extends DialogFormValueMap> = {
  [K in keyof T]?: DialogControlConfig<T[K]>;
} & Record<string, DialogControlConfig<any>>;

export type DialogFormGroupInput<T extends DialogFormValueMap> = | FormGroup | DialogFormGroupConfig<T>;

export interface DialogsFormOptions<T extends DialogFormValueMap = DialogFormValueMap> {
  autoFocus?: boolean;
  disableIfInvalid?: boolean;
  onSubmit?: (value: T, form: FormGroup) => void;
  formOptions?: AbstractControlOptions;
  closeOnSubmit?: boolean;
  [key: string]: unknown;
}

export interface DialogsFormData<T extends DialogFormValueMap = DialogFormValueMap>
  extends DialogsFormOptions<T> {
  title: string;
  fields: DialogField[];
  formGroup: DialogFormGroupInput<T>;
}

@Injectable()
export class DialogsFormService {

  private dialogRef?: MatDialogRef<DialogsFormComponent>;

  constructor(private dialog: MatDialog) { }

  public confirm<T extends DialogFormValueMap = DialogFormValueMap>(
    title: string,
    fields: DialogField[],
    formGroup: DialogFormGroupInput<T>,
    autoFocus = false
  ): Observable<T | undefined> {
    const dialogRef = this.dialog.open<DialogsFormComponent, DialogsFormData<T>>(DialogsFormComponent, {
      width: '600px',
      autoFocus,
      data: { title, fields, formGroup, closeOnSubmit: true }
    });
    return dialogRef.afterClosed() as Observable<T | undefined>;
  }

  openDialogsForm<T extends DialogFormValueMap = DialogFormValueMap>(
    title: string,
    fields: DialogField[],
    formGroup: DialogFormGroupInput<T>,
    options: DialogsFormOptions<T> = {}
  ) {
    this.dialogRef = this.dialog.open<DialogsFormComponent, DialogsFormData<T>>(DialogsFormComponent, {
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
