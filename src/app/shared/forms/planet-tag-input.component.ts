import { Component, Input, Optional, Self, OnDestroy, HostBinding, EventEmitter, Output, ViewChild, ElementRef } from '@angular/core';
import { ControlValueAccessor, NgControl, FormControl } from '@angular/forms';
import { MatFormFieldControl } from '@angular/material';
import { Subject, Observable } from 'rxjs';
import { startWith, map } from 'rxjs/operators';
import { TagsService } from './tags.service';

@Component({
  'selector': 'planet-tag-input',
  'templateUrl': './planet-tag-input.component.html',
  'providers': [
    { provide: MatFormFieldControl, useExisting: PlanetTagInputComponent }
  ]
})
export class PlanetTagInputComponent implements ControlValueAccessor, OnDestroy {

  static nextId = 0;

  @HostBinding() id = `planet-rating-stars-${PlanetTagInputComponent.nextId++}`;
  @HostBinding('attr.aria-describedby') describedBy = '';
  @Input() _value: string[] = [];
  get value() {
    return this._value;
  }
  set value(tags: string[]) {
    this._value = tags;
    this.onChange(tags);
    this.stateChanges.next();
  }
  @Output() valueChanges = new EventEmitter<string[]>();

  @ViewChild('tagInput') tagInput: ElementRef;

  onTouched;
  stateChanges = new Subject<void>();
  tags: string[] = [];
  filteredTags: Observable<string[]>;
  inputControl = new FormControl();

  constructor(
    @Optional() @Self() public ngControl: NgControl,
    private tagsService: TagsService
  ) {
    if (this.ngControl) {
      this.ngControl.valueAccessor = this;
    }
    this.tagsService.getTags().subscribe((tags: string[]) => {
      console.log(tags);
      this.tags = tags;
    });
    this.filteredTags = this.inputControl.valueChanges.pipe(
      startWith(null),
      map((value: string | null) => value ? this.tagsService.filterTags(this.tags, value) : this.tags)
    );
  }

  ngOnDestroy() {
    this.stateChanges.complete();
  }

  onChange(_: any) {}

  inputAddTag(event: any) {
    this.addTag(event.value);
  }

  autocompleteAddTag(event: any) {
    this.addTag(event.option.viewValue);
  }

  addTag(newTag: string) {
    if (this.value.indexOf(newTag.trim()) > -1) {
      return;
    }
    const input = this.tagInput.nativeElement;
    if (newTag.trim()) {
      this.writeValue(this.value.concat([ newTag.trim() ]));
    }
    if (input.value) {
      input.value = '';
    }
  }

  removeTag(tagToRemove: string) {
    this.writeValue(this.value.filter(tag => tag !== tagToRemove));
  }

  writeValue(tags) {
    this.value = tags;
  }

  registerOnChange(fn: (_: any) => void) {
    this.onChange = fn;
  }

  registerOnTouched(fn: any) {
    this.onTouched = fn;
  }

  setDescribedByIds(ids: string[]) {
    this.describedBy = ids.join(' ');
  }

}
