import { Component, OnInit, Input, Output, EventEmitter } from '@angular/core';
import { forkJoin } from 'rxjs';
import { CouchService } from '../shared/couchdb.service';
import { ManagerService } from '../manager-dashboard/manager.service';
import { arrangePlanetsIntoHubs, attachNamesToPlanets } from '../manager-dashboard/reports/reports.utils';

@Component({
  selector: 'planet-community-list',
  templateUrl: './community-list.component.html'
})
export class CommunityListComponent implements OnInit {

  planets: { hubs: any[], sandboxPlanets: any[] } = { hubs: [], sandboxPlanets: [] };
  @Input() selectMode = false;
  @Output() selectionChange = new EventEmitter<any>();

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
        attachNamesToPlanets(children).filter(planet => planet.doc.docType !== 'parentName'),
        hubs
      );
    });
  }

  selectChange(planet) {
    planet.selected = !planet.selected;
    this.selectionChange.emit(planet);
  }

}
