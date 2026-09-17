import { Component, HostBinding, Input, Optional, Self } from '@angular/core';
import { coerceBooleanProperty } from '@angular/cdk/coercion';
import { ControlValueAccessor, NgControl } from '@angular/forms';
import { NgClass, NgStyle } from '@angular/common';
import { MatIcon } from '@angular/material/icon';

@Component({
  selector: 'planet-rating-stars',
  templateUrl: './planet-rating-stars.component.html',
  styles: [`
    .stars mat-icon {
      cursor: default;
    }
    .stars.stars-enabled mat-icon {
      cursor: pointer;
    }
  `],
  imports: [NgClass, MatIcon, NgStyle]
})
export class PlanetRatingStarsComponent implements ControlValueAccessor {

  #required = false;
  #disabled = false;

  starActiveWidth = '0%';
  // Needs to be defined on class, but there is nothing to mark as touched
  onTouched;
  @HostBinding('attr.role') role = 'img';
  @HostBinding('attr.aria-label') get ariaLabel() {
    return $localize`Rating: ${this.value} out of 5`;
  }

  @Input()
  get value() {
    return this.#value;
  }
  set value(rating: number) {
    this.#value = rating;
    this.starActiveWidth = rating * 20 + '%';
    this.onChange(rating);
  }
  @Input() isEnrolled: (id: any, type: any) => boolean;
  @Input() itemId: (id: any) => void;
  @Input() type: string;
  #value = 0;

  onChange(_: any) {}

  constructor(@Optional() @Self() public ngControl: NgControl) {
    if (this.ngControl) {
      this.ngControl.valueAccessor = this;
    }
  }

  @Input()
  get required() {
    return this.#required;
  }
  set required(req) {
    this.#required = coerceBooleanProperty(req);
  }

  @Input()
  get disabled() {
    return this.#disabled;
  }
  set disabled(dis) {
    this.#disabled = coerceBooleanProperty(dis);
  }

  onStarClick(rating: number): void {
    if (this.isEnrolled) {
      if (!this.isEnrolled(this.itemId, this.type)) {
        return;
      }
    }
    this.writeValue(rating);
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
