import { Injectable } from '@angular/core';
import { CouchService } from '../../shared/couchdb.service';

@Injectable({
  providedIn: 'root'
})
export class UsersAchievementsService {

  readonly dbName = 'achievements';
  infoTypes = [ 'Language', 'Education', 'History', 'Badges', 'Certificates', 'Internships', 'Degrees', 'Awards' ];

  constructor(
    private couchService: CouchService
  ) {}

  getAchievements(id) {
    return this.couchService.get(this.dbName + '/' + id);
  }

}
