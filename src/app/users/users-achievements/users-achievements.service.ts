import { Injectable } from '@angular/core';
import { CouchService } from '../../shared/couchdb.service';
import { forkJoin } from 'rxjs';
import { map, first } from 'rxjs/operators';
import { ResourcesService } from '../../resources/resources.service';

@Injectable({
  providedIn: 'root'
})
export class UsersAchievementsService {

  readonly dbName = 'achievements';
  parent = false;

  constructor(
    private couchService: CouchService,
    private resourcesService: ResourcesService
  ) {}


  getAchievements(id) {
    this.resourcesService.requestResourcesUpdate(this.parent);
    return forkJoin([
      this.couchService.get(this.dbName + '/' + id),
      this.resourcesService.resourcesListener(this.parent).pipe(first())
    ]).pipe(
      map(([ userAchievements, resources ]: any[]) => {
        const resourceIds = resources.map((res: any) => res._id);
        userAchievements.achievements.forEach((achievement: any) => {
          if (achievement.resources.length !== 0) {
            achievement.resources = achievement.resources.filter(res => resourceIds.indexOf(res._id) !== -1);
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
