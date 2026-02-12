import { Component, OnInit, ViewChild, AfterViewInit, OnDestroy } from '@angular/core';
import { CouchService } from '../shared/couchdb.service';
import { MatPaginator, PageEvent } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { MatTableDataSource } from '@angular/material/table';
import { PlanetMessageService } from '../shared/planet-message.service';
import { filterSpecificFields, selectedOutOfFilter, composeFilterFunctions, filterSpecificFieldsByWord } from '../shared/table-helpers';
import { SelectionModel } from '@angular/cdk/collections';
import { Router, ActivatedRoute } from '@angular/router';
import { UserService } from '../shared/user.service';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { MeetupService } from './meetups.service';
import { StateService } from '../shared/state.service';
import { DialogsLoadingService } from '../shared/dialogs/dialogs-loading.service';
import { findByIdInArray, itemsShown } from '../shared/utils';

@Component({
  templateUrl: './meetups.component.html',
  styles: [ `
    .mat-mdc-row {
      border-bottom-width: 1px;
      border-bottom-style: solid;
      border-bottom-color: rgba(0, 0, 0, 0.12);
    }

    .mat-mdc-cell {
      border: none;
    }
    /* Column Widths */
    .mat-column-select {
      max-width: 44px;
    }
    .mat-column-info {
      max-width: 500px;
      align-self: flex-start;
    }
  ` ]
})
export class MeetupsComponent implements OnInit, AfterViewInit, OnDestroy {

  meetups = new MatTableDataSource();
  message = '';
  readonly dbName = 'meetups';
  deleteDialog: any;
  selection = new SelectionModel(true, []);
  onDestroy$ = new Subject<void>();
  @ViewChild(MatPaginator) paginator: MatPaginator;
  @ViewChild(MatSort) sort: MatSort;
  parent = this.route.snapshot.data.parent;
  displayedColumns = this.parent ? [ 'title' ] : [ 'select', 'title', 'info' ];
  getOpts = this.parent ? { domain: this.stateService.configuration.parentDomain } : {};
  pageEvent: PageEvent;
  currentUser = this.userService.get();
  selectedNotJoined = 0;
  selectedJoined = 0;
  isAuthorized = false;
  dateNow: any;

  constructor(
    private couchService: CouchService,
    private planetMessageService: PlanetMessageService,
    private router: Router,
    private route: ActivatedRoute,
    private userService: UserService,
    private meetupService: MeetupService,
    private stateService: StateService,
    private dialogsLoadingService: DialogsLoadingService
  ) {
    this.dialogsLoadingService.start();
    this.couchService.currentTime().subscribe((date) => this.dateNow = date);
  }

  ngOnInit() {
    this.meetupService.meetupUpdated$.pipe(takeUntil(this.onDestroy$))
    .subscribe((meetups) => {
      // Sort in descending createdDate order, so the new meetup can be shown on the top
      meetups.sort((a, b) => b.createdDate - a.createdDate);
      this.meetups.data = meetups;
      this.dialogsLoadingService.stop();
    });
    this.meetupService.updateMeetups({ opts: this.getOpts });
    this.meetups.filterPredicate = composeFilterFunctions([
      filterSpecificFieldsByWord([ 'title' ]),
      filterSpecificFields([ 'description' ])
    ]);
    this.meetups.sortingDataAccessor = (item, property) => item[property].toLowerCase();
    this.selection.changed.subscribe(({ source }) => {
      this.countSelectedShelf(source.selected);
    });
    this.couchService.checkAuthorization('meetups').subscribe((isAuthorized) => this.isAuthorized = isAuthorized);
  }

  ngAfterViewInit() {
    this.meetups.paginator = this.paginator;
    this.meetups.sort = this.sort;
  }

  isAllSelected() {
    return this.selection.selected.length === itemsShown(this.paginator);
  }
  onPaginateChange(e: PageEvent) {
    this.selection.clear();
  }


