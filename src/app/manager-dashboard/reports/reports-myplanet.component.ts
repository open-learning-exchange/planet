import { Component, OnInit } from '@angular/core';
import { CouchService } from '../../shared/couchdb.service';
import { forkJoin } from 'rxjs';
import { StateService } from '../../shared/state.service';
import { PlanetMessageService } from '../../shared/planet-message.service';
import { ManagerService } from '../manager.service';
import { ReportsService } from './reports.service';
import { filterSpecificFields } from '../../shared/table-helpers';

@Component({
  templateUrl: './reports-myplanet.component.html'
})
export class ReportsMyPlanetComponent implements OnInit {

  private allPlanets: any[] = [];
  searchValue = '';
  planets: any[] = [];
  planetType = this.stateService.configuration.planetType;
  get childType() {
    return this.planetType === 'center' ? 'Community' : 'Nation';
  }

  constructor(
    private couchService: CouchService,
    private stateService: StateService,
    private planetMessageService: PlanetMessageService,
    private managerService: ManagerService,
    private reportsService: ReportsService
  ) {}

  ngOnInit() {
    this.getMyPlanetList();
  }

  filterData(filterValue: string) {
    this.searchValue = filterValue;
    this.planets = this.allPlanets.filter(planet => filterSpecificFields([ 'name', 'doc.code' ])(planet, filterValue));
  }

  setAllPlanets(planets: any[], myPlanets: any[]) {
    this.allPlanets = planets.map(planet => ({
      ...planet,
      children:
        this.reportsService.groupBy(
          myPlanets.filter(myPlanet => myPlanet.createdOn === planet.doc.code || myPlanet.parentCode === planet.doc.code),
          [ 'androidId' ],
          { maxField: 'time' }
        ).map((child: any) => {
          return { count: child.count, ...child.max };
        })
      })
    );
  }

  getMyPlanetList() {
    forkJoin([
      this.managerService.getChildPlanets(),
      this.couchService.findAll('myplanet_activities')
    ]).subscribe(([ planets, myPlanets ]) => {
      this.setAllPlanets(
        [ { doc: this.stateService.configuration } ].concat(this.reportsService.attachNamesToPlanets(planets))
          .filter((planet: any) => planet.doc.docType !== 'parentName')
          .map((planet: any) => ({ ...planet, name: planet.nameDoc ? planet.nameDoc.name : planet.doc.name })),
        myPlanets
      );
      this.planets = this.allPlanets;
    }, (error) => this.planetMessageService.showAlert('There was a problem getting ' + this.childType));
  }

}
