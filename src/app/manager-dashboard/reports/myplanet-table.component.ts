import { Component, OnChanges, AfterViewInit, ViewChild, Input, OnInit } from '@angular/core';
import { MatTableDataSource, MatPaginator, MatSort } from '@angular/material';
import { MatDialog } from '@angular/material';
import { DialogsViewComponent } from '../../shared/dialogs/dialogs-view.component';

@Component({
  selector: 'planet-myplanet-table',
  templateUrl: './myplanet-table.component.html'
})
export class MyPlanetTableComponent implements OnInit, OnChanges, AfterViewInit {

  @Input() data = [];
  @Input() usage: any;
  @Input() dataType: 'logs' | 'report' | 'activity' = 'report';
  myPlanets = new MatTableDataSource();
  displayedColumns = [ 'id', 'name' ];

  @ViewChild(MatPaginator, { static: false }) paginator: MatPaginator;
  @ViewChild(MatSort, { static: false }) sort: MatSort;

  constructor(
    private dialog: MatDialog,
    ) {}

  ngOnInit() {
    this.myPlanets.sortingDataAccessor = (item: any, property) => {
      switch (property) {
        case 'versionName': return (item.versionName || item.version || '').split('.').reduce((v, n) => v + n.padStart(3, '0'), '');
        case 'name': return (item.customDeviceName || item.deviceName || '').toLowerCase();
        default: return typeof item[property] === undefined ? '' :
          typeof item[property] === 'string' ? item[property].toLowerCase() : item[property];
      }
    };
    if (this.dataType === 'activity') {
      this.displayedColumns = [ 'usagename', 'usageid', 'usagetime' ];
    } else if (this.dataType === 'logs') {
      this.displayedColumns = [ ...this.displayedColumns, ...[ 'type', 'time', 'versionName', 'detail' ] ];
    } else {
      this.displayedColumns = [ ...this.displayedColumns, ...[ 'last_synced', 'versionName', 'count' ] ];
    }
  }

  ngOnChanges() {
    this.myPlanets.data = this.data;
    if (this.usage !== undefined) {
      let total;
      this.usage.map(data => {
        data.max.usages.map((time) => {
          const date = new Date(time.totalForegroundTime);
          total = + date;
        });
        data.max.totalUsedTime = total;
      });
      this.myPlanets.data = this.usage;
    }
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
