/*
 *  Material dialog component for selecting an object from a
 *  list, rendered as a Material table
 */

import { Component, Inject, ViewChild, AfterViewInit } from '@angular/core';
import { MatTableDataSource, MAT_DIALOG_DATA, MatPaginator, PageEvent } from '@angular/material';
import { SelectionModel } from '@angular/cdk/collections';
import { composeFilterFunctions, filterDropdowns } from '../table-helpers';

@Component({
  templateUrl: './dialogs-list.component.html',
  styles: [ `
    .search-bar {
      display: flex;
      align-items: center;
      justify-content: flex-end;
    }
    mat-table {
      overflow-y: auto;
      height: calc(100% - 160px);
    }
    ::ng-deep .tooltip {
      white-space: pre-line;
      font-size: 14px;
    }
  ` ]
})
export class DialogsListComponent implements AfterViewInit {

  tableData = new MatTableDataSource();
  tableColumns: string[] = [];
  selection = new SelectionModel(false, []);
  pageEvent: PageEvent;
  disableRowClick: boolean;
  emptySubmit: boolean;
  dropdownOptions: any;
  dropdownFilter: any = {};
  dropdownField: string;
  selectedElements: any[];
  selectedNames: string;
  @ViewChild('paginator') paginator: MatPaginator;

  constructor(@Inject(MAT_DIALOG_DATA) public data: {
    tableData: any[],
    columns: string[],
    okClick: any,
    dropdownSettings: { field: string, startingValue?: { value: string, text: string } },
    filterPredicate?: any,
    allowMulti?: boolean,
    initialSelection?: any[],
    disableSelection?: boolean,
    selectionOptional?: boolean
  }) {
    this.selection = new SelectionModel(this.data.allowMulti || false, this.data.initialSelection || []);
    this.tableData.data = this.data.tableData;
    this.tableColumns = this.data.columns;
    this.disableRowClick = this.data.disableSelection || false;
    this.emptySubmit = this.data.selectionOptional || false;
    if (this.data.filterPredicate) {
      this.tableData.filterPredicate = this.data.filterPredicate;
    }
    this.setDropdownFilter(this.data.dropdownSettings);
  }

  ngAfterViewInit() {
    this.tableData.paginator = this.paginator;
  }

  ok() {
    this.data.okClick(this.selectedRows());
  }

  applyFilter(filterValue: string) {
    this.tableData.filter = filterValue || ' ';
  }

  isAllSelected() {
    // Finds first instance that a filtered row id is not selected, and undefined if all are selected
    // Convert to boolean with ! (true = all selected, false = not all selected)
    const allShownSelected = !this.tableData.filteredData.find((row: any) => {
      return this.selection.selected.indexOf(this.selectIdentifier(row)) === -1;
    });

    if (this.tableData.filteredData.length === 0) {
      return 'hidden';
    }
    return allShownSelected ? 'yes' : 'no';

  }

  masterToggle() {
    if (this.isAllSelected() === 'yes') {
      this.tableData.filteredData.forEach((row: any) => {
        this.selection.deselect(this.selectIdentifier(row));
      });
    } else {
      // Only select items in the filter
      this.tableData.filteredData.forEach((row: any) => this.selection.select(this.selectIdentifier(row)));
    }
  }

  selectedRows() {
    return this.selection.selected.map(id => this.tableData.data.find((row: any) => {
      return this.selectIdentifier(row) === id;
    }));
  }

  selectIdentifier(row: any) {
    return row._id + (row.planetCode === undefined ? '' : row.planetCode);
  }

  selections() {
    this.selectedElements = [];
    this.selection.selected.map(id => this.tableData.data.filter((row: any) => {
      if (row._id === id) {
        this.selectedElements.push(row.name);
        this.selectedNames = this.selectedElements.join('\r\n');
      }
    }));
    return this.selectedNames;
  }

  allowSubmit() {
    return this.emptySubmit || this.selection.hasValue();
  }

  setDropdownFilter(dropdownSettings: any) {
    if (dropdownSettings === undefined) {
      return;
    }
    this.dropdownField = dropdownSettings.field;
    this.dropdownOptions = this.reduceDropDown(dropdownSettings);
    const otherFilterPredicates = this.tableData.filterPredicate;
    this.dropdownFilter = dropdownSettings.startingValue.value ?
      { [dropdownSettings.field]: dropdownSettings.startingValue.value } : { [dropdownSettings.field]: '' };
    this.tableData.filterPredicate = composeFilterFunctions([ otherFilterPredicates, filterDropdowns(this.dropdownFilter) ]);
    this.tableData.filter = ' ';
  }

  reduceDropDown(dropdownSettings) {
    return this.tableData.data.reduce((values: any[], item: any) => {
      const value = item[dropdownSettings.field];
      if (value && values.findIndex(v => v.value === value) === -1) {
        values.push({ value, text: value });
      }
      return values;
    }, dropdownSettings.startingValue ? [ dropdownSettings.startingValue ] : []);
  }

  onFilterChange(filterValue: string, field: string) {
    this.dropdownFilter[field] = filterValue === 'All' ? '' : filterValue;
    // Force filter to update by setting it to a space if empty
    this.tableData.filter = this.tableData.filter ? this.tableData.filter : ' ';
  }

}
