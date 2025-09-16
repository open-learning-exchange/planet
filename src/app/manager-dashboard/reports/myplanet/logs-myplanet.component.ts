import { Component, OnInit, HostListener } from '@angular/core';
import { UntypedFormBuilder, UntypedFormGroup, Validators } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { CouchService } from '../../../shared/couchdb.service';
import { StateService } from '../../../shared/state.service';
import { PlanetMessageService } from '../../../shared/planet-message.service';
import { ManagerService } from '../../manager.service';
import { filterSpecificFields } from '../../../shared/table-helpers';
import { attachNamesToPlanets, areNoChildren, filterByDate } from '../reports.utils';
import { CsvService } from '../../../shared/csv.service';
import { DeviceInfoService, DeviceType } from '../../../shared/device-info.service';
import { ReportsService } from '../reports.service';

@Component({
  templateUrl: './logs-myplanet.component.html',
  styleUrls: [ './shared.scss' ]
})
export class LogsMyPlanetComponent implements OnInit {

  private readonly defaultTimeFilter: string = '24h';
  private allPlanets: any[] = [];
  apklogs: any[] = [];
  isEmpty = false;
  searchValue = '';
  planetType = this.stateService.configuration.planetType;
  startDate: Date = new Date(new Date().setFullYear(new Date().getDate() - 1));
  endDate: Date = new Date();
  selectedChildren: any[] = [];
  logsForm: UntypedFormGroup;
  minDate = new Date(new Date().setFullYear(new Date().getFullYear() - 1));
  today = new Date();
  versions: string[] = [];
  selectedVersion = '';
  types: string[] = [];
  selectedType = '';
  showFiltersRow = false;
  deviceType: DeviceType;
  deviceTypes: typeof DeviceType = DeviceType;
  selectedTimeFilter = '24h';
  showCustomDateFields = false;
  timeFilterOptions = this.activityService.standardTimeFilters;
  isLoading = false;
  get childType() {
    return this.planetType === 'center' ? $localize`Community` : $localize`Nation`;
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
    private fb: UntypedFormBuilder,
    private deviceInfoService: DeviceInfoService,
    private activityService: ReportsService,
  ) {
    this.deviceType = this.deviceInfoService.getDeviceType({ tablet: 1350 });
    this.logsForm = this.fb.group({
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
    this.getApkLogs();
    this.logsForm.valueChanges.subscribe(() => {
      this.startDate = this.logsForm.get('startDate').value;
      this.endDate = this.logsForm.get('endDate').value;
      if (!this.logsForm.errors?.invalidDates) {
        this.applyFilters();
      }
    });
  }

  @HostListener('window:resize')
  OnResize() {
    this.deviceType = this.deviceInfoService.getDeviceType({ tablet: 1350 });
  }

  filterData(filterValue: string) {
    this.searchValue = filterValue;
    this.applyFilters();
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

  onTimeFilterChange(timeFilter: string) {
    this.selectedTimeFilter = timeFilter;
    const { startDate, endDate, showCustomDateFields } = this.activityService.getDateRange(timeFilter, this.minDate);
    this.showCustomDateFields = showCustomDateFields;
    if (timeFilter === 'custom') {
      return;
    }
    this.startDate = startDate;
    this.endDate = endDate;
    this.logsForm.patchValue({
      startDate,
      endDate
    });
    this.applyFilters();
  }

  applyFilters() {
    this.apklogs = this.allPlanets
      .filter(planet => filterSpecificFields([ 'name', 'doc.code' ])(planet, this.searchValue))
      .map(planet => ({
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

  resetDateFilter() {
    this.onTimeFilterChange('24h');
  }

  clearFilters() {
    this.searchValue = '';
    this.selectedVersion = '';
    this.selectedType = '';
    this.resetDateFilter();
    this.applyFilters();
  }

}
