import {
  Component, Input, Optional, Self, OnDestroy, HostBinding, EventEmitter, Output, OnInit, ViewEncapsulation, ElementRef
} from '@angular/core';
import { ControlValueAccessor, NgControl } from '@angular/forms';
import { MatFormFieldControl } from '@angular/material';
import { Subject } from 'rxjs';
import { FocusMonitor } from '@angular/cdk/a11y';

@Component({
  'selector': 'planet-markdown-textbox',
  'templateUrl': './planet-markdown-textbox.component.html',
  'styleUrls': [ 'planet-markdown-textbox.scss' ],
  'providers': [
    { provide: MatFormFieldControl, useExisting: PlanetMarkdownTextboxComponent },
  ],
  'encapsulation': ViewEncapsulation.None
})
export class PlanetMarkdownTextboxComponent implements ControlValueAccessor, OnInit, OnDestroy {

  static nextId = 0;

  @HostBinding() id = `planet-markdown-textbox-${PlanetMarkdownTextboxComponent.nextId++}`;
  @HostBinding('attr.aria-describedby') describedBy = '';
  @Input() _value = '';
  get value() {
    return this._value;
  }
  set value(text: string) {
    console.log(text);
    this._value = text;
    this.onChange(text);
    this.stateChanges.next();
  }
  @Output() valueChanges = new EventEmitter<string[]>();

  get empty() {
    return this._value.length === 0;
  }

  private _placeholder: string;
  @Input()
  get placeholder() {
    return this._placeholder;
  }
  set placeholder(text: string) {
    this._placeholder = text;
    this.stateChanges.next();
  }

  get shouldLabelFloat() {
    return true;
  }

  onTouched;
  stateChanges = new Subject<void>();
  focused = false;
  errorState = false;

  constructor(
    @Optional() @Self() public ngControl: NgControl,
    private focusMonitor: FocusMonitor,
    private elementRef: ElementRef
  ) {
    if (this.ngControl) {
      this.ngControl.valueAccessor = this;
    }
    focusMonitor.monitor(elementRef.nativeElement, true).subscribe(origin => {
      this.focused = !!origin;
      this.stateChanges.next();
    });
  }

  ngOnInit() {}

  ngOnDestroy() {
    this.stateChanges.complete();
  }

  writeValue(val: string) {
    this.value = val;
    this.setErrorState();
  }

  onChange(_: any) {}

  registerOnChange(fn: (_: any) => void) {
    this.onChange = fn;
  }

  registerOnTouched(fn: any) {
    this.onTouched = fn;
  }

  setDescribedByIds(ids: string[]) {
    this.describedBy = ids.join(' ');
  }

  setErrorState() {
    this.errorState = this.ngControl.touched && this.value === '';
  }

  onFocusOut() {
    this.ngControl.control.markAsTouched({ onlySelf: true });
    this.setErrorState();
  }

}
