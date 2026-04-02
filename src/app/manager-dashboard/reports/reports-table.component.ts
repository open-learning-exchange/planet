import { Component, Input, ViewChild, OnChanges, AfterViewInit, OnInit } from '@angular/core';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort, MatSortHeader } from '@angular/material/sort';
import { MatTableDataSource, MatTable, MatColumnDef, MatHeaderCellDef, MatHeaderCell, MatCellDef, MatCell, MatHeaderRowDef, MatHeaderRow, MatRowDef, MatRow } from '@angular/material/table';
import { commonSortingDataAccessor, deepSortingDataAccessor } from '../../shared/table-helpers';
import { ReportsService } from './reports.service';
import { RouterLink } from '@angular/router';
import { MatButton } from '@angular/material/button';
import { DatePipe } from '@angular/common';

@Component({
    selector: 'planet-reports-table',
    templateUrl: './reports-table.component.html',
    imports: [MatTable, MatSort, MatColumnDef, MatHeaderCellDef, MatHeaderCell, MatSortHeader, MatCellDef, MatCell, RouterLink, MatButton, MatHeaderRowDef, MatHeaderRow, MatRowDef, MatRow, MatPaginator, DatePipe]
})
export class ReportsTableComponent implements OnInit, OnChanges, AfterViewInit {

  @Input() planets = [];
  logs = new MatTableDataSource();
  displayedColumns = [
    'name',
    // 'downloads',
    'views',
    'logins',
    'lastUpgrade',
    'lastSync'
  ];
  @ViewChild(MatPaginator) paginator: MatPaginator;
  @ViewChild(MatSort) sort: MatSort;

  constructor(
    private reportsService: ReportsService
  ) {}

  ngOnInit() {
    this.logs.sortingDataAccessor = (item: any, property: string) => property === 'lastSync' ?
      deepSortingDataAccessor(item, 'doc.lastSync.max.time') :
      commonSortingDataAccessor(this.sortingObject(item, property), property);
  }

  ngOnChanges() {
    this.logs.data = this.planets;
  }

  ngAfterViewInit() {
    this.logs.paginator = this.paginator;
    this.logs.sort = this.sort;
  }

  viewDetails(planet: any) {
    this.reportsService.viewPlanetDetails(planet);
  }

  sortingObject(item, property) {
    return property === 'name' ?
      item.nameDoc || item.doc :
      item;
  }

}
