import { Component, OnInit, AfterViewInit, ViewChild } from '@angular/core';
import { Router } from '@angular/router';
import { switchMap } from 'rxjs/operators';
import { CouchService } from '../shared/couchdb.service';
import { StateService } from '../shared/state.service';
import { ManagerService } from './manager.service';
import { SelectionModel } from '@angular/cdk/collections';
import { MatTableDataSource, MatSort, MatPaginator, PageEvent } from '@angular/material';
import { findByIdInArray } from '../shared/utils';
import { SyncService } from '../shared/sync.service';
import { PlanetMessageService } from '../shared/planet-message.service';

@Component({
  templateUrl: './manager-fetch.component.html'
})

export class ManagerFetchComponent implements OnInit, AfterViewInit {
  selection = new SelectionModel(true, []);
  @ViewChild(MatSort) sort: MatSort;
  @ViewChild(MatPaginator) paginator: MatPaginator;
  planetConfiguration = this.stateService.configuration;
  displayedColumns = [ 'select', 'item' ];
  pushedItems = new MatTableDataSource();

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
        /*this.pushedCount = pushedList.docs.length; */
        this.pushedItems.data = pushedList.docs;
        console.log(this.pushedItems.data);
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

  sendCourse() {
    const itemsToPull = this.selection.selected.map(id => findByIdInArray(this.pushedItems.data, id));
    let resourcesToPull = itemsToPull.filter(item => item.db === 'resources');
    const coursesToPull = itemsToPull.filter(item => item.db === 'courses');
    const courseSteps = [].concat.apply([], coursesToPull.map(course => course.steps));
    const examsToPull = [].concat.apply([], courseSteps.map(step => step.exam || []));
    resourcesToPull = resourcesToPull.concat.apply([], courseSteps.map(step => step.resources));
    const deleteItems = itemsToPull.map(sentItem => ({ _id: sentItem._id, _rev: sentItem._rev, _deleted: true }));
    const replicators = [];
    if (resourcesToPull) {
      replicators['resources'] = { db: 'resources', type: 'pull', date: true, items: resourcesToPull };
    }
    if (coursesToPull) {
      replicators['courses'] = { db: 'courses', type: 'pull', date: true, items: coursesToPull };
    }
    if (examsToPull) {
      replicators['exams'] = { db: 'exams', type: 'pull', date: true, items: examsToPull };
    }
    if (replicators) {
      this.syncService.confirmPasswordAndRunReplicators(replicators).pipe(
        switchMap(() => {
          return this.couchService.post('send_items/_bulk_docs', { docs: deleteItems }, { domain: this.planetConfiguration.parentDomain });
        })
      ).subscribe(() => this.planetMessageService.showMessage('Resources/Courses are being fetched'));
    }
  }
}
