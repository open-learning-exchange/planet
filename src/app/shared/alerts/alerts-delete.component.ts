import { Component, Input, Output, EventEmitter } from '@angular/core';

@Component({
  selector: 'planet-alerts-delete',
  templateUrl: './alerts-delete.component.html'
})
export class AlertsDeleteComponent {

  @Input() type: string;
  @Input() deleteItem: any;
  @Input() message: string;
  @Input() displayName: string;
  @Output() okClick = new EventEmitter();
  @Output() cancelClick = new EventEmitter();

  name: string;

  ngOnChanges() {
    this.name = this.deleteItem ? this.displayName || this.deleteItem.name : this.displayName;
  }

  ok() {
    this.okClick.emit(this.deleteItem);
  }

  cancel() {
    this.cancelClick.emit();
  }

}
