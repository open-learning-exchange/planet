import { Component, Input, Output, EventEmitter } from '@angular/core';

@Component({
  selector: 'planet-alerts-delete',
  templateUrl: './alerts-delete.component.html'
})
export class AlertsDeleteComponent {

  @Input() type: string;
  @Input() deleteItem: any;
  @Output() okEmit = new EventEmitter();
  @Output() cancelEmit = new EventEmitter();

  okClick() {
    this.okEmit.emit(this.deleteItem);
  }

  cancelClick() {
    this.cancelEmit.emit();
  }

}
