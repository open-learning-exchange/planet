/*
 * Material dialog for confirming action or prompting user with information
 * showMainParagraph - Optional, defaults to true. Boolean which toggles the longer main message.
 * type,
 * changeType,
 * amount - Required if showMainParagraph.  Sets the text of the main message on the modal.  See HTML for options.
 * cancelable - Optional. Shows/hides the cancel button.
 * message - Optional.  Error message that is displayed when value is truthy.
 * displayName - Optional. If deleteItem does not have a 'name' property, set this to
 *  display to the user what is being deleted.
 * okClick - Optional.  Function to call when user clicks OK.
 */
import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material';
import { timer, throwError } from 'rxjs';
import { catchError, switchMap } from 'rxjs/operators';

@Component({
  templateUrl: './dialogs-prompt.component.html'
})
export class DialogsPromptComponent {

  message = '';
  showMainParagraph: boolean;
  cancelable: boolean;
  spinnerOn: boolean;

  constructor(
    public dialogRef: MatDialogRef<DialogsPromptComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any
  ) {
    // Support dialogs created before the amount field was added
    this.data.amount = this.setDefault(this.data.amount, 'single');
    this.showMainParagraph = this.setDefault(this.data.showMainParagraph, true);
    this.cancelable = this.setDefault(this.data.cancelable, true);
    this.data.okClick = this.setDefault(this.data.okClick, this.close.bind(this));
    this.spinnerOn = this.setDefault(this.data.spinnerOn, true);
  }

  ok() {
    this.data.okClick.request.pipe(catchError((error) => {
      this.spinnerOn = false;
      // Timer is used to wait for ngOnChanges to close spinner in SubmitDirective
      return timer(100).pipe(switchMap(() => throwError(error)));
    })).subscribe(
      this.data.okClick.onNext,
      (err) => {
        this.spinnerOn = this.setDefault(this.data.spinnerOn, true);
        this.data.okClick.onError(err);
      }
    );
  }

  close() {
    this.dialogRef.close();
  }

  setDefault(value, dfault) {
    return value === undefined ? dfault : value;
  }

}
