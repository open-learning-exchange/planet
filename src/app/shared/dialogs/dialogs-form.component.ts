import { Component, Inject } from '@angular/core';
import { MatDialog, MatDialogRef, MAT_DIALOG_DATA, MatDialogTitle, MatDialogContent, MatDialogActions } from '@angular/material/dialog';
import { AbstractControl, FormArray, FormBuilder, FormGroup, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { DialogsLoadingService } from './dialogs-loading.service';
import { DialogsListService } from './dialogs-list.service';
import { DialogsListComponent } from './dialogs-list.component';
import { UserService } from '../user.service';
import { DialogField, DialogFormGroupInput, DialogsFormData } from './dialogs-form.service';
import { MatIcon } from '@angular/material/icon';
import { CdkScrollable } from '@angular/cdk/scrolling';
import { NgFor, NgClass, NgIf } from '@angular/common';
import { MatCheckbox } from '@angular/material/checkbox';
import { MatTooltip } from '@angular/material/tooltip';
import { MatFormField, MatLabel, MatError, MatSuffix } from '@angular/material/form-field';
import { MatInput } from '@angular/material/input';
import { FormErrorMessagesComponent } from '../forms/form-error-messages.component';
import { MatIconButton, MatButton } from '@angular/material/button';
import { MatSelect } from '@angular/material/select';
import { MatOption } from '@angular/material/autocomplete';
import { MatRadioGroup, MatRadioButton } from '@angular/material/radio';
import { PlanetRatingStarsComponent } from '../forms/planet-rating-stars.component';
import { PlanetMarkdownTextboxComponent } from '../forms/planet-markdown-textbox.component';
import { AuthorizedRolesDirective } from '../authorized-roles.directive';
import { MatDatepickerInput, MatDatepickerToggle, MatDatepicker } from '@angular/material/datepicker';
import { MatSlideToggle } from '@angular/material/slide-toggle';
import { SubmitDirective } from '../submit.directive';

@Component({
  templateUrl: './dialogs-form.component.html',
  styles: [`
    .checkbox-wrapper:last-child {
      margin: 0 0 20px 0;
    }

    .mat-mdc-radio-group.ng-touched.ng-invalid label {
      border-bottom: 2px solid red;
    }

    .ng-touched.ng-valid {
      border: none;
    }
  `],
  imports: [
    FormsModule, ReactiveFormsModule, MatDialogTitle, MatIcon, CdkScrollable, MatDialogContent, NgFor,
    NgClass, NgIf, MatCheckbox, MatTooltip, MatFormField, MatLabel, MatInput, MatError, FormErrorMessagesComponent,
    MatIconButton, MatSuffix, MatSelect, MatOption, MatRadioGroup, MatRadioButton, PlanetRatingStarsComponent,
    PlanetMarkdownTextboxComponent, AuthorizedRolesDirective, MatButton, MatDatepickerInput, MatDatepickerToggle,
    MatDatepicker, MatSlideToggle, MatDialogActions, SubmitDirective
  ]
})
export class DialogsFormComponent {

  public title!: string;
  public fields!: DialogField[];
  public modalForm!: FormGroup;
  passwordVisibility = new Map<string, boolean>();
  isSpinnerOk = true;
  errorMessage = '';
  dialogListRef!: MatDialogRef<DialogsListComponent>;
  disableIfInvalid = false;

  private markFormAsTouched(control: FormGroup | FormArray<AbstractControl>) {
    const controls = control instanceof FormGroup ? Object.values(control.controls) : control.controls;
    controls.forEach(innerControl => {
      innerControl.markAsTouched();
      if (innerControl instanceof FormGroup || innerControl instanceof FormArray) {
        this.markFormAsTouched(innerControl);
      }
    });
  }

  constructor(
    public dialogRef: MatDialogRef<DialogsFormComponent>,
    private dialog: MatDialog,
    private fb: FormBuilder,
    @Inject(MAT_DIALOG_DATA) public data: DialogsFormData,
    private dialogsLoadingService: DialogsLoadingService,
    private dialogsListService: DialogsListService,
    private userService: UserService
  ) {
    if (this.data && this.data.formGroup) {
      this.modalForm = this.createModalForm(this.data.formGroup);
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

  onSubmit(mForm: FormGroup, dialog: MatDialogRef<DialogsFormComponent>) {
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

  openDialog(field: DialogField) {
    const control = this.modalForm.controls[field.name];
    const currentValue = control.value as Array<{ _id: string }> | null;
    const initialSelection = (currentValue || []).map((value) => value._id);
    this.dialogsLoadingService.start();
    this.dialogsListService.attachDocsData(field.db, 'title', this.dialogOkClick(field).bind(this), initialSelection)
      .subscribe((data) => {
        this.dialogsLoadingService.stop();
        this.dialogListRef = this.dialog.open(DialogsListComponent, {
          data: data,
          maxHeight: '500px',
          width: '600px',
          autoFocus: false
        });
      });
  }

  dialogOkClick(field: DialogField) {
    return (selection) => {
      this.modalForm.controls[field.name].setValue(selection);
      this.dialogListRef.close();
      this.modalForm.markAsDirty();
    };
  }

  isValid() {
    return this.modalForm.status === 'VALID';
  }

  isDirty() {
    return this.modalForm.dirty;
  }

  private createModalForm(formGroup: DialogFormGroupInput<Record<string, unknown>>): FormGroup {
    if (formGroup instanceof FormGroup) {
      return formGroup;
    }
    return this.fb.group(formGroup, this.data.formOptions || {});
  }

}
