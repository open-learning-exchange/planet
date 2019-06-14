import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, ParamMap } from '@angular/router';
import { CouchService } from '../shared/couchdb.service';
import { switchMap, takeUntil } from 'rxjs/operators';
import { forkJoin, of, Subject } from 'rxjs';
import { findDocuments } from '../shared/mangoQueries';
import { filterSpecificFields } from '../shared/table-helpers';
import { StateService } from '../shared/state.service';
import { DialogsFormService } from '../shared/dialogs/dialogs-form.service';
import { Validators } from '@angular/forms';
import { ValidatorService } from '../validators/validator.service';
import { PlanetMessageService } from '../shared/planet-message.service';
import { CustomValidators } from '../validators/custom-validators';
import { ReportsService } from '../manager-dashboard/reports/reports.service';
import { ManagerService } from '../manager-dashboard/manager.service';

@Component({
  templateUrl: './community.component.html',
  styles: [ `
    mat-panel-title {
      align-items: center;
    }
  ` ]
})
export class CommunityComponent implements OnInit, OnDestroy {

  searchValue = '';
  data = [];
  filteredData = [];
  hubs = [];
  sandboxPlanets = [];
  shownStatus = 'pending';
  onDestroy$ = new Subject<void>();
  planetType = this.stateService.configuration.planetType;
  get childType() {
    return this.planetType === 'nation' ? 'Network' : 'Region';
  }

  constructor(
    private couchService: CouchService,
    private validatorService: ValidatorService,
    private dialogsFormService: DialogsFormService,
    private route: ActivatedRoute,
    private stateService: StateService,
    private planetMessageService: PlanetMessageService,
    private reportsService: ReportsService,
    private managerService: ManagerService
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
    const planetFilterDoc = (planet) => ({ ...planet.doc, ...(planet.nameDoc ? { 'name': planet.nameDoc.name } : {}) });
    const filterFunction = filterSpecificFields([ 'code', 'name' ]);
    this.filteredData = this.data.filter(
      (planet) => planet.doc.registrationRequest === this.shownStatus && filterFunction(planetFilterDoc(planet), search)
    );
    const { hubs, sandboxPlanets } = this.reportsService.arrangePlanetsIntoHubs(this.filteredData, this.hubs);
    this.hubs = hubs;
    this.sandboxPlanets = sandboxPlanets;
  }

  requestListFilter(filterValue: string) {
    this.searchValue = filterValue;
    this.filterData();
  }

  getCommunityList(search = this.searchValue) {
    forkJoin([
      this.managerService.getChildPlanets(),
      this.couchService.findAll('hubs')
    ]).subscribe(([ data, hubs ]) => {
      this.hubs = hubs;
      this.data = this.reportsService.attachNamesToPlanets(data);
      this.filterData(search);
    }, (error) => this.planetMessageService.showAlert('There was a problem getting ' + this.childType));
  }

  addHubClick() {
    const type = this.childType;
    this.dialogsFormService.confirm(
      'Add ' + type,
      [ { placeholder: 'Name', name: 'name', required: true, type: 'textbox' } ],
      { name: [ '', CustomValidators.required, ac => this.validatorService.isUnique$('hubs', 'name', ac) ] }
    ).pipe(switchMap((response: any) => response !== undefined ? this.couchService.post('hubs', { ...response, spokes: [] }) : of())
    ).subscribe(
      () => {
        this.planetMessageService.showMessage(type + ' Added');
        this.getCommunityList();
      },
      () => this.planetMessageService.showAlert('There was an error adding ' + type)
    );
  }

  deleteHub(hub, event) {
    this.couchService.delete('hubs/' + hub._id + '?rev=' + hub._rev).subscribe(() => this.getCommunityList());
    event.stopPropagation();
  }

}
