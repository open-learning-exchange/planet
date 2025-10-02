import { Component, OnInit } from '@angular/core';
import { FormBuilder } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { forkJoin, of } from 'rxjs';
import { switchMap, map } from 'rxjs/operators';
import { StateService } from '../../../shared/state.service';
import { PlanetMessageService } from '../../../shared/planet-message.service';
import { ManagerService } from '../../manager.service';
import { ReportsService } from '../reports.service';
import { CouchService } from '../../../shared/couchdb.service';
import { attachNamesToPlanets, getDomainParams, areNoChildren, filterByDate, exportMyPlanetCsv } from '../reports.utils';
import { findDocuments } from '../../../shared/mangoQueries';
import { CsvService } from '../../../shared/csv.service';
import { filterSpecificFields } from '../../../shared/table-helpers';
import { MyPlanetFiltersBase } from './filter.base';
import { TimePipe } from '../time.pipe';

@Component({
  templateUrl: './reports-myplanet.component.html',
  styleUrls: [ './myplanet.scss' ]
})
export class ReportsMyPlanetComponent extends MyPlanetFiltersBase implements OnInit {

  private exportCsvHelper = exportMyPlanetCsv(this.csvService);
  private allPlanets: any[] = [];
  planets: any[] = [];
  isMobile: boolean;
  planetType = this.stateService.configuration.planetType;
  configuration = this.stateService.configuration;
  hubId: string | null = null;
  hub = { spokes: [] };
  get childType() {
    return this.planetType === 'center' ? 'Community' : 'Nation';
  }

  constructor(
    private csvService: CsvService,
    private couchService: CouchService,
    private stateService: StateService,
    private planetMessageService: PlanetMessageService,
    private managerService: ManagerService,
    private reportsService: ReportsService,
    private route: ActivatedRoute,
    private timePipe: TimePipe,
    fb: FormBuilder,
    activityService: ReportsService,
  ) {
    super(fb, activityService, 'all');
  }

  ngOnInit() {
    this.resetDateFilter();
    this.isLoading = true;
    this.getMyPlanetList(this.route.snapshot.params.hubId);
  }

  setAllPlanets(planets: any[], myPlanets: any[]) {
    this.allPlanets = planets.map(planet => ({
      ...planet,
      children: this.filterMyPlanetData(
        this.myPlanetGroups(planet, myPlanets).map((child: any) => ({ count: child.count, totalUsedTime: child.sum, ...child.max }))
      )
    }))
  };

  filterMyPlanetData(data: any[]) {
    return data
      .filter(item => !this.selectedVersion || item.versionName === this.selectedVersion)
      .filter(item => filterByDate(
        [item],
        item.last_synced ? 'last_synced' : 'time',
        { startDate: this.startDate, endDate: this.endDate }).length > 0
      )
  }

  getUniqueVersions(myPlanets: any[]) {
    this.versions = Array.from(new Set(myPlanets.map(planet =>
      planet.versionName || (planet.usages && planet.usages.length > 0 ? planet.usages[0].versionName : null)
    ))).filter(version => version).sort();
  }

  getEarliestDate(myPlanets: any[]): Date {
    const earliest = Math.min(...myPlanets.flatMap(planet => {
      const dates = [];
      if (planet.time) { dates.push(Number(planet.time)); }
      if (planet.last_synced) { dates.push(Number(planet.last_synced)); }
      if (planet.usages) {
        dates.push(...planet.usages.map(usage => Number(usage.time || usage.last_synced)));
      }
      return dates;
    }));
    return new Date(earliest);
  }

  applyFilters() {
    this.planets = this.allPlanets
      .filter(planet => !this.searchValue || filterSpecificFields([ 'name', 'doc.code' ])(planet, this.searchValue))
      .map(planet => ({
        ...planet,
        children: this.filterMyPlanetData(planet.children)
      }));
    this.isEmpty = areNoChildren(this.planets);
  }

  myPlanetGroups(planet: any, myPlanets: any[]) {
    return this.reportsService.groupBy(
      myPlanets
        .filter(myPlanet => myPlanet.createdOn === planet.doc.code || myPlanet.parentCode === planet.doc.code)
        .map(myPlanet => (myPlanet.type === 'usages' || (myPlanet.usages || []) > 0) ? myPlanet.usages : myPlanet)
        .flat(),
      [ 'androidId' ],
      { maxField: 'time', sumField: 'totalUsed' }
    );
  }

  getMyPlanetList(hubId) {
    this.isLoading = true;
    this.myPlanetRequest(hubId).subscribe(
      ([ planets, myPlanets ]: [ any, any ]) => {
        this.updateMinDate(this.getEarliestDate(myPlanets));
        this.getUniqueVersions(myPlanets);
        this.setAllPlanets(
          [ { doc: this.configuration } ].concat(
            planets.filter(planet => planet.doc.docType !== 'parentName')
          ).map((planet: any) => ({ ...planet, name: planet.nameDoc ? planet.nameDoc.name : planet.doc.name })),
          myPlanets
        );
        this.planets = this.allPlanets;
        this.onTimeFilterChange(this.selectedTimeFilter);
        this.isEmpty = areNoChildren(this.planets);
        this.isLoading = false;
      },
      (error) => {
        this.planetMessageService.showAlert($localize`There was a problem getting myPlanet activity.`);
        this.isLoading = false;
      }
    );
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

  private mapToCsvData(children: any[], planetName?: string): any[] {
    return children.map((data: any) => ({
      ...(planetName ? { 'Planet Name': planetName } : {}),
      'ID': data.androidId.toString() || data.uniqueAndroidId.toString(),
      'Name': data.deviceName || data.customDeviceName,
      'Last Synced': data.time && data.time !== 0 ?
      new Date(data.time).toDateString() :
      data.last_synced && data.last_synced !== 0 ?
      new Date(data.last_synced).toDateString() :
      'N/A',
      'Version': data.versionName,
      'No of Visits': data.count,
      'Used Time': this.timePipe.transform(data.totalUsedTime),
    }));
  }

  exportAll(): void {
    this.exportCsvHelper(this.planets, undefined, this.mapToCsvData.bind(this), $localize`myPlanet Reports`);
  }

  exportSingle(planet: any): void {
    this.exportCsvHelper(planet.children, planet.name, this.mapToCsvData.bind(this), $localize`myPlanet Reports for ${planet.name}`);
  }

}
