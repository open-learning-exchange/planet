import { Injectable } from '@angular/core';
import { CouchService } from '../shared/couchdb.service';
import { UserService } from '../shared/user.service';
import { map } from 'rxjs/operators';

@Injectable()
export class DashboardService {

  userShelf = this.userService.shelf;

  constructor(
    private couchService: CouchService,
    private userService: UserService,
  ) {
    this.userService.shelfChange$
      .subscribe((shelf: any) => {
        this.userShelf = shelf;
      });
    }

    removeFromDashboard(itemId, myItem) {
        switch(myItem) {
            case "myLibrary":
                            this.userShelf.resourceIds.splice(itemId, 1);
                            break;
            case "myCourses":
                            this.userShelf.courseIds.splice(itemId, 1);
                            break;
            case "myMeetups":
                            this.userShelf.meetupIds.splice(itemId, 1);
                            break;
            case "myTeams":
                            this.userShelf.myTeamIds.splice(itemId, 1);
                            break;
        }
        return this.couchService.put('shelf/' + this.userService.get()._id, this.userShelf)
        .pipe(map((response) => {
            this.userShelf._rev = response.rev;
            this.userService.shelf = this.userShelf;
            return { response };
        }));
    }

}
