import { Component, OnDestroy, OnInit } from '@angular/core';
import { forkJoin, Subject } from 'rxjs';
import { CouchService } from '../../shared/couchdb.service';
import { ReportsService } from './reports.service';
import { PlanetMessageService } from '../../shared/planet-message.service';
import { ManagerService } from '../manager.service';
import { arrangePlanetsIntoHubs, attachNamesToPlanets } from './reports.utils';
import { StateService } from '../../shared/state.service';
import { ActivatedRoute } from '@angular/router';
import { takeUntil, map } from 'rxjs/operators';

@Component({
  templateUrl: './reports.component.html',
})
export class ReportsComponent implements OnInit, OnDestroy {

  hubs = [];
  sandboxPlanets = [];
  hubId: string | null = null;
  configuration = this.stateService.configuration;
  onDestroy$ = new Subject<void>();

  constructor(
    private couchService: CouchService,
    private activityService: ReportsService,
    private planetMessageService: PlanetMessageService,
    private managerService: ManagerService,
    private stateService: StateService,
    private route: ActivatedRoute
  ) {
    this.getLogs();
  }

  ngOnInit() {
    this.route.paramMap.pipe(takeUntil(this.onDestroy$)).subscribe(params => this.hubId = params.get('hubId'));
  }

  ngOnDestroy() {
    this.onDestroy$.next();
    this.onDestroy$.complete();
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
    const { planetCode, domain } = this.configuration.planetType === 'community' ?
      { planetCode: this.configuration.parentCode, domain: this.configuration.parentDomain } :
      { planetCode: undefined, domain: undefined };
    forkJoin([
      this.managerService.getChildPlanets(true, planetCode, domain),
      this.activityService.getGroupedReport('resourceViews'),
      this.activityService.getGroupedReport('logins'),
      this.activityService.getAdminActivities(),
      this.couchService.findAll('hubs', undefined, domain ? { domain } : {})
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
    const { hubs, sandboxPlanets } = arrangePlanetsIntoHubs(attachNamesToPlanets(planetDocs), hubData);
    if (this.hubId !== null) {
      this.sandboxPlanets = hubs.find(hub => hub.planetId === this.hubId).children;
      return;
    }
    this.hubs = hubs;
    this.sandboxPlanets = sandboxPlanets.filter((planet: any) => planet.doc.docType !== 'parentName');
  }

}
