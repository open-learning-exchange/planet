import { Component, OnInit, HostListener } from '@angular/core';
import { CouchService } from '../../shared/couchdb.service';
import { forkJoin, of } from 'rxjs';
import { StateService } from '../../shared/state.service';
import { PlanetMessageService } from '../../shared/planet-message.service';
import { ManagerService } from '../manager.service';
import { ReportsService } from './reports.service';
import { filterSpecificFields } from '../../shared/table-helpers';
import { attachNamesToPlanets, getDomainParams, areNoChildren } from './reports.utils';
import { ActivatedRoute } from '@angular/router';
import { switchMap, map } from 'rxjs/operators';
import { findDocuments } from '../../shared/mangoQueries';
import { DeviceInfoService, DeviceType } from '../../shared/device-info.service';
import { CsvService } from '../../shared/csv.service';

@Component({
  templateUrl: './reports-myplanet.component.html'
})
export class ReportsMyPlanetComponent implements OnInit {

  private allPlanets: any[] = [];
  searchValue = '';
  planets: any[] = [];
  isEmpty = false;
  isMobile: boolean;
  deviceType: DeviceType;
  showFiltersRow = false;
  planetType = this.stateService.configuration.planetType;
  configuration = this.stateService.configuration;
  get childType() {
    return this.planetType === 'center' ? 'Community' : 'Nation';
  }
  hubId: string | null = null;
  hub = { spokes: [] };

  constructor(
    private csvService: CsvService,
    private couchService: CouchService,
    private stateService: StateService,
    private planetMessageService: PlanetMessageService,
    private managerService: ManagerService,
    private reportsService: ReportsService,
    private route: ActivatedRoute,
    private deviceInfoService: DeviceInfoService
  ) {
    this.deviceType = this.deviceInfoService.getDeviceType();
    this.isMobile = this.deviceType === DeviceType.MOBILE;
  }

  ngOnInit() {
    this.getMyPlanetList(this.route.snapshot.params.hubId);
  }

  @HostListener('window:resize') onResize() {
    this.deviceType = this.deviceInfoService.getDeviceType();
    this.isMobile = this.deviceType === DeviceType.MOBILE;
    this.showFiltersRow = false;
  }

  filterData(filterValue: string) {
    this.searchValue = filterValue;
    this.planets = this.allPlanets.filter(planet => filterSpecificFields([ 'name', 'doc.code' ])(planet, filterValue));
  }

  setAllPlanets(planets: any[], myPlanets: any[]) {
    this.allPlanets = planets.map(planet => ({
      ...planet,
      children: this.myPlanetGroups(planet, myPlanets)
        .map((child: any) => ({ count: child.count, totalUsedTime: child.sum, ...child.max }))
    }));
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
    this.myPlanetRequest(hubId).subscribe(([ planets, myPlanets ]: [ any, any ]) => {
      this.setAllPlanets(
        [ { doc: this.configuration } ].concat(
          planets.filter(planet => planet.doc.docType !== 'parentName')
        ).map((planet: any) => ({ ...planet, name: planet.nameDoc ? planet.nameDoc.name : planet.doc.name })),
        myPlanets
      );
      this.planets = this.allPlanets;
      this.isEmpty = areNoChildren(this.planets);
    }, (error) => this.planetMessageService.showAlert($localize`There was a problem getting myPlanet activity.`));
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
    return children.map((data: any) => {
      console.log(data);
      return {
      ...(planetName ? { 'Planet Name': planetName } : {}),
      'ID': data.uniqueAndroidId,
      'Name': data.deviceName || data.customDeviceName,
      'Last Synced': new Date(data.last_synced),
      'Version': data.versionName,
      'No of Visits': data.count,
      'Used Time': new Date(data.totalUsedTime).toISOString().substr(11, 8)
    };
  });
  }


  exportAll(): void {
    const csvData: any[] = this.planets.flatMap((planet: any) => {
      return this.mapToCsvData(planet.children, planet.name);
    });

    this.csvService.exportCSV({
      data: csvData,
      title: 'myPlanet Reports',
    });
  }

  exportSingle(planet: any): void {
    const csvData = this.mapToCsvData(planet.children);

    this.csvService.exportCSV({
      data: csvData,
      title: `myPlanet Reports for ${planet.name}`,
    });
  }

}
