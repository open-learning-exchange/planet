import { Component, HostBinding, Input, OnDestroy, Optional, Self } from '@angular/core';
import { coerceBooleanProperty } from '@angular/cdk/coercion';
import { MatFormFieldControl } from '@angular/material';
import { Subject } from 'rxjs';
import { ControlValueAccessor, NgControl } from '@angular/forms';

@Component({
  selector: 'planet-rating-stars',
  templateUrl: './planet-rating-stars.component.html',
  styles: [ `
    .stars mat-icon {
      cursor: default;
    }
    .stars.stars-enabled mat-icon {
      cursor: pointer;
    }
  ` ],
  providers: [
    { provide: MatFormFieldControl, useExisting: PlanetRatingStarsComponent }
  ]
})
export class PlanetRatingStarsComponent implements MatFormFieldControl<number>, ControlValueAccessor, OnDestroy {

  static nextId = 0;

  @Input() _value = 0;
  @HostBinding() id = `planet-rating-stars-${PlanetRatingStarsComponent.nextId++}`;
  @HostBinding('attr.aria-describedby') describedBy = '';

  private _required = false;
  private _placeholder: string;
  private _disabled = false;

  starActiveWidth = '0%';
  stateChanges = new Subject<void>();
  errorState = false;
  // Label should always float above stars
  shouldLabelFloat = true;
  controlType = 'no-underline';
  // Need to be defined on class, but not needed for this component
  onTouched;
  onContainerClick;
  focused = false;

  onChange(_: any) {}

  constructor(@Optional() @Self() public ngControl: NgControl) {
    if (this.ngControl) {
      this.ngControl.valueAccessor = this;
    }
  }

  ngOnDestroy() {
    this.stateChanges.complete();
  }

  get value() {
    return this._value;
  }
  set value(rating: number) {
    this._value = rating;
    this.starActiveWidth = rating * 20 + '%';
    this.onChange(rating);
    this.stateChanges.next();
  }

  setDescribedByIds(ids: string[]) {
    this.describedBy = ids.join(' ');
  }

  get empty() {
    return this.value === 0;
  }

  @Input()
  get required() {
    return this._required;
  }
  set required(req) {
    this._required = coerceBooleanProperty(req);
    this.stateChanges.next();
  }

  @Input()
  get placeholder() {
    return this._placeholder;
  }
  set placeholder(plh) {
    this._placeholder = plh;
    this.stateChanges.next();
  }

  @Input()
  get disabled() {
    return this._disabled;
  }
  set disabled(dis) {
    this._disabled = coerceBooleanProperty(dis);
    this.stateChanges.next();
  }

  onStarClick(rating: number): void {
    this.writeValue(rating);
  }

  mouseOverStar(starNumber: number): void {
    if (!this.disabled) {
      this.starActiveWidth = starNumber * 20 + '%';
    }
  }

  writeValue(nextVal: number) {
    this.value = nextVal;
  }

  registerOnChange(fn: (_: any) => void) {
    this.onChange = fn;
  }

  registerOnTouched(fn: any) {
    this.onTouched = fn;
  }

}
