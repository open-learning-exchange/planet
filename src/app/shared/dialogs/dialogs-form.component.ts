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

export interface DialogListSelection {
  _id: string;
  [key: string]: unknown;
}

type DialogFieldType =
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

interface DialogFieldBase {
  name: string;
  type: DialogFieldType;
  planetBeta?: boolean;
  disabled?: boolean;
  required?: boolean;
  placeholder?: string;
  tooltip?: string;
  label?: string;
  authorizedRoles?: string | string[];
}

interface DialogCheckboxField extends DialogFieldBase {
  type: 'checkbox';
}

interface DialogTextboxField extends DialogFieldBase {
  type: 'textbox';
  inputType?: string;
  min?: number;
  step?: string | number;
}

interface DialogPasswordField extends DialogFieldBase {
  type: 'password';
}

interface DialogSelectboxField extends DialogFieldBase {
  type: 'selectbox';
  multiple?: boolean;
  reset?: boolean;
  options: DialogFieldOption[];
}

interface DialogRadioField extends DialogFieldBase {
  type: 'radio';
  options: string[];
}

interface DialogRatingField extends DialogFieldBase {
  type: 'rating';
}

interface DialogTextareaField extends DialogFieldBase {
  type: 'textarea';
}

interface DialogMarkdownField extends DialogFieldBase {
  type: 'markdown';
  imageGroup?: string;
}

interface DialogDialogField extends DialogFieldBase {
  type: 'dialog';
  text: string;
  db: string;
}

interface DialogDateField extends DialogFieldBase {
  type: 'date';
  min?: Date | string;
  max?: Date | string;
}

interface DialogTimeField extends DialogFieldBase {
  type: 'time';
}

interface DialogToggleField extends DialogFieldBase {
  type: 'toggle';
}

export type DialogField =
  | DialogCheckboxField
  | DialogTextboxField
  | DialogPasswordField
  | DialogSelectboxField
  | DialogRadioField
  | DialogRatingField
  | DialogTextareaField
  | DialogMarkdownField
  | DialogDialogField
  | DialogDateField
  | DialogTimeField
  | DialogToggleField;

type DialogFieldValue =
  | string
  | number
  | boolean
  | Date
  | DialogListSelection[]
  | string[]
  | number[]
  | null
  | undefined;

interface DialogFormControls {
  [key: string]: AbstractControl<DialogFieldValue | null>;
}

export type DialogFormGroup = FormGroup<DialogFormControls>;

export type DialogFormGroupConfig = Parameters<FormBuilder['group']>[0];

export type DialogFormGroupOptions = Parameters<FormBuilder['group']>[1];

export interface DialogFormData {
  title: string;
  formGroup: DialogFormGroup | DialogFormGroupConfig;
  formOptions?: DialogFormGroupOptions;
  fields: DialogField[];
  onSubmit?: (value: DialogFormGroup['value'], form: DialogFormGroup) => void;
  closeOnSubmit?: boolean;
  disableIfInvalid?: boolean;
  autoFocus?: boolean;
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

  public title = '';
  public fields: DialogField[] = [];
  public modalForm!: DialogFormGroup;
  passwordVisibility = new Map<string, boolean>();
  isSpinnerOk = true;
  errorMessage = '';
  dialogListRef: MatDialogRef<DialogsListComponent>;
  disableIfInvalid = false;

  private markFormAsTouched(control: AbstractControl): void {
    if (control instanceof FormGroup) {
      Object.values(control.controls).forEach(childControl => this.markFormAsTouched(childControl));
    } else if (control instanceof FormArray) {
      control.controls.forEach(childControl => this.markFormAsTouched(childControl));
    }
    control.markAsTouched();
  }

  constructor(
    public dialogRef: MatDialogRef<DialogsFormComponent>,
    private dialog: MatDialog,
    private fb: FormBuilder,
    @Inject(MAT_DIALOG_DATA) public data: DialogFormData | null,
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

  openDialog(field: DialogDialogField) {
    const control = this.modalForm.controls[field.name];
    const currentValue = control?.value;
    const initialSelection = Array.isArray(currentValue)
      ? currentValue
        .filter((value): value is DialogListSelection => this.isDialogSelection(value))
        .map(value => value._id)
      : [];
    this.dialogsLoadingService.start();
    this.dialogsListService.attachDocsData(field.db, 'title', this.dialogOkClick(field), initialSelection).subscribe((data) => {
      this.dialogsLoadingService.stop();
      this.dialogListRef = this.dialog.open(DialogsListComponent, {
        data: data,
        maxHeight: '500px',
        width: '600px',
        autoFocus: false
      });
    });
  }

  dialogOkClick(field: DialogDialogField) {
    return (selection: DialogListSelection[]) => {
      const control = this.modalForm.controls[field.name];
      control?.setValue(selection);
      this.dialogListRef?.close();
      this.modalForm.markAsDirty();
    };
  }

  isValid() {
    return this.modalForm.status === 'VALID';
  }

  isDirty() {
    return this.modalForm.dirty;
  }

  private isDialogSelection(value: unknown): value is DialogListSelection {
    return typeof value === 'object' && value !== null && '_id' in value;
  }

}
