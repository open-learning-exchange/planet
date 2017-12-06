import { Observable } from 'rxjs/Rx';
import { DialogsFormComponent } from './dialogs-form.component';
import { MatDialogRef, MatDialog, MatDialogConfig } from '@angular/material';
import { Injectable } from '@angular/core';
import {
  FormBuilder,
  FormControl,
  FormGroup,
  FormArray,
  Validators
} from '@angular/forms';

@Injectable()
export class DialogsFormService {
  constructor(private dialog: MatDialog, private fb: FormBuilder) { }

  public confirm(title: string, type: string, fields: any, validation: any, message: string): Observable<boolean> {
    let dialogRef: MatDialogRef<DialogsFormComponent>;
    dialogRef = this.dialog.open(DialogsFormComponent, {
      width: '600px'
    });
    dialogRef.componentInstance.modalForm = this.fb.group(validation);
    dialogRef.componentInstance.title = title;
    dialogRef.componentInstance.type = type;
    dialogRef.componentInstance.fields = fields;
    dialogRef.componentInstance.message = message;
    return dialogRef.afterClosed();
  }

}
