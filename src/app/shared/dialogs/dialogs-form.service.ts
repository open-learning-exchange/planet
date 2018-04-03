import { Observable } from 'rxjs/Rx';
import { DialogsFormComponent } from './dialogs-form.component';
import { MatDialogRef, MatDialog, MatDialogConfig } from '@angular/material';
import { Injectable } from '@angular/core';
import {
  FormBuilder,
  FormGroup
} from '@angular/forms';

@Injectable()
export class DialogsFormService {
  constructor(private dialog: MatDialog, private fb: FormBuilder) { }

  public confirm(title: string, fields: any, formGroup: any): Observable<boolean> {
    let dialogRef: MatDialogRef<DialogsFormComponent>;
    dialogRef = this.dialog.open(DialogsFormComponent, {
      width: '600px'
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

}
