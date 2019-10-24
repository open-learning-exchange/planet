import { Component, OnInit, ViewChild } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
// import { FormControl } from '../../../node_modules/@angular/forms';
import { FormControl, } from '@angular/forms';
import { MatTableDataSource, MatPaginator, MatSort, MatDialog, PageEvent, MatDialogRef } from '@angular/material';
import { SelectionModel } from '@angular/cdk/collections';
// import { selectedOutOfFilter } from '../shared/table-helpers';
import { selectedOutOfFilter } from '../../shared/table-helpers';
import { ResourcesSearchComponent } from '../../resources/search-resources/resources-search.component';

@Component({
  selector: 'app-users-personals',
  templateUrl: './users-personals.component.html',
  styleUrls: ['./users-personals.component.scss']
})
export class UsersPersonalsComponent implements OnInit {

  @ViewChild(MatPaginator, { static: false }) paginator: MatPaginator;
  @ViewChild(ResourcesSearchComponent, { static: false }) searchComponent: ResourcesSearchComponent;
  resources = new MatTableDataSource();
  parent = this.route.snapshot.data.parent;
  tagFilter = new FormControl([]);
  readonly dbName = 'resources';
  showFilters = 'off';
  readonly myLibraryFilter: { value: 'on' | 'off' } = { value: this.route.snapshot.data.myLibrary === true ? 'on' : 'off' };
  searchSelection: any = { _empty: true };

  tagFilterValue = [];
  private _titleSearch = '';
  get titleSearch(): string { return this._titleSearch; }
  set titleSearch(value: string) {
    // When setting the titleSearch, also set the resource filter
    this.resources.filter = value ? value : this.dropdownsFill();
    this._titleSearch = value;
    this.removeFilteredFromSelection();
  }
  selection = new SelectionModel(true, []);

  constructor(
    private router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit() {
  }

  goBack() {
    this.parent ? this.router.navigate([ '/manager' ]) : this.router.navigate([ '/' ]);
  }

  toggleFilters() {
    this.showFilters = this.showFilters === 'off' ? 'on' : 'off';
  }

  onSearchChange({ items, category }) {
    this.searchSelection[category] = items;
    this.searchSelection._empty = Object.entries(this.searchSelection).every(([ field, val ]: any[]) => val.length === 0);
    this.titleSearch = this.titleSearch;
    this.removeFilteredFromSelection();
  }

  removeFilteredFromSelection() {
    this.selection.deselect(...selectedOutOfFilter(this.resources.filteredData, this.selection, this.paginator));
  }

  // Returns a space to fill the MatTable filter field so filtering runs for dropdowns when
  // search text is deleted, but does not run when there are no active filters.
  dropdownsFill() {
    return this.tagFilter.value.length > 0 ||
      Object.entries(this.searchSelection).findIndex(([ field, val ]: any[]) => val.length > 0) > -1 ||
      this.myLibraryFilter.value === 'on' ?
      ' ' : '';
  }

  resetFilter() {
    this.tagFilter.setValue([]);
    this.tagFilterValue = [];
    Object.keys(this.searchSelection).forEach(key => this.searchSelection[key] = []);
    if (this.searchComponent) {
      this.searchComponent.reset();
    }
    this.titleSearch = '';
  }

  /** Selects all rows if they are not all selected; otherwise clear selection. */
  masterToggle() {
    const start = this.paginator.pageIndex * this.paginator.pageSize;
    const end = start + this.paginator.pageSize;
    this.isAllSelected() ?
    this.selection.clear() :
    this.resources.filteredData.slice(start, end).forEach((row: any) => this.selection.select(row._id));
  }

  /** Whether the number of selected elements matches the total number of rows. */
  isAllSelected() {
    const itemsShown = Math.min(this.paginator.length - (this.paginator.pageIndex * this.paginator.pageSize), this.paginator.pageSize);
    return this.selection.selected.length === itemsShown;
  }

}
