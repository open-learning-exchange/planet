import { Observable } from 'rxjs';
import { DialogsFormComponent } from './dialogs-form.component';
import { MatLegacyDialogRef as MatDialogRef, MatLegacyDialog as MatDialog } from '@angular/material/legacy-dialog';
import { Injectable } from '@angular/core';
import {
  UntypedFormGroup
} from '@angular/forms';

interface DialogsFormOptions {
  autoFocus?: boolean;
  closeOnSubmit?: boolean;
  disableIfInvalid?: boolean;
  onSubmit?: (...args: any[]) => void;
  formOptions?: Record<string, unknown>;
  [key: string]: any;
}

interface DialogsFormData {
  title: string;
  fields: any[];
  formGroup: any;
}

@Injectable()
export class DialogsFormService {

  private dialogRef?: MatDialogRef<DialogsFormComponent>;

  constructor(private dialog: MatDialog) { }

  public confirm<T = any>(title: string, fields: any[], formGroup: any, autoFocus = false): Observable<T | undefined> {
    const dialogRef = this.dialog.open<DialogsFormComponent, DialogsFormData, T>(DialogsFormComponent, {
      width: '600px',
      autoFocus,
      data: { title, fields, formGroup }
    });

    return dialogRef.afterClosed();
  }

  openDialogsForm(title: string, fields: any[], formGroup: any, options: DialogsFormOptions = {}) {
    const mergedOptions: DialogsFormOptions = {
      autoFocus: false,
      ...options
    };

    this.dialogRef = this.dialog.open(DialogsFormComponent, {
      width: '600px',
      autoFocus: mergedOptions.autoFocus,
      data: { title, formGroup, fields, ...mergedOptions }
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
