import {Directive, Input, Output, EventEmitter, OnInit} from '@angular/core';

@Directive({
  selector: '[lowercase]',
  host: {
    '[value]': 'lowercase',
    '(input)': 'format($event.target.value)'
  }
})
export class LowerCase implements OnInit {
  @Input() lowercase: string;
  @Output() lowercaseChange: EventEmitter<string> = new EventEmitter<string>();

  constructor() { }

  ngOnInit() {
    this.lowercase = this.lowercase || '';
    this.format(this.lowercase);
  }

  format(value) {
    value = value.toLowerCase();
    this.lowercaseChange.next(value);
  }
}
