import { Component, OnInit, Input, Output, EventEmitter } from '@angular/core';
import { forkJoin } from 'rxjs';
import { CouchService } from '../shared/couchdb.service';
import { ManagerService } from '../manager-dashboard/manager.service';
import { arrangePlanetsIntoHubs, attachNamesToPlanets, planetAndParentId, sortPlanet } from '../manager-dashboard/reports/reports.utils';
import { NgIf, NgFor, NgClass } from '@angular/common';
import { PlanetLoadingSpinnerComponent } from '../shared/planet-loading-spinner.component';
import { MatList, MatListSubheaderCssMatStyler, MatListItem, MatListItemIcon, MatListItemTitle, MatListItemMeta } from '@angular/material/list';
import { MatCheckbox } from '@angular/material/checkbox';
import { MatAnchor } from '@angular/material/button';
import { RouterLink } from '@angular/router';

@Component({
    selector: 'planet-community-list',
    templateUrl: './community-list.component.html',
    imports: [NgIf, PlanetLoadingSpinnerComponent, MatList, NgFor, MatListSubheaderCssMatStyler, MatListItem, NgClass, MatCheckbox, MatListItemIcon, MatListItemTitle, MatListItemMeta, MatAnchor, RouterLink]
})
export class CommunityListComponent implements OnInit {

  planets: { hubs: any[], sandboxPlanets: any[] } = { hubs: [], sandboxPlanets: [] };
  isLoading = true;
  @Input() selectMode = false;
  @Output() selectionChange = new EventEmitter<any>();
  @Input() excludeIds = [];

  constructor(
    private couchService: CouchService,
    private managerService: ManagerService
  ) {}

  ngOnInit() {
    this.isLoading = true;
    forkJoin([
      this.managerService.getChildPlanets(true),
      this.couchService.findAll('hubs')
    ]).subscribe(([ children, hubs ]: any[]) => {
      const childPlanets = attachNamesToPlanets(children)
        .filter(planet => planet.doc.docType !== 'parentName' && this.excludeIds.indexOf(planetAndParentId(planet.doc)) === -1);
      const allHubs = arrangePlanetsIntoHubs(
        childPlanets.sort(sortPlanet),
        hubs
      );
      this.planets = {
        hubs: allHubs.hubs
          .map(hub => {
            const planet = children.find(child => child._id === hub.planetId);
            if (!planet || this.excludeIds.indexOf(planetAndParentId(planet)) > -1) {
              return hub;
            }
            return { ...hub, children: [ { doc: planet }, ...hub.children ] };
          })
          .filter(hub => hub.children.length > 0),
        sandboxPlanets: allHubs.sandboxPlanets
      };
      this.isLoading = false;
    }, () => {
      this.isLoading = false;
    });
  }

  selectChange(planet) {
    planet.selected = !planet.selected;
    this.selectionChange.emit(planet);
  }

}
