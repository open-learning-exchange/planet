import {
  Component, Input, ViewEncapsulation, OnChanges, Output, EventEmitter, OnInit, ViewChildren, QueryList, ViewChild
} from '@angular/core';
import { MatSelectionList } from '@angular/material/list';
import * as constants from '../resources-constants';
import { languages } from '../../shared/languages';
import { dedupeShelfReduce } from '../../shared/utils';
import { trackByCategory } from '../../shared/table-helpers';

@Component({
  template: `
    <span class="mat-caption" i18n>{category, select,
      subject {Subject}
      language {Language}
      medium {Medium}
      level {Level}
    }
    </span>
    <mat-selection-list (selectionChange)="selectionChange($event)">
      <mat-list-option *ngFor="let item of items" [value]="item.value" [selected]="isSelected(item)" checkboxPosition="before">
        {{item?.label || 'N/A'}}
      </mat-list-option>
    </mat-selection-list>
  `,
  selector: 'planet-resources-search-list',
  styleUrls: [ './resources-search.scss' ],
  encapsulation: ViewEncapsulation.None
})
export class ResourcesSearchListComponent {

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
    return this.selected.indexOf(item.value) > -1;
  }

}

@Component({
  template: `
    <planet-resources-search-list
      *ngFor="let list of searchLists;trackBy:trackByFn"
      [category]="list.category"
      [items]="list.items"
      (selectChange)="selectChange($event)"
      [selected]="selected[list.category]">
    </planet-resources-search-list>
  `,
  styleUrls: [ './resources-search.scss' ],
  selector: 'planet-resources-search',
  encapsulation: ViewEncapsulation.None
})
export class ResourcesSearchComponent implements OnInit, OnChanges {

  @Input() filteredData: any[];
  @Input() startingSelection: any;
  @Output() searchChange = new EventEmitter<any>();
  @ViewChildren(ResourcesSearchListComponent) searchListComponents: QueryList<ResourcesSearchListComponent>;
  trackByFn = trackByCategory;

  categories = [
    { 'label': 'subject', 'options': constants.subjectList },
    { 'label': 'language', 'options': languages },
    { 'label': 'medium', 'options': constants.media },
    { 'label': 'level', 'options': constants.levelList }
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
        .sort((a, b) => a.toLowerCase() > b.toLowerCase() ? 1 : -1).map(item => category.options.find(opt => opt.value === item))
        .filter(item => item)
    });
  }

  selectChange({ items, category }) {
    this.selected[category] = items;
    this.searchChange.emit({ items, category });
  }

}
