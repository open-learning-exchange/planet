import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, ParamMap } from '@angular/router';
import { CouchService } from '../shared/couchdb.service';
import { MatDialogRef } from '@angular/material';
import { switchMap, takeUntil } from 'rxjs/operators';
import { forkJoin, of, Subject } from 'rxjs';
import { findDocuments } from '../shared/mangoQueries';
import { filterSpecificFields } from '../shared/table-helpers';
import { DialogsListComponent } from '../shared/dialogs/dialogs-list.component';
import { StateService } from '../shared/state.service';
import { DialogsFormService } from '../shared/dialogs/dialogs-form.service';
import { Validators } from '@angular/forms';
import { ValidatorService } from '../validators/validator.service';
import { PlanetMessageService } from '../shared/planet-message.service';

@Component({
  templateUrl: './community.component.html'
})
export class CommunityComponent implements OnInit, OnDestroy {
  message = '';
  searchValue = '';
  data = [];
  filteredData = [];
  hubs = [];
  sandboxPlanets = [];
  shownStatus = 'pending';
  editDialog: any;
  viewNationDetailDialog: any;
  dialogRef: MatDialogRef<DialogsListComponent>;
  onDestroy$ = new Subject<void>();
  planetType = this.stateService.configuration.planetType;

  constructor(
    private couchService: CouchService,
    private validatorService: ValidatorService,
    private dialogsFormService: DialogsFormService,
    private route: ActivatedRoute,
    private stateService: StateService,
    private planetMessageService: PlanetMessageService
  ) {}

  ngOnInit() {
    this.route.paramMap.pipe(
      takeUntil(this.onDestroy$)
    ).subscribe((params: ParamMap) => {
      const searchValue = params.get('search');
      this.searchValue = searchValue || '';
      this.getCommunityList();
    });
  }

  ngOnDestroy() {
    this.onDestroy$.next();
    this.onDestroy$.complete();
  }

  shownStatusChange(newStatus: string) {
    this.shownStatus = newStatus;
    this.filterData();
  }

  filterData(search = this.searchValue) {
    const filterFunction = filterSpecificFields([ 'code', 'name' ]);
    this.filteredData = this.data.filter((item: any) => item.registrationRequest === this.shownStatus && filterFunction(item, search));
    this.hubs = this.hubs.map((hub: any) => ({
      ...hub,
      children: hub.attached.map(code => this.filteredData.find((item: any) => item.code === code)).filter(child => child)
    }));
    this.sandboxPlanets = this.filteredData.filter(
      (item: any) => this.hubs.find((hub: any) => hub.attached.indexOf(item.code) > -1) === undefined
    );
    console.log(this.sandboxPlanets);
  }

  requestListFilter(filterValue: string) {
    this.searchValue = filterValue;
  }

  getCommunityList(search = this.searchValue) {
    forkJoin([
      this.couchService.findAll('communityregistrationrequests',
        findDocuments({ '_id': { '$gt': null } }, 0, [ { 'createdDate': 'desc' } ] )),
      this.couchService.findAll('hubs')
    ]).subscribe(([ data, hubs ]) => {
      this.hubs = hubs;
      this.data = data;
      this.filterData(search);
    }, (error) => this.message = 'There was a problem getting Communities');
  }

  addHubClick() {
    const type = this.planetType === 'nation' ? 'Center' : 'Region';
    this.dialogsFormService.confirm(
      'Add ' + (this.planetType === 'nation' ? 'Center' : 'Region'),
      [ { placeholder: 'Name', name: 'name', required: true, type: 'textbox' } ],
      { name: [ '', Validators.required, ac => this.validatorService.isUnique$('hubs', 'name', ac) ] }
    ).pipe(switchMap((response: any) => response !== undefined ? this.couchService.post('hubs', { ...response, attached: [] }) : of())
    ).subscribe(
      () => {
        this.planetMessageService.showMessage(type + ' Added');
        this.getCommunityList();
      },
      () => this.planetMessageService.showAlert('There was an error adding ' + type)
    );
  }

}
