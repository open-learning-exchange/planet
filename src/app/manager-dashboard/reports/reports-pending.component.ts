import { Component, OnInit } from '@angular/core';
import { CouchService } from '../../shared/couchdb.service';
import { forkJoin, Subject } from 'rxjs';
import { findDocuments } from '../../shared/mangoQueries';
import { StateService } from '../../shared/state.service';
import { PlanetMessageService } from '../../shared/planet-message.service';

@Component({
  templateUrl: './reports-pending.component.html'
})
export class ReportsPendingComponent implements OnInit {

  data = [];
  planets = [];
  planetType = this.stateService.configuration.planetType;
  get childType() {
    return this.planetType === 'nation' ? 'Community' : 'Nation';
  }
  displayedColumns = [ 'item' ];

  constructor(
    private couchService: CouchService,
    private stateService: StateService,
    private planetMessageService: PlanetMessageService
  ) {}

  ngOnInit() {
    this.getCommunityList();
  }

  filterData() {
    this.planets = this.planets.map((planet: any) => ({
        ...planet,
        children: this.data.filter((item: any) => item.sendTo === planet.code)
      }));
  }

  getCommunityList() {
    forkJoin([
      this.couchService.findAll('send_items'),
      this.couchService.findAll('communityregistrationrequests',
        findDocuments({ '_id': { '$gt': null } }, 0, [ { 'createdDate': 'desc' } ] ))
    ]).subscribe(([ data, planets ]) => {
      this.planets = planets;
      this.data = data;
      this.filterData();
      console.log(this.data);
    }, (error) => this.planetMessageService.showAlert('There was a problem getting ' + this.childType));
  }

}
