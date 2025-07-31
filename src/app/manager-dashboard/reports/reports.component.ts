import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { forkJoin, Subject } from 'rxjs';
import { takeUntil, switchMap } from 'rxjs/operators';
import { CouchService } from '../../shared/couchdb.service';
import { ReportsService } from './reports.service';
import { PlanetMessageService } from '../../shared/planet-message.service';
import { ManagerService } from '../manager.service';
import { arrangePlanetsIntoHubs, attachNamesToPlanets, getDomainParams } from './reports.utils';
import { StateService } from '../../shared/state.service';
import { trackById } from '../../shared/table-helpers';

@Component({
  templateUrl: './reports.component.html',
  styles: [ `
    mat-panel-title {
      align-items: center;
    }
  ` ],
  styleUrls: [ './reports.components.scss' ]
})
export class ReportsComponent implements OnInit, OnDestroy {

  onDestroy$ = new Subject<void>();
  hubs = [];
  sandboxPlanets = [];
  planets = [];
  hubId: string | null = null;
  configuration = this.stateService.configuration;
  trackById = trackById;

  constructor(
    private couchService: CouchService,
    private activityService: ReportsService,
    private planetMessageService: PlanetMessageService,
    private managerService: ManagerService,
    private stateService: StateService,
    private route: ActivatedRoute,
    private router: Router
  ) {}

  ngOnInit() {
    this.route.paramMap.pipe(takeUntil(this.onDestroy$)).subscribe(params => {
      this.hubId = params.get('hubId');
      this.getLogs();
    });
  }

  ngOnDestroy() {
    this.onDestroy$.next();
    this.onDestroy$.complete();
  }

  findByPlanet({ rows }: { rows: any[] }, planetCode) {
    return (rows.find(row => row.key === planetCode) || { value: 0 }).value;
  }

  getLogs() {
    const { planetCode, domain } = getDomainParams(this.configuration, this.hubId !== undefined && this.hubId !== null);
    forkJoin([
      this.managerService.getChildPlanets(true, planetCode, domain),
      this.couchService.findAll('hubs', undefined, domain ? { domain } : {})
    ]).pipe(
      switchMap(([ planets, hubs ]) => {
        this.planets = planets;
        this.arrangePlanetData(planets, hubs);
        return forkJoin([
          this.activityService.getActivities('resource_activities', 'byPlanet', domain),
          this.activityService.getActivities('login_activities', 'byPlanet', domain),
          this.activityService.getAdminActivities({ domain })
        ]);
      })
    ).subscribe(([ resourceVisits, loginActivities, adminActivities ]) => {
      this.arrangePlanetData(this.planets.map((planet: any) => planet.docType === 'parentName' ? planet : ({
        ...planet,
        resourceViews: this.findByPlanet(resourceVisits, planet.code),
        userVisits: this.findByPlanet(loginActivities, planet.code),
        ...this.activityService.mostRecentAdminActivities(planet, [], adminActivities)
      })), this.hubs);
    }, (error) => this.planetMessageService.showAlert($localize`There was a problem getting Activity Logs`));
  }

  arrangePlanetData(planetDocs, hubData) {
    const { hubs, sandboxPlanets } = arrangePlanetsIntoHubs(attachNamesToPlanets(planetDocs), hubData);
    if (this.hubId !== null) {
      this.hubs = [ hubs.find(hub => hub.planetId === this.hubId) ];
      this.sandboxPlanets = this.hubs[0].children;
      return;
    }
    this.hubs = hubs;
    this.sandboxPlanets = sandboxPlanets.filter((planet: any) => planet.doc.docType !== 'parentName');
  }

  viewReport(planet, event) {
    this.router.navigate([ 'detail', { parentCode: planet.parentCode, code: planet.code } ], { relativeTo: this.route });
    event.stopPropagation();
  }

}
