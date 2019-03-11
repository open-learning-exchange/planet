import { Injectable } from '@angular/core';
import { CouchService } from '../../shared/couchdb.service';
import { map } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class UsersAchievementsService {

  readonly dbName = 'achievements';

  constructor(
    private couchService: CouchService
  ) {}

  getAchievements(id) {
    return this.couchService.get(this.dbName + '/' + id).pipe(
      map(userAchievements => {
        userAchievements.achievements.forEach(achievement => {
          if(achievement.resources.length !== 0) {
            achievement.resources.map(resource => {
              this.couchService.get('resources/' + resource._id)
                .subscribe((data) => {
                  achievement.resources = achievement.resources.filter((res: any) => data._id === res._id);
                }, (err) =>{ console.log(err) });
            });
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
