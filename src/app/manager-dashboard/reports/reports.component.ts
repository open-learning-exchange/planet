import { Component, OnDestroy, OnInit } from '@angular/core';
import { forkJoin, Subject } from 'rxjs';
import { CouchService } from '../../shared/couchdb.service';
import { ReportsService } from './reports.service';
import { PlanetMessageService } from '../../shared/planet-message.service';
import { ManagerService } from '../manager.service';
import { arrangePlanetsIntoHubs, attachNamesToPlanets, getDomainParams } from './reports.utils';
import { StateService } from '../../shared/state.service';
import { ActivatedRoute } from '@angular/router';
import { takeUntil, switchMap } from 'rxjs/operators';

@Component({
  templateUrl: './reports.component.html',
})
export class ReportsComponent implements OnInit, OnDestroy {

  hubs = [];
  sandboxPlanets = [];
  planets = [];
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

  findByPlanet({ rows }: { rows: any[] }, planetCode) {
    return (rows.find(row => row.key === planetCode) || { value: 0 }).value;
  }

  getLogs() {
    const { planetCode, domain } = getDomainParams(this.configuration);
    forkJoin([
      this.managerService.getChildPlanets(true, planetCode, domain),
      this.couchService.findAll('hubs', undefined, domain ? { domain } : {})
    ]).pipe(
      switchMap(([ planets, hubs ]) => {
        this.planets = planets;
        this.arrangePlanetData(planets, hubs);
        return forkJoin([
          this.activityService.getActivities('resource_activities', 'byPlanet'),
          this.activityService.getActivities('login_activities', 'byPlanet'),
          this.activityService.getAdminActivities()
        ]);
      })
    ).subscribe(([ resourceVisits, loginActivities, adminActivities ]) => {
      this.arrangePlanetData(this.planets.map((planet: any) => planet.docType === 'parentName' ? planet : ({
        ...planet,
        resourceViews: this.findByPlanet(resourceVisits, planet.code),
        userVisits: this.findByPlanet(loginActivities, planet.code),
        ...this.activityService.mostRecentAdminActivities(planet, [], adminActivities)
      })), this.hubs);
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

  trackById(index, item) {
    return item._id;
  }

}
