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
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

@Component({
  template: `
    <planet-login-form></planet-login-form>
  `,
  styles: [ `
    .break-word {
      word-wrap: break-word;
      white-space: normal;
      word-break: break-word;
    }
  ` ]
})
export class LoginDialogComponent {

  constructor(
    public dialogRef: MatDialogRef<LoginDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any
  ) {}

  close() {
    this.dialogRef.close();
  }

}
