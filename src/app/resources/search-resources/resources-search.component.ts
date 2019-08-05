import {
  Component,
  Input,
  ViewEncapsulation,
  OnChanges,
  Output,
  EventEmitter,
  OnInit,
  ViewChildren,
  QueryList,
  ViewChild
} from '@angular/core';
import { dedupeShelfReduce } from '../../shared/utils';
import { MatSelectionList } from '@angular/material';

@Component({
  template: `
    <span class="mat-caption" i18n>{category, select,
      subject {Subject}
      language {Language}
      mediaType {Medium}
      level {Level}
    }
    </span>
    <mat-selection-list (selectionChange)="selectionChange($event)">
      <mat-list-option *ngFor="let item of items" [value]="item" [selected]="isSelected(item)" checkboxPosition="before">
        {{item}}
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
  @ViewChild(MatSelectionList, { static: false }) selectionList: MatSelectionList;

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

  categories = [ 'subject', 'language', 'mediaType', 'level' ];
  searchLists = [];
  selected: any = {};

  constructor () {}

  ngOnInit() {
    this.reset({ startingSelection: this.startingSelection, isInit: true });
  }

  ngOnChanges() {
    this.searchLists = this.categories.reduce((lists, category) => {
      return lists.concat(this.createSearchList(category, this.filteredData));
    }, []);
  }

  reset({ startingSelection = {}, isInit = false } = {}) {
    this.selected = this.categories.reduce((select, category) => ({ ...select, [category]: [] }), {});
    this.selected = { ...this.selected, ...startingSelection };
    if (!isInit) {
      this.searchListComponents.forEach((component) => component.reset());
    }
  }

  createSearchList(category, data) {
    return ({
      category,
      items: data.reduce((list, { doc }) => list.concat(doc[category]), []).reduce(dedupeShelfReduce, []).filter(item => item)
        .sort((a, b) => a.toLowerCase() > b.toLowerCase() ? 1 : -1)
    });
  }

  selectChange({ items, category }) {
    this.selected[category] = items;
    this.searchChange.emit({ items, category });
  }

  trackByFn(index, item: { category: string, items: string[] }) {
    return item.category;
  }

}
