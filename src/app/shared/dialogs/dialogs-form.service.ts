import { Observable, Subject } from 'rxjs';
import { DialogsFormComponent } from './dialogs-form.component';
import { MatDialogRef, MatDialog } from '@angular/material/dialog';
import { Injectable } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { UnsavedChangesService } from '../unsaved-changes.service';

@Injectable()
export class DialogsFormService {

  private dialogRef: MatDialogRef<DialogsFormComponent>;
  private onSubmit: Subject<any> = new Subject();
  private currentForm: FormGroup;

  constructor(
    private dialog: MatDialog,
    private fb: FormBuilder,
    private unsavedChangesService: UnsavedChangesService
  ) {}

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
    this.currentForm = formGroup instanceof FormGroup ? 
      formGroup : 
      this.fb.group(formGroup);
    const initialValue = JSON.stringify(this.currentForm.value);

    this.currentForm.valueChanges.subscribe(() => {
      const hasChanges = JSON.stringify(this.currentForm.value) !== initialValue;
      this.unsavedChangesService.setHasUnsavedChanges(hasChanges);
    });

    this.dialogRef = this.dialog.open(DialogsFormComponent, {
      width: '600px',
      autoFocus: options.autoFocus,
      data: {
        title,
        formGroup: this.currentForm,
        fields,
        onSubmit: (formValue, formGroup) => {
          if (options.onSubmit) {
            options.onSubmit(formValue);
          }
          this.onSubmit.next(formValue);
        },
        ...options
      }
    });

    this.dialogRef.beforeClosed().subscribe(() => {
      if (options.onClose && !options.onClose()) {
        return;
      }
      this.unsavedChangesService.setHasUnsavedChanges(false);
    });

    return this.onSubmit.asObservable();
  }

  closeDialogsForm() {
    this.dialogRef.close();
    this.unsavedChangesService.setHasUnsavedChanges(false);
  }

  showErrorMessage(errorMessage: string) {
    this.dialogRef.componentInstance.errorMessage = errorMessage;
  }

}
