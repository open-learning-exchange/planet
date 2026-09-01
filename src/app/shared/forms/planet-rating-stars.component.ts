import { Component, HostBinding, Input, OnDestroy, Optional, Self } from '@angular/core';
import { coerceBooleanProperty } from '@angular/cdk/coercion';
import { MatFormFieldControl } from '@angular/material/form-field';
import { Subject } from 'rxjs';
import { ControlValueAccessor, NgControl } from '@angular/forms';
import { UserService } from '../user.service';
import { NgClass, NgStyle } from '@angular/common';
import { MatIcon } from '@angular/material/icon';
import { MatIconButton } from '@angular/material/button';
import { MatTooltip } from '@angular/material/tooltip';

@Component({
  selector: 'planet-rating-stars',
  templateUrl: './planet-rating-stars.component.html',
  styles: [`
    :host {
      display: inline-flex;
      align-items: center;
      vertical-align: middle;
    }
    .stars-wrapper {
      display: inline-flex;
      align-items: center;
      vertical-align: middle;
      height: 24px;
      line-height: 24px;
    }
    .stars {
      display: inline-flex;
      align-items: center;
      height: 24px;
      line-height: 24px;
    }
    .stars mat-icon {
      cursor: default;
      height: 24px;
      width: 24px;
      font-size: 24px;
      line-height: 24px;
    }
    .stars.stars-enabled mat-icon {
      cursor: pointer;
    }
    .clear-rating-button.mat-mdc-icon-button {
      width: 24px;
      height: 24px;
      min-width: 24px;
      min-height: 24px;
      margin-left: 8px;
      padding: 0;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      vertical-align: middle;
      --mat-icon-button-touch-target-display: none;
      --mdc-icon-button-state-layer-size: 24px;
      --mdc-icon-button-icon-size: 20px;
      color: rgba(0, 0, 0, 0.54);

      mat-icon {
        font-size: 20px;
        width: 20px;
        height: 20px;
        line-height: 20px;
        display: flex;
        align-items: center;
        justify-content: center;
      }
    }
  `],
  providers: [
    { provide: MatFormFieldControl, useExisting: PlanetRatingStarsComponent }
  ],
  imports: [NgClass, MatIcon, NgStyle, MatIconButton, MatTooltip]
})
export class PlanetRatingStarsComponent implements MatFormFieldControl<number>, ControlValueAccessor, OnDestroy {

  static nextId = 0;

  @HostBinding() id = `planet-rating-stars-${PlanetRatingStarsComponent.nextId++}`;
  @HostBinding('attr.aria-describedby') describedBy = '';

  #required = false;
  #placeholder: string;
  #disabled = false;
  #showClear = false;

  @Input()
  get showClear() {
    return this.#showClear;
  }
  set showClear(val: any) {
    this.#showClear = coerceBooleanProperty(val);
  }

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

  @Input()
  get value() {
    return this.#value;
  }
  set value(rating: number) {
    this.#value = rating;
    this.starActiveWidth = rating * 20 + '%';
    this.onChange(rating);
    this.stateChanges.next();
  }
  @Input() isEnrolled: (id: any, type: any) => boolean;
  @Input() itemId: (id: any) => void;
  @Input() type: string;
  #value = 0;

  onChange(_: any) {}

  constructor(@Optional() @Self() public ngControl: NgControl, private userService: UserService) {
    if (this.ngControl) {
      this.ngControl.valueAccessor = this;
    }
  }

  ngOnDestroy() {
    this.stateChanges.complete();
  }

  setDescribedByIds(ids: string[]) {
    this.describedBy = ids.join(' ');
  }

  get empty() {
    return this.value === 0;
  }

  @Input()
  get required() {
    return this.#required;
  }
  set required(req) {
    this.#required = coerceBooleanProperty(req);
    this.stateChanges.next();
  }

  @Input()
  get placeholder() {
    return this.#placeholder;
  }
  set placeholder(plh) {
    this.#placeholder = plh;
    this.stateChanges.next();
  }

  @Input()
  get disabled() {
    return this.#disabled;
  }
  set disabled(dis) {
    this.#disabled = coerceBooleanProperty(dis);
    this.stateChanges.next();
  }

  onStarClick(rating: number): void {
    if (this.isEnrolled) {
      if (!this.isEnrolled(this.itemId, this.type)) {
        return;
      }
    }
    this.writeValue(rating);
  }

  clearRating(event?: Event): void {
    if (event) {
      event.stopPropagation();
    }
    this.writeValue(0);
  }

  mouseOverStar(starNumber: number): void {
    if (!this.#disabled) {
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
