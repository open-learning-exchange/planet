import {
  Component, Input, Optional, Self, OnInit, OnChanges, OnDestroy, HostBinding, EventEmitter, Output, ElementRef
} from '@angular/core';
import { ControlValueAccessor, NgControl, FormControl } from '@angular/forms';
import { MatFormFieldControl, MatDialog, MatDialogRef } from '@angular/material';
import { FocusMonitor } from '@angular/cdk/a11y';
import { Subject } from 'rxjs';
import { TagsService } from './tags.service';
import { PlanetTagInputDialogComponent } from './planet-tag-input-dialog.component';

@Component({
  'selector': 'planet-tag-input',
  'templateUrl': './planet-tag-input.component.html',
  'styleUrls': [ 'planet-tag-input.scss' ],
  'providers': [
    { provide: MatFormFieldControl, useExisting: PlanetTagInputComponent }
  ]
})
export class PlanetTagInputComponent implements ControlValueAccessor, OnInit, OnChanges, OnDestroy {

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
  @Input() mode = 'filter';
  @Input() parent = false;
  @Input() filteredData = [];
  @Input() helperText = true;

  shouldLabelFloat = false;
  onTouched;
  stateChanges = new Subject<void>();
  tags: string[] = [];
  inputControl = new FormControl();
  focused = false;
  tooltipLabels = '';
  dialogRef: MatDialogRef<PlanetTagInputDialogComponent>;
  selectMany = false;

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
  }

  ngOnInit() {
    this.initTags();
  }

  ngOnChanges() {
    if (this.selectMany) {
      this.resetDialogData();
    }
  }

  ngOnDestroy() {
    this.stateChanges.complete();
    this.focusMonitor.stopMonitoring(this.elementRef.nativeElement);
  }

  onChange(_: any) {}

  initTags() {
    this.tagsService.getTags(this.parent).subscribe((tags: string[]) => {
      this.tags = tags;
      this.setLabels(this.value, tags);
      this.resetDialogData();
    });
  }

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
    if (this.tags.length > 0) {
      this.setLabels(tags, this.tags);
    }
  }

  setLabels(selectedTags, allTags) {
    const tagsNames = selectedTags.map((tag: any) => this.tagsService.findTag(tag, allTags).name);
    this.tooltipLabels = tagsNames.join(', ');
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
    this.dialogRef = this.dialog.open(PlanetTagInputDialogComponent, {
      maxWidth: '80vw',
      maxHeight: '80vh',
      autoFocus: false,
      data: this.dialogData()
    });
  }

  dialogData() {
    return ({
      tagUpdate: this.dialogTagUpdate.bind(this),
      initTags: this.initTags.bind(this),
      reset: this.resetDialogData.bind(this),
      startingTags: this.value,
      tags: this.filterTags(this.tags, this.selectMany),
      mode: this.mode,
      initSelectMany: this.selectMany
    });
  }

  resetDialogData(selectMany = this.selectMany) {
    this.selectMany = selectMany;
    if (this.dialogRef && this.dialogRef.componentInstance) {
      this.dialogRef.componentInstance.data = this.dialogData();
      this.dialogRef.componentInstance.dataInit();
    }
  }

  filterTags(tags, selectMany = false) {
    return this.mode === 'add' ? tags : tags.map((tag) => {
      return !selectMany ? tag : ({
        ...tag,
        count: this.filteredData.reduce((count, item: any) => count + ((item.tags || []).indexOf(tag._id) > -1 ? 1 : 0), 0)
      });
    }).filter((tag: any) => tag.count > 0);
  }

  dialogTagUpdate(tag, isSelected, tagOne = false) {
    this.selectMany = !tagOne;
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
