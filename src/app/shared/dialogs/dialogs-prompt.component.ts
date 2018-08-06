/*
 * Material dialog for deleting from Planet
 * type - Required.  Sets the text of the main message on the modal.  See HTML for options.
 * deleteItem - Required.  Object which is the main argument for the delete method located
 *  in the parent component this is called from.
 * message - Optional.  Error message that is displayed when value is truthy.
 * displayName - Optional. If deleteItem does not have a 'name' property, set this to
 *  display to the user what is being deleted.
 * okClick - Required.  Method from parent which is called to delete.
 */
import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material';

@Component({
  templateUrl: './dialogs-prompt.component.html'
})
export class DialogsPromptComponent {

  message = '';
  showMainParagraph: boolean;
  cancelable: boolean;

  constructor(
    public dialogRef: MatDialogRef<DialogsPromptComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any
  ) {
    // Support dialogs created before the amount field was added
    this.data.amount = this.setDefault(this.data.amount, 'single');
    this.showMainParagraph = this.setDefault(this.data.showMainParagraph, true);
    this.cancelable = this.setDefault(this.data.cancelable, true);
    this.data.okClick = this.setDefault(this.data.okClick, this.close.bind(this));
  }

  ok() {
    this.data.okClick();
  }

  close() {
    this.dialogRef.close();
  }

  closeAlert() {
    this.message = '';
  }

  setDefault(value, dfault) {
    return value === undefined ? dfault : value;
  }

}
