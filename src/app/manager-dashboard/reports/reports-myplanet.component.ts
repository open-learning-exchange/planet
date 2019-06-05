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
      children: myPlanets.filter(myPlanet => myPlanet.createdOn === planet.doc.code || myPlanet.parentCode === planet.doc.code)
        .sort((a, b) => b.time - a.time)
        .reduce((myplanetArr, item) => {
          const exist = myplanetArr.findIndex(myplanet => item.androidId === myplanet.androidId);
          if (exist === -1) {
            myplanetArr.push(item);
          }
          return myplanetArr;
        }, [])
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
