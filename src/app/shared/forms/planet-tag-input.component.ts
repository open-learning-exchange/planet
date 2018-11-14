import {
  Component, Input, Optional, Self, OnDestroy, HostBinding, EventEmitter, Output, ElementRef, Inject
} from '@angular/core';
import { ControlValueAccessor, NgControl, FormControl } from '@angular/forms';
import { MatFormFieldControl, MatDialog, MAT_DIALOG_DATA, MatDialogRef } from '@angular/material';
import { FocusMonitor } from '@angular/cdk/a11y';
import { Subject } from 'rxjs';
import { TagsService } from './tags.service';

@Component({
  'templateUrl': 'planet-tag-input-dialog.component.html'
})
export class PlanetTagInputDialogComponent {

  tags: any[] = [];
  selected = new Map(this.data.tags.map(value => [ value, false ] as [ string, boolean ]));
  filterValue = '';
  selectMany = false;

  constructor(
    public dialogRef: MatDialogRef<PlanetTagInputDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any,
    private tagsService: TagsService
  ) {
    this.tags = this.data.tags;
    this.data.startingTags
      .filter((tag: string) => tag)
      .forEach(tag => this.tagChange({ value: tag, selected: true }));
  }

  tagChange(option) {
    const tag = option.value;
    this.selected.set(tag, option.selected);
    this.data.tagUpdate(tag, this.selected.get(tag));
  }

  isSelected(tag: string) {
    return this.selected.get(tag);
  }

  updateFilter(value) {
    this.tags = value ? this.tagsService.filterTags(this.data.tags, value) : this.data.tags;
  }

  selectOne(tag) {
    this.data.tagUpdate(tag, true, true);
    this.dialogRef.close();
  }

}

@Component({
  'selector': 'planet-tag-input',
  'templateUrl': './planet-tag-input.component.html',
  'styleUrls': [ 'planet-tag-input.scss' ],
  'providers': [
    { provide: MatFormFieldControl, useExisting: PlanetTagInputComponent }
  ]
})
export class PlanetTagInputComponent implements ControlValueAccessor, OnDestroy {

  static nextId = 0;

  @HostBinding() id = `planet-tag-input-${PlanetTagInputComponent.nextId++}`;
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

  private _placeholder: string;
  @Input()
  get placeholder() {
    return this._placeholder;
  }
  set placeholder(text: string) {
    this._placeholder = text;
    this.stateChanges.next();
  }

  shouldLabelFloat = false;
  onTouched;
  stateChanges = new Subject<void>();
  tags: string[] = [];
  inputControl = new FormControl();
  focused = false;
  tooltipLabels = '';

  constructor(
    @Optional() @Self() public ngControl: NgControl,
    private focusMonitor: FocusMonitor,
    private elementRef: ElementRef,
    private tagsService: TagsService,
    private dialog: MatDialog
  ) {
    if (this.ngControl) {
      this.ngControl.valueAccessor = this;
    }
    this.tagsService.getTags().subscribe((tags: string[]) => {
      this.tags = tags;
    });
  }

  ngOnDestroy() {
    this.stateChanges.complete();
    this.focusMonitor.stopMonitoring(this.elementRef.nativeElement);
  }

  onChange(_: any) {}

  addTag(newTag: string) {
    if (this.value.indexOf(newTag.trim()) > -1) {
      return;
    }
    if (newTag.trim()) {
      this.writeValue(this.value.concat([ newTag.trim() ]));
    }
  }

  removeTag(tagToRemove: string) {
    this.writeValue(this.value.filter(tag => tag !== tagToRemove));
  }

  writeValue(tags) {
    this.value = tags;
    this.tooltipLabels = tags.join(', ');
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

  openPresetDialog() {
    this.dialog.open(PlanetTagInputDialogComponent, {
      maxWidth: '80vw',
      maxHeight: '80vh',
      autoFocus: false,
      data: {
        tagUpdate: this.dialogTagUpdate.bind(this),
        startingTags: this.value,
        tags: this.tags
      }
    });
  }

  dialogTagUpdate(tag, isSelected, tagOne = false) {
    if (tagOne) {
      this.value = [];
    }
    if (isSelected) {
      this.addTag(tag);
    } else {
      this.removeTag(tag);
    }
  }

}
