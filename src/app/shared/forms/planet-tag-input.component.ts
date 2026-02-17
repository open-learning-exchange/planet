import {
  Component, Input, Optional, Self, OnInit, OnChanges, OnDestroy, HostBinding, EventEmitter, Output, ElementRef
} from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { ControlValueAccessor, FormControl, NgControl } from '@angular/forms';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldControl } from '@angular/material/form-field';
import { FocusMonitor } from '@angular/cdk/a11y';
import { coerceBooleanProperty } from '@angular/cdk/coercion';
import { Subject } from 'rxjs';
import { TagsService } from './tags.service';
import { PlanetTagInputDialogComponent } from './planet-tag-input-dialog.component';
import { dedupeShelfReduce } from '../utils';

interface SelectedDialogTag { tagId: string; indeterminate: boolean; }
type DialogStartingTag = string | SelectedDialogTag;
interface TagWithId extends Record<string, unknown> { _id: string; }
interface FilteredDataItem { _id: string; tags?: TagWithId[]; }
interface PlanetTagDialogData {
  tagUpdate: (tag: string, isSelected: boolean, tagOne?: boolean) => void;
  initTags: (editedId?: string) => void;
  reset: (selectMany?: boolean) => void;
  startingTags: DialogStartingTag[];
  tags: TagWithId[];
  mode: string;
  selectMany: boolean;
  db: unknown;
}

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
  set value(tags: string[] | null) {
    this._value = tags ?? [];
    if (this.mode === 'filter' && this.updateRouteParam) {
      this.filterReroute(this._value);
    }
    this.onChange(this._value);
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
  @Input() mode: string;
  @Input() parent = false;
  @Input() filteredData: FilteredDataItem[] = [];
  @Input() helperText = true;
  @Input() selectedIds?: string[];
  @Input() labelType?: string;
  @Input() db: string;
  @Input() largeFont = false;
  @Input() selectMany = true;
  @Input() updateRouteParam = true;
  @Output() finalTags = new EventEmitter<{ selected: string[], indeterminate: string[] }>();

  shouldLabelFloat = false;
  onChange: (value: string[]) => void = () => {};
  onTouched: () => void = () => {};
  stateChanges = new Subject<void>();
  tags: TagWithId[] = [];
  inputControl = new FormControl<string>('', { nonNullable: true });
  focused = false;
  dialogRef: MatDialogRef<PlanetTagInputDialogComponent>;
  tagUrlDelimiter = '_,_';

  constructor(
    @Optional() @Self() public ngControl: NgControl,
    private focusMonitor: FocusMonitor,
    private elementRef: ElementRef,
    private tagsService: TagsService,
    private dialog: MatDialog,
    private router: Router,
    private route: ActivatedRoute
  ) {
    if (this.ngControl) {
      this.ngControl.valueAccessor = this;
    }
  }

  ngOnInit() {
    this.initTags();
  }

  ngOnChanges() {
    this.labelType = this.labelType || this.mode;
    if (this.selectMany) {
      this.resetDialogData();
    }
  }

  ngOnDestroy() {
    this.stateChanges.complete();
    this.focusMonitor.stopMonitoring(this.elementRef.nativeElement);
  }

  initTags(editedId?: string) {
    this.tagsService.getTags(this.db, this.parent).subscribe((tags: TagWithId[]) => {
      this.tags = tags;
      const newValue = this.value
        .concat(editedId ? [ editedId ] : [])
        .filter(tagId => tags.some(tag => tag._id === tagId))
        .reduce(dedupeShelfReduce, []);
      this.value = newValue;
      this.resetDialogData();
    });
  }

  // newTags is a string of tags delimited by this.tagUrlDelimiter
  addTags(newTags?: string) {
    if (newTags === undefined || newTags === null) {
      return;
    }
    newTags.split(this.tagUrlDelimiter).forEach(tag => this.addTag(tag));
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

  writeValue(tags: string[] | null = []) {
    this.value = tags ?? [];
  }

  registerOnChange(fn: (value: string[]) => void) {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void) {
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

  dialogData(isInit = false): PlanetTagDialogData {
    let startingTags: DialogStartingTag[];
    if (Array.isArray(this.selectedIds) && isInit) {
      startingTags = this.tagsInSelection(this.selectedIds, this.filteredData);
      this.writeValue(startingTags.map((tag) => typeof tag === 'string' ? tag : tag.tagId));
    } else {
      startingTags = this.value;
    }
    return ({
      tagUpdate: this.dialogTagUpdate.bind(this),
      initTags: this.initTags.bind(this),
      reset: this.resetDialogData.bind(this),
      startingTags,
      tags: this.tags.filter(this.tagsService.filterOutSubTags),
      mode: this.mode,
      selectMany: this.selectMany,
      db: this.db
    });
  }

  tagsInSelection(selectedIds: string[], data: FilteredDataItem[]): SelectedDialogTag[] {
    const selectedTagsObject = selectedIds
      .reduce<Record<string, number>>((selectedTags, id) => {
        const tags = data.find((item) => item._id === id)?.tags || [];
        tags.forEach((tag) => {
          selectedTags[tag._id] = selectedTags[tag._id] === undefined ? 1 : selectedTags[tag._id] + 1;
        });
        return selectedTags;
      }, {});
    return Object.entries(selectedTagsObject).map(([ tagId, count ]) => ({ tagId, indeterminate: count !== selectedIds.length }));
  }

  resetDialogData(selectMany: boolean = this.selectMany) {
    this.selectMany = selectMany;
    if (this.dialogRef && this.dialogRef.componentInstance) {
      this.dialogRef.componentInstance.data = this.dialogData();
      this.dialogRef.componentInstance.dataInit();
    }
  }

  dialogTagUpdate(tag: string, isSelected: boolean, tagOne = false) {
    if (tagOne) {
      this.value = [];
    }
    if (isSelected) {
      this.addTag(tag);
    } else {
      this.removeTag(tag);
    }
  }

  /**
   * Adds parameter to url with currently selected tags to maintain selection after navigation (filter mode only)
   */
  filterReroute(tags: string[]) {
    const collections = tags.join(this.tagUrlDelimiter);
    const [ url, ...params ] = this.router.url.split(';');
    const newParams = params.filter(param => param.indexOf('collections') === -1).reduce((paramObj, param) => {
      const [ key, value ] = param.split('=');
      return { ...paramObj, [key]: value };
    }, {});
    this.router.navigate([ url, { ...newParams, ...(tags.length > 0 ? { collections } : {}) } ], { replaceUrl: true });
  }

}
