import { Observable } from 'rxjs';
import { DialogsFormComponent } from './dialogs-form.component';
import { MatLegacyDialogRef as MatDialogRef, MatLegacyDialog as MatDialog } from '@angular/material/legacy-dialog';
import { Injectable } from '@angular/core';
import {
  AbstractControlOptions,
  AsyncValidatorFn,
  FormArray,
  FormBuilder,
  FormControl,
  FormControlState,
  FormGroup,
  ValidatorFn
} from '@angular/forms';

export type DialogFieldType =
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
  | 'toggle'
  | string;

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

type DialogControlConfig<TValue> =
  | TValue
  | FormControlState<TValue>
  | FormControl<TValue>
  | FormGroup<any>
  | FormArray<any>
  | [
    TValue | FormControlState<TValue>,
    (ValidatorFn | ValidatorFn[] | null)?,
    (AsyncValidatorFn | AsyncValidatorFn[] | null)?
  ]
  | Array<
    | TValue
    | FormControlState<TValue>
    | ValidatorFn
    | ValidatorFn[]
    | AsyncValidatorFn
    | AsyncValidatorFn[]
  >;

export type DialogFormGroupConfig<T extends DialogFormValueMap> = {
  [K in keyof T]?: DialogControlConfig<T[K]>;
} & {
  [key: string]: unknown;
};

export type DialogFormControls<T extends DialogFormValueMap> = {
  [K in keyof T]: FormControl<T[K]> | FormGroup<any> | FormArray<any>;
};

export type DialogFormGroup<T extends DialogFormValueMap = DialogFormValueMap> = FormGroup<DialogFormControls<T>>;

export type DialogFormGroupInput<T extends DialogFormValueMap> =
  | DialogFormGroup<T>
  | DialogFormGroupConfig<T>;

export interface DialogsFormOptions<T extends DialogFormValueMap> {
  autoFocus?: boolean;
  disableIfInvalid?: boolean;
  onSubmit?: (value: T, form: DialogFormGroup<T>) => void;
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

  private dialogRef: MatDialogRef<DialogsFormComponent>;

  constructor(private dialog: MatDialog, private fb: FormBuilder) { }

  public confirm<T extends DialogFormValueMap>(
    title: string,
    fields: DialogField[],
    formGroup: DialogFormGroupInput<T>,
    autoFocus = false
  ): Observable<T | undefined> {
    let dialogRef: MatDialogRef<DialogsFormComponent>;
    dialogRef = this.dialog.open(DialogsFormComponent, {
      width: '600px',
      autoFocus: autoFocus
    });
    dialogRef.componentInstance.modalForm = formGroup instanceof FormGroup
      ? formGroup
      : this.fb.group(formGroup);
    dialogRef.componentInstance.title = title;
    dialogRef.componentInstance.fields = fields;
    return dialogRef.afterClosed() as Observable<T | undefined>;
  }

  openDialogsForm<T extends DialogFormValueMap>(
    title: string,
    fields: DialogField[],
    formGroup: DialogFormGroupInput<T>,
    options: DialogsFormOptions<T> = {}
  ) {
    this.dialogRef = this.dialog.open(DialogsFormComponent, {
      width: '600px',
      autoFocus: options.autoFocus,
      data: { title, formGroup, fields, ...options }
    });
  }

  closeDialogsForm() {
    this.dialogRef.close();
  }

  showErrorMessage(errorMessage: string) {
    this.dialogRef.componentInstance.errorMessage = errorMessage;
  }

}
