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

import * as constants from '../courses.constants';


export const coursesSearchCategories = [
  { label: 'languageOfInstruction', options: languages },
  { label: 'gradeLevel', options: constants.gradeLevels },
  { label: 'subjectLevel', options: constants.subjectLevels },
];

@Component({
  template: `
    <ng-template #caption>
      <ng-container i18n>{category, select,
        languageOfInstruction {Language}
        gradeLevel {Grade Level}
        subjectLevel {Subject Level}
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
            <span matListItemTitle>
              @if (item?.label) {
                {{item.label}}
              } @else {
                <ng-container i18n>N/A</ng-container>
              }
            </span>
          </mat-list-option>
        }
      </mat-selection-list>
    }
    `,
  selector: 'planet-courses-search-list',
  encapsulation: ViewEncapsulation.None,
  imports: [MatSelectionList, MatListOption, MatListItemTitle, MatFormField, MatLabel, MatSelect, MatOption, NgTemplateOutlet]
})
export class CoursesSearchListComponent {

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
    // Compact mode has no selection list: its select follows the selected input
    this.selectionList?.deselectAll();
  }

  isSelected(item) {
    return this.selected.indexOf(item.value) > -1;
  }

}

@Component({
  template: `
    @for (list of searchLists; track trackByFn($index, list)) {
      <planet-courses-search-list
        [category]="list.category"
        [items]="list.items"
        (selectChange)="selectChange($event)"
        [selected]="selected[list.category]"
        [compact]="compact">
      </planet-courses-search-list>
    }
    `,
  selector: 'planet-courses-search',
  encapsulation: ViewEncapsulation.None,
  imports: [CoursesSearchListComponent]
})
export class CoursesSearchComponent implements OnInit, OnChanges {

  @Input() filteredData: any[];
  @Input() startingSelection: any;
  @Input() compact = false;
  @Output() searchChange = new EventEmitter<any>();
  @ViewChildren(CoursesSearchListComponent) searchListComponents: QueryList<CoursesSearchListComponent>;
  trackByFn = trackByCategory;

  categories = coursesSearchCategories;

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
    return ({
      category: category.label,
      items: data.reduce((list, { doc }) => list.concat(doc[category.label]), []).reduce(dedupeShelfReduce, []).filter(item => item)
        .filter(item => typeof item === 'string' && item.trim() !== '')
        .map(item => category.options.find(opt => opt.value === item))
        .filter(item => item)
        .sort((a, b) => category.options.indexOf(a) - category.options.indexOf(b))
    });
  }

  selectChange({ items, category }) {
    this.selected[category] = items;
    this.searchChange.emit({ items, category });
  }

}
