import { Component, Inject, Input } from '@angular/core';
import { FormGroup, FormBuilder } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialog } from '@angular/material/dialog';
import { TagsService } from './tags.service';
import { PlanetMessageService } from '../planet-message.service';
import { ValidatorService } from '../../validators/validator.service';
import { DialogsFormService } from '../dialogs/dialogs-form.service';
import { UserService } from '../user.service';
import { CustomValidators } from '../../validators/custom-validators';
import { mapToArray, isInMap } from '../utils';
import { DialogsLoadingService } from '../../shared/dialogs/dialogs-loading.service';
import { DialogsPromptComponent } from '../../shared/dialogs/dialogs-prompt.component';

@Component({
  'templateUrl': 'planet-tag-input-dialog.component.html',
  'styles': [ `
    :host .mat-list-option span {
      font-weight: inherit;
    }
    :host p[matLine] *, :host .mat-nav-list .mat-list-item * {
      margin-right: 0.25rem;
    }
    :host p[matLine] *:last-child, :host .mat-nav-list .mat-list-item *:last-child {
      margin-right: 0;
    }
    :host mat-dialog-actions {
      padding: 0;
    }
  ` ]
})
export class PlanetTagInputDialogComponent {

  deleteDialog: any;
  tags: any[] = [];
  selected: Map<string, boolean> = new Map(this.data.tags.map(value => [ value, false ] as [ string, boolean ]));
  indeterminate: Map<string, boolean> = new Map(this.data.tags.map((value: any) => [ value._id, false ] as [ string, boolean ]));
  filterValue = '';
  mode = 'filter';
  _selectMany = true;
  get selectMany() {
    return this._selectMany;
  }
  set selectMany(value: boolean) {
    this._selectMany = value;
    this.data.reset(value);
  }
  addTagForm: FormGroup;
  newTagInfo: { id: string, parentId?: string };
  isUserAdmin = false;
  isInMap = isInMap;
  subcollectionIsOpen = new Map();
  get okClickValue() {
    return { wasOkClicked: true, indeterminate: this.indeterminate ? mapToArray(this.indeterminate, true) : [] };
  }

  constructor(
    public dialogRef: MatDialogRef<PlanetTagInputDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any,
    private tagsService: TagsService,
    private fb: FormBuilder,
    private planetMessageService: PlanetMessageService,
    private validatorService: ValidatorService,
    private dialogsFormService: DialogsFormService,
    private userService: UserService,
    private dialogsLoadingService: DialogsLoadingService,
    private dialog: MatDialog
  ) {
    this.dataInit();
    // April 17, 2019: Removing selectMany toggle, but may revisit later
    // August 2, 2019: We are not readding the toggle, but for filter mode we allow select many to be turned off
    this.selectMany = this.mode === 'add' || this.data.selectMany;
    this.data.startingTags
      .filter((tag: any) => tag)
      .forEach(tag => {
        this.tagChange(tag.tagId || tag, { tagOne: !this.selectMany });
        this.indeterminate.set(tag.tagId || tag, tag.indeterminate || false);
      });
    this.addTagForm = this.fb.group({
      name: [ '', this.tagNameSyncValidator(), ac => this.tagNameAsyncValidator(ac) ],
      attachedTo: [ [] ]
    });
    this.isUserAdmin = this.userService.get().isUserAdmin;
  }

  dataInit() {
    this.tags = this.filterTags(this.filterValue);
    this.mode = this.data.mode;
    if (this.newTagInfo && this.newTagInfo.id !== undefined && this.mode === 'add') {
      const { parentId, id } = this.newTagInfo;
      const parentTag = parentId.length > 0 ? this.data.tags.find(tag => tag._id === parentId) : undefined;
      this.tagChange(id, { parentTag });
    }
    this.newTagInfo = undefined;
  }

  resetSelection() {
    this.data.tagUpdate('', false, true);
    this.selected.clear();
    this.data.reset(this._selectMany);
  }

  tagChange(tagId, { tagOne = false, parentTag }: { tagOne?, parentTag? } = {}) {
    const newState = !this.selected.get(tagId);
    const updateTag = (id) => {
      this.selected.set(id, newState || this.indeterminate.get(id));
      this.indeterminate.set(id, false);
      this.data.tagUpdate(id, this.selected.get(id), tagOne);
    };
    updateTag(tagId);
    if (parentTag && (newState || parentTag.subTags.every(sub => !this.selected.get(sub._id)))) {
      updateTag(parentTag._id);
    }
  }

  subTagIds(subTags: any[]) {
    return subTags.map(subTag => subTag._id || subTag.name);
  }

  updateFilter(value) {
    this.filterValue = value;
    this.tags = this.filterTags(value);
  }

  filterTags(value) {
    return value ? this.tagsService.filterTags(this.data.tags, value) : this.data.tags;
  }

  selectOne(tag) {
    this.data.tagUpdate(tag, true, true);
    this.dialogRef.close();
  }

