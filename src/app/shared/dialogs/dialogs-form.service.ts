import { Observable } from 'rxjs';
import { DialogsFormComponent } from './dialogs-form.component';
import { MatDialogRef, MatDialog } from '@angular/material';
import { Injectable } from '@angular/core';
import {
  FormBuilder,
  FormGroup
} from '@angular/forms';

@Injectable()
export class DialogsFormService {

  private dialogRef: MatDialogRef<DialogsFormComponent>;

  constructor(private dialog: MatDialog, private fb: FormBuilder) { }

  public confirm(title: string, fields: any, formGroup: any, autoFocus = false): Observable<boolean> {
    let dialogRef: MatDialogRef<DialogsFormComponent>;
    dialogRef = this.dialog.open(DialogsFormComponent, {
      width: '600px',
      autoFocus: autoFocus
    });
    if (formGroup instanceof FormGroup) {
      dialogRef.componentInstance.modalForm = formGroup;
    } else {
      dialogRef.componentInstance.modalForm = this.fb.group(formGroup);
    }
    dialogRef.componentInstance.title = title;
    dialogRef.componentInstance.fields = fields;
    return dialogRef.afterClosed();
  }

  openDialogsForm(title: string, fields: any[], formGroup: any, options: any) {
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
