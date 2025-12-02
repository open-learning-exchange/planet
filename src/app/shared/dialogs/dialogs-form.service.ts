import { Observable } from 'rxjs';
import { DialogsFormComponent } from './dialogs-form.component';
import { MatLegacyDialogRef as MatDialogRef, MatLegacyDialog as MatDialog } from '@angular/material/legacy-dialog';
import { Injectable } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { DialogFormData, DialogField, DialogFormGroup } from './dialogs-form.component';

@Injectable()
export class DialogsFormService {

  private dialogRef: MatDialogRef<DialogsFormComponent>;

  constructor(private dialog: MatDialog, private fb: FormBuilder) { }

  public confirm(title: string, fields: DialogField[], formGroup: DialogFormGroup | Record<string, unknown>, autoFocus = false): Observable<boolean> {
    const dialogRef: MatDialogRef<DialogsFormComponent> = this.dialog.open(DialogsFormComponent, {
      width: '600px',
      autoFocus: autoFocus
    });
    dialogRef.componentInstance.modalForm = formGroup instanceof FormGroup ?
      formGroup as DialogFormGroup :
      this.fb.group(formGroup) as DialogFormGroup;
    dialogRef.componentInstance.title = title;
    dialogRef.componentInstance.fields = fields;
    return dialogRef.afterClosed();
  }

  openDialogsForm(title: string, fields: DialogField[], formGroup: DialogFormGroup | Record<string, unknown>, options: Omit<DialogFormData, 'fields' | 'title' | 'formGroup'>) {
    const data: DialogFormData = { title, formGroup, fields, ...options } as DialogFormData;
    this.dialogRef = this.dialog.open(DialogsFormComponent, {
      width: '600px',
      autoFocus: options.autoFocus,
      data
    });
  }

  closeDialogsForm() {
    this.dialogRef.close();
  }

  showErrorMessage(errorMessage: string) {
    this.dialogRef.componentInstance.errorMessage = errorMessage;
  }

}
