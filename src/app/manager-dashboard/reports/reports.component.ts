import { Component } from '@angular/core';
import { MatTableDataSource } from '@angular/material';
import { forkJoin } from 'rxjs';
import { CouchService } from '../../shared/couchdb.service';
import { findDocuments } from '../../shared/mangoQueries';
import { UserService } from '../../shared/user.service';
import { ReportsService } from './reports.service';
import { PlanetMessageService } from '../../shared/planet-message.service';

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
    private userService: UserService,
    private planetMessageService: PlanetMessageService
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
        findDocuments({ 'parentCode': this.userService.getConfig().code }, 0, [ { 'createdDate': 'desc' } ] )),
      this.activityService.getResourceVisits(),
      this.activityService.getLoginActivities(),
      this.activityService.getAdminActivities()
    ]).subscribe(([ planets, resourceVisits, loginActivities, adminActivities ]) => {
        this.logs.data = planets.map((planet: any) => ({
          ...planet,
          resourceViews: this.countByPlanet(planet, resourceVisits),
          userVisits: this.countByPlanet(planet, loginActivities),
          ...this.activityService.mostRecentAdminActivities(planet, loginActivities, adminActivities)
        }));
    }, (error) => this.planetMessageService.showAlert('There was a problem getting Activity Logs'));
  }

}
