import { Component, OnInit, OnDestroy, HostListener } from '@angular/core';
import { ActivatedRoute, ParamMap } from '@angular/router';
import { CouchService } from '../../shared/couchdb.service';
import { switchMap, takeUntil } from 'rxjs/operators';
import { forkJoin, of, Subject } from 'rxjs';
import { filterSpecificFields } from '../../shared/table-helpers';
import { StateService } from '../../shared/state.service';
import { DialogsFormService } from '../../shared/dialogs/dialogs-form.service';
import { ValidatorService } from '../../validators/validator.service';
import { PlanetMessageService } from '../../shared/planet-message.service';
import { CustomValidators } from '../../validators/custom-validators';
import { ReportsService } from '../reports/reports.service';
import { ManagerService } from '../manager.service';
import { attachNamesToPlanets, arrangePlanetsIntoHubs } from '../reports/reports.utils';
import { DeviceInfoService, DeviceType } from '../../shared/device-info.service';

@Component({
  templateUrl: './requests.component.html',
  styleUrls: ['./requests.component.scss']
})
export class RequestsComponent implements OnInit, OnDestroy {

  searchValue = '';
  data = [];
  filteredData = [];
  hubs = [];
  sandboxPlanets = [];
  shownStatus = 'pending';
  onDestroy$ = new Subject<void>();
  planetType = this.stateService.configuration.planetType;
  deviceType: DeviceType;
  isMobile: boolean;
  showMobileFilters = false;
  get childType() {
    return this.planetType === 'nation' ? $localize`Network` : $localize`Region`;
  }

  constructor(
    private couchService: CouchService,
    private validatorService: ValidatorService,
    private dialogsFormService: DialogsFormService,
    private route: ActivatedRoute,
    private stateService: StateService,
    private planetMessageService: PlanetMessageService,
    private reportsService: ReportsService,
    private managerService: ManagerService,
    private deviceInfoService: DeviceInfoService
  ) {
    this.deviceType = this.deviceInfoService.getDeviceType();
    this.isMobile = this.deviceType === DeviceType.MOBILE;
  }

  ngOnInit() {
    this.route.paramMap.pipe(
      takeUntil(this.onDestroy$)
    ).subscribe((params: ParamMap) => {
      const searchValue = params.get('search');
      this.searchValue = searchValue || '';
      this.getCommunityList();
    });
  }

  @HostListener('window:resize')
  onResize() {
    this.deviceType = this.deviceInfoService.getDeviceType();
    this.isMobile = this.deviceType === DeviceType.MOBILE;
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
    const { hubs, sandboxPlanets } = arrangePlanetsIntoHubs(this.filteredData, this.hubs);
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
      this.data = attachNamesToPlanets(data);
      this.filterData(search);
    }, (error) => this.planetMessageService.showAlert($localize`There was a problem getting ${this.childType}`));
  }

  addHubClick() {
    const type = this.childType;
    this.dialogsFormService.confirm(
      $localize`Add ${type}`,
      [
        { placeholder: $localize`Name`, name: 'name', required: true, type: 'textbox' },
        { type: 'selectbox', name: 'planetId', placeholder: $localize`Planet`, required: false,
          'options': [
            { name: $localize`Select Planet`, value: '' },
            ...this.sandboxPlanets.map(p => ({ name: p.nameDoc ? p.nameDoc.name : p.doc.name, value: p.doc._id }))
          ]
        }
      ],
      {
        name: [ '', CustomValidators.required, ac => this.validatorService.isUnique$('hubs', 'name', ac) ],
        planetId: ''
      }
    ).pipe(switchMap((response: any) => response !== undefined ? this.couchService.post('hubs', { ...response, spokes: [] }) : of())
    ).subscribe(
      () => {
        this.planetMessageService.showMessage($localize`${type} Added`);
        this.getCommunityList();
      },
      () => this.planetMessageService.showAlert($localize`There was an error adding ${type}`)
    );
  }

  deleteHub(hub, event) {
    this.couchService.delete('hubs/' + hub._id + '?rev=' + hub._rev).subscribe(() => this.getCommunityList());
    event.stopPropagation();
  }

  view(planetId) {
    const hubPlanet = this.data.find(planet => planet.doc._id === planetId);
    this.reportsService.viewPlanetDetails(hubPlanet.doc);
  }

  toggleMobileFilterList() {
    this.showMobileFilters = !this.showMobileFilters;
  }
  
}
