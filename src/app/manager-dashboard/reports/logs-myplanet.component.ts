import { Component, OnInit } from '@angular/core';
import { CouchService } from '../../shared/couchdb.service';
import { forkJoin } from 'rxjs';
import { StateService } from '../../shared/state.service';
import { PlanetMessageService } from '../../shared/planet-message.service';
import { ManagerService } from '../manager.service';
import { filterSpecificFields } from '../../shared/table-helpers';
import { attachNamesToPlanets, areNoChildren } from './reports.utils';


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

  constructor(
    private couchService: CouchService,
    private stateService: StateService,
    private planetMessageService: PlanetMessageService,
    private managerService: ManagerService
  ) {}

  ngOnInit() {
    this.getApkLogs();
  }

  filterData(filterValue: string) {
    this.searchValue = filterValue;
    this.apklogs = this.allPlanets.filter(planet => filterSpecificFields([ 'name', 'doc.code' ])(planet, filterValue));
  }

  setAllPlanets(planets: any[], apklogs: any[]) {
    this.allPlanets = planets.map(planet => ({
      ...planet,
      children: apklogs.filter(myPlanet => {
          return (myPlanet.createdOn === planet.doc.code || myPlanet.parentCode === planet.doc.code);
        })
      })
    );
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

}
