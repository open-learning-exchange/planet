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

  searchValue = '';
  myPlanets = [];
  planets = [];
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

  requestListFilter(filterValue: string) {
    this.searchValue = filterValue;
    this.filterData();
  }

  filterData() {
    const filterFunction = filterSpecificFields([ 'createdOn', 'parentCode' ]);
    this.planets = this.planets.map((planet: any) => ({
      ...planet,
      children: this.myPlanets.filter((item: any) => (item.createdOn === planet.doc.code || item.parentCode === planet.doc.code)
                  && filterFunction(item, this.searchValue))
                  .sort((a, b) => b.time - a.time)
                  .reduce((myplanetArr, item) => {
                    const exist = myplanetArr.findIndex(myplanet => item.androidId === myplanet.androidId);
                    if (exist === -1) {
                      myplanetArr.push(item);
                    }
                    return myplanetArr;
                  }, [])
    }));
  }

  getMyPlanetList() {
    forkJoin([
      this.managerService.getChildPlanets(),
      this.couchService.findAll('myplanet_activities')
    ]).subscribe(([ planets, myPlanets ]) => {
      this.planets = [ { doc: this.stateService.configuration } ]
        .concat(this.reportsService.attachNamesToPlanets(planets))
        .filter((planet: any) => planet.doc.docType !== 'parentName');
      this.myPlanets = myPlanets;
      this.filterData();
    }, (error) => this.planetMessageService.showAlert('There was a problem getting ' + this.childType));
  }

}
