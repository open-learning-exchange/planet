import { Component, OnChanges, AfterViewInit, ViewChild, Input, OnInit } from '@angular/core';
import { MatLegacyPaginator as MatPaginator } from '@angular/material/legacy-paginator';
import { MatSort } from '@angular/material/sort';
import { MatLegacyTableDataSource as MatTableDataSource } from '@angular/material/legacy-table';
import { MatLegacyDialog as MatDialog } from '@angular/material/legacy-dialog';
import { DialogsViewComponent } from '../../../shared/dialogs/dialogs-view.component';

@Component({
  selector: 'planet-myplanet-table',
  templateUrl: './myplanet-table.component.html'
})
export class MyPlanetTableComponent implements OnInit, OnChanges, AfterViewInit {

  @Input() data = [];
  @Input() dataType: 'logs' | 'report' = 'report';
  @ViewChild(MatPaginator) paginator: MatPaginator;
  @ViewChild(MatSort) sort: MatSort;
  myPlanets = new MatTableDataSource();
  displayedColumns = [ 'id', 'name' ];

  constructor(private dialog: MatDialog) {}

  ngOnInit() {
    this.myPlanets.sortingDataAccessor = (item: any, property) => {
      switch (property) {
        case 'versionName': return (item.versionName || item.version || '');
        case 'name': return (item.customDeviceName || item.deviceName || '').toLowerCase();
        default: return typeof item[property] === undefined ? '' :
          typeof item[property] === 'string' ? item[property].toLowerCase() : item[property];
      }
    };
    if (this.dataType === 'logs') {
      this.displayedColumns = [ ...this.displayedColumns, ...[ 'type', 'time', 'versionName', 'detail' ] ];
    } else {
      this.displayedColumns = [ ...this.displayedColumns, ...[ 'last_synced', 'versionName', 'count', 'usagetime' ] ];
    }
  }

  ngOnChanges() {
    this.myPlanets.data = this.data;
  }

  ngAfterViewInit() {
    this.myPlanets.paginator = this.paginator;
    this.myPlanets.sort = this.sort;
  }

  viewDetails(log: any) {
    this.dialog.open(DialogsViewComponent, {
      width: '600px',
      autoFocus: false,
      data: {
        allData: log,
        type: 'log',
        title: log.type
      }
    });
  }

}
