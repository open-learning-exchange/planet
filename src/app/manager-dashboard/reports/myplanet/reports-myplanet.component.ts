import { Component, OnInit, HostListener } from '@angular/core';
import { UntypedFormBuilder, UntypedFormGroup, Validators } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { forkJoin, of } from 'rxjs';
import { switchMap, map } from 'rxjs/operators';
import { StateService } from '../../../shared/state.service';
import { PlanetMessageService } from '../../../shared/planet-message.service';
import { ManagerService } from '../../manager.service';
import { ReportsService } from '../reports.service';
import { CouchService } from '../../../shared/couchdb.service';
import { attachNamesToPlanets, getDomainParams, areNoChildren } from '../reports.utils';
import { findDocuments } from '../../../shared/mangoQueries';
import { DeviceInfoService, DeviceType } from '../../../shared/device-info.service';
import { CsvService } from '../../../shared/csv.service';
import { filterSpecificFields } from '../../../shared/table-helpers';

@Component({
  templateUrl: './reports-myplanet.component.html',
  styleUrls: [ './reports-myplanet.component.scss' ]
})
export class ReportsMyPlanetComponent implements OnInit {

  private readonly defaultTimeFilter: string = 'all';
  private allPlanets: any[] = [];
  searchValue = '';
  planets: any[] = [];
  isEmpty = false;
  isLoading = true;
  isMobile: boolean;
  showFiltersRow = false;
  deviceType: DeviceType;
  deviceTypes: typeof DeviceType = DeviceType;
  planetType = this.stateService.configuration.planetType;
  configuration = this.stateService.configuration;
  hubId: string | null = null;
  hub = { spokes: [] };
  startDate: Date = new Date(new Date().setFullYear(new Date().getFullYear() - 1));
  endDate: Date = new Date();
  reportsForm: UntypedFormGroup;
  minDate = new Date(new Date().setFullYear(new Date().getFullYear() - 1));
  today = new Date();
  versions: string[] = [];
  selectedVersion = '';
  selectedTimeFilter = 'all';
  timeFilterOptions = this.activityService.standardTimeFilters;
  showCustomDateFields = false;
  get childType() {
    return this.planetType === 'center' ? 'Community' : 'Nation';
  }
  get isDefaultTimeFilter(): boolean {
    return this.selectedTimeFilter === this.defaultTimeFilter;
  }

  constructor(
    private csvService: CsvService,
    private couchService: CouchService,
    private stateService: StateService,
    private planetMessageService: PlanetMessageService,
    private managerService: ManagerService,
    private reportsService: ReportsService,
    private activityService: ReportsService,
    private route: ActivatedRoute,
    private deviceInfoService: DeviceInfoService,
    private fb: UntypedFormBuilder
  ) {
    this.deviceType = this.deviceInfoService.getDeviceType({ tablet: 1300 });
    this.reportsForm = this.fb.group({
      startDate: [ this.minDate, [ Validators.required, Validators.min(this.minDate.getTime()), Validators.max(this.today.getTime()) ] ],
      endDate: [ this.today, [ Validators.required, Validators.min(this.minDate.getTime()), Validators.max(this.today.getTime()) ] ]
    }, {
      validator: (ac) => {
        if (ac.get('startDate').value > ac.get('endDate').value) {
          return { invalidDates: true };
        }
        return null;
      }
    });
  }

  ngOnInit() {
    this.onTimeFilterChange('all');
    this.isLoading = true;
    this.getMyPlanetList(this.route.snapshot.params.hubId);
    this.reportsForm.valueChanges.subscribe(() => {
      this.startDate = this.reportsForm.get('startDate').value;
      this.endDate = this.reportsForm.get('endDate').value;
      if (!this.reportsForm.errors?.invalidDates) {
        this.applyFilters();
      }
    });
  }

  @HostListener('window:resize')
  OnResize() {
    this.deviceType = this.deviceInfoService.getDeviceType({ tablet: 1300 });
  }

  filterData(filterValue: string) {
    this.searchValue = filterValue;
    this.applyFilters();
  }

  clearFilters() {
    this.searchValue = '';
    this.selectedVersion = '';
    this.selectedTimeFilter = 'all';
    this.resetDateFilter();
    this.applyFilters();
  }

  setAllPlanets(planets: any[], myPlanets: any[]) {
    this.getUniqueVersions(myPlanets);
    this.minDate = this.getEarliestDate(myPlanets);
    this.reportsForm.patchValue({
      startDate: this.minDate
    });
    this.allPlanets = planets.map(planet => ({
      ...planet,
      children: this.filterMyPlanetData(this.myPlanetGroups(planet, myPlanets)
        .map((child: any) => ({ count: child.count, totalUsedTime: child.sum, ...child.max })))
    }));
  }

  filterMyPlanetData(data: any[]) {
    return data
      .filter(item => !this.selectedVersion || item.versionName === this.selectedVersion)
      .filter(item => {
        const itemDate = item.time || item.last_synced;
        return !itemDate || (itemDate >= this.startDate.getTime() && itemDate <= this.endDate.getTime());
      });
  }

  getUniqueVersions(myPlanets: any[]) {
    this.versions = Array.from(new Set(myPlanets.map(planet =>
      planet.versionName || (planet.usages && planet.usages.length > 0 ? planet.usages[0].versionName : null)
    ))).filter(version => version).sort();
  }

