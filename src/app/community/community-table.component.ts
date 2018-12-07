import { Component, OnChanges, AfterViewInit, ViewChild, OnDestroy, Input, Output, EventEmitter } from '@angular/core';
import { CouchService } from '../shared/couchdb.service';
import { DialogsPromptComponent } from '../shared/dialogs/dialogs-prompt.component';
import { MatTableDataSource, MatPaginator, MatDialog, MatSort, MatDialogRef } from '@angular/material';
import { switchMap, takeUntil } from 'rxjs/operators';
import { forkJoin, of, Subject } from 'rxjs';
import { filterSpecificFields, sortNumberOrString } from '../shared/table-helpers';
import { DialogsViewComponent } from '../shared/dialogs/dialogs-view.component';
import { DialogsListService } from '../shared/dialogs/dialogs-list.service';
import { DialogsListComponent } from '../shared/dialogs/dialogs-list.component';
import { StateService } from '../shared/state.service';

@Component({
  selector: 'planet-community-table',
  templateUrl: './community-table.component.html'
})
export class CommunityTableComponent implements OnChanges, AfterViewInit, OnDestroy {

  @Input() data = [];
  @Input() hubs = [];
  @Input() hub: any = 'sandbox';
  @Output() requestUpdate = new EventEmitter<void>();
  communities = new MatTableDataSource();
  nations = [];
  displayedColumns = [
    'name',
    'code',
    'localDomain',
    'createdDate',
    'action'
  ];
  editDialog: any;
  viewNationDetailDialog: any;
  dialogRef: MatDialogRef<DialogsListComponent>;
  onDestroy$ = new Subject<void>();
  planetType = this.stateService.configuration.planetType;

  @ViewChild(MatPaginator) paginator: MatPaginator;
  @ViewChild(MatSort) sort: MatSort;

  constructor(
    private couchService: CouchService,
    private dialogsListService: DialogsListService,
    private dialog: MatDialog,
    private stateService: StateService
  ) {}

  ngOnChanges() {
    this.communities.data = this.data;
  }

  ngAfterViewInit() {
    this.communities.sortingDataAccessor = sortNumberOrString;
    this.communities.paginator = this.paginator;
    this.communities.sort = this.sort;
  }

  ngOnDestroy() {
    this.onDestroy$.next();
    this.onDestroy$.complete();
  }

  updateClick(community, change) {
    this.editDialog = this.dialog.open(DialogsPromptComponent, {
      data: {
        okClick: this.updateCommunity(community, change),
        changeType: change,
        type: 'community',
        displayName: community.name
      }
    });
  }

  updateCommunity(community, change) {
    // Return a function with community on its scope to pass to delete dialog
    return () => {
      // With object destructuring colon means different variable name assigned, i.e. 'id' rather than '_id'
      // Split community object into id, rev, and all other props in communityInfo
      const { _id: communityId, _rev: communityRev, ...communityInfo } = community;
      switch (change) {
        case 'delete':
          this.deleteCommunity(community);
          break;
        case 'accept':
          forkJoin([
            // When accepting a registration request, add learner role to user from that community/nation,
            this.unlockUser(community),
            // update registration request to accepted
            this.couchService.put('communityregistrationrequests/' + communityId, { ...community, registrationRequest: 'accepted' })
          ]).subscribe((data) => {
            this.requestUpdate.emit();
            this.editDialog.close();
          }, (error) => this.editDialog.componentInstance.message = 'Planet was not accepted');
      }
    };
  }

  // Checks response and creates couch call if a doc was returned
  addDeleteObservable(res, db) {
    if (res.docs.length > 0) {
      const doc = res.docs[0];
      return this.couchService.delete(db + doc._id + '?rev=' + doc._rev);
    }
    return of({ 'ok': true });
  }

  deleteCommunity(community) {
    // Return a function with community on its scope to pass to delete dialog
    const { _id: id, _rev: rev } = community;
    return this.pipeRemovePlanetUser(this.couchService.delete('communityregistrationrequests/' + id + '?rev=' + rev), community)
    .subscribe(([ data, userRes ]) => {
      // It's safer to remove the item from the array based on its id than to splice based on the index
      this.requestUpdate.emit();
      this.editDialog.close();
    }, (error) => this.editDialog.componentInstance.message = 'There was a problem deleting this community');
  }

  pipeRemovePlanetUser(obs: any, community) {
    return obs.pipe(
      switchMap(data => {
        return forkJoin([ of(data), this.removePlanetUser(community) ]);
      })
    );
  }

  removePlanetUser(community) {
    return forkJoin([
      this.couchService.post('_users/_find', { 'selector': { '_id': 'org.couchdb.user:' + community.adminName } }),
      this.couchService.post('shelf/_find', { 'selector': { '_id': 'org.couchdb.user:' + community.adminName } })
    ]).pipe(switchMap(([ user, shelf ]) => {
      return forkJoin([
        this.addDeleteObservable(user, '_users/'),
        this.addDeleteObservable(shelf, 'shelf/')
      ]);
    }));
  }

  // Gives the requesting user the 'learner' role & access to all DBs (as of April 2018)
  unlockUser(community) {
    return this.couchService.post('_users/_find', { 'selector': { 'requestId': community._id } })
      .pipe(switchMap(data => {
        const user = data.docs[0];
        return this.couchService.put('_users/' + user._id + '?rev=' + user._rev,
          { ...user, roles: [ 'learner' ] });
      }));
  }

  view(planet) {
    this.viewNationDetailDialog = this.dialog.open(DialogsViewComponent, {
      width: '600px',
      autoFocus: false,
      data: {
        allData: planet,
        title: planet.planetType === 'nation' ? 'Nation Details' : 'Community Details'
      }
    });
  }

  getChildPlanet(url: string) {
    this.dialogsListService.getListAndColumns('communityregistrationrequests',
    { 'registrationRequest': 'accepted' }, url)
    .pipe(takeUntil(this.onDestroy$))
    .subscribe((planets) => {
      const data = {
        disableSelection: true,
        filterPredicate: filterSpecificFields([ 'name', 'code' ]),
        ...planets };
      this.dialogRef = this.dialog.open(DialogsListComponent, {
        data: data,
        height: '500px',
        width: '600px',
        autoFocus: false
      });
    });
  }

  addHubClick(planetCode, hubName) {
    const hub = this.hubs.find((hb: any) => hb.name === hubName);
    hub.attached.push(planetCode);
    this.couchService.post('hubs', hub).pipe(switchMap(() => {
      if (this.hub !== 'sandbox') {
        return this.couchService.post('hubs', { ...this.hub, attached: this.hub.attached.filter(code => code !== planetCode) });
      }
      return of({});
    })).subscribe(() => {
      this.requestUpdate.emit();
    });
  }

}
