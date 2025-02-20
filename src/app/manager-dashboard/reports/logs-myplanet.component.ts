import { Component, OnInit } from '@angular/core';
import { CouchService } from '../../shared/couchdb.service';
import { forkJoin } from 'rxjs';
import { StateService } from '../../shared/state.service';
import { PlanetMessageService } from '../../shared/planet-message.service';
import { ManagerService } from '../manager.service';
import { filterSpecificFields } from '../../shared/table-helpers';
import { attachNamesToPlanets, areNoChildren, filterByDate } from './reports.utils';
import { CsvService } from '../../shared/csv.service';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';

@Component({
  templateUrl: './logs-myplanet.component.html'
})
export class LogsMyPlanetComponent implements OnInit {

  apklogs: any[] = [];
  isEmpty = false;
  private allPlanets: any[] = [];
  searchValue = '';
  planetType = this.stateService.configuration.planetType;
  get childType() {
    return this.planetType === 'center' ? $localize`Community` : $localize`Nation`;
  }
  startDate: Date = new Date(new Date().setFullYear(new Date().getFullYear() - 1));
  endDate: Date = new Date();
  selectedChildren: any[] = [];
  logsForm: FormGroup;
  minDate = new Date(new Date().setFullYear(new Date().getFullYear() - 1));
  today = new Date();

  constructor(
    private csvService: CsvService,
    private couchService: CouchService,
    private stateService: StateService,
    private planetMessageService: PlanetMessageService,
    private managerService: ManagerService,
    private fb: FormBuilder
  ) {
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
        this.onDateChange();
      }
    });
  }

  filterData(filterValue: string) {
    this.searchValue = filterValue;
    this.apklogs = this.allPlanets.filter(planet => filterSpecificFields([ 'name', 'doc.code' ])(planet, filterValue));
  }

  setAllPlanets(planets: any[], apklogs: any[]) {
    this.allPlanets = planets.map(planet => ({
      ...planet,
      children: this.filterLogsByDate(apklogs.filter(myPlanet => {
          return (myPlanet.createdOn === planet.doc.code || myPlanet.parentCode === planet.doc.code);
        }))
      })
    );
  }

  filterLogsByDate(logs: any[]) {
    return filterByDate(logs, 'time', { startDate: this.startDate, endDate: this.endDate });
  }

  onDateChange() {
    this.getApkLogs();
  }

  getApkLogs() {
    forkJoin([
      this.managerService.getChildPlanets(),
      this.couchService.findAll('apk_logs')
    ]).subscribe(([ planets, apklogs ]) => {
      this.setAllPlanets(
        [ { doc: this.stateService.configuration } ].concat(attachNamesToPlanets(planets))
          .filter((planet: any) => planet.doc.docType !== 'parentName')
          .map((planet: any) => ({ ...planet, name: planet.nameDoc ? planet.nameDoc.name : planet.doc.name })),
          apklogs
      );
      this.apklogs = this.allPlanets;
      this.isEmpty = areNoChildren(this.apklogs);
    }, (error) => this.planetMessageService.showAlert($localize`There was a problem getting myPlanet activity.`));
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

}
