import { Component, OnChanges, AfterViewInit, ViewChild, OnDestroy, Input, Output, EventEmitter } from '@angular/core';
import { CouchService } from '../../shared/couchdb.service';
import { DialogsPromptComponent } from '../../shared/dialogs/dialogs-prompt.component';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { MatTableDataSource } from '@angular/material/table';
import { switchMap, takeUntil, finalize } from 'rxjs/operators';
import { forkJoin, of, Subject } from 'rxjs';
import { filterSpecificFields, sortNumberOrString } from '../../shared/table-helpers';
import { DialogsListService } from '../../shared/dialogs/dialogs-list.service';
import { DialogsListComponent } from '../../shared/dialogs/dialogs-list.component';
import { StateService } from '../../shared/state.service';
import { PlanetMessageService } from '../../shared/planet-message.service';
import { DialogsFormService } from '../../shared/dialogs/dialogs-form.service';
import { UntypedFormBuilder } from '@angular/forms';
import { CustomValidators } from '../../validators/custom-validators';
import { DialogsLoadingService } from '../../shared/dialogs/dialogs-loading.service';
import { ValidatorService } from '../../validators/validator.service';
import { ReportsService } from '../reports/reports.service';
import { findDocuments } from '../../shared/mangoQueries';

@Component({
  selector: 'planet-requests-table',
  templateUrl: './requests-table.component.html'
})
export class RequestsTableComponent implements OnChanges, AfterViewInit, OnDestroy {

  @Input() data = [];
  @Input() hubs = [];
  @Input() hub: any = 'sandbox';
  @Output() requestUpdate = new EventEmitter<void>();
  dbName = 'communityregistrationrequests';
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
    private fb: UntypedFormBuilder,
    private stateService: StateService,
    private planetMessageService: PlanetMessageService,
    private dialogsFormService: DialogsFormService,
    private dialogsLoadingService: DialogsLoadingService,
    private validatorService: ValidatorService,
    private reportsService: ReportsService
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

  updateClick(planet, change) {
    this.editDialog = this.dialog.open(DialogsPromptComponent, {
      data: {
        okClick: this.updateCommunity(planet.doc, change),
        changeType: change,
        type: 'community',
        displayName: planet.nameDoc ? planet.nameDoc.name : planet.doc.name
      }
    });
  }

  updateCommunity(community, change) {
    // With object destructuring colon means different variable name assigned, i.e. 'id' rather than '_id'
    // Split community object into id, rev, and all other props in communityInfo
    const { _id: communityId, _rev: communityRev, ...communityInfo } = community;
    switch (change) {
      case 'delete':
        return this.deleteCommunity(community);
      case 'accept':
        return {
          request: forkJoin([
            // When accepting a registration request, add learner role to user from that community/nation,
            this.unlockUser(community),
            // update registration request to accepted
            this.couchService.put(`${this.dbName}/${communityId}`, { ...community, registrationRequest: 'accepted' })
          ]),
          onNext: (data) => {
            this.requestUpdate.emit();
            this.editDialog.close();
          },
          onError: (error) => this.planetMessageService.showAlert($localize`Planet was not accepted`)
        };
    }
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
    return {
      request: this.pipeRemovePlanetUser(this.couchService.delete(`${this.dbName}/${id}?rev=${rev}`), community),
      onNext: ([ data, userRes ]) => {
        this.requestUpdate.emit();
        this.editDialog.close();
      },
      onError: (error) => this.planetMessageService.showAlert($localize`There was a problem deleting this community`)
    };
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
    return this.couchService.findAll('_users', findDocuments({ 'requestId': community._id })).pipe(
      switchMap((users: any[]) => this.couchService.bulkDocs('_users', users.map(user => ({ ...user, roles: [ 'learner' ] }))))
    );
  }

  view(planet) {
    this.reportsService.viewPlanetDetails(planet);
  }

  getChildPlanet(url: string) {
    this.dialogsListService.getListAndColumns(this.dbName,
    { 'registrationRequest': 'accepted' }, url)
    .pipe(takeUntil(this.onDestroy$))
    .subscribe((planets) => {
      const data = {
        disableSelection: true,
        filterPredicate: filterSpecificFields([ 'name', 'code' ]),
        ...planets };
      this.dialogRef = this.dialog.open(DialogsListComponent, {
        data: data,
        maxHeight: '500px',
        width: '600px',
        autoFocus: false
      });
    });
  }

  addHubClick(planetCode, hubName) {
    const { children, ...hub } = this.hubs.find((hb: any) => hb.name === hubName);
    hub.spokes.push(planetCode);
    this.couchService.post('hubs', hub).pipe(switchMap(() => {
      if (this.hub !== 'sandbox') {
        return this.removeFromHub(planetCode);
      }
      return of({});
    })).subscribe(() => {
      this.requestUpdate.emit();
    });
  }

  removeHubClick(planetCode) {
    this.removeFromHub(planetCode).subscribe(() => this.requestUpdate.emit());
  }

  removeFromHub(planetCode) {
    return this.couchService.post('hubs', { ...this.hub, spokes: this.hub.spokes.filter(code => code !== planetCode) });
  }

  openEditChildNameDialog(planet) {
    const exceptions = [ planet.nameDoc ? planet.nameDoc.name : planet.doc.name ];
    this.dialogsFormService.openDialogsForm(
      $localize`Edit ${this.reportsService.planetTypeText(planet.doc.planetType)} Name`,
      [ { 'label': $localize`Name`, 'type': 'textbox', 'name': 'name', 'placeholder': $localize`Name`, 'required': true } ],
      this.fb.group({ name: [
        planet.nameDoc ? planet.nameDoc.name : planet.doc.name,
        CustomValidators.required,
        ac => this.validatorService.isUnique$(this.dbName, 'name', ac, { exceptions })
      ] }),
      { onSubmit: this.editChildName(planet).bind(this) }
    );

  }

  editChildName({ doc, nameDoc }) {
    return (form) => {
      this.couchService.updateDocument(
        this.dbName,
        { ...nameDoc, 'name': form.name, 'docType': 'parentName', 'planetId': doc._id, createdDate: this.couchService.datePlaceholder }
      ).pipe(
        finalize(() => this.dialogsLoadingService.stop())
      ).subscribe(() => {
        this.dialogsFormService.closeDialogsForm();
        this.planetMessageService.showMessage($localize`${this.reportsService.planetTypeText(doc.planetType)} name updated.`);
        this.requestUpdate.emit();
      },
      () => this.planetMessageService.showAlert(
        $localize`There was an error updating ${this.reportsService.planetTypeText(doc.planetType)} name`)
      );
    };
  }

}