  checkboxChange(event, tag) {
    event.source.checked = isInMap(tag, this.selected);
  }

  addLabel() {
    const onAllFormControls = (func: any) => Object.entries(this.addTagForm.controls).forEach(func);
    if (this.addTagForm.valid) {
      this.tagsService.updateTag({ ...this.addTagForm.value, db: this.data.db, docType: 'definition' }).subscribe((res) => {
        this.newTagInfo = { id: res[0].id, parentId: this.addTagForm.controls.attachedTo.value };
        this.planetMessageService.showMessage($localize`New collection added`);
        onAllFormControls(([ key, value ]) => value.updateValueAndValidity());
        this.data.initTags();
        this.addTagForm.get('name').reset('');
        this.addTagForm.get('attachedTo').reset([]);
      });
    } else {
      onAllFormControls(([ key, value ]) => value.markAsTouched({ onlySelf: true }));
    }
  }

  editTagClick(event, tag) {
    const onSubmit = ((newTag) => {
      this.tagsService.updateTag({ ...tag, ...newTag }).subscribe((res) => {
        const newTagId = res[0].id;
        this.planetMessageService.showMessage($localize`Collection updated`);
        this.selected.set(newTagId, this.selected.get(tag._id));
        this.indeterminate.set(newTagId, this.indeterminate.get(tag._id));
        this.data.initTags(this.mode === 'add' ? newTagId : undefined);
        this.dialogsFormService.closeDialogsForm();
        this.dialogsLoadingService.stop();
      });
    }).bind(this);
    event.stopPropagation();
    const subcollectionField = tag.subTags && tag.subTags.length > 0 ? [] : [
      {
        placeholder: $localize`Subcollection of...`, name: 'attachedTo', type: 'selectbox',
        options: this.subcollectionOfOptions(tag, this.tags), required: false, reset: true
      }
    ];
    this.dialogsFormService.openDialogsForm('Edit Collection', [
      { placeholder: $localize`Name`, name: 'name', required: true, type: 'textbox' },
      ...subcollectionField
    ], this.tagForm(tag), { onSubmit });
  }

  subcollectionOfOptions(tag, tags) {
    return tags.filter((t: any) => t.name !== tag.name && (t.attachedTo === undefined || t.attachedTo.length === 0))
      .map((t: any) => ({ name: t.name, value: t._id || t.name }));
  }

  deleteTag(event, tag) {
    event.stopPropagation();
    const amount = 'single',
      okClick = this.deleteSelectedTag(tag),
      displayName = tag.name;
    this.deleteDialog = this.dialog.open(DialogsPromptComponent, {
      data: {
        okClick,
        amount,
        changeType: 'delete',
        type: 'tag',
        displayName
      }
    });
  }

  deleteSelectedTag(tag) {
    return {
      request: this.tagsService.deleteTag(tag),
      onNext: (data) => {
        this.data.initTags();
        this.deleteDialog.close();
        this.planetMessageService.showMessage($localize`Tag deleted: ${tag.name}`);
      },
      onError: (error) => this.planetMessageService.showAlert($localize`There was a problem deleting this tag.`)
    };
  }

  tagForm(tag: any = {}) {
    return this.fb.group({
      name: [
        tag.name || '',
        this.tagNameSyncValidator(),
        ac => this.tagNameAsyncValidator(ac, ac.value.toLowerCase() === tag.name.toLowerCase() ? ac.value : '')
      ],
      attachedTo: [ tag.attachedTo || [] ]
    });
  }

  tagNameSyncValidator() {
    return [ CustomValidators.required, ac => ac.value.match('_') ? { noUnderscore: true } : null ];
  }

  tagNameAsyncValidator(ac, exception = '') {
    return this.validatorService.isUnique$(
      'tags', '_id', ac,
      { exceptions: [ exception ], selectors: { _id: `${this.data.db}_${ac.value.toLowerCase()}` } }
    );
  }

  toggleSubcollection(event, tagId) {
    event.stopPropagation();
    const newState = !this.subcollectionIsOpen.get(tagId);
    this.subcollectionIsOpen.clear();
    this.subcollectionIsOpen.set(tagId, newState);
  }

  emptySelection() {
    const checkValue = (iterator) => {
      const { value: entry, done } = iterator.next();
      if (done) {
        return true;
      }
      const [ key, value ] = entry;
      if (value === true && this.indeterminate.get(key) !== true) {
        return false;
      }
      return checkValue(iterator);
    };
    return checkValue(this.selected.entries());
  }

}

@Component({
  'selector': 'planet-tag-input-toggle-icon',
  'template': `
    <mat-icon *ngIf="!isOpen" [inline]="true">expand_more</mat-icon>
    <mat-icon *ngIf="isOpen" [inline]="true">expand_less</mat-icon>
  `,
  'styles': [ `
    mat-icon {
      vertical-align: middle;
    }
  ` ]
})
export class PlanetTagInputToggleIconComponent {

  @Input() isOpen = false;

}