  getEarliestDate(myPlanets: any[]): Date {
    const earliest = Math.min(...myPlanets.flatMap(planet => {
      const dates = [];
      if (planet.time) { dates.push(Number(planet.time)); }
      if (planet.last_synced) { dates.push(Number(planet.last_synced)); }
      if (planet.usages) {
        dates.push(...planet.usages.map(usage => Number(usage.time || usage.last_synced)));
      }
      return dates;
    }));
    return new Date(earliest);
  }

  onVersionChange(version: string) {
    this.selectedVersion = version;
    this.applyFilters();
  }

  onTimeFilterChange(timeFilter: string) {
    this.selectedTimeFilter = timeFilter;
    const { startDate, endDate, showCustomDateFields } = this.activityService.getDateRange(timeFilter, this.minDate);
    this.showCustomDateFields = showCustomDateFields;
    if (timeFilter === 'custom') {
      return;
    }
    this.startDate = startDate;
    this.endDate = endDate;
    this.reportsForm.patchValue({
      startDate,
      endDate
    });
    this.applyFilters();
  }

  applyFilters() {
    this.planets = this.allPlanets
      .filter(planet => filterSpecificFields([ 'name', 'doc.code' ])(planet, this.searchValue))
      .map(planet => ({
        ...planet,
        children: this.filterMyPlanetData(planet.children)
      }));
    this.isEmpty = areNoChildren(this.planets);
  }

  resetDateFilter() {
    this.onTimeFilterChange('all');
  }

  myPlanetGroups(planet: any, myPlanets: any[]) {
    return this.reportsService.groupBy(
      myPlanets
        .filter(myPlanet => myPlanet.createdOn === planet.doc.code || myPlanet.parentCode === planet.doc.code)
        .map(myPlanet => (myPlanet.type === 'usages' || (myPlanet.usages || []) > 0) ? myPlanet.usages : myPlanet)
        .flat(),
      [ 'androidId' ],
      { maxField: 'time', sumField: 'totalUsed' }
    );
  }

  getMyPlanetList(hubId) {
    this.isLoading = true;
    this.myPlanetRequest(hubId).subscribe(
      ([ planets, myPlanets ]: [ any, any ]) => {
        this.setAllPlanets(
          [ { doc: this.configuration } ].concat(
            planets.filter(planet => planet.doc.docType !== 'parentName')
          ).map((planet: any) => ({ ...planet, name: planet.nameDoc ? planet.nameDoc.name : planet.doc.name })),
          myPlanets
        );
        this.planets = this.allPlanets;
        this.isEmpty = areNoChildren(this.planets);
        this.isLoading = false;
      },
      (error) => {
        this.planetMessageService.showAlert($localize`There was a problem getting myPlanet activity.`);
        this.isLoading = false;
      }
    );
  }

  myPlanetRequest(hubId) {
    const { planetCode, domain } = getDomainParams(this.configuration, hubId !== undefined);
    return (hubId ? this.couchService.findAll('hubs', findDocuments({ 'planetId': hubId }), { domain }) : of([])).pipe(
      switchMap((hubs: any) => {
        this.hub = hubs[0] || { spokes: [] };
        const selector = findDocuments({ 'createdOn': { '$in': this.hub.spokes } });
        return forkJoin([
          this.managerService.getChildPlanets(true, planetCode, domain),
          this.couchService.findAll('myplanet_activities'),
          hubId ? this.couchService.findAll('myplanet_activities', selector, { domain }) : of([])
        ]);
      }),
      map(([ planets, myPlanets, hubMyPlanets ]) => {
        const filteredPlanets = attachNamesToPlanets(planets)
          .filter((planet: any) => planet.doc.docType !== 'parentName' && (!hubId || this.hub.spokes.indexOf(planet.doc.code) > -1));
        return [ filteredPlanets, myPlanets.concat(hubMyPlanets) ];
      })
    );
  }

  private formatTotalTime(totalMilliseconds: number): string {
    if (!totalMilliseconds || totalMilliseconds === 0) {
        return '00:00:00';
    }
    const totalSeconds = Math.floor(totalMilliseconds / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }

  private mapToCsvData(children: any[], planetName?: string): any[] {
    return children.map((data: any) => ({
      ...(planetName ? { [$localize`Planet Name`]: planetName } : {}),
      [$localize`ID`]: data.androidId.toString() || data.uniqueAndroidId.toString(),
      [$localize`Name`]: data.deviceName || data.customDeviceName,
      [$localize`Last Synced`]: data.time && data.time !== 0 ?
        new Date(data.time).toDateString() :
        data.last_synced && data.last_synced !== 0 ?
        new Date(data.last_synced).toDateString() :
        'N/A',
      [$localize`Version`]: data.versionName,
      [$localize`No of Visits`]: data.count,
      [$localize`Used Time`]: this.formatTotalTime(data.totalUsedTime),
    }));
  }

  exportAll(): void {
    const csvData: any[] = this.planets.flatMap((planet: any) => {
      return this.mapToCsvData(planet.children, planet.name);
    });

    this.csvService.exportCSV({
      data: csvData,
      title: $localize`myPlanet Reports`,
    });
  }

  exportSingle(planet: any): void {
    const csvData = this.mapToCsvData(planet.children);

    this.csvService.exportCSV({
      data: csvData,
      title: $localize`myPlanet Reports for ${planet.name}`,
    });
  }

}
