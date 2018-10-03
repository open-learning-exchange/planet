import { Component } from '@angular/core';
import { MatTableDataSource } from '@angular/material';
import { switchMap } from 'rxjs/operators';
import { forkJoin } from 'rxjs';
import { CouchService } from '../shared/couchdb.service';
import { findDocuments } from '../shared/mangoQueries';
import { UserService } from '../shared/user.service';
import { ActivityService } from './activity.service';

@Component({
  templateUrl: './activity-logs.component.html',
})
export class ActivityLogsComponent {

  message = '';
  logs = new MatTableDataSource();
  displayedColumns = [
    'name',
    // 'downloads',
    'views',
    'logins',
    'lastLogin',
    'lastUpgrade',
    'lastSync'
  ];
  constructor(
    private couchService: CouchService,
    private activityService: ActivityService,
    private userService: UserService
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

  mostRecentAdminActivities(planet, logins, adminActivities) {
    const adminName = planet.adminName.split('@')[0];
    const findPlanetLog = (item: any) => item.createdOn === planet.code;
    const findAdminActivity = (type: any) => (activity: any) => activity.type === type && findPlanetLog(activity);
    return ({
      lastLogin: logins.find((item: any) => item.user === adminName && findPlanetLog(item)),
      lastUpgrade: adminActivities.find(findAdminActivity('upgrade')),
      lastSync: adminActivities.find(findAdminActivity('sync'))
    });
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
          userLogins: this.countByPlanet(planet, loginActivities),
          ...this.mostRecentAdminActivities(planet, loginActivities, adminActivities)
        }));
    }, (error) => this.message = 'There was a problem getting Activity Logs');
  }

}
