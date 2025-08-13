import { Component, OnInit, HostListener } from '@angular/core';
import { FormBuilder } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { StateService } from '../../../shared/state.service';
import { CouchService } from '../../../shared/couchdb.service';
import { PlanetMessageService } from '../../../shared/planet-message.service';
import { ManagerService } from '../../manager.service';
import { filterSpecificFields } from '../../../shared/table-helpers';
import { attachNamesToPlanets, areNoChildren, filterByDate } from '../reports.utils';
import { CsvService } from '../../../shared/csv.service';
import { DeviceInfoService, DeviceType } from '../../../shared/device-info.service';
import { ReportsService } from '../reports.service';
import { MyPlanetFiltersBase } from './filter-myplanet.base';

@Component({
  templateUrl: './logs-myplanet.component.html',
  styleUrls: [ './shared.scss' ]
})
export class LogsMyPlanetComponent extends MyPlanetFiltersBase implements OnInit {

  private allPlanets: any[] = [];
  apklogs: any[] = [];
  isEmpty = false;
  searchValue = '';
  planetType = this.stateService.configuration.planetType;
  selectedChildren: any[] = [];
  versions: string[] = [];
  types: string[] = [];
  selectedType = '';
  showFiltersRow = false;
  deviceType: DeviceType;
  deviceTypes: typeof DeviceType = DeviceType;
  isLoading = false;
  get childType() {
    return this.planetType === 'center' ? $localize`Community` : $localize`Nation`;
  }

  constructor(
    private csvService: CsvService,
    private couchService: CouchService,
    private stateService: StateService,
    private planetMessageService: PlanetMessageService,
    private managerService: ManagerService,
    private deviceInfoService: DeviceInfoService,
    fb: FormBuilder,
    activityService: ReportsService,
  ) {
    super(fb, activityService, '24h');
    this.deviceType = this.deviceInfoService.getDeviceType({ tablet: 1350 });
  }

  ngOnInit() {
    this.getApkLogs();
  }

  @HostListener('window:resize')
  OnResize() {
    this.deviceType = this.deviceInfoService.getDeviceType({ tablet: 1350 });
  }

  filterData(filterValue: string) {
    this.searchValue = filterValue;
    this.apklogs = this.allPlanets.filter(planet => filterSpecificFields([ 'name', 'doc.code' ])(planet, filterValue));
  }

  setAllPlanets(planets: any[], apklogs: any[]) {
    this.allPlanets = planets.map(planet => ({
      ...planet,
      children: this.filterLogs(apklogs.filter(myPlanet =>
        myPlanet.createdOn === planet.doc.code || myPlanet.parentCode === planet.doc.code
      ))
    }));
  }

  filterLogs(logs: any[]) {
    return logs
      .filter(log => !this.selectedVersion || log.version === this.selectedVersion)
      .filter(log => !this.selectedType || log.type === this.selectedType)
      .filter(log => filterByDate([ log ], 'time', { startDate: this.startDate, endDate: this.endDate }).length > 0);
  }

  getUniqueVersions(logs: any[]) {
    this.versions = Array.from(
      new Set(logs.map(log => log.version)))
      .filter(version => version)
      .sort((a, b) => b.localeCompare(a));
  }

  getUniqueTypes(logs: any[]) {
    this.types = Array.from(new Set(logs.map(log => log.type))).filter(type => type).sort();
  }

  getEarliestDate(logs: any[]): Date {
    const earliest = Math.min(...logs.map(log => Number(log.time)));
    return new Date(earliest);
  }

  getApkLogs() {
    this.isLoading = true;
    forkJoin([
      this.managerService.getChildPlanets(),
      this.couchService.findAll('apk_logs')
    ]).subscribe(([planets, apklogs]) => {
      this.getUniqueVersions(apklogs);
      this.getUniqueTypes(apklogs);
      this.setAllPlanets(
        [ { doc: this.stateService.configuration } ].concat(attachNamesToPlanets(planets))
          .filter((planet: any) => planet.doc.docType !== 'parentName')
          .map((planet: any) => ({ ...planet, name: planet.nameDoc ? planet.nameDoc.name : planet.doc.name })),
          apklogs
      );
      this.apklogs = this.allPlanets;
      this.isEmpty = areNoChildren(this.apklogs);
      this.onTimeFilterChange('24h');
      this.isLoading = false;
    }, (error) => {
      this.planetMessageService.showAlert($localize`There was a problem getting myPlanet activity.`);
      this.isLoading = false;
    });
  }

  onVersionChange(version: string) {
    this.selectedVersion = version;
    this.applyFilters();
  }

  onTypeChange(type: string) {
    this.selectedType = type;
    this.applyFilters();
  }

  applyFilters() {
    this.apklogs = this.allPlanets.map(planet => ({
      ...planet,
      children: this.filterLogs(planet.children)
    }));
    this.isEmpty = areNoChildren(this.apklogs);
  }

  private mapToCsvData(children: any[], planetName?: string): any[] {
    return children.map((data: any) => ({
      ...(planetName ? { 'Planet Name': planetName } : {}),
      'ID': data.androidId,
      'Name': data.deviceName || data.customDeviceName,
      'Type': data.type,
      'Time': new Date(Number(data.time)),
      'Version': data.version,
      'Error':  data.error || 'N/A',
    }));
  }

  exportAll(): void {
    const csvData: any[] = this.apklogs.flatMap((planet: any) => {
      return this.mapToCsvData(planet.children, planet.name);
    });

    this.csvService.exportCSV({
      data: csvData,
      title: 'myPlanet Logs',
    });
  }

  exportSingle(planet: any): void {
    const csvData = this.mapToCsvData(planet.children);

    this.csvService.exportCSV({
      data: csvData,
      title: `myPlanet Logs for ${planet.name}`,
    });
  }

  clearFilters() {
    this.searchValue = '';
    this.selectedType = '';
    super.clearFilters();
  }

}
