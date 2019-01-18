import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class UsersAchievementsService {

  infoTypes = [ 'Language', 'Education', 'History', 'Badges', 'Certificates', 'Internships', 'Degrees', 'Awards' ];

  constructor() {}

}
