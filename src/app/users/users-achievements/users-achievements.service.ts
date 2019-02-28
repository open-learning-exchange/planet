import { Injectable } from '@angular/core';
import { CouchService } from '../../shared/couchdb.service';

@Injectable({
  providedIn: 'root'
})
export class UsersAchievementsService {

  readonly dbName = 'achievements';

  constructor(
    private couchService: CouchService
  ) {}

  getAchievements(id) {
    return this.couchService.get(this.dbName + '/' + id);
  }

  isEmpty(achievement) {
    return (!achievement.purpose && !achievement.goals && !achievement.achievementsHeader
            && achievement.achievements.length === 0 && achievement.references.length === 0);
  }

  sortAchievement(achievements, sortOrder = 'asc') {
    return achievements.sort((a, b) => {
      if (!a.date) {
        return 1;
      }
      if (sortOrder === 'desc') {
        return (a.date > b.date) ? -1 : 1;
      } else {
        return (a.date < b.date || !b.date) ? -1 : 1;
      }
    });
  }
}
