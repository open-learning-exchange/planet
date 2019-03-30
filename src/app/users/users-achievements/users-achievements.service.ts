import { Injectable } from '@angular/core';
import { CouchService } from '../../shared/couchdb.service';
import { map } from 'rxjs/operators';
import { ResourcesService } from '../../resources/resources.service';
import { ActivatedRoute } from '@angular/router';

@Injectable({
  providedIn: 'root'
})
export class UsersAchievementsService {

  readonly dbName = 'achievements';
  resourceIds = [];
  parent = this.route.snapshot.data.parent;

  constructor(
    private couchService: CouchService,
    private resourcesService: ResourcesService,
    private route: ActivatedRoute
  ) {
    this.resourcesService.resourcesListener(this.parent).pipe(map((resources: any) => {
      resources.map((res: any) => { this.resourceIds.push(res._id); });
      return this.resourceIds;
    })).subscribe((resIds: any) => {
      this.resourceIds = resIds;
    });
    this.resourcesService.requestResourcesUpdate(this.parent);
  }


  getAchievements(id) {
    return this.couchService.get(this.dbName + '/' + id).pipe(
      map((userAchievements: any) => {
        userAchievements.achievements.forEach((achievement: any) => {
          if (achievement.resources.length !== 0) {
            achievement.resources = achievement.resources.filter(res => this.resourceIds.indexOf(res._id) !== -1);
          }
        });
        return userAchievements;
      })
    );
  }

  isEmpty(achievement) {
    return (!achievement.purpose && !achievement.goals && !achievement.achievementsHeader
            && achievement.achievements.length === 0 && achievement.references.length === 0);
  }
}
