import { Component, Inject, Input } from '@angular/core';
import { FormGroup, FormBuilder, Validators, AbstractControl } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material';
import { TagsService } from './tags.service';
import { PlanetMessageService } from '../planet-message.service';
import { ValidatorService } from '../../validators/validator.service';
import { DialogsFormService } from '../dialogs/dialogs-form.service';
import { UserService } from '../user.service';
import { CustomValidators } from '../../validators/custom-validators';
import { mapToArray, isInMap } from '../utils';

@Component({
  'templateUrl': 'planet-tag-input-dialog.component.html',
  'styles': [ `
    :host .mat-list-option span {
      font-weight: inherit;
    }
  ` ]
})
export class PlanetTagInputDialogComponent {

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
  newTagId: string;
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
    private userService: UserService
  ) {
    this.dataInit();
    // April 17, 2019: Removing selectMany toggle, but may revisit later
    // this.selectMany = this.mode === 'add' || this.data.initSelectMany;
    this.data.startingTags
      .filter((tag: any) => tag)
      .forEach(tag => {
        this.tagChange([ tag.tagId || tag ], !this.selectMany);
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
    if (this.newTagId !== undefined) {
      this.tagChange([ this.newTagId ]);
      this.newTagId = undefined;
    }
  }

  tagChange(tags, tagOne = false) {
    const newState = !this.selected.get(tags[0]);
    tags.forEach((tag, index) => {
      if (index === 0 || newState) {
        this.selected.set(tag, newState || this.indeterminate.get(tag));
        this.indeterminate.set(tag, false);

        this.data.tagUpdate(tag, this.selected.get(tag), tagOne);
      }
    });
  }

  updateFilter(value) {
    this.filterValue = value;
    this.tags = this.filterTags(value);
  }

  filterTags(value) {
    return value ? this.tagsService.filterTags(this.data.tags, value) : this.data.tags;
  }

  selectOne(tag, subTag?) {
    this.data.tagUpdate(tag, true, true);
    if (subTag !== undefined) {
      this.data.tagUpdate(subTag, true);
    }
    this.dialogRef.close();
  }

  checkboxChange(event, tag) {
    event.source.checked = isInMap(tag, this.selected);
  }

  addLabel() {
    const onAllFormControls = (func: any) => Object.entries(this.addTagForm.controls).forEach(func);
    if (this.addTagForm.valid) {
      this.tagsService.updateTag({ ...this.addTagForm.value, db: this.data.db, docType: 'definition' }).subscribe((res) => {
        this.newTagId = res[0].id;
        this.planetMessageService.showMessage('New collection added');
        onAllFormControls(([ key, value ]) => value.updateValueAndValidity());
        this.data.initTags();
        this.resetFormControl(this.addTagForm.get('name'));
        this.resetFormControl(this.addTagForm.get('attachedTo'));
      });
    } else {
      onAllFormControls(([ key, value ]) => value.markAsTouched({ onlySelf: true }));
    }
  }

  resetFormControl(control: AbstractControl) {
    control.setValue('');
    control.markAsPristine();
    control.markAsUntouched();
  }

  editTagClick(event, tag) {
    const onSubmit = ((newTag) => {
      this.tagsService.updateTag({ ...tag, ...newTag }).subscribe((res) => {
        const newTagId = res[0].id;
        this.planetMessageService.showMessage('Collection updated');
        this.selected.set(newTagId, this.selected.get(tag._id));
        this.indeterminate.set(newTagId, this.indeterminate.get(tag._id));
        this.data.initTags(newTagId);
        this.dialogsFormService.closeDialogsForm();
      });
    }).bind(this);
    event.stopPropagation();
    const options = this.tags.map((t: any) => ({ name: t.name, value: t._id || t.name })).filter((t: any) => t.name !== tag.name);
    this.dialogsFormService.openDialogsForm('Edit Collection', [
      { placeholder: 'Name', name: 'name', required: true, type: 'textbox' },
      { placeholder: 'Subcollection of...', name: 'attachedTo', type: 'selectbox', options, required: false, multiple: true }
    ], this.tagForm(tag), { onSubmit });
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
    this.subcollectionIsOpen.set(tagId, !this.subcollectionIsOpen.get(tagId));
  }

}

@Component({
  'selector': 'planet-tag-input-toggle-icon',
  'template': `
    <button mat-icon-button>
      <mat-icon *ngIf="!isOpen">expand_more</mat-icon>
      <mat-icon *ngIf="isOpen">expand_less</mat-icon>
    </button>
  `
})
export class PlanetTagInputToggleIconComponent {

  @Input() isOpen = false;

}
