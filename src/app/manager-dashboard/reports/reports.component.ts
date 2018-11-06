import { Component } from '@angular/core';
import { MatTableDataSource } from '@angular/material';
import { forkJoin } from 'rxjs';
import { CouchService } from '../../shared/couchdb.service';
import { findDocuments } from '../../shared/mangoQueries';
import { ReportsService } from './reports.service';
import { PlanetMessageService } from '../../shared/planet-message.service';
import { StateService } from '../../shared/state.service';

@Component({
  templateUrl: './reports.component.html',
})
export class ReportsComponent {

  logs = new MatTableDataSource();
  displayedColumns = [
    'name',
    // 'downloads',
    'views',
    'logins',
    'lastAdminLogin',
    'lastUpgrade',
    'lastSync'
  ];

  constructor(
    private couchService: CouchService,
    private activityService: ReportsService,
    private planetMessageService: PlanetMessageService,
    private stateService: StateService
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
      this.couchService.findAll('communityregistrationrequests',
        findDocuments(
          { 'parentCode': this.stateService.configuration.code, 'registrationRequest': 'accepted' }, 0, [ { 'createdDate': 'desc' } ]
        )
      ),
      this.activityService.getResourceVisits(),
      this.activityService.getLoginActivities(),
      this.activityService.getAdminActivities()
    ]).subscribe(([ planets, resourceVisits, loginActivities, adminActivities ]) => {
        this.logs.data = planets.map((planet: any) => ({
          ...planet,
          resourceViews: this.countByPlanet(planet, resourceVisits.byResource),
          userVisits: this.countByPlanet(planet, loginActivities.byUser),
          ...this.activityService.mostRecentAdminActivities(planet, loginActivities.byUser, adminActivities)
        }));
    }, (error) => this.planetMessageService.showAlert('There was a problem getting Activity Logs'));
  }

}
