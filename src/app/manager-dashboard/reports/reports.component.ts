import { Component } from '@angular/core';
import { forkJoin } from 'rxjs';
import { CouchService } from '../../shared/couchdb.service';
import { findDocuments } from '../../shared/mangoQueries';
import { ReportsService } from './reports.service';
import { PlanetMessageService } from '../../shared/planet-message.service';
import { ManagerService } from '../manager.service';

@Component({
  templateUrl: './reports.component.html',
})
export class ReportsComponent {

  hubs = [];
  sandboxPlanets = [];

  constructor(
    private couchService: CouchService,
    private activityService: ReportsService,
    private planetMessageService: PlanetMessageService,
    private managerService: ManagerService
  ) {
    this.getLogs();
  }
  countByPlanet(planet, logs) {
    return logs.reduce((total, log: any) => {
      if (log.createdOn === planet.code) {
        return total + log.count;
      }
      return total;
    }, 0);
  }

  getLogs() {
    forkJoin([
      this.managerService.getChildPlanets(true),
      this.activityService.getGroupedReport('resourceViews'),
      this.activityService.getGroupedReport('logins'),
      this.activityService.getAdminActivities(),
      this.couchService.findAll('hubs')
    ]).subscribe(([ planets, resourceVisits, loginActivities, adminActivities, hubs ]) => {
      this.arrangePlanetData(planets.map((planet: any) => planet.docType === 'parentName' ? planet : ({
        ...planet,
        resourceViews: this.countByPlanet(planet, resourceVisits.byResource),
        userVisits: this.countByPlanet(planet, loginActivities.byUser),
        ...this.activityService.mostRecentAdminActivities(planet, loginActivities.byUser, adminActivities)
      })), hubs);
    }, (error) => this.planetMessageService.showAlert('There was a problem getting Activity Logs'));
  }

  arrangePlanetData(planetDocs, hubData) {
    const { hubs, sandboxPlanets } = this.activityService.arrangePlanetsIntoHubs(
      this.activityService.attachNamesToPlanets(planetDocs), hubData
    );
    this.hubs = hubs;
    this.sandboxPlanets = sandboxPlanets.filter((planet: any) => planet.doc.docType !== 'parentName');
  }

}
