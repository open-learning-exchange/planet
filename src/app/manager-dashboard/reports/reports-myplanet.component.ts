import { Component, OnInit } from '@angular/core';
import { CouchService } from '../../shared/couchdb.service';
import { forkJoin, of } from 'rxjs';
import { StateService } from '../../shared/state.service';
import { PlanetMessageService } from '../../shared/planet-message.service';
import { ManagerService } from '../manager.service';
import { ReportsService } from './reports.service';
import { filterSpecificFields } from '../../shared/table-helpers';
import { attachNamesToPlanets, getDomainParams } from './reports.utils';
import { ActivatedRoute } from '@angular/router';
import { switchMap } from 'rxjs/operators';

@Component({
  templateUrl: './reports-myplanet.component.html'
})
export class ReportsMyPlanetComponent implements OnInit {

  private allPlanets: any[] = [];
  searchValue = '';
  planets: any[] = [];
  planetType = this.stateService.configuration.planetType;
  configuration = this.stateService.configuration;
  get childType() {
    return this.planetType === 'center' ? 'Community' : 'Nation';
  }
  hubId: string | null = null;
  hub = { spokes: [] };

  constructor(
    private couchService: CouchService,
    private stateService: StateService,
    private planetMessageService: PlanetMessageService,
    private managerService: ManagerService,
    private reportsService: ReportsService,
    private route: ActivatedRoute
  ) {}

  ngOnInit() {
    this.getMyPlanetList(this.route.snapshot.params.hubId);
  }

  filterData(filterValue: string) {
    this.searchValue = filterValue;
    this.planets = this.allPlanets.filter(planet => filterSpecificFields([ 'name', 'doc.code' ])(planet, filterValue));
  }

  setAllPlanets(planets: any[], myPlanets: any[]) {
    this.allPlanets = planets.map(planet => ({
      ...planet,
      children:
        this.reportsService.groupBy(
          myPlanets.filter(myPlanet => {
            return myPlanet.type !== 'usages' && (myPlanet.usages || []).length === 0 &&
              (myPlanet.createdOn === planet.doc.code || myPlanet.parentCode === planet.doc.code);
          }),
          [ 'androidId' ],
          { maxField: 'time' }
        ).map((child: any) => {
          return { count: child.count, ...child.max };
        })
      })
    );
  }

  getMyPlanetList(hubId) {
    this.myPlanetRequest(hubId).subscribe(([ planets, myPlanets ]: [ any, any ]) => {
      this.setAllPlanets(
        [ { doc: this.configuration } ].concat(planets)
          .map((planet: any) => ({ ...planet, name: planet.nameDoc ? planet.nameDoc.name : planet.doc.name })),
        myPlanets
      );
      this.planets = this.allPlanets;
    }, (error) => this.planetMessageService.showAlert('There was a problem getting ' + this.childType));
  }

  myPlanetRequest(hubId) {
    const { planetCode, domain } = getDomainParams(this.configuration);
    return forkJoin([
      this.managerService.getChildPlanets(true, planetCode, domain),
      this.couchService.findAll('myplanet_activities')
    ]).pipe(switchMap(([ planets, myPlanets ]) => {
        planets = attachNamesToPlanets(planets).filter((planet: any) => planet.doc.docType !== 'parentName');
        if (hubId) {
          return this.couchService.findAll('hubs', { 'selector': { 'planetId': hubId } }, { domain })
          .pipe(switchMap((hubs: any) => {
            this.hub = hubs[0] || { spokes: [] };
            const selector = { 'selector': { 'createdOn': { '$in': this.hub.spokes } } };
            return this.couchService.findAll('myplanet_activities', selector, { domain });
          }), switchMap((hubActivities: any) => {
            return of([ planets.filter((p: any) => this.hub.spokes.indexOf(p.doc.code) > -1), myPlanets.concat(hubActivities) ]);
          }));
        }
        return of([ planets, myPlanets ]);
    }));
  }

}
