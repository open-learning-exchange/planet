import { Component, OnInit, AfterViewInit, ViewChild } from '@angular/core';
import { Router } from '@angular/router';
import { of } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { CouchService } from '../shared/couchdb.service';
import { StateService } from '../shared/state.service';
import { ManagerService } from './manager.service';
import { SelectionModel } from '@angular/cdk/collections';
import { MatPaginator, PageEvent } from '@angular/material/paginator';
import { MatSort, MatSortHeader } from '@angular/material/sort';
import {
  MatTableDataSource, MatTable, MatColumnDef, MatHeaderCellDef, MatHeaderCell, MatCellDef, MatCell, MatHeaderRowDef, MatHeaderRow,
  MatRowDef, MatRow, MatNoDataRow
} from '@angular/material/table';
import { findByIdInArray, itemsShown } from '../shared/utils';
import { commonSortingDataAccessor } from '../shared/table-helpers';
import { SyncService } from '../shared/sync.service';
import { PlanetMessageService } from '../shared/planet-message.service';
import { MatToolbar } from '@angular/material/toolbar';
import { MatIconButton, MatButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { NgIf, NgClass, DatePipe } from '@angular/common';
import { PlanetLoadingSpinnerComponent } from '../shared/planet-loading-spinner.component';
import { MatCheckbox } from '@angular/material/checkbox';

@Component({
  templateUrl: './manager-fetch.component.html',
  styles: [`
    .mat-column-select {
      max-width: 44px;
    }
    .mat-column-date {
      max-width: 150px;
    }
    .fetch-icon {
      color: #666;
    }
  `],
  imports: [
    MatToolbar, MatIconButton, MatIcon, MatButton, NgIf, PlanetLoadingSpinnerComponent, MatTable, MatSort, MatColumnDef,
    MatHeaderCellDef, MatHeaderCell, MatCheckbox, MatCellDef, MatCell, MatSortHeader, MatHeaderRowDef, MatHeaderRow, MatRowDef,
    MatRow, NgClass, MatNoDataRow, MatPaginator, DatePipe
  ]
})

export class ManagerFetchComponent implements OnInit, AfterViewInit {
  selection = new SelectionModel(true, []);
  @ViewChild(MatSort) sort: MatSort;
  @ViewChild(MatPaginator) paginator: MatPaginator;
  planetConfiguration = this.stateService.configuration;
  displayedColumns = [ 'select', 'item', 'date' ];
  pushedItems = new MatTableDataSource();
  isLoading = true;

  constructor(
    private couchService: CouchService,
    private router: Router,
    private stateService: StateService,
    private managerService: ManagerService,
    private syncService: SyncService,
    private planetMessageService: PlanetMessageService
  ) {}

  ngOnInit() {
    this.isLoading = true;
    this.pushedItems.sortingDataAccessor = commonSortingDataAccessor;

    this.managerService.getPushedList().subscribe((pushedList: any) => {
      this.pushedItems.data = pushedList.map((item: any) => ({
        ...item,
        title: item.db === 'courses' ? (item.item.doc?.courseTitle ?? '') : (item.item.doc?.title ?? '')
      }));
      this.isLoading = false;
    }, () => {
      this.isLoading = false;
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
    return this.selection.selected.length === itemsShown(this.paginator);
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
    console.log('Getting pushed list');

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
