import { Component, Input, ViewEncapsulation, OnChanges, Output, EventEmitter, OnInit, ViewChildren, QueryList, ViewChild } from '@angular/core';
import { MatLegacySelectionList as MatSelectionList } from '@angular/material/legacy-list';
import * as constants from '../constants';
import { languages } from '../../shared/languages';
import { dedupeShelfReduce } from '../../shared/utils';
import { trackByCategory } from '../../shared/table-helpers';

@Component({
  template: `
    <span class="mat-caption" i18n>{category, select,
      languageOfInstruction {Language}
      gradeLevel {Grade Level}
      subjectLevel {Subject Level}
    }
    </span>
    <mat-selection-list (selectionChange)="selectionChange($event)">
      <mat-list-option *ngFor="let item of items" [value]="item.value" [selected]="isSelected(item)" checkboxPosition="before">
        {{item?.label || 'N/A'}}
      </mat-list-option>
    </mat-selection-list>
  `,
  selector: 'planet-courses-search-list',
  styleUrls: [ './courses-search.scss' ],
  encapsulation: ViewEncapsulation.None
})
export class CoursesSearchListComponent {

  @Input() category;
  @Input() items;
  @Input() selected: string[] = [];
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
    this.selectionList.deselectAll();
  }

  isSelected(item) {
    return this.selected.indexOf(item) > -1;
  }

}

@Component({
  template: `
    <planet-courses-search-list
      *ngFor="let list of searchLists;trackBy:trackByFn"
      [category]="list.category"
      [items]="list.items"
      (selectChange)="selectChange($event)"
      [selected]="selected[list.category]">
    </planet-courses-search-list>
  `,
  styleUrls: [ './courses-search.scss' ],
  selector: 'planet-courses-search',
  encapsulation: ViewEncapsulation.None
})
export class CoursesSearchComponent implements OnInit, OnChanges {

  @Input() filteredData: any[];
  @Input() startingSelection: any;
  @Output() searchChange = new EventEmitter<any>();
  @ViewChildren(CoursesSearchListComponent) searchListComponents: QueryList<CoursesSearchListComponent>;
  trackByFn = trackByCategory;

  categories = [
    { 'label': 'languageOfInstruction', 'options': languages },
    { 'label': 'gradeLevel', 'options': constants.gradeLevels },
    { 'label': 'subjectLevel', 'options': constants.subjectLevels },
  ];

  searchLists = [];
  selected: any = {};

  ngOnInit() {
    this.reset({ startingSelection: this.startingSelection, isInit: true });
  }

  ngOnChanges() {
    this.searchLists = this.categories.reduce((lists, category) => {
      return lists.concat(this.createSearchList(category, this.filteredData));
    }, []);
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
        .sort((a, b) => a.toLowerCase() > b.toLowerCase() ? 1 : -1).map(item => category.options.find(opt => opt.value === item))
        .filter(item => item)
    });
  }

  selectChange({ items, category }) {
    this.selected[category] = items;
    this.searchChange.emit({ items, category });
  }

}
