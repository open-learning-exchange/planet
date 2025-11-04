import { Observable } from 'rxjs';
import { DialogsFormComponent } from './dialogs-form.component';
import { MatLegacyDialogRef as MatDialogRef, MatLegacyDialog as MatDialog } from '@angular/material/legacy-dialog';
import { Injectable } from '@angular/core';
import {
  FormBuilder,
  FormGroup
} from '@angular/forms';
import {
  DialogField,
  DialogFormData,
  DialogFormGroup,
  DialogFormGroupConfig
} from './dialogs-form.component';

@Injectable()
export class DialogsFormService {

  private dialogRef: MatDialogRef<DialogsFormComponent>;

  constructor(private dialog: MatDialog, private fb: FormBuilder) { }

  public confirm(
    title: string,
    fields: DialogField[],
    formGroup: DialogFormGroup | DialogFormGroupConfig,
    autoFocus = false
  ): Observable<boolean> {
    let dialogRef: MatDialogRef<DialogsFormComponent>;
    dialogRef = this.dialog.open(DialogsFormComponent, {
      width: '600px',
      autoFocus: autoFocus
    });
    if (formGroup instanceof FormGroup) {
      dialogRef.componentInstance.modalForm = formGroup as DialogFormGroup;
    } else {
      dialogRef.componentInstance.modalForm = this.fb.group(formGroup) as DialogFormGroup;
    }
    dialogRef.componentInstance.title = title;
    dialogRef.componentInstance.fields = fields;
    return dialogRef.afterClosed();
  }

  openDialogsForm(
    title: string,
    fields: DialogField[],
    formGroup: DialogFormGroup | DialogFormGroupConfig,
    options: DialogFormOpenOptions = {}
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

type DialogFormOpenOptions = Partial<Omit<DialogFormData, 'title' | 'fields' | 'formGroup'>> & {
  autoFocus?: boolean;
};
