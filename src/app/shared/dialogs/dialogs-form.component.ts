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
  templateUrl: './dialogs-form.component.html'
})
export class DialogsFormComponent {

  @Input() rating: number;
  @Input() itemId: number;
  @Output() ratingClick: EventEmitter<any> = new EventEmitter<any>();
  public title: string;
  public type: string;
  public fields: any;
  public validation: any;
  public message: string;
  public modalForm: FormGroup;
  public star_rating: boolean;

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
    if (this.star_rating) {
      mForm.rate = this.rating;
    }
    if (dialog.componentInstance.modalForm.valid) {
      dialog.close(mForm);
    } else {
      this.markFormAsTouched(this.modalForm);
    }
  }

  valueChange(event) {
    if (event.key) {
      this.message = '';
    }
  }

  onClick(rating: number): void {
    this.star_rating = true;
    this.rating = rating;
    this.ratingClick.emit({
      itemId: this.itemId,
      rating: rating
    });
  }

}
