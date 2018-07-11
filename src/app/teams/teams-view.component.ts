import { Component, OnInit, OnDestroy } from '@angular/core';
import { CouchService } from '../shared/couchdb.service';
import { findDocuments } from '../shared/mangoQueries';
import { ActivatedRoute } from '@angular/router';
import { UserService } from '../shared/user.service';
import { PlanetMessageService } from '../shared/planet-message.service';
import { TeamsService } from './teams.service';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

@Component({
  templateUrl: './teams-view.component.html',
  styleUrls: [ './teams-view.scss' ]
})
export class TeamsViewComponent implements OnInit {

  team: any;
  teamId = this.route.snapshot.paramMap.get('teamId');
  members = [];
  displayedColumns = [ 'name' ];
  userShelf: any = [];
  userIsMember = false;
  onDestroy$ = new Subject<void>;

  constructor(
    private couchService: CouchService,
    private userService: UserService,
    private route: ActivatedRoute,
    private planetMessageService: PlanetMessageService,
    private teamsService: TeamsService
  ) {}

  ngOnInit() {
    this.couchService.get('teams/' + this.teamId)
      .subscribe(data => {
        this.team = data;
        this.getMembers();
        this.userShelf = this.userService.shelf;
      });
    this.userService.shelfChange$
      .pipe(takeUntil(this.onDestroy$))
      .subscribe(shelf => {
        this.userShelf = shelf;
        this.getMembers();
      });
  }

  ngOnDestroy() {
    this.onDestroy$.next();
    this.onDestroy$.complete();
  }

  getMembers() {
    // find teamId on User shelf
    this.couchService.post('shelf/_find', findDocuments({
      'myTeamIds': { '$in': [ this.teamId ] }
    }, 0)).subscribe((data) => {
      this.userIsMember = false;
      this.members = data.docs.map((mem) => {
        if (mem._id === this.userService.get()._id) {
          this.userIsMember = true;
        }
        return { name: mem._id.split(':')[1] };
      });
    });
  }

  toggleMembership(teamId, leaveTeam) {
    this.teamsService.toggleTeamMembership(teamId, leaveTeam, this.userShelf).subscribe(() => {
      const msg = leaveTeam ? 'left' : 'joined';
      this.planetMessageService.showMessage('You have ' + msg + ' team');
    });
  }

}
