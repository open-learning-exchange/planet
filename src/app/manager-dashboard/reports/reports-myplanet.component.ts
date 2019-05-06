import { Component, OnInit } from '@angular/core';
import { CouchService } from '../../shared/couchdb.service';
import { forkJoin, Subject } from 'rxjs';
import { findDocuments } from '../../shared/mangoQueries';
import { StateService } from '../../shared/state.service';
import { PlanetMessageService } from '../../shared/planet-message.service';

@Component({
  templateUrl: './reports-myplanet.component.html'
})
export class ReportsMyPlanetComponent implements OnInit {

  myPlanets = [];
  planets = [];
  planetType = this.stateService.configuration.planetType;
  get childType() {
    return this.planetType === 'center' ? 'Community' : 'Nation';
  }

  constructor(
    private couchService: CouchService,
    private stateService: StateService,
    private planetMessageService: PlanetMessageService
  ) {}

  ngOnInit() {
    this.getMyPlanetList();
  }

  filterData() {
    this.planets = this.planets.map((planet: any) => ({
        ...planet,
        children: this.myPlanets.filter((item: any) => item.createdOn === planet.code || item.parentCode === planet.code)
      }));
  }

  getMyPlanetList() {
    forkJoin([
      this.couchService.findAll('communityregistrationrequests',
        findDocuments({ '_id': { '$gt': null } }, 0, [ { 'createdDate': 'desc' } ] )),
      this.couchService.findAll('myplanet_activities')
    ]).subscribe(([ planets, myPlanets ]) => {
      this.planets = [ this.stateService.configuration ].concat(planets);
      this.myPlanets = myPlanets;
      this.filterData();
    }, (error) => this.planetMessageService.showAlert('There was a problem getting ' + this.childType));
  }

}
