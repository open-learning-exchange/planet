import {
  Component, Input, ViewEncapsulation, OnChanges, Output, EventEmitter, OnInit, ViewChildren, QueryList, ViewChild
} from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { MatSelectionList, MatListOption, MatListItemTitle } from '@angular/material/list';
import { MatFormField, MatLabel } from '@angular/material/form-field';
import { MatSelect } from '@angular/material/select';
import { MatOption } from '@angular/material/core';

import { languages } from '@shared/language/languages';
import { dedupeShelfReduce } from '@shared/utils';
import { trackByCategory } from '@shared/tables/table.helpers';

import * as constants from '../resources.constants';
import { resourceFileTypeValue } from '../resources.utils';


export const resourcesSearchCategories = [
  { label: 'subject', options: constants.subjectList },
  { label: 'language', options: languages },
  { label: 'medium', options: constants.media },
  { label: 'fileType', options: constants.fileTypes, docValue: resourceFileTypeValue },
  { label: 'level', options: constants.levelList }
];

@Component({
  template: `
    <ng-template #caption>
      <ng-container i18n>{category, select,
        subject {Subject}
        language {Language}
        medium {Medium}
        fileType {File Type}
        level {Level}
      }</ng-container>
    </ng-template>
    @if (compact) {
      <mat-form-field subscriptSizing="dynamic" floatLabel="always">
        <mat-label><ng-container *ngTemplateOutlet="caption"></ng-container></mat-label>
        <mat-select multiple placeholder="All" i18n-placeholder [value]="selected" (selectionChange)="emitChange($event.value)">
          @for (item of items; track item) {
            <mat-option [value]="item.value">{{item.label}}</mat-option>
          }
        </mat-select>
      </mat-form-field>
    } @else {
      <span class="mat-caption"><ng-container *ngTemplateOutlet="caption"></ng-container></span>
      <mat-selection-list (selectionChange)="selectionChange($event)">
        @for (item of items; track item) {
          <mat-list-option [value]="item.value" [selected]="isSelected(item)" checkboxPosition="before">
            <span matListItemTitle>{{item?.label || 'N/A'}}</span>
          </mat-list-option>
        }
      </mat-selection-list>
    }
    `,
  selector: 'planet-resources-search-list',
  encapsulation: ViewEncapsulation.None,
  imports: [MatSelectionList, MatListOption, MatListItemTitle, MatFormField, MatLabel, MatSelect, MatOption, NgTemplateOutlet]
})
export class ResourcesSearchListComponent {

  @Input() category;
  @Input() items;
  @Input() selected: string[] = [];
  @Input() compact = false;
  @Output() selectChange = new EventEmitter<any>();
  @ViewChild(MatSelectionList) selectionList: MatSelectionList;

  selectionChange(event) {
    this.emitChange(event.source.selectedOptions.selected.map(option => option.value));
  }

  emitChange(items) {
    this.selectChange.emit({
      items,
      category: this.category
    });
  }

  reset() {
    this.selectionList?.deselectAll();
  }

  isSelected(item) {
    return this.selected.indexOf(item.value) > -1;
  }

}

@Component({
  template: `
    @for (list of searchLists; track trackByFn($index, list)) {
      <planet-resources-search-list
        [category]="list.category"
        [items]="list.items"
        (selectChange)="selectChange($event)"
        [selected]="selected[list.category]"
        [compact]="compact">
      </planet-resources-search-list>
    }
    `,
  selector: 'planet-resources-search',
  encapsulation: ViewEncapsulation.None,
  imports: [ResourcesSearchListComponent]
})
export class ResourcesSearchComponent implements OnInit, OnChanges {

  @Input() filteredData: any[];
  @Input() startingSelection: any;
  @Input() compact = false;
  @Output() searchChange = new EventEmitter<any>();
  @ViewChildren(ResourcesSearchListComponent) searchListComponents: QueryList<ResourcesSearchListComponent>;
  trackByFn = trackByCategory;

  categories = resourcesSearchCategories;

  searchLists = [];
  selected: any = {};

  ngOnInit() {
    this.reset({ startingSelection: this.startingSelection, isInit: true });
  }

  ngOnChanges() {
    this.searchLists = this.categories.reduce((lists, category) => lists.concat(this.createSearchList(category, this.filteredData)), []);
  }

  reset({ startingSelection = {}, isInit = false } = {}) {
    this.selected = this.categories.reduce((select, category) => ({ ...select, [category.label]: [] }), {});
    this.selected = { ...this.selected, ...startingSelection };
    if (!isInit) {
      this.searchListComponents.forEach((component) => component.reset());
    }
  }

  createSearchList(category, data) {
    const docValue = category.docValue ?? ((doc) => doc[category.label]);
    return ({
      category: category.label,
      items: data.reduce((list, { doc }) => list.concat(docValue(doc)), []).reduce(dedupeShelfReduce, []).filter(item => item)
        .sort((a, b) => a.toLowerCase() > b.toLowerCase() ? 1 : -1).map(item => category.options.find(opt => opt.value === item))
        .filter(item => item)
    });
  }

  selectChange({ items, category }) {
    this.selected[category] = items;
    this.searchChange.emit({ items, category });
  }

}
