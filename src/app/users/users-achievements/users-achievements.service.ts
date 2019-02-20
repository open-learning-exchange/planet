import { Injectable } from '@angular/core';
import { CouchService } from '../../shared/couchdb.service';

@Injectable({
  providedIn: 'root'
})
export class UsersAchievementsService {

  readonly dbName = 'achievements';
  infoTypes = [ 'Languages', 'Education', 'Employment History', 'Badges', 'Certificates', 'Internships', 'Awards' ];

  constructor(
    private couchService: CouchService
  ) {}

  getAchievements(id) {
    return this.couchService.get(this.dbName + '/' + id);
  }

  isEmpty(achievement) {
    return (!achievement.purpose && !achievement.goals && !achievement.achievementsHeader
            && achievement.achievements.length === 0);
  }
}
