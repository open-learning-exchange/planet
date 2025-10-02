import { Component, OnInit } from '@angular/core';
import { FormBuilder } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { CouchService } from '../../../shared/couchdb.service';
import { StateService } from '../../../shared/state.service';
import { PlanetMessageService } from '../../../shared/planet-message.service';
import { ManagerService } from '../../manager.service';
import { filterSpecificFields } from '../../../shared/table-helpers';
import { attachNamesToPlanets, areNoChildren, filterByDate } from '../reports.utils';
import { CsvService } from '../../../shared/csv.service';
import { ReportsService } from '../reports.service';
import { MyPlanetFiltersBase } from './filter.base';
import { exportMyPlanetCsv } from '../reports.utils';

@Component({
  templateUrl: './logs-myplanet.component.html',
  styleUrls: [ './myplanet.scss' ]
})
export class LogsMyPlanetComponent extends MyPlanetFiltersBase implements OnInit {

  private exportCsvHelper = exportMyPlanetCsv(this.csvService);
  private allPlanets: any[] = [];
  apklogs: any[] = [];
  planetType = this.stateService.configuration.planetType;
  selectedChildren: any[] = [];
  types: string[] = [];
  selectedType = '';
  get childType() {
    return this.planetType === 'center' ? $localize`Community` : $localize`Nation`;
  }

  constructor(
    private csvService: CsvService,
    private couchService: CouchService,
    private stateService: StateService,
    private planetMessageService: PlanetMessageService,
    private managerService: ManagerService,
    fb: FormBuilder,
    activityService: ReportsService,
  ) {
    super(fb, activityService, '24h');
  }

  ngOnInit() {
    this.getApkLogs();
  }

  clearFilters() {
    this.selectedType = '';
    super.clearFilters();
  }

  setAllPlanets(planets: any[], apklogs: any[]) {
    this.allPlanets = planets.map(planet => ({
      ...planet,
      children: apklogs.filter(myPlanet => myPlanet.createdOn === planet.doc.code || myPlanet.parentCode === planet.doc.code)
    }));
  }

  filterLogs(logs: any[]) {
    return logs
      .filter(log => !this.selectedVersion || log.version === this.selectedVersion)
      .filter(log => !this.selectedType || log.type === this.selectedType)
      .filter(log => filterByDate([ log ], 'time', { startDate: this.startDate, endDate: this.endDate }).length > 0);
  }

  getUniqueVersions(logs: any[]) {
    this.versions = Array.from(new Set(logs.map(log => log.version))).filter(version => version).sort((a, b) => b.localeCompare(a));
  }

  getUniqueTypes(logs: any[]) {
    this.types = Array.from(new Set(logs.map(log => log.type))).filter(type => type).sort();
  }

  getEarliestDate(logs: any[]): Date {
    const earliest = Math.min(...logs.flatMap(log => {
      const dates = [];
      if (log.time) { dates.push(Number(log.time)); }
      return dates;
    }));
    return new Date(earliest);
  };

  getApkLogs() {
    this.isLoading = true;
    forkJoin([
      this.managerService.getChildPlanets(),
      this.couchService.findAll('apk_logs')
    ]).subscribe(([planets, apklogs]) => {
      this.updateMinDate(this.getEarliestDate(apklogs));
      this.getUniqueVersions(apklogs);
      this.getUniqueTypes(apklogs);
      this.setAllPlanets(
        [ { doc: this.stateService.configuration } ].concat(attachNamesToPlanets(planets))
          .filter((planet: any) => planet.doc.docType !== 'parentName')
          .map((planet: any) => ({ ...planet, name: planet.nameDoc ? planet.nameDoc.name : planet.doc.name })),
          apklogs
      );
      this.apklogs = this.allPlanets;
      this.onTimeFilterChange(this.selectedTimeFilter);
      this.isEmpty = areNoChildren(this.apklogs);
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
    this.apklogs = this.allPlanets
      .filter(planet => !this.searchValue || filterSpecificFields([ 'name', 'doc.code' ])(planet, this.searchValue))
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
      'Error': data.error || 'N/A',
    }));
  }

  exportAll(): void {
    this.exportCsvHelper(this.apklogs, undefined, this.mapToCsvData, $localize`myPlanet Logs`);
  }

  exportSingle(planet: any): void {
    this.exportCsvHelper(planet.children, planet.name, this.mapToCsvData, $localize`myPlanet Logs for ${planet.name}`);
  }

}
