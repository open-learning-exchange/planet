import { Component, Inject, Input, Output, EventEmitter } from '@angular/core';
import { MatDialogRef } from '@angular/material';
import {
  FormBuilder,
  FormControl,
  FormGroup,
  FormArray,
  Validators
} from '@angular/forms';

@Component({
  templateUrl: './dialogs-form.component.html',
  styles: [ `
    .stars mat-icon {
      cursor: pointer;
    }
  ` ]
})
export class DialogsFormComponent {

  public title: string;
  public type: string;
  public fields: any;
  public validation: any;
  public modalForm: FormGroup;
  starActiveWidth = '0%';

  private markFormAsTouched (formGroup: FormGroup) {
    (<any>Object).values(formGroup.controls).forEach(control => {
      control.markAsTouched();
      if (control.controls) {
        this.markFormAsTouched(control);
      }
    });
  }

  constructor( public dialogRef: MatDialogRef<DialogsFormComponent>, public fb: FormBuilder ) { }

  onSubmit(mForm, dialog) {
    if (dialog.componentInstance.modalForm.valid) {
      dialog.close(mForm);
    } else {
      this.markFormAsTouched(this.modalForm);
    }
  }

  onStarClick(rating: number, fieldName: string): void {
    const pVal = {};
    pVal[fieldName] = rating;
    this.modalForm.patchValue(pVal);
    this.mouseOverStar(rating);
  }

  mouseOverStar(starNumber: number): void {
    this.starActiveWidth = starNumber * 20 + '%';
  }

}
