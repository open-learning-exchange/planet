/*
 * Bootstrap modal for deleting from Planet
 * type - Required.  Sets the text of the main message on the modal.  See HTML for options.
 * deleteItem - Required.  Object which is the main argument for the delete method located
 *  in the parent component this is called from.
 * message - Optional.  Error message that is displayed when value is truthy.
 * displayName - Optional. If deleteItem does not have a 'name' property, set this to
 *  display to the user what is being deleted.
 * okClick - Required.  Method from parent which is called to delete.
 */
import { Component, Input, Output, EventEmitter, OnChanges } from '@angular/core';
import { trigger, state, animate, transition, style } from '@angular/animations';

@Component({
  selector: 'planet-alerts-delete',
  templateUrl: './alerts-delete.component.html',
  animations: [
    trigger('visibilityChanged', [
      state('true' , style({ opacity: 1 })),
      state('false', style({ opacity: 0, display: 'none' })),
      transition('1 => 0', animate('300ms ease-out')),
      transition('0 => 1', animate('100ms ease-in'))
    ])
  ]
})
export class AlertsDeleteComponent implements OnChanges {

  @Input() type: string;
  @Input() deleteItem: any;
  @Input() message: string;
  @Input() displayName: string;
  @Output() okClick = new EventEmitter();
  @Output() resetMessage = new EventEmitter();

  name: string;
  isMessage: boolean;

  ngOnChanges() {
    this.name = this.deleteItem ? this.displayName || this.deleteItem.name : this.displayName;
    this.isMessage = this.message !== '';
  }

  ok() {
    this.okClick.emit(this.deleteItem);
  }

  closeAlert() {
    this.isMessage = false;
  }

  animationDone(event) {
    if (event.toState === false) {
      this.resetMessage.emit();
    }
  }

}