  masterToggle() {
    const start = this.paginator.pageIndex * this.paginator.pageSize;
    const end = start + this.paginator.pageSize;
    this.isAllSelected() ?
    this.selection.clear() :
    this.meetups.filteredData.slice(start, end).forEach((row: any) => this.selection.select(row._id));
  }

  applyFilter(filterValue: string) {
    this.meetups.filter = filterValue;
    this.selection.deselect(...selectedOutOfFilter(this.meetups.filteredData, this.selection, this.paginator));
  }

  ngOnDestroy() {
    this.onDestroy$.next();
    this.onDestroy$.complete();
  }

  deleteCallback() {
    return (deletedMeetups) => {
      deletedMeetups.forEach(deletedMeetup => this.selection.deselect(deletedMeetup.id));
      // It's safer to remove the item from the array based on its id than to splice based on the index
      this.meetups.data = this.meetups.data.filter(
        (meetup: any) => deletedMeetups.findIndex(deletedMeetup => deletedMeetup.id === meetup._id) === -1
      );
    };
  }

  deleteClick(meetup) {
    this.meetupService.openDeleteDialog(meetup, this.deleteCallback());
  }

  deleteMeetups(meetupIds) {
    const deleteMeetupArr = meetupIds.map((meetupId) => {
      const meetup: any = this.meetups.data.find((m: any) => m._id === meetupId);
      return { _id: meetup._id, _rev: meetup._rev, _deleted: true };
    });
    return {
      request: this.couchService.post(this.dbName + '/_bulk_docs', { docs: deleteMeetupArr }),
      onNext: (data) => {
        this.meetupService.updateMeetups();
        this.selection.clear();
        this.deleteDialog.close();
        this.planetMessageService.showMessage($localize`You have deleted selected meetups`);
      },
      onError: (error) => this.planetMessageService.showAlert($localize`There was a problem deleting these meetups.`)
    };
  }

  deleteSelected() {
    const meetups = this.selection.selected.map((meetupId) => {
      const meetup: any = this.meetups.data.find((m: any) => m._id === meetupId);
      return { ...meetup, _deleted: true };
    });
    this.meetupService.openDeleteDialog(meetups, this.deleteCallback());
  }

  goBack() {
    this.parent ? this.router.navigate([ '/manager' ]) : this.router.navigate([ '/' ]);
  }

  upcomingMeetups(ids: any) {
    return ids.filter(id => {
      const meetup = findByIdInArray(this.meetups.data, id);
      return (meetup.endDate || meetup.startDate) > this.dateNow;
    });
  }

  meetupsToggle(meetupIds, type) {
    this.meetupService.attendMeetups(type !== 'remove' ? this.upcomingMeetups(meetupIds) : meetupIds, type).subscribe((res) => {
      this.countSelectedShelf(this.selection.selected);
    }, (error) => ((error)));
  }

  attendMeetup(meetup) {
    const meetupDate = (meetup.endDate || meetup.startDate);
    if ((meetupDate < this.dateNow && meetup.participate) || (meetupDate > this.dateNow)) {
      this.meetupService.attendMeetup(meetup._id, meetup.participate).subscribe((res) => {
        const msg = res.participate ? $localize`left` : $localize`joined`;
        meetup.participate = !res.participate;
        this.countSelectedShelf(this.selection.selected);
        this.planetMessageService.showMessage($localize`You have ${msg} meetup.`);
      });
    } else {
      this.planetMessageService.showMessage($localize`You cannot join an old meetup.`);
    }
  }

  countSelectedShelf(selected: any) {
    const inShelf = this.userService.countInShelf(selected, 'meetupIds').inShelf;
    const notInShelf = this.userService.countInShelf(this.upcomingMeetups(selected), 'meetupIds').notInShelf;
    this.selectedNotJoined = notInShelf;
    this.selectedJoined = inShelf;
  }
}
