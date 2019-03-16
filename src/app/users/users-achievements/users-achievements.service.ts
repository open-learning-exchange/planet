import { Injectable } from '@angular/core';
import { CouchService } from '../../shared/couchdb.service';
import { forkJoin } from 'rxjs';
import { findDocuments, inSelector } from '../../shared/mangoQueries';
import { map } from 'rxjs/operators';
import { of } from 'rxjs';

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
      map((userAchievements: any) => {
        forkJoin([
          of(userAchievements),
          this.couchService.findAll('resources', findDocuments({ '_id': inSelector([]) }))
        ]).subscribe(([ userAchievements, resources ]: [ any, any ]) => {
          let rArr = []
          resources.forEach(r => rArr.push(r._id))
    
          userAchievements.achievements.map((achievement: any) => {
            if(achievement.resources.length !== 0) {
              achievement.resources = achievement.resources.filter((res: any) => rArr.indexOf(res._id) !== -1) 
            }
          })
        }, (err) => { console.log(err); });
        return userAchievements;
      })
    );
  }

  isEmpty(achievement) {
    return (!achievement.purpose && !achievement.goals && !achievement.achievementsHeader
            && achievement.achievements.length === 0 && achievement.references.length === 0);
  }
}
