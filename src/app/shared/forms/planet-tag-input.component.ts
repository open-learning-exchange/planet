import {
  Component, Input, Optional, Self, OnDestroy, HostBinding, EventEmitter, Output, ViewChild, ElementRef, OnInit, Inject
} from '@angular/core';
import { ControlValueAccessor, NgControl, FormControl } from '@angular/forms';
import { MatFormFieldControl, MatAutocomplete, MatDialog, MAT_DIALOG_DATA } from '@angular/material';
import { FocusMonitor } from '@angular/cdk/a11y';
import { ENTER, COMMA } from '@angular/cdk/keycodes';
import { Subject, Observable } from 'rxjs';
import { startWith, map, takeUntil, auditTime } from 'rxjs/operators';
import { TagsService } from './tags.service';

@Component({
  'templateUrl': 'planet-tag-input-dialog.component.html'
})
export class PlanetTagInputDialogComponent {

  tags: any[] = [];
  selected = new Map(this.data.tags.map(value => [ value, false ] as [ string, boolean ]));
  filterValue = '';

  constructor(
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
    console.log(this.tags);
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
export class PlanetTagInputComponent implements ControlValueAccessor, OnInit, OnDestroy {

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

  get empty() {
    return this.tagInput.nativeElement.value === '' && this._value.length === 0;
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
    return this.focused || !this.empty;
  }

  @ViewChild('tagInput') tagInput: ElementRef;
  @ViewChild('tagAuto') tagAutocomplete: MatAutocomplete;

  onTouched;
  stateChanges = new Subject<void>();
  tagChanges$ = new Subject<string>();
  private onDestroy$ = new Subject<void>();
  tags: string[] = [];
  filteredTags: Observable<string[]>;
  inputControl = new FormControl();
  focused = false;
  separatorKeyCodes = [ ENTER, COMMA ];

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
    this.filteredTags = this.inputControl.valueChanges.pipe(
      startWith(null),
      map((value: string | null) => value ? this.tagsService.filterTags(this.tags, value) : this.tags),
      map((fullList) => fullList.slice(0, 5))
    );
    this.focusMonitor.monitor(elementRef.nativeElement, true).subscribe(origin => {
      this.focused = !!origin;
      this.stateChanges.next();
    });
  }

  ngOnInit() {
    this.tagChanges$.pipe(takeUntil(this.onDestroy$), auditTime(200)).subscribe((newTag) => {
      this.addTag(newTag);
    });
  }

  ngOnDestroy() {
    this.stateChanges.complete();
    this.onDestroy$.next();
    this.onDestroy$.complete();
    this.focusMonitor.stopMonitoring(this.elementRef.nativeElement);
  }

  onChange(_: any) {}

  inputAddTag(event: any) {
    this.tagChanges$.next(event.value);
  }

  autocompleteAddTag(event: any) {
    this.tagChanges$.next(event.option.viewValue);
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

  openPresetDialog() {
    this.dialog.open(PlanetTagInputDialogComponent, {
      width: '80vw',
      maxHeight: '80vh',
      data: {
        tagUpdate: this.dialogTagUpdate.bind(this),
        startingTags: this.value,
        tags: this.tags
      }
    });
  }

  dialogTagUpdate(tag, isSelected) {
    if (isSelected) {
      this.addTag(tag);
    } else {
      this.removeTag(tag);
    }
  }

}
