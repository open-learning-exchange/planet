import { Observable } from 'rxjs/Rx';
import { FormDialogComponent } from './form-dialog.component';
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
export class FormDialogService {
  constructor(private dialog: MatDialog, private fb: FormBuilder) { }
  
      public confirm(title: string, formName: string, fields: any, message: string): Observable<boolean> {
        
          let dialogRef: MatDialogRef<FormDialogComponent>;
          dialogRef = this.dialog.open(FormDialogComponent);
          dialogRef.componentInstance.modalForm = this.fb.group({
            adminName: [ '', Validators.required,
              // an arrow function is for lexically binding 'this' otherwise 'this' would be undefined
              //ac => this.nationValidatorService.nationCheckerService$(ac)
            ],
            nationName: [ '', Validators.required ],
            nationURL: [ '', Validators.required ],
          });
          dialogRef.componentInstance.title = title;
          dialogRef.componentInstance.fields = fields;
          dialogRef.componentInstance.message = message;
          
          return dialogRef.afterClosed();
  }

}
