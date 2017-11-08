import { Component, Input, Output, EventEmitter } from '@angular/core';

@Component({
  selector: 'planet-alerts-delete',
  templateUrl: './alerts-delete.component.html'
})
export class AlertsDeleteComponent {

  @Input() type: string;
  @Input() deleteItem: any;
  @Output() okClick = new EventEmitter();
  @Output() cancelClick = new EventEmitter();

  ok() {
    this.okClick.emit(this.deleteItem);
  }

  cancel() {
    this.cancelClick.emit();
  }

}
