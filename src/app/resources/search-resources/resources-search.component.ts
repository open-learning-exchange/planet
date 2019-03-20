import { Component, Input, ViewEncapsulation, OnChanges } from '@angular/core';
import { dedupeShelfReduce } from '../../shared/utils';

@Component({
  template: `
    <planet-resources-search-list *ngFor="let list of searchLists" [category]="list.category" [items]="list.items">
    </planet-resources-search-list>
  `,
  styleUrls: [ './resources-search.scss' ],
  selector: 'planet-resources-search',
  encapsulation: ViewEncapsulation.None
})
export class ResourcesSearchComponent {

  @Input() filteredData: any[];

  categories = [ 'subject', 'languages', 'mediaType', 'level' ];
  searchLists = [];

  constructor () {}

  ngOnChanges() {
    this.searchLists = this.categories.reduce((lists, category) => {
      return lists.concat(this.createSearchList(category, this.filteredData));
    }, []);
  }

  createSearchList(category, data) {
    return ({
      category,
      items: data.reduce((list, item) => list.concat(item[category]), []).reduce(dedupeShelfReduce, []).filter(item => item)
    })
  }

}

@Component({
  template: `
    <span class="mat-caption" i18n>{category, select,
      subject {Subject}
      languages {Language}
      mediaType {Medium}
      level {Level}
    }
    </span>
    <mat-selection-list>
      <mat-list-option *ngFor="let item of items" [value]="item">{{item}}</mat-list-option>
    </mat-selection-list>
  `,
  selector: 'planet-resources-search-list',
  styleUrls: [ './resources-search.scss' ],
  encapsulation: ViewEncapsulation.None
})
export class ResourcesSearchListComponent {

  @Input() category;
  @Input() items;

}
