import {
  Component, Input, Optional, Self, OnInit, OnChanges, OnDestroy, HostBinding, EventEmitter, Output, ElementRef
} from '@angular/core';
import { ControlValueAccessor, NgControl, FormControl } from '@angular/forms';
import { MatFormFieldControl, MatDialog, MatDialogRef } from '@angular/material';
import { FocusMonitor } from '@angular/cdk/a11y';
import { coerceBooleanProperty } from '@angular/cdk/coercion';
import { Subject } from 'rxjs';
import { TagsService } from './tags.service';
import { PlanetTagInputDialogComponent } from './planet-tag-input-dialog.component';
import { dedupeShelfReduce } from '../utils';
import { UserService } from '../user.service';

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
  _value: string[] = [];
  @Input()
  get value() {
    return this._value;
  }
  set value(tags: string[]) {
    this._value = tags || [];
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

  private _disabled = false;
  @Input()
  get disabled() {
    return this._disabled;
  }
  set disabled(dis) {
    this._disabled = coerceBooleanProperty(dis);
    this.stateChanges.next();
  }
  @Input() mode = 'filter';
  @Input() parent = false;
  @Input() filteredData = [];
  @Input() helperText = true;
  @Input() selectedIds;
  @Input() labelType = this.mode;
  @Input() db;
  @Output() finalTags = new EventEmitter<{ selected: string[], indeterminate: string[] }>();

  shouldLabelFloat = false;
  onTouched;
  stateChanges = new Subject<void>();
  tags: string[] = [];
  inputControl = new FormControl();
  focused = false;
  dialogRef: MatDialogRef<PlanetTagInputDialogComponent>;
  selectMany = false;

  constructor(
    @Optional() @Self() public ngControl: NgControl,
    private focusMonitor: FocusMonitor,
    private elementRef: ElementRef,
    private tagsService: TagsService,
    private dialog: MatDialog,
    private userService: UserService
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

  initTags(editedId?: string) {
    this.tagsService.getTags(this.db, this.parent).subscribe((tags: any[]) => {
      this.tags = tags;
      const newValue = this.value.concat(editedId).filter(tagId => tags.some(tag => tag._id === tagId)).reduce(dedupeShelfReduce, []);
      this.value = newValue;
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
    this.initTags();
    this.dialogRef = this.dialog.open(PlanetTagInputDialogComponent, {
      minWidth: '25vw',
      maxWidth: '90vw',
      maxHeight: '80vh',
      autoFocus: false,
      data: this.dialogData(true)
    });
    this.dialogRef.afterClosed().subscribe((result) => {
      if (result && result.wasOkClicked === true) {
        this.finalTags.emit({ selected: this.value, indeterminate: result.indeterminate });
      }
    });
  }

  dialogData(isInit = false) {
    let startingTags: any[];
    if (this.selectedIds && isInit) {
      startingTags = this.tagsInSelection(this.selectedIds, this.filteredData);
      this.writeValue(startingTags.map((tag: any) => tag.tagId));
    } else {
      startingTags = this.value;
    }
    return ({
      tagUpdate: this.dialogTagUpdate.bind(this),
      initTags: this.initTags.bind(this),
      reset: this.resetDialogData.bind(this),
      startingTags,
      tags: this.addTagCount(this.tags.filter(this.tagsService.filterOutSubTags), this.selectMany),
      mode: this.mode,
      initSelectMany: this.selectMany,
      db: this.db
    });
  }

  tagsInSelection(selectedIds, data) {
    const selectedTagsObject = selectedIds
      .reduce((selectedTags, id) => {
        const tags = this.filteredData.find((item: any) => item._id === id).tags || [];
        tags.forEach((tag: any) => {
          selectedTags[tag._id] = selectedTags[tag._id] === undefined ? 1 : selectedTags[tag._id] + 1;
        });
        return selectedTags;
      }, {});
    return Object.entries(selectedTagsObject).map(([ tagId, count ]) => ({ tagId, indeterminate: count !== selectedIds.length }));
  }

  resetDialogData(selectMany = this.selectMany) {
    this.selectMany = selectMany;
    if (this.dialogRef && this.dialogRef.componentInstance) {
      this.dialogRef.componentInstance.data = this.dialogData();
      this.dialogRef.componentInstance.dataInit();
    }
  }

  addTagCount(tags, selectMany = false) {
    return this.mode === 'add' ? tags : tags.map((tag) => {
      return !selectMany ? tag : ({
        ...tag,
        count: this.filteredData.reduce(
          (count, item: any) => count + ((item.tags || []).findIndex((itemTag: any) => itemTag._id === tag._id) > -1 ? 1 : 0),
          0
        )
      });
    });
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
