import { Component, OnInit, AfterViewInit, ViewChild } from '@angular/core';
import { Router } from '@angular/router';
import { of } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { CouchService } from '../shared/couchdb.service';
import { StateService } from '../shared/state.service';
import { ManagerService } from './manager.service';
import { SelectionModel } from '@angular/cdk/collections';
import { MatPaginator, PageEvent } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { MatTableDataSource } from '@angular/material/table';
import { findByIdInArray } from '../shared/utils';
import { SyncService } from '../shared/sync.service';
import { PlanetMessageService } from '../shared/planet-message.service';

@Component({
  templateUrl: './manager-fetch.component.html',
  styles: [ `
    .mat-column-select {
      max-width: 44px;
    }
    .mat-column-date {
      max-width: 150px;
    }
  ` ]
})

export class ManagerFetchComponent implements OnInit, AfterViewInit {
  selection = new SelectionModel(true, []);
  @ViewChild(MatSort) sort: MatSort;
  @ViewChild(MatPaginator) paginator: MatPaginator;
  planetConfiguration = this.stateService.configuration;
  displayedColumns = [ 'select', 'item', 'date' ];
  pushedItems = new MatTableDataSource();
  emptyData = false;

  constructor(
    private couchService: CouchService,
    private router: Router,
    private stateService: StateService,
    private managerService: ManagerService,
    private syncService: SyncService,
    private planetMessageService: PlanetMessageService
  ) {}

  ngOnInit() {
    this.managerService.getPushedList().subscribe((pushedList: any) => {
      this.pushedItems.data = pushedList;
      this.emptyData = !this.pushedItems.data.length;
    });
  }

  ngAfterViewInit() {
    this.pushedItems.sort = this.sort;
    this.pushedItems.paginator = this.paginator;
  }

  onPaginateChange(e: PageEvent) {
    this.selection.clear();
  }

  /** Whether the number of selected elements matches the total number of rows. */
  isAllSelected() {
    const itemsShown = Math.min(this.paginator.length - (this.paginator.pageIndex * this.paginator.pageSize), this.paginator.pageSize);
    return this.selection.selected.length === itemsShown;
  }

  /** Selects all rows if they are not all selected; otherwise clear selection. */
  masterToggle() {
    const start = this.paginator.pageIndex * this.paginator.pageSize;
    const end = start + this.paginator.pageSize;
    if (this.isAllSelected()) {
      this.selection.clear();
    } else {
      this.pushedItems.filteredData.slice(start, end).forEach((row: any) => this.selection.select(row._id));
    }
  }

  goBack() {
    this.router.navigate([ '/manager' ]);
  }

  getPushedItem() {
    const itemsToPull = this.selection.selected.map(id => findByIdInArray(this.pushedItems.data, id));
    const deleteItems = itemsToPull.map(sentItem => ({ _id: sentItem._id, _rev: sentItem._rev, _deleted: true }));
    this.syncService.replicatorsArrayWithTags(itemsToPull, 'pull', 'parent').pipe(switchMap((replicators) =>
      replicators.length > 0 ?
        this.syncService.confirmPasswordAndRunReplicators(replicators) :
        of('no replicators')
    ), switchMap((res) =>
      res !== 'no replicators' ?
        this.couchService.post('send_items/_bulk_docs', { docs: deleteItems }, { domain: this.planetConfiguration.parentDomain }) :
        of({})
    )).subscribe(() => this.planetMessageService.showMessage($localize`Resources/Courses are being fetched`));

  }

}
