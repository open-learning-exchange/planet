import { Component, OnInit } from '@angular/core';
import { CouchService } from '../../shared/couchdb.service';
import { forkJoin, of } from 'rxjs';
import { StateService } from '../../shared/state.service';
import { PlanetMessageService } from '../../shared/planet-message.service';
import { ManagerService } from '../manager.service';
import { ReportsService } from './reports.service';
import { filterSpecificFields } from '../../shared/table-helpers';
import { attachNamesToPlanets, getDomainParams, areNoChildren, hasChildrenId } from './reports.utils';
import { ActivatedRoute } from '@angular/router';
import { switchMap, map } from 'rxjs/operators';
import { findDocuments } from '../../shared/mangoQueries';

@Component({
  templateUrl: './reports-myplanet.component.html'
})
export class ReportsMyPlanetComponent implements OnInit {

  private allPlanets: any[] = [];
  searchValue = '';
  planets: any[] = [];
  isEmpty = false;
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
    myPlanets.filter(myPlanet => {
      return (myPlanet.type === 'usages' && (myPlanet.usages || []).length !== 0);
    }).map(myPlanetUsage => {
      this.allPlanets.map(allPlanet => {
        allPlanet.children.map(element => {
          if ( hasChildrenId(element, myPlanetUsage) ) {
            const total = myPlanetUsage.usages.reduce((accumulator, currentValue) => accumulator + new Date(currentValue.lastTimeUsed));
            return ({ ...element, totalUsedTime: total });
          }
        });
      });
    });
  }

  getMyPlanetList(hubId) {
    this.myPlanetRequest(hubId).subscribe(([ planets, myPlanets ]: [ any, any ]) => {
      this.setAllPlanets(
        [ { doc: this.configuration } ].concat(
          planets.filter(planet => planet.doc.docType !== 'parentName')
        ).map((planet: any) => ({ ...planet, name: planet.nameDoc ? planet.nameDoc.name : planet.doc.name })),
        myPlanets
      );
      // console.log(this.allPlanets)
      this.planets = this.allPlanets;
      this.isEmpty = areNoChildren(this.planets);
    }, (error) => this.planetMessageService.showAlert('There was a problem getting myPlanet activity.'));
  }

  myPlanetRequest(hubId) {
    const { planetCode, domain } = getDomainParams(this.configuration, hubId !== undefined);
    return (hubId ? this.couchService.findAll('hubs', findDocuments({ 'planetId': hubId }), { domain }) : of([])).pipe(
      switchMap((hubs: any) => {
        this.hub = hubs[0] || { spokes: [] };
        const selector = findDocuments({ 'createdOn': { '$in': this.hub.spokes } });
        return forkJoin([
          this.managerService.getChildPlanets(true, planetCode, domain),
          this.couchService.findAll('myplanet_activities'),
          hubId ? this.couchService.findAll('myplanet_activities', selector, { domain }) : of([])
        ]);
      }),
      map(([ planets, myPlanets, hubMyPlanets ]) => {
        const filteredPlanets = attachNamesToPlanets(planets)
          .filter((planet: any) => planet.doc.docType !== 'parentName' && (!hubId || this.hub.spokes.indexOf(planet.doc.code) > -1));
        return [ filteredPlanets, myPlanets.concat(hubMyPlanets) ];
      })
    );
  }

}
