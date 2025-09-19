/*
 *  Material dialog component for selecting an object from a
 *  list, rendered as a Material table
 */

import { Component, Inject, ViewChild, AfterViewInit } from '@angular/core';
import { MAT_LEGACY_DIALOG_DATA as MAT_DIALOG_DATA } from '@angular/material/legacy-dialog';
import { MatLegacyPaginator as MatPaginator, LegacyPageEvent as PageEvent } from '@angular/material/legacy-paginator';
import { MatLegacyTableDataSource as MatTableDataSource } from '@angular/material/legacy-table';
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
  selectedNames: string[] = [];
  tooltipText = '';
  @ViewChild('paginator') paginator: MatPaginator;

  constructor(@Inject(MAT_DIALOG_DATA) public data: {
    tableData: any[],
    columns: string[],
    itemDescription: string,
    nameProperty: string,
    okClick: any,
    dropdownSettings: { field: string, startingValue?: { value: string, text: string } },
    filterPredicate?: any,
    allowMulti?: boolean,
    initialSelection?: any[],
    disableSelection?: boolean,
    selectionOptional?: boolean,
    labels?: any
  }) {
    const hasFullName = this.data.columns.some(column => column === 'Full Name');
    const tableData = hasFullName ?
      this.appendFullName(this.data.tableData) :
      this.data.tableData;
    this.selection = new SelectionModel(this.data.allowMulti || false, this.data.initialSelection || []);
    this.tableData.data = tableData;
    this.tableColumns = this.data.columns;
    this.disableRowClick = this.data.disableSelection || false;
    this.emptySubmit = this.data.selectionOptional || false;
    if (this.data.filterPredicate) {
      this.tableData.filterPredicate = this.data.filterPredicate;
    }
    this.setDropdownFilter(this.data.dropdownSettings, this.data.labels);
    this.initializeTooltip();
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

  appendFullName(data: any[]) {
    return data.map(row => ({
      ...row, 'Full Name': (row.firstName || '') && `${row.firstName} ${row.middleName || ''} ${row.lastName}`
    }));
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
    const isAllSelected = this.isAllSelected() === 'yes';
    this.tableData.filteredData.forEach((row: any) => {
      const selectIdentifier = this.selectIdentifier(row);
      if (isAllSelected) {
        this.selection.deselect(selectIdentifier);
      } else {
        this.selection.select(selectIdentifier);
      }
      this.setSelectedNames(row[this.data.nameProperty], selectIdentifier);
    });
  }

  rowClick(row: any) {
    if (!this.disableRowClick) {
      const selectIdentifier = this.selectIdentifier(row);
      this.selection.toggle(selectIdentifier);
      this.setSelectedNames(row[this.data.nameProperty], selectIdentifier);
    }
  }

  selectedRows() {
    return this.selection.selected.map(id => this.tableData.data.find((row: any) => {
      return this.selectIdentifier(row) === id;
    }));
  }

  initializeTooltip() {
    this.selectedRows().forEach((row: any) => this.setSelectedNames(row[this.data.nameProperty], this.selectIdentifier(row)));
  }

  selectIdentifier(row: any) {
    return row._id + (row.planetCode === undefined ? '' : row.planetCode);
  }

  setSelectedNames(name, selectIdentifier) {
    if (this.selection.isSelected(selectIdentifier)) {
      this.addToSelectedNames(name);
    } else {
      this.removeFromSelectedNames(name);
    }
    this.tooltipText = this.selectedNames.join(', ');
  }

  addToSelectedNames(name) {
    if (this.selectedNames.indexOf(name) === -1) {
      this.selectedNames.push(name);
    }
  }

  removeFromSelectedNames(name) {
    this.selectedNames.splice(this.selectedNames.indexOf(name), 1);
  }

  allowSubmit() {
    return this.emptySubmit || this.selection.hasValue();
  }

  setDropdownFilter(dropdownSettings: any, labels: any) {
    if (dropdownSettings === undefined) {
      return;
    }
    this.dropdownField = dropdownSettings.field;
    this.dropdownOptions = this.sortDropDown(dropdownSettings, this.reduceDropDown(dropdownSettings, labels));
    const otherFilterPredicates = this.tableData.filterPredicate;
    this.dropdownFilter = dropdownSettings.startingValue.value ?
      { [dropdownSettings.field]: dropdownSettings.startingValue.value } : { [dropdownSettings.field]: '' };
    this.tableData.filterPredicate = composeFilterFunctions([ otherFilterPredicates, filterDropdowns(this.dropdownFilter) ]);
    this.tableData.filter = ' ';
  }

  reduceDropDown(dropdownSettings, labels) {
    return this.tableData.data.reduce((values: any[], item: any) => {
      const value = item[dropdownSettings.field];
      if (value && values.findIndex(v => v.value === value) === -1) {
        values.push({ value, text: labels[value] || value });
      }
      return values;
    }, dropdownSettings.startingValue ? [ dropdownSettings.startingValue ] : []);
  }

  sortDropDown(dropdownSettings, list) {
    return list.sort(
      (a, b) => (dropdownSettings.startingValue && dropdownSettings.startingValue.value === b.value) ? 1 : a.text.localeCompare(b.text)
    );
  }

  onFilterChange(filterValue: string, field: string) {
    this.dropdownFilter[field] = filterValue === 'All' ? '' : filterValue;
    // Force filter to update by setting it to a space if empty
    this.tableData.filter = this.tableData.filter ? this.tableData.filter : ' ';
  }

}
