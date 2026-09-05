import { Injectable } from '@angular/core';
import { CouchService } from '../../shared/couchdb.service';
import { AchievementVisibility, achievementVisibility } from './users-achievements.constants';

@Injectable({
  providedIn: 'root'
})
export class UsersAchievementsService {

  readonly dbName = 'achievements';
  parent = false;

  constructor(
    private couchService: CouchService,
  ) {}

  getAchievements(id) {
    return this.couchService.get(this.dbName + '/' + id);
  }

  visibility(achievements: any = {}): AchievementVisibility {
    return achievementVisibility(achievements?.visibility);
  }

  isEmpty(achievement) {
    return (!achievement.purpose && !achievement.goals && !achievement.achievementsHeader
            && achievement.achievements.length === 0 && achievement.references.length === 0
            && (achievement.links?.length ?? 0) === 0
            && !achievement.resumeFileName && !achievement._attachments?.['resume.pdf']);
  }
}
