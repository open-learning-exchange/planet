import { Component, OnInit, Input, Output, EventEmitter } from '@angular/core';
import { forkJoin } from 'rxjs';
import { CouchService } from '../shared/couchdb.service';
import { ManagerService } from '../manager-dashboard/manager.service';
import { arrangePlanetsIntoHubs, attachNamesToPlanets, planetAndParentId } from '../manager-dashboard/reports/reports.utils';

@Component({
  selector: 'planet-community-list',
  templateUrl: './community-list.component.html'
})
export class CommunityListComponent implements OnInit {

  planets: { hubs: any[], sandboxPlanets: any[] } = { hubs: [], sandboxPlanets: [] };
  @Input() selectMode = false;
  @Output() selectionChange = new EventEmitter<any>();
  @Input() excludeIds = [];

  constructor(
    private couchService: CouchService,
    private managerService: ManagerService
  ) {}

  ngOnInit() {
    forkJoin([
      this.managerService.getChildPlanets(true),
      this.couchService.findAll('hubs')
    ]).subscribe(([ children, hubs ]) => {
      this.planets = arrangePlanetsIntoHubs(
        attachNamesToPlanets(children)
          .filter(planet => planet.doc.docType !== 'parentName' && this.excludeIds.indexOf(planetAndParentId(planet.doc)) === -1),
        hubs
      );
      console.log(this.planets);
    });
  }

  selectChange(planet) {
    planet.selected = !planet.selected;
    this.selectionChange.emit(planet);
  }

}
